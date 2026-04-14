"use client";

import { useMemo, useState } from "react";
import { TeachingDesignTopbar } from "@/components/teaching-design/TeachingDesignTopbar";
import { IntentConversationPanel } from "@/components/teaching-design/intent/IntentConversationPanel";
import { IntentStatusPanel } from "@/components/teaching-design/intent/IntentStatusPanel";
import type { IntentMessage, ProjectSummary, UploadedFile } from "@/lib/types/teaching-design-ui";
import type { ReferenceMaterial, TeachingDesign } from "@/lib/types/teaching";
import type { ImageMapping } from "@/lib/types/generation";
import { mapIntentToTeachingRequest } from "@/lib/mappers/intent-to-teaching-request";
import { extractIntentSlotsFromMessages } from "@/lib/mappers/intent-message-to-slots";
import { saveTeachingDesignDraft, saveTeachingDesignMaterials } from "@/lib/utils/teaching-design-session";
import { getCurrentModelConfig } from "@/lib/utils/model-config";

interface TeachingSessionState {
  topic?: string;
  subject?: string;
  gradeLevel?: string;
  duration?: number;
  objectives?: string[];
  additionalNotes?: string;
  useKnowledgeBase?: boolean;
  hasMaterials?: boolean;
  ready: boolean;
}

interface TeachingChatApiResult {
  success: boolean;
  reply?: string;
  ready?: boolean;
  teachingRequest?: unknown;
  session?: TeachingSessionState;
  error?: string;
}

const INITIAL_MESSAGES: IntentMessage[] = [
  {
    id: "ai-welcome",
    role: "ai",
    title: "AI 教学设计助手",
    content: "你好，我先帮你梳理这节课的教学意图。你最希望学生通过这节课学会什么？也可以直接告诉我课题、学科、年级和课时。",
    meta: "开始理解",
  },
];

function formatDuration(duration?: number) {
  return duration ? `${duration} 分钟` : "待补充";
}

function buildSessionFromSlots(messages: IntentMessage[], hasMaterials: boolean): TeachingSessionState {
  const { slots, missingSlots } = extractIntentSlotsFromMessages(messages);

  return {
    ...slots,
    hasMaterials,
    ready: missingSlots.length === 0,
  };
}

function buildProjectSummary(session: TeachingSessionState): ProjectSummary {
  return {
    subject: session.subject || "待补充",
    grade: session.gradeLevel || "待补充",
    topic: session.topic || "待补充课题",
    duration: formatDuration(session.duration),
  };
}

function buildGuidancePrompts(session: TeachingSessionState, hasMaterials: boolean): string[] {
  const prompts: string[] = [];

  if (!session.topic) prompts.push("补充这节课的课题或主题");
  if (!session.subject) prompts.push("说明学科，例如语文/数学");
  if (!session.gradeLevel) prompts.push("说明授课年级");
  if (!session.duration) prompts.push("告诉我课时或分钟数");
  if (!hasMaterials) prompts.push("如有教材、讲义或 Word 教案，可上传 PDF / DOCX");
  if (prompts.length === 0) prompts.push("可继续补充教学目标、互动方式或资料偏好");

  return prompts.slice(0, 4);
}

function getSessionCompletion(session: TeachingSessionState) {
  const requiredFields = [session.topic, session.subject, session.gradeLevel, session.duration];
  const completedCount = requiredFields.filter(Boolean).length;
  return Math.round((completedCount / requiredFields.length) * 100);
}

