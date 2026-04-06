/**
 * Teaching Design Outline Generator
 * 
 * Replaces outline-generator.ts for teaching design generation
 * Generates complete TeachingDesign structure (without canvas details)
 */

import { nanoid } from 'nanoid';
import { MAX_PDF_CONTENT_CHARS, MAX_VISION_IMAGES } from '@/lib/constants/generation';
import type { TeachingRequest, TeachingDesign, ParsedImage } from '@/lib/types/teaching';
import type { ImageMapping } from '@/lib/types/generation';
import { formatImageDescription, formatImagePlaceholder } from './prompt-formatters';
import { parseJsonResponse } from './json-repair';
import type { AICallFn, GenerationResult, GenerationCallbacks } from './pipeline-types';
import { createLogger } from '@/lib/logger';
import { queryFastGPT } from '@/lib/ai/fastgpt-client';

const log = createLogger('TeachingGeneration');

/**
 * Build knowledge base query from teaching request
 */
function buildKnowledgeQueryFromTeachingRequest(request: TeachingRequest): string {
  const parts = [
    '请基于知识库，为以下教学任务提供可直接用于教学设计的知识支持。',
    '',
    `学科：${request.subject}`,
    `课题：${request.topic}`,
    `年级：${request.gradeLevel}`,
    `课时：${request.duration}分钟`,
  ];

  if (request.objectives) {
    parts.push('');
    parts.push('教学目标：');
    if (request.objectives.knowledge && request.objectives.knowledge.length > 0) {
      parts.push(`知识目标：${request.objectives.knowledge.join('；')}`);
    }
    if (request.objectives.skills && request.objectives.skills.length > 0) {
      parts.push(`能力目标：${request.objectives.skills.join('；')}`);
    }
  }

  if (request.additionalNotes) {
    parts.push('');
    parts.push(`特殊要求：${request.additionalNotes}`);
  }

  parts.push('');
  parts.push('请输出：');
  parts.push('1. 本课题核心知识点');
  parts.push('2. 易错点/重难点');
  parts.push('3. 推荐教学思路');
  parts.push('4. 可用于课堂讲解的关键内容');
  parts.push('5. 如适合，请给出简洁的例子或结构化要点');

  return parts.join('\n');
}

/**
 * Generate teaching design from teacher request
 * 
 * This is the new Stage 1: TeachingRequest → TeachingDesign (initial draft)
 * 
 * Output includes:
 * - objectives, keyPoints, difficulties
 * - slides (title + keyPoints only, no canvas yet)
 * - procedures (simplified)
 */
