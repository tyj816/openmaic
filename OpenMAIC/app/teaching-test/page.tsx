/**
 * Teaching Design Test Page
 * 
 * Simple test page to verify the new teaching design generation flow
 */

'use client';

import { useState } from 'react';
import { useTeachingGenerator } from '@/lib/hooks/use-teaching-generator';
import { useExportTeachingPPTX } from '@/lib/export/use-export-teaching-pptx';
import type { TeachingRequest, ReferenceMaterial, ParsedImage } from '@/lib/types/teaching';
import { getModel } from '@/lib/ai/providers';
import { nanoid } from 'nanoid';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingTest');

// 预设测试场景
const TEST_SCENARIOS = [
  {
    name: '毛泽东思想的活的灵魂',
    request: {
      subject: '思想政治',
      topic: '毛泽东思想的活的灵魂',
      gradeLevel: '大学本科',
      duration: 45,
      language: 'zh-CN' as const,
      useKnowledgeBase: true,
      objectives: {
        knowledge: ['理解实事求是、群众路线、独立自主的基本内涵'],
        skills: ['能够运用毛泽东思想分析现实问题'],
        attitude: ['增强对毛泽东思想的认同感'],
      },
      additionalNotes: '重点讲解实事求是的核心地位，结合具体历史案例',
    },
  },
  {
    name: '新民主主义革命理论',
    request: {
      subject: '思想政治',
      topic: '新民主主义革命的总路线和基本纲领',
      gradeLevel: '大学本科',
      duration: 45,
      language: 'zh-CN' as const,
      useKnowledgeBase: true,
      objectives: {
        knowledge: ['掌握新民主主义革命的总路线', '理解新民主主义的基本纲领'],
        skills: ['能够分析新民主主义革命的历史必然性'],
      },
      additionalNotes: '结合中国近代史背景，突出革命道路的特殊性',
    },
  },
  {
    name: '社会主义改造理论',
    request: {
      subject: '思想政治',
      topic: '社会主义改造的道路和历史经验',
      gradeLevel: '大学本科',
      duration: 45,
      language: 'zh-CN' as const,
      useKnowledgeBase: true,
      objectives: {
        knowledge: ['了解社会主义改造的基本完成', '理解社会主义制度在中国的确立'],
        skills: ['能够评价社会主义改造的历史意义'],
      },
    },
  },
  {
    name: '社会主义建设道路初步探索',
    request: {
      subject: '思想政治',
      topic: '社会主义建设道路初步探索的理论成果',
      gradeLevel: '大学本科',
      duration: 45,
      language: 'zh-CN' as const,
      useKnowledgeBase: true,
      additionalNotes: '重点分析《论十大关系》和《关于正确处理人民内部矛盾的问题》',
    },
  },
  {
    name: '',
    request: {
      subject: '思想政治',
      topic: '邓小平理论的形成和主要内容',
      gradeLevel: '大学本科',
      duration: 45,
      language: 'zh-CN' as const,
      useKnowledgeBase: true,
      objectives: {
        knowledge: ['理解邓小平理论的形成条件', '掌握邓小平理论的主要内容'],
        skills: ['能够运用邓小平理论分析改革开放实践'],
      },
      // ⭐ 关键增强字段（用于诱导RAG但不暴露答案）
      additionalNotes: '请设计具有鲜明结构的课堂流程；导入环节尽量使用具有想象力或非日常的情境；总结部分请使用具有仪式感或固定表达方式的语言；在讲解中可以使用符号或标记来强化重点内容',
    },
  }
];