function buildImageMapping(materials: ReferenceMaterial[]): ImageMapping {
  const imageMapping: ImageMapping = {};

  for (const material of materials) {
    for (const image of material.parsedImages || []) {
      imageMapping[image.id] = image.src;
    }
  }

  return imageMapping;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function toChatMessages(messages: IntentMessage[]) {
  return messages.map((message) => ({
    role: message.role === "teacher" ? "user" : "assistant",
    content: message.content,
  }));
}

export default function TeachingDesignIntentPage() {
  const [messages, setMessages] = useState<IntentMessage[]>(INITIAL_MESSAGES);
  const [materials, setMaterials] = useState<ReferenceMaterial[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<TeachingSessionState>(() =>
    buildSessionFromSlots(INITIAL_MESSAGES, false),
  );

  const projectSummary = useMemo(() => buildProjectSummary(session), [session]);
  const guidancePrompts = useMemo(
    () => buildGuidancePrompts(session, uploadedFiles.length > 0),
    [session, uploadedFiles.length],
  );
  const completion = useMemo(() => getSessionCompletion(session), [session]);

  const teacherMessages = useMemo(
    () => messages.filter((message) => message.role === "teacher"),
    [messages],
  );

  const handleSendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || isThinking) return;

    const teacherMessage: IntentMessage = {
      id: `teacher-${Date.now()}`,
      role: "teacher",
      title: "教师",
      content: trimmed,
      meta: "教师输入",
    };

    const nextMessages = [...messages, teacherMessage];
    const nextSession = buildSessionFromSlots(nextMessages, uploadedFiles.length > 0);
    setMessages(nextMessages);
    setSession(nextSession);
    setInputValue("");
    setError(null);
    setIsThinking(true);

    try {
      const response = await fetch("/api/teaching-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: toChatMessages(nextMessages),
        }),
      });

      const json = (await response.json()) as TeachingChatApiResult;
      if (!response.ok || !json.success || !json.reply) {
        throw new Error(json.error || "意图理解对话失败");
      }

      const updatedMessages = [
        ...nextMessages,
        {
          id: `ai-${Date.now()}`,
          role: "ai" as const,
          title: "AI 教学设计助手",
          content: json.reply || "",
          meta: json.ready ? "可开始生成" : "继续理解",
        },
      ];

      setMessages(updatedMessages);
      setSession((prev) => {
        const fallbackSession = buildSessionFromSlots(updatedMessages, materials.length > 0);
        return {
          ...fallbackSession,
          ...(json.session || {}),
          hasMaterials: materials.length > 0,
          ready: Boolean(json.ready || fallbackSession.ready || json.session?.ready),
          subject: json.session?.subject || fallbackSession.subject || prev.subject,
          topic: json.session?.topic || fallbackSession.topic || prev.topic,
          gradeLevel: json.session?.gradeLevel || fallbackSession.gradeLevel || prev.gradeLevel,
          duration: json.session?.duration || fallbackSession.duration || prev.duration,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "意图理解对话失败");
    } finally {
      setIsThinking(false);
    }
  };

  const handleUploadPdf = async (file: File) => {
    setUploading(true);
    setError(null);

    const tempId = `upload-${Date.now()}`;
    const extension = file.name.split(".").pop()?.toLowerCase();
    const isDocx = extension === "docx" || extension === "doc";
    const fileTypeLabel = isDocx ? "DOCX" : "PDF";
    setUploadedFiles((prev) => [
      ...prev,
      {
        id: tempId,
        name: file.name,
        type: fileTypeLabel,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        status: "解析中",
      },
    ]);

    try {
      const formData = new FormData();
      const endpoint = isDocx ? "/api/parse-docx" : "/api/parse-pdf";
      formData.append(isDocx ? "docx" : "pdf", file);
      if (!isDocx) {
        formData.append("providerId", "unpdf");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const json = await response.json();
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || `${fileTypeLabel} 解析失败`);
      }

      const parsed = json.data;
      const parsedImages = (isDocx ? parsed.images || [] : parsed.metadata?.pdfImages || []).map(
        (img: {
          id: string;
          src: string;
          pageNumber?: number;
          description?: string;
          width?: number;
          height?: number;
        }) => ({
          id: img.id,
          src: img.src,
          pageNumber: img.pageNumber,
          description: img.description,
          width: img.width,
          height: img.height,
        }),
      );

      const material: ReferenceMaterial = {
        id: tempId,
        type: isDocx ? "docx" : "pdf",
        name: file.name,
        parsedText: parsed.text,
        parsedImages,
        metadata: {
          uploadedAt: new Date(),
          size: file.size,
          ...(isDocx
            ? {
                summary: `已解析 Word 文档 · ${parsed.metadata?.imageCount || 0} 张图片`,
              }
            : {
                pageCount: parsed.metadata?.pageCount,
                summary: `已解析 ${parsed.metadata?.pageCount || 0} 页 PDF`,
              }),
        },
      };

      setMaterials((prev) => [...prev, material]);
      setSession((prev) => ({
        ...buildSessionFromSlots(messages, true),
        ...prev,
        hasMaterials: true,
      }));
      setUploadedFiles((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                status: "已解析",
              }
            : item,
        ),
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-upload-${Date.now()}`,
          role: "ai",
          title: "AI 教学设计助手",
          content: `已解析资料《${file.name}》，后续会作为参考资料参与教学设计生成。`,
          meta: "资料解析完成",
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : `${fileTypeLabel} 解析失败`;
      setUploadedFiles((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                status: "解析失败",
              }
            : item,
        ),
      );
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    setError(null);

    const tempId = `upload-${Date.now()}`;
    setUploadedFiles((prev) => [
      ...prev,
      {
        id: tempId,
        name: file.name,
        type: "IMAGE",
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        status: "解析中",
      },
    ]);

    try {
      const imageData = await readFileAsDataURL(file);
      const material: ReferenceMaterial = {
        id: tempId,
        type: "image",
        name: file.name,
        parsedImages: [
          {
            id: `img_${Date.now()}`,
            src: imageData,
            description: `上传的参考图片：${file.name}`,
          },
        ],
        metadata: {
          uploadedAt: new Date(),
          size: file.size,
          summary: "已导入参考图片",
        },
      };

      setMaterials((prev) => [...prev, material]);
      setSession((prev) => ({
        ...buildSessionFromSlots(messages, true),
        ...prev,
        hasMaterials: true,
      }));
      setUploadedFiles((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                status: "已解析",
              }
            : item,
        ),
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-image-${Date.now()}`,
          role: "ai",
          title: "AI 教学设计助手",
          content: `已导入图片《${file.name}》，后续会作为参考图片参与 PPT 图文页生成。`,
          meta: "图片导入完成",
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "图片导入失败";
      setUploadedFiles((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                status: "解析失败",
              }
            : item,
        ),
      );
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus("正在整理教学需求...");
    setError(null);

    try {
      const teachingRequest = mapIntentToTeachingRequest({
        projectSummary,
        messages,
        materials,
        language: "zh-CN",
      });

      const modelConfig = getCurrentModelConfig();
      const imageMapping = buildImageMapping(materials);
      setGenerationProgress(12);
      setGenerationStatus("正在生成教学大纲...");
      const outlineResponse = await fetch("/api/generate/teaching-outline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request: teachingRequest,
          materials,
          imageMapping,
          modelString: modelConfig.modelString,
          apiKey: modelConfig.apiKey,
          baseUrl: modelConfig.baseUrl,
          providerType: modelConfig.providerType,
          requiresApiKey: modelConfig.requiresApiKey,
          visionEnabled: false,
        }),
      });

      const outlineJson = await outlineResponse.json();
      if (!outlineResponse.ok || !outlineJson.design) {
        throw new Error(outlineJson.error || "教学设计生成失败");
      }

      const design = outlineJson.design as TeachingDesign;
      const assignedImages = materials.flatMap((material) => material.parsedImages || []);

      setGenerationProgress(42);
      setGenerationStatus(`教学大纲已完成，准备生成 ${design.slides.length} 页 PPT...`);

      const canvases: Array<TeachingDesign["slides"][number]["canvas"]> = [];
      for (let index = 0; index < design.slides.length; index += 1) {
        const slide = design.slides[index];
        const progress = 42 + Math.floor(((index + 1) / design.slides.length) * 52);
        setGenerationProgress(progress);
        setGenerationStatus(`正在生成第 ${index + 1}/${design.slides.length} 页 PPT：${slide.title}`);

        const slideResponse = await fetch("/api/generate/teaching-slide", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slide,
            assignedImages,
            imageMapping,
            visionEnabled: false,
            language: teachingRequest.language,
            modelString: modelConfig.modelString,
            apiKey: modelConfig.apiKey,
            baseUrl: modelConfig.baseUrl,
            providerType: modelConfig.providerType,
            requiresApiKey: modelConfig.requiresApiKey,
          }),
        });

        if (!slideResponse.ok) {
          const slideJson = await slideResponse.json().catch(() => null);
          throw new Error(slideJson?.error || `第 ${index + 1} 页课件生成失败`);
        }

        const slideJson = await slideResponse.json();
        canvases.push(slideJson.canvas);
      }

      design.slides.forEach((slide, index) => {
        slide.canvas = canvases[index];
      });

      setGenerationProgress(98);
      setGenerationStatus("正在保存教学设计并进入工作台...");
      saveTeachingDesignDraft(design);
      saveTeachingDesignMaterials({ materials, imageMapping });
      window.location.href = "/teaching-design/workspace";
    } catch (err) {
      setError(err instanceof Error ? err.message : "教学设计生成失败");
      setGenerationProgress(0);
      setGenerationStatus("");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f5f7fb_45%,#eef2f7_100%)] text-slate-900">
      <TeachingDesignTopbar stage="intent" />

      <div className="mx-auto max-w-[1440px] px-5 py-3 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
          <IntentConversationPanel
            projectSummary={projectSummary}
            guidancePrompts={guidancePrompts}
            messages={messages}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSendMessage={handleSendMessage}
            onGenerate={handleGenerate}
            onUploadPdf={handleUploadPdf}
            onUploadDocx={handleUploadPdf}
            onUploadImage={handleUploadImage}
            uploadedFiles={uploadedFiles}
            isUploading={uploading}
            isThinking={isThinking}
            isGenerating={isGenerating}
            generationStatus={generationStatus}
            error={error}
            canGenerate={completion === 100}
          />

          <IntentStatusPanel
            teacherMessageCount={teacherMessages.length}
            uploadedFileCount={uploadedFiles.length}
            isUploading={uploading}
            isThinking={isThinking}
            isGenerating={isGenerating}
            generationStatus={generationStatus}
            generationProgress={generationProgress}
            error={error}
            completion={completion}
            session={session}
          />
        </div>
      </div>
    </div>
  );
}