export async function generateTeachingDesignFromRequest(
  request: TeachingRequest,
  pdfText: string | undefined,
  pdfImages: ParsedImage[] | undefined,
  aiCall: AICallFn,
  callbacks?: GenerationCallbacks,
  options?: {
    visionEnabled?: boolean;
    imageMapping?: ImageMapping;
    researchContext?: string;
  },
): Promise<GenerationResult<TeachingDesign>> {
  // Step 1: Query FastGPT knowledge base if enabled
  let ragContext = '';

  if (request.useKnowledgeBase) {
    try {
      log.info('Knowledge base enhancement enabled, querying FastGPT...');
      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 5,
        stageProgress: 10,
        statusMessage: '正在查询知识库...',
        scenesGenerated: 0,
        totalScenes: 0,
      });

      const query = buildKnowledgeQueryFromTeachingRequest(request);
      const result = await queryFastGPT(query, { timeoutMs: 300000 }); // 5分钟
      ragContext = result.answer;

      log.info(`FastGPT query successful, retrieved ${ragContext.length} chars`);
      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 10,
        stageProgress: 20,
        statusMessage: '知识库查询完成',
        scenesGenerated: 0,
        totalScenes: 0,
      });
    } catch (error) {
      // Graceful degradation: log error but continue generation
      log.warn('FastGPT query failed, continuing without knowledge base enhancement:', error);
      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 10,
        stageProgress: 20,
        statusMessage: '知识库查询失败，继续生成...',
        scenesGenerated: 0,
        totalScenes: 0,
      });
      ragContext = '';
    }
  }

  // Build available images description
  let availableImagesText =
    request.language === 'zh-CN' ? '无可用图片' : 'No images available';
  let visionImages: Array<{ id: string; src: string }> | undefined;

  if (pdfImages && pdfImages.length > 0) {
    if (options?.visionEnabled && options?.imageMapping) {
      const allWithSrc = pdfImages.filter((img) => options.imageMapping![img.id]);
      const visionSlice = allWithSrc.slice(0, MAX_VISION_IMAGES);
      const textOnlySlice = allWithSrc.slice(MAX_VISION_IMAGES);
      const noSrcImages = pdfImages.filter((img) => !options.imageMapping![img.id]);

      const visionDescriptions = visionSlice.map((img) =>
        formatImagePlaceholder(img, request.language),
      );
      const textDescriptions = [...textOnlySlice, ...noSrcImages].map((img) =>
        formatImageDescription(img, request.language),
      );
      availableImagesText = [...visionDescriptions, ...textDescriptions].join('\n');

      visionImages = visionSlice.map((img) => ({
        id: img.id,
        src: options.imageMapping![img.id],
        width: img.width,
        height: img.height,
      }));
    } else {
      availableImagesText = pdfImages
        .map((img) => formatImageDescription(img, request.language))
        .join('\n');
    }
  }

  // Build prompt for teaching design generation
  const systemPrompt = `你是一位经验丰富的教学设计专家。
你的任务是根据教师需求和参考资料，生成结构化的教学设计。

输出格式必须是 JSON，包含以下字段：
{
  "title": "课题名称",
  "subject": "学科",
  "gradeLevel": "年级",
  "duration": 课时（分钟）,
  "objectives": {
    "knowledge": ["知识目标1", "知识目标2"],
    "skills": ["能力目标1", "能力目标2"],
    "attitude": ["情感态度目标1"]
  },
  "keyPoints": ["教学重点1", "教学重点2"],
  "difficulties": ["教学难点1", "教学难点2"],
  "slides": [
    {
      "title": "页面标题",
      "description": "这一页的教学目的（1-2句）",
      "type": "cover" | "content" | "transition" | "end",
      "keyPoints": ["本页要点1", "本页要点2"],
      "narration": "教师讲解词（可选）"
    }
  ],
  "procedures": [
    {
      "stageName": "导入新课",
      "duration": 5,
      "teacherActivity": "教师活动描述",
      "studentActivity": "学生活动描述",
      "designIntent": "设计意图（可选）"
    }
  ],
  "homework": ["作业1", "作业2"],
  "boardDesign": "板书设计（文本描述）"
}

注意：
1. slides 数组中只需要提供标题和要点，不需要具体的元素布局
2. procedures 应该包含完整的教学环节（导入、新授、巩固、小结等）
3. 根据课时合理安排内容量
4. 如果有可用图片，在 keyPoints 中标注使用哪些图片（如"使用 img_1 展示..."）`;

  // Prepare RAG context section (truncate to avoid token overflow)
  const safeRagContext = ragContext ? ragContext.slice(0, 2000) : '';
  const ragSection = safeRagContext
    ? `\n## 【知识库参考内容】\n${safeRagContext}\n`
    : '';

  const userPrompt = `# 教学设计任务

## 基本信息
- 学科：${request.subject}
- 课题：${request.topic}
- 年级：${request.gradeLevel}
- 课时：${request.duration} 分钟

## 教学目标
${request.objectives ? formatObjectives(request.objectives) : '（请根据课题自动生成三维目标）'}
${ragSection}
## 参考资料内容
${pdfText ? pdfText.substring(0, MAX_PDF_CONTENT_CHARS) : '无'}

## 可用图片资源
${availableImagesText}

## 特殊要求
${request.additionalNotes || '无'}

---

请基于以上信息，生成完整的教学设计JSON。`;

  try {
    callbacks?.onProgress?.({
      currentStage: 1,
      overallProgress: 20,
      stageProgress: 50,
      statusMessage: '正在生成教学设计...',
      scenesGenerated: 0,
      totalScenes: 0,
    });

    const response = await aiCall(systemPrompt, userPrompt, visionImages);
    const designData = parseJsonResponse<Partial<TeachingDesign>>(response);

    if (!designData || !designData.slides || !Array.isArray(designData.slides)) {
      return {
        success: false,
        error: 'Failed to parse teaching design response',
      };
    }

    // Enrich with IDs and metadata
    const design: TeachingDesign = {
      id: nanoid(),
      title: designData.title || request.topic,
      subject: designData.subject || request.subject,
      gradeLevel: designData.gradeLevel || request.gradeLevel,
      duration: designData.duration || request.duration,
      objectives: designData.objectives || {
        knowledge: [],
        skills: [],
        attitude: [],
      },
      keyPoints: designData.keyPoints || [],
      difficulties: designData.difficulties || [],
      slides: designData.slides.map((slide, index) => ({
        id: nanoid(),
        order: index + 1,
        title: slide.title || `页面 ${index + 1}`,
        description: slide.description,
        type: slide.type,
        keyPoints: slide.keyPoints || [],
        contentBlocks: [], // Will be filled in Stage 2
        narration: slide.narration,
      })),
      procedures: (designData.procedures || []).map((proc, index) => ({
        id: nanoid(),
        order: index + 1,
        stageName: proc.stageName || `环节 ${index + 1}`,
        duration: proc.duration || 5,
        teacherActivity: proc.teacherActivity || '',
        studentActivity: proc.studentActivity || '',
        relatedSlides: [],
        designIntent: proc.designIntent,
      })),
      homework: designData.homework,
      boardDesign: designData.boardDesign,
      remarks: designData.remarks,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    callbacks?.onProgress?.({
      currentStage: 1,
      overallProgress: 50,
      stageProgress: 100,
      statusMessage: `已生成教学设计，包含 ${design.slides.length} 页课件`,
      scenesGenerated: 0,
      totalScenes: design.slides.length,
    });

    log.info(`Generated teaching design: ${design.slides.length} slides, ${design.procedures.length} procedures`);

    return { success: true, data: design };
  } catch (error) {
    log.error('Failed to generate teaching design:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Format objectives for prompt
 */
function formatObjectives(objectives: {
  knowledge?: string[];
  skills?: string[];
  attitude?: string[];
}): string {
  const parts: string[] = [];

  if (objectives.knowledge && objectives.knowledge.length > 0) {
    parts.push(`知识与技能：\n${objectives.knowledge.map((k) => `- ${k}`).join('\n')}`);
  }

  if (objectives.skills && objectives.skills.length > 0) {
    parts.push(`过程与方法：\n${objectives.skills.map((s) => `- ${s}`).join('\n')}`);
  }

  if (objectives.attitude && objectives.attitude.length > 0) {
    parts.push(
      `情感态度与价值观：\n${objectives.attitude.map((a) => `- ${a}`).join('\n')}`,
    );
  }

  return parts.join('\n\n');
}
