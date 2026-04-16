'use client';

/**
 * Teaching Chat Page
 * 
 * Conversational interface for collecting teaching requirements
 */

import { useState, useRef, useEffect } from 'react';
import { handleTeachingConversation, type ChatMessage, type TeachingSession } from '@/lib/agent/teaching-intent-agent';
import { useTeachingGenerator } from '@/lib/hooks/use-teaching-generator';
import { useExportTeachingPPTX } from '@/lib/export/use-export-teaching-pptx';
import { getModel } from '@/lib/ai/providers';
import type { ReferenceMaterial, ParsedImage } from '@/lib/types/teaching';
import { nanoid } from 'nanoid';
import { createLogger } from '@/lib/logger';
import { MessageContent } from '@/components/teaching-chat/MessageContent';

const log = createLogger('TeachingChat');

export default function TeachingChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '你好！我是教学设计助手。我可以帮你生成教学设计和课件。请告诉我你想做什么课程？',
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [session, setSession] = useState<TeachingSession>({ ready: false });
  const [materials, setMaterials] = useState<ReferenceMaterial[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const generator = useTeachingGenerator();
  const exporter = useExportTeachingPPTX();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileType = getFileType(file);
        
        if (fileType === 'pdf') {
          const parsedPdf = await parsePdfFile(file);
          if (parsedPdf) {
            const material: ReferenceMaterial = {
              id: nanoid(),
              type: 'pdf',
              name: file.name,
              parsedText: parsedPdf.text,
              parsedImages: parsedPdf.images,
              metadata: {
                uploadedAt: new Date(),
                size: file.size,
                pageCount: parsedPdf.pageCount,
              },
            };
            setMaterials(prev => [...prev, material]);
            log.info(`PDF parsed: ${file.name}, ${parsedPdf.images.length} images`);
          }
        } else if (fileType === 'docx') {
          const parsedDocx = await parseDocxFile(file);
          if (parsedDocx) {
            const material: ReferenceMaterial = {
              id: nanoid(),
              type: 'docx',
              name: file.name,
              parsedText: parsedDocx.text,
              parsedImages: parsedDocx.images,
              metadata: {
                uploadedAt: new Date(),
                size: file.size,
              },
            };
            setMaterials(prev => [...prev, material]);
            log.info(`DOCX parsed: ${file.name}, ${parsedDocx.images.length} images`);
          }
        } else if (fileType === 'image') {
          const imageData = await readFileAsDataURL(file);
          const material: ReferenceMaterial = {
            id: nanoid(),
            type: 'image',
            name: file.name,
            parsedImages: [{
              id: nanoid(),
              src: imageData,
              description: `上传的图片：${file.name}`,
            }],
            metadata: {
              uploadedAt: new Date(),
              size: file.size,
            },
          };
          setMaterials(prev => [...prev, material]);
          log.info(`Image uploaded: ${file.name}`);
        }
      }
      
      // Add system message about uploaded materials
      const materialMessage: ChatMessage = {
        role: 'assistant',
        content: `✓ 已上传 ${files.length} 个参考资料，这些资料将在生成时使用。`,
      };
      setMessages(prev => [...prev, materialMessage]);
    } catch (error) {
      log.error('File upload failed:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `抱歉，文件上传失败：${error instanceof Error ? error.message : String(error)}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    try {
      // Call API endpoint instead of direct LLM call
      const apiResponse = await fetch('/api/teaching-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
        }),
      });

      if (!apiResponse.ok) {
        const error = await apiResponse.json();
        throw new Error(error.details || 'Failed to process chat');
      }

      const result = await apiResponse.json();
      
      log.info('API response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process chat');
      }

      // apiSuccess spreads the data, so fields are at root level
      const response = {
        reply: result.reply,
        ready: result.ready,
        teachingRequest: result.teachingRequest,
        session: result.session,
      };

      if (!response.reply) {
        throw new Error('Invalid response format: missing reply');
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.reply,
      };

      setMessages([...newMessages, assistantMessage]);
      setSession(response.session || { ready: false });

      // If ready, start generation
      if (response.ready && response.teachingRequest) {
        log.info('Teaching request ready, starting generation:', response.teachingRequest);
        
        // Configure model for generation
        const modelConfig = {
          providerId: 'glm' as const,
          modelId: 'glm-4.7',
          apiKey: 'a61159bfaa7949b98ca9863e4350217b.qZiaDB1pjuLuuADv',
          baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
          providerType: 'openai' as const,
          requiresApiKey: true,
        };

        const { model } = getModel(modelConfig);
        
        // Build image mapping from materials
        const imageMapping: Record<string, string> = {};
        materials.forEach(material => {
          material.parsedImages?.forEach(img => {
            imageMapping[img.id] = img.src;
          });
        });
        
        // Start generation
        const design = await generator.generate(response.teachingRequest, {
          model,
          materials,
          imageMapping,
          modelString: 'glm:glm-4.7',
          apiKey: modelConfig.apiKey,
          baseUrl: modelConfig.baseUrl,
          providerType: modelConfig.providerType,
          requiresApiKey: modelConfig.requiresApiKey,
          visionEnabled: false,
        });

        if (design) {
          const successMessage: ChatMessage = {
            role: 'assistant',
            content: '✅ 教学设计生成完成！你可以在下方查看详情，或者导出为 PPT。',
          };
          setMessages(prev => [...prev, successMessage]);
        }
      }
    } catch (error) {
      log.error('Failed to process message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `抱歉，处理您的消息时出错了：${error instanceof Error ? error.message : String(error)}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExport = () => {
    if (generator.design) {
      exporter.exportPPTX(generator.design);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold">对话式教学设计</h1>
        <p className="text-sm text-gray-600 mt-1">
          通过自然对话收集需求，自动生成教学设计和课件
        </p>
      </div>

      {/* Session Status */}
      {!session.ready && (
        <div className="bg-blue-50 border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">收集进度：</span>
              <span className={session.topic ? 'text-green-600' : 'text-gray-400'}>
                {' '}课题{session.topic ? '✓' : '✗'}
              </span>
              <span className={session.subject ? 'text-green-600' : 'text-gray-400'}>
                {' '}学科{session.subject ? '✓' : '✗'}
              </span>
              <span className={session.gradeLevel ? 'text-green-600' : 'text-gray-400'}>
                {' '}年级{session.gradeLevel ? '✓' : '✗'}
              </span>
              <span className={session.duration ? 'text-green-600' : 'text-gray-400'}>
                {' '}课时{session.duration ? '✓' : '✗'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {materials.length > 0 && `📎 ${materials.length} 个参考资料`}
            </div>
          </div>
        </div>
      )}

      {/* Materials Upload Section */}
      {materials.length > 0 && (
        <div className="bg-green-50 border-b px-6 py-3">
          <div className="text-sm font-medium mb-2">📎 参考资料（{materials.length}）</div>
          <div className="flex flex-wrap gap-2">
            {materials.map((material) => (
              <div
                key={material.id}
                className="flex items-center space-x-2 bg-white border rounded px-3 py-1 text-sm"
              >
                <span>
                  {material.type === 'pdf' ? '📄' : material.type === 'docx' ? '📝' : '🖼️'}
                </span>
                <span className="max-w-[150px] truncate">{material.name}</span>
                <button
                  onClick={() => handleRemoveMaterial(material.id)}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border shadow-sm'
              }`}
            >
              <MessageContent content={message.content} />
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white border shadow-sm rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Generation Progress */}
      {generator.isGenerating && (
        <div className="bg-yellow-50 border-t px-6 py-4">
          <div className="text-sm font-medium mb-2">{generator.statusMessage}</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-yellow-600 h-2 rounded-full transition-all"
              style={{ width: `${generator.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Generated Design Preview */}
      {generator.design && (
        <div className="bg-green-50 border-t px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-green-800">
                ✓ 教学设计已生成：{generator.design.title}
              </div>
              <div className="text-sm text-green-600 mt-1">
                {generator.design.slides.length} 页课件 · {generator.design.procedures.length} 个教学环节
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporter.exporting}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {exporter.exporting ? '导出中...' : '导出 PPT'}
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t px-6 py-4">
        <div className="flex space-x-3 mb-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入你的回答..."
            disabled={isThinking || generator.isGenerating}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center space-x-2 disabled:opacity-50">
            <span>📎</span>
            <span className="text-sm">上传资料</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc,image/png,image/jpeg,image/jpg,image/webp"
              multiple
              onChange={handleFileUpload}
              disabled={uploading || generator.isGenerating}
              className="hidden"
            />
          </label>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking || generator.isGenerating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
        <div className="text-xs text-gray-500">
          按 Enter 发送，Shift + Enter 换行 · 支持上传 PDF、Word、图片作为参考资料
        </div>
      </div>
    </div>
  );
}

// Helper functions

function getFileType(file: File): 'pdf' | 'docx' | 'image' | 'other' {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (file.type === 'application/msword') return 'docx';
  if (file.type.startsWith('image/')) return 'image';
  return 'other';
}

async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function parsePdfFile(file: File): Promise<{
  text: string;
  images: ParsedImage[];
  pageCount: number;
} | null> {
  try {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('providerId', 'unpdf');

    const response = await fetch('/api/parse-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`PDF parsing failed: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error('PDF parsing returned no data');
    }

    const pdfData = result.data;
    const images: ParsedImage[] = pdfData.metadata?.pdfImages || [];

    return {
      text: pdfData.text || '',
      images,
      pageCount: pdfData.metadata?.pageCount || 0,
    };
  } catch (error) {
    console.error('Failed to parse PDF:', error);
    return null;
  }
}

async function parseDocxFile(file: File): Promise<{
  text: string;
  images: ParsedImage[];
} | null> {
  try {
    const formData = new FormData();
    formData.append('docx', file);

    const response = await fetch('/api/parse-docx', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`DOCX parsing failed: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error('DOCX parsing returned no data');
    }

    const docxData = result.data;
    const images: ParsedImage[] = docxData.images || [];

    return {
      text: docxData.text || '',
      images,
    };
  } catch (error) {
    console.error('Failed to parse DOCX:', error);
    return null;
  }
}