export default function TeachingTestPage() {
  const [request, setRequest] = useState<TeachingRequest>(TEST_SCENARIOS[0].request);
  const [materials, setMaterials] = useState<ReferenceMaterial[]>([]);
  const [uploading, setUploading] = useState(false);

  const generator = useTeachingGenerator();
  const exporter = useExportTeachingPPTX();

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileType = getFileType(file);
        
        if (fileType === 'pdf') {
          // Parse PDF using API
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
        } else if (fileType === 'image') {
          // Handle image upload
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
    } catch (error) {
      log.error('File upload failed:', error);
      alert(`文件上传失败：${error}`);
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  // Remove material
  const handleRemoveMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleGenerate = async () => {
    // 使用 GLM-5 模型
    const modelConfig = {
      providerId: 'glm' as const,
      modelId: 'glm-4.7', // 使用存在的模型
      apiKey: 'a61159bfaa7949b98ca9863e4350217b.qZiaDB1pjuLuuADv', // 从 .env.local 中的 GLM_API_KEY
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4', // 从 .env.local 中的 GLM_BASE_URL
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

    const design = await generator.generate(request, {
      model,
      materials,
      imageMapping,
      modelString: 'glm:glm-4.7', // 修正格式：使用冒号而不是斜杠
      apiKey: modelConfig.apiKey,
      baseUrl: modelConfig.baseUrl,
      providerType: modelConfig.providerType,
      requiresApiKey: modelConfig.requiresApiKey,
      visionEnabled: false,
    });

    if (design) {
      console.log('Generated design:', design);
    }
  };

  const handleExport = () => {
    if (generator.design) {
      exporter.exportPPTX(generator.design);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">教学设计生成测试</h1>

      {/* 预设场景选择 */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h2 className="text-lg font-semibold mb-3">快速测试场景（毛概知识库）</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {TEST_SCENARIOS.map((scenario, index) => (
            <button
              key={index}
              onClick={() => setRequest(scenario.request)}
              className="px-4 py-2 bg-white border border-blue-300 rounded hover:bg-blue-100 text-sm text-left"
            >
              {scenario.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          💡 点击上方按钮快速加载预设场景，所有场景默认启用知识库增强
        </p>
      </div>

      {/* 参考资料上传 */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
        <h2 className="text-lg font-semibold mb-3">📎 参考资料上传（三源融合）</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              上传 PDF 或图片（支持 PDF、PNG、JPG、JPEG、WEBP）
            </label>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-green-600 file:text-white
                hover:file:bg-green-700
                disabled:opacity-50"
            />
          </div>

          {/* 已上传资料列表 */}
          {materials.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-2">已上传资料（{materials.length}）：</p>
              <ul className="space-y-2">
                {materials.map((material) => (
                  <li key={material.id} className="flex items-center justify-between bg-white p-2 rounded border">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {material.type === 'pdf' ? '📄' : '🖼️'}
                      </span>
                      <div className="text-sm">
                        <div className="font-medium">{material.name}</div>
                        <div className="text-gray-500 text-xs">
                          {material.type === 'pdf' && `${material.metadata.pageCount || 0}页，`}
                          {material.parsedImages?.length || 0}张图片
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMaterial(material.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {uploading && (
            <div className="text-sm text-gray-600">正在上传和解析文件...</div>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">学科</label>
          <input
            type="text"
            value={request.subject}
            onChange={(e) => setRequest({ ...request, subject: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">课题</label>
          <input
            type="text"
            value={request.topic}
            onChange={(e) => setRequest({ ...request, topic: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">年级</label>
          <input
            type="text"
            value={request.gradeLevel}
            onChange={(e) => setRequest({ ...request, gradeLevel: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">课时（分钟）</label>
          <input
            type="number"
            value={request.duration || ''}
            onChange={(e) => setRequest({ ...request, duration: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={request.useKnowledgeBase || false}
              onChange={(e) => setRequest({ ...request, useKnowledgeBase: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">使用知识库增强（FastGPT）</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            勾选后将从 FastGPT 知识库中检索相关教学内容
          </p>
        </div>

        {/* 教学目标（可选） */}
        <div>
          <label className="block text-sm font-medium mb-2">教学目标（可选）</label>
          <div className="space-y-2 text-sm">
            <div>
              <label className="text-xs text-gray-600">知识目标</label>
              <textarea
                value={request.objectives?.knowledge?.join('\n') || ''}
                onChange={(e) => setRequest({
                  ...request,
                  objectives: {
                    ...request.objectives,
                    knowledge: e.target.value.split('\n').filter(Boolean),
                  },
                })}
                className="w-full px-2 py-1 border rounded text-xs"
                rows={2}
                placeholder="每行一个目标"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">能力目标</label>
              <textarea
                value={request.objectives?.skills?.join('\n') || ''}
                onChange={(e) => setRequest({
                  ...request,
                  objectives: {
                    ...request.objectives,
                    skills: e.target.value.split('\n').filter(Boolean),
                  },
                })}
                className="w-full px-2 py-1 border rounded text-xs"
                rows={2}
                placeholder="每行一个目标"
              />
            </div>
          </div>
        </div>

        {/* 特殊要求 */}
        <div>
          <label className="block text-sm font-medium mb-2">特殊要求（可选）</label>
          <textarea
            value={request.additionalNotes || ''}
            onChange={(e) => setRequest({ ...request, additionalNotes: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
            rows={2}
            placeholder="例如：重点讲解某个知识点，结合具体案例等"
          />
        </div>
      </div>

      <div className="space-x-4 mb-8">
        <button
          onClick={handleGenerate}
          disabled={generator.isGenerating}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {generator.isGenerating ? '生成中...' : '生成教学设计'}
        </button>

        <button
          onClick={handleExport}
          disabled={!generator.design || exporter.exporting}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {exporter.exporting ? '导出中...' : '导出 PPT'}
        </button>
      </div>

      {generator.isGenerating && (
        <div className="mb-8">
          <div className="text-sm text-gray-600 mb-2">{generator.statusMessage}</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${generator.progress}%` }}
            />
          </div>
        </div>
      )}

      {generator.error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          错误：{generator.error}
        </div>
      )}

      {generator.design && (
        <div className="border rounded p-6">
          <h2 className="text-2xl font-bold mb-4">{generator.design.title}</h2>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">教学目标</h3>
            <div className="space-y-2 text-sm">
              {generator.design.objectives.knowledge.length > 0 && (
                <div>
                  <strong>知识与技能：</strong>
                  <ul className="list-disc list-inside ml-4">
                    {generator.design.objectives.knowledge.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
              )}
              {generator.design.objectives.skills.length > 0 && (
                <div>
                  <strong>过程与方法：</strong>
                  <ul className="list-disc list-inside ml-4">
                    {generator.design.objectives.skills.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">课件页面（{generator.design.slides.length} 页）</h3>
            <ul className="space-y-2 text-sm">
              {generator.design.slides.map((slide) => (
                <li key={slide.id} className="border-l-2 border-blue-500 pl-3">
                  <div className="font-medium">{slide.title}</div>
                  <div className="text-gray-600">
                    {slide.canvas ? '✓ 已生成' : '✗ 未生成'}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">教学过程（{generator.design.procedures.length} 个环节）</h3>
            <ul className="space-y-2 text-sm">
              {generator.design.procedures.map((proc) => (
                <li key={proc.id} className="border-l-2 border-green-500 pl-3">
                  <div className="font-medium">{proc.stageName}（{proc.duration} 分钟）</div>
                  <div className="text-gray-600">教师：{proc.teacherActivity}</div>
                  <div className="text-gray-600">学生：{proc.studentActivity}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions

function getFileType(file: File): 'pdf' | 'image' | 'other' {
  if (file.type === 'application/pdf') return 'pdf';
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
    log.error('Failed to parse PDF:', error);
    return null;
  }
}
