/**
 * Teaching Design Outline Generator
 * 
 * Replaces outline-generator.ts for teaching design generation
 * Generates complete TeachingDesign structure (without canvas details)
 */

import { nanoid } from 'nanoid';
import { MAX_PDF_CONTENT_CHARS, MAX_VISION_IMAGES } from '@/lib/constants/generation';
import type { TeachingRequest, TeachingDesign, ParsedImage, ReferenceMaterial, SourceUsageStats, KeyPointWithSource, RagChunk } from '@/lib/types/teaching';
import type { ImageMapping } from '@/lib/types/generation';
import { formatImageDescription, formatImagePlaceholder } from './prompt-formatters';
import { parseJsonResponse } from './json-repair';
import type { AICallFn, GenerationResult, GenerationCallbacks } from './pipeline-types';
import { createLogger } from '@/lib/logger';
import { queryFastGPT } from '@/lib/ai/fastgpt-client';
import { parseTeachingMaterials } from './teaching-material-parser';
import { buildTeachingContextBundle } from './teaching-context-builder';
import { validateTeachingDesign, buildRetryPrompt, type ValidationResult } from './fusion-validator';

const log = createLogger('TeachingGeneration');

/**
 * Build enhanced knowledge base query from teaching request
 * Enhanced version: includes topic + key points + teaching objectives
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

  // Enhanced: Add specific knowledge points from objectives
  if (request.objectives) {
    parts.push('');
    parts.push('教学目标与关键知识点：');
    if (request.objectives.knowledge && request.objectives.knowledge.length > 0) {
      parts.push(`知识目标：${request.objectives.knowledge.join('；')}`);
      // Extract key terms for better RAG matching
      const keyTerms = request.objectives.knowledge
        .flatMap(k => k.match(/[\u4e00-\u9fa5]{2,}/g) || [])
        .filter((term, index, self) => self.indexOf(term) === index)
        .slice(0, 5);
      if (keyTerms.length > 0) {
        parts.push(`核心概念：${keyTerms.join('、')}`);
      }
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
  parts.push('请重点输出：');
  parts.push('1. 本课题的核心知识点（定义、原理、公式等）');
  parts.push('2. 易错点/重难点及其解决方法');
  parts.push('3. 推荐的教学思路和教学方法');
  parts.push('4. 可用于课堂讲解的关键内容和例子');
  parts.push('5. 相关的概念辨析和知识拓展');
  parts.push('');
  parts.push('注意：请提供具体、可操作的教学内容，而非泛泛而谈的建议。');

  return parts.join('\n');
}

/**
 * Generate teaching design from teacher request
 * 
 * This is the new Stage 1: TeachingRequest → TeachingDesign (initial draft)
 * 
 * Now supports three-source fusion:
 * 1. Teacher intent (TeachingRequest)
 * 2. Reference materials (PDF + images)
 * 3. Knowledge base (FastGPT RAG)
 * 
 * Output includes:
 * - objectives, keyPoints, difficulties
 * - slides (title + keyPoints only, no canvas yet)
 * - procedures (simplified)
 */
export async function generateTeachingDesignFromRequest(
  request: TeachingRequest,
  materials: ReferenceMaterial[] | undefined,
  aiCall: AICallFn,
  callbacks?: GenerationCallbacks,
  options?: {
    visionEnabled?: boolean;
    imageMapping?: ImageMapping;
    researchContext?: string;
  },
): Promise<GenerationResult<TeachingDesign>> {
  // Step 1: Parse reference materials
  let parsedMaterials = {
    textContent: '',
    images: [] as ParsedImage[],
    summaries: [] as string[],
  };

  if (materials && materials.length > 0) {
    try {
      log.info(`Parsing ${materials.length} reference materials...`);
      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 2,
        stageProgress: 5,
        statusMessage: '正在解析参考资料...',
        scenesGenerated: 0,
        totalScenes: 0,
      });

      parsedMaterials = await parseTeachingMaterials(materials);

      log.info(`Materials parsed: ${parsedMaterials.textContent.length} chars, ${parsedMaterials.images.length} images`);
      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 5,
        stageProgress: 10,
        statusMessage: `资料解析完成（${parsedMaterials.images.length}张图片）`,
        scenesGenerated: 0,
        totalScenes: 0,
      });
    } catch (error) {
      log.error('Failed to parse materials, continuing without them:', error);
      // Continue without materials (graceful degradation)
    }
  }

  // Step 2: Query FastGPT knowledge base if enabled
  let ragContext = '';
  let ragChunks: RagChunk[] | undefined;

  if (request.useKnowledgeBase) {
    try {
      log.info('Knowledge base enhancement enabled, querying FastGPT...');
      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 5,
        stageProgress: 15,
        statusMessage: '正在查询知识库...',
        scenesGenerated: 0,
        totalScenes: 0,
      });

      const query = buildKnowledgeQueryFromTeachingRequest(request);
      const result = await queryFastGPT(query, { timeoutMs: 300000 }); // 5分钟
      ragContext = result.answer;

      // Extract and structure RAG chunks from quoteList
      if (result.quoteList && result.quoteList.length > 0) {
        log.info(`🔍 [2/4] Processing ${result.quoteList.length} quotes from FastGPT result`);
        
        ragChunks = result.quoteList.map((quote, index) => {
          const content = quote.q || quote.a || '';
          const chunk = {
            id: quote.id,
            content: content,
            sourceName: quote.sourceName,
            chunkIndex: quote.chunkIndex,
          };
          
          // 🔍 DEBUG: Print each chunk extraction
          log.info(`🔍 [2/4] RAG chunk[${index}]:`, {
            id: chunk.id,
            sourceName: chunk.sourceName,
            contentLength: content.length,
            contentPreview: content.substring(0, 150) + '...',
            hasQ: !!quote.q,
            hasA: !!quote.a,
            qLength: quote.q?.length || 0,
            aLength: quote.a?.length || 0,
          });
          
          return chunk;
        });
        
        const totalChunkChars = ragChunks.reduce((sum, c) => sum + c.content.length, 0);
        log.info(`🔍 [2/4] SUMMARY: Extracted ${ragChunks.length} RAG chunks (${totalChunkChars} chars total) for verification`);
        
        // 🔍 DEBUG: Warn if total is 0
        if (totalChunkChars === 0) {
          log.error('🔍 [2/4] ⚠️ CRITICAL: All RAG chunks have 0 content! This will cause empty RAG context.');
          log.error('🔍 [2/4] Quote details:', result.quoteList.map(q => ({
            id: q.id,
            hasQ: !!q.q,
            hasA: !!q.a,
            qLen: q.q?.length || 0,
            aLen: q.a?.length || 0,
          })));
        }
      } else {
        log.warn('🔍 [2/4] No quoteList in FastGPT result, ragChunks will be undefined');
      }

      const effectiveRagContent = ragChunks && ragChunks.length > 0
        ? ragChunks.reduce((sum, c) => sum + c.content.length, 0)
        : ragContext.length;
      log.info(`FastGPT query successful, answer: ${ragContext.length} chars, effective RAG content: ${effectiveRagContent} chars`);
      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 10,
        stageProgress: 25,
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
        stageProgress: 25,
        statusMessage: '知识库查询失败，继续生成...',
        scenesGenerated: 0,
        totalScenes: 0,
      });
      ragContext = '';
      ragChunks = undefined;
    }
  }

  // Step 3: Build three-source context bundle
  const contextBundle = buildTeachingContextBundle(request, parsedMaterials, ragContext, ragChunks);
  
  log.info('Three-source context bundle built:', {
    materialChars: contextBundle.extractedFromMaterials.textContent.length,
    imageCount: contextBundle.extractedFromMaterials.availableImages.length,
    ragChars: contextBundle.retrievedKnowledge.relevantChunks.join('').length,
    mergedChars: contextBundle.mergedContext.length,
  });

  // Step 5: Build available images description for prompt
  const allImages = contextBundle.extractedFromMaterials.availableImages;
  let availableImagesText =
    request.language === 'zh-CN' ? '无可用图片' : 'No images available';
  let visionImages: Array<{ id: string; src: string }> | undefined;

  if (allImages.length > 0) {
    // Convert ParsedImage to PdfImage format (ensure pageNumber is present)
    const pdfImages = allImages.map((img) => ({
      ...img,
      pageNumber: img.pageNumber ?? 0, // Default to 0 if not specified
    }));

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

  // Step 6: Build prompt using merged context with enhanced source tracking
  const systemPrompt = `你是一位经验丰富的一线教师，同时也是PPT教学设计专家。
你的任务不是写教案，而是：👉 生成"适合课堂展示的PPT页面结构"。

-------------------------------------
【核心目标】
每一页都必须像"可以直接上课用的PPT"，而不是说明文或教案。

-------------------------------------
【PPT结构要求（非常重要）】
每一页必须满足：
1. 页面结构清晰：
   - 一个明确标题（简短有力）
   - 3-5个要点（不能更多）

2. 每个要点必须是：
   - 一句话表达（10-24字）
   - 可以直接写在PPT上
   - 可以被老师讲解展开

3. 内容必须：
   - 有具体信息（不能空泛）
   - 有教学意义（不是泛泛总结）
   - 有逻辑顺序（递进 / 并列 / 对比）

-------------------------------------
【禁止行为】
严禁出现：
❌ 大段文字说明
❌ "首先…其次…最后…"教案式语言
❌ 抽象总结（如：培养能力、提升素养）
❌ 空洞句（如：理解课文内容、掌握知识点）

-------------------------------------
【内容强化要求】
每一页至少做到以下之一：
- 给出"具体例子"
- 提供"对比关系"
- 提供"问题引导"
- 提供"步骤拆解"
- 提供"课堂互动点"

👉 不允许只写概括性内容

-------------------------------------
【语言风格】
- 面向${request.gradeLevel}学生
- 口语化、课堂化
- 简短、有节奏
- 让学生"看得懂、听得进"

-------------------------------------
【来源融合（弱约束）】
- 可以使用教师需求、资料、知识库内容
- 优先保证内容质量
- 不要为了标注来源而硬塞内容
- 如果使用了知识库内容，标记 source: "knowledge" 并填写 ragChunkId

-------------------------------------
【输出格式】
必须输出 JSON，包含以下字段：
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
      "title": "PPT页面标题（简短有力，5-10字）",
      "description": "这一页的教学目的（1句话）",
      "type": "cover" | "content" | "transition" | "end",
      "teachingObjective": "本页希望学生学会什么或关注什么",
      "visualIntent": "建议的视觉呈现方式，如图文讲解/对比归纳/步骤拆解/总结回顾",
      "preferredLayout": "建议版式，如hero/two-column/comparison/steps/summary",
      "densityHint": "sparse" | "balanced" | "dense",
      "suggestedImageIds": ["img_1", "img_2"],
      "keyPoints": [
        {
          "content": "PPT要点内容（10-24字，一句话，可直接展示）",
          "source": "teacher" | "material" | "knowledge",
          "ragChunkId": "chunk_xxx"  // 仅当 source 为 knowledge 时需要
        }
      ],
      "narration": "教师讲解词（可选，口语化）"
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

重要说明：
1. **slides[].keyPoints[].content 必须符合 PPT 展示逻辑**：
   - 每个要点 10-24 字
   - 一句话表达
   - 可以直接写在 PPT 上
   - 不能是教案式说明文字
2. **每页 3-5 个要点，不能更多**
3. **内容必须具体、有教学意义**，禁止空洞抽象
4. source 字段标记内容来源：
   - "teacher": 来自教师需求和教学目标
   - "material": 来自参考资料的内容、术语、概念
   - "knowledge": 来自知识库的专业知识（必须填写 ragChunkId）
5. 如果有可用图片，在 suggestedImageIds 中标注最适合该页的 0-2 张
6. procedures 应该包含完整的教学环节（导入、新授、巩固、小结等）
7. 根据课时合理安排内容量

【示例对比】

❌ 错误示例（教案式、空洞）：
{
  "title": "课文分析",
  "keyPoints": [
    {"content": "首先，我们要理解课文的主要内容和中心思想，把握文章的整体结构"},
    {"content": "其次，要掌握文章的写作手法和表达技巧，学习作者的表达方式"},
    {"content": "最后，要培养学生的阅读理解能力和审美情趣，提升语文素养"}
  ]
}

✅ 正确示例（PPT式、具体）：
{
  "title": "荷塘月色",
  "keyPoints": [
    {"content": "月光下的荷塘：静谧、朦胧、如梦似幻", "source": "material"},
    {"content": "作者心境：不宁静 → 暂时宁静 → 回到现实", "source": "teacher"},
    {"content": "写作手法：通感（"光与影有着和谐的旋律"）", "source": "knowledge", "ragChunkId": "chunk_123"}
  ]
}`;

  // Use merged context from three-source bundle
  const userPrompt = `${contextBundle.mergedContext}

## 可用图片资源
${availableImagesText}

---

请基于以上三源融合信息，生成完整的教学设计JSON。
特别注意：
1. 每个 keyPoint 必须包含 content 和 source 字段
2. 当 source 为 "knowledge" 时，必须在内容中标注"（来自知识库片段X）"，并填写 ragChunkId 字段
3. ragChunkId 必须是上文提供的知识库片段的真实ID
4. 根据教学需要灵活使用三种来源，不强制要求固定比例
5. 确保教学内容的质量和完整性，来源标记真实可验证
6. **必须直接输出纯 JSON，不要使用 markdown 代码块，不要添加任何解释性文字**

---

【重要补充要求】

请特别注意：

1. 每一页内容必须“像PPT”，而不是教案：
   - 控制要点数量（3-5条）
   - 每条必须是简洁表达

2. 每页至少包含一个：
   - 具体例子 / 情境
   - 或课堂提问
   - 或对比关系

3. 不要生成空泛内容，例如：
   - 理解内容
   - 掌握知识
   - 提高能力

4. 优先生成：
   👉 老师可以直接照着讲的内容
   👉 学生一看就能理解的表达
`;

  // Step 7: Generate with validation and retry mechanism
  const MAX_RETRIES = 1;
  let currentAttempt = 0;
  let validationResult: ValidationResult | null = null;
  let design: TeachingDesign | null = null;

  try {
    while (currentAttempt <= MAX_RETRIES) {
      currentAttempt++;
      
      const attemptMessage = currentAttempt === 1 
        ? '正在生成教学设计...' 
        : `正在重新生成教学设计（第 ${currentAttempt} 次尝试）...`;

      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 20 + (currentAttempt - 1) * 10,
        stageProgress: 50,
        statusMessage: attemptMessage,
        scenesGenerated: 0,
        totalScenes: 0,
      });

      log.info(`Generation attempt ${currentAttempt}/${MAX_RETRIES + 1}`);

      // Build prompt (add retry instructions if not first attempt)
      let finalUserPrompt = userPrompt;
      if (currentAttempt > 1 && validationResult && !validationResult.isValid) {
        const retryInstructions = buildRetryPrompt(validationResult.issues, currentAttempt - 1);
        finalUserPrompt = `${userPrompt}\n\n${retryInstructions}`;
        log.info('Added retry instructions to prompt');
      }

      const response = await aiCall(systemPrompt, finalUserPrompt, visionImages);
      
      // 🔍 DEBUG: Print the complete prompt sent to LLM
      log.info('🔍 [4/4] Complete prompt sent to PPT generation model:');
      log.info('🔍 [4/4] ===== SYSTEM PROMPT =====');
      log.info(systemPrompt);
      log.info('🔍 [4/4] ===== USER PROMPT (first 2000 chars) =====');
      log.info(finalUserPrompt.substring(0, 2000));
      log.info('🔍 [4/4] ===== USER PROMPT (last 1000 chars) =====');
      log.info(finalUserPrompt.substring(Math.max(0, finalUserPrompt.length - 1000)));
      log.info('🔍 [4/4] ===== PROMPT STATS =====', {
        systemPromptLength: systemPrompt.length,
        userPromptLength: finalUserPrompt.length,
        totalPromptLength: systemPrompt.length + finalUserPrompt.length,
        hasVisionImages: !!visionImages && visionImages.length > 0,
        visionImageCount: visionImages?.length || 0,
      });
      
      const designData = parseJsonResponse<Partial<TeachingDesign>>(response);

      if (!designData || !designData.slides || !Array.isArray(designData.slides)) {
        return {
          success: false,
          error: 'Failed to parse teaching design response',
        };
      }

      // Enrich with IDs and metadata
      design = {
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
        teachingObjective: slide.teachingObjective,
        visualIntent: slide.visualIntent,
        preferredLayout: slide.preferredLayout,
        densityHint: slide.densityHint,
        suggestedImageIds: Array.isArray(slide.suggestedImageIds)
          ? slide.suggestedImageIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 2)
          : undefined,
        // Normalize keyPoints: support both string[] (old format) and KeyPointWithSource[] (new format)
        keyPoints: (slide.keyPoints || []).map((kp: any) => {
          if (typeof kp === 'string') {
            // Old format: convert string to KeyPointWithSource
            return { content: kp, source: undefined };
          } else if (kp && typeof kp === 'object' && 'content' in kp) {
            // New format: already KeyPointWithSource
            return kp;
          } else {
            // Invalid format: convert to string
            return { content: String(kp), source: undefined };
          }
        }),
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

      // Validate the generated design
      validationResult = validateTeachingDesign(design, ragChunks, parsedMaterials.textContent.length > 0);

      log.info(`Attempt ${currentAttempt} validation result:`, {
        isValid: validationResult.isValid,
        issueCount: validationResult.issues.length,
        warningCount: validationResult.warnings.length,
        stats: validationResult.stats,
        ragAlignment: validationResult.ragAlignment,
      });

      // Log detailed statistics
      const materialPercentage = validationResult.stats.totalItems > 0
        ? ((validationResult.stats.materialUsage / validationResult.stats.totalItems) * 100).toFixed(1)
        : '0.0';
      const ragPercentage = validationResult.stats.totalItems > 0
        ? ((validationResult.stats.ragUsage / validationResult.stats.totalItems) * 100).toFixed(1)
        : '0.0';
      const teacherPercentage = validationResult.stats.totalItems > 0
        ? ((validationResult.stats.teacherUsage / validationResult.stats.totalItems) * 100).toFixed(1)
        : '0.0';

      log.info(`Attempt ${currentAttempt} - Three-source fusion statistics:`, {
        materialUsage: `${validationResult.stats.materialUsage}/${validationResult.stats.totalItems} (${materialPercentage}%)`,
        ragUsage: `${validationResult.stats.ragUsage}/${validationResult.stats.totalItems} (${ragPercentage}%)`,
        teacherUsage: `${validationResult.stats.teacherUsage}/${validationResult.stats.totalItems} (${teacherPercentage}%)`,
        ragAlignment: validationResult.ragAlignment ? {
          successCount: validationResult.ragAlignment.successCount,
          failureCount: validationResult.ragAlignment.failureCount,
          alignmentRate: `${validationResult.ragAlignment.alignmentRate.toFixed(1)}%`,
        } : 'N/A',
      });

      // Log warnings separately (informational only)
      if (validationResult.warnings.length > 0) {
        log.info(`Attempt ${currentAttempt} - Non-critical warnings:`, validationResult.warnings);
      }

      // If validation passed (no critical issues), break the loop
      if (validationResult.isValid) {
        log.info(`✅ Validation passed on attempt ${currentAttempt} (${validationResult.warnings.length} warnings)`);
        break;
      }

      // If validation failed (critical issues) and we have retries left, continue
      if (currentAttempt <= MAX_RETRIES) {
        log.warn(`❌ Validation failed on attempt ${currentAttempt} (critical issues found), retrying...`, {
          issues: validationResult.issues,
        });
        callbacks?.onProgress?.({
          currentStage: 1,
          overallProgress: 20 + currentAttempt * 10,
          stageProgress: 75,
          statusMessage: `发现关键问题，准备重试...`,
          scenesGenerated: 0,
          totalScenes: 0,
        });
      } else {
        log.error(`❌ Validation failed after ${MAX_RETRIES + 1} attempts, using last result`);
      }
    }

    // Final result (either validated or last attempt)
    if (!design) {
      return {
        success: false,
        error: 'Failed to generate teaching design',
      };
    }

    callbacks?.onProgress?.({
      currentStage: 1,
      overallProgress: 50,
      stageProgress: 100,
      statusMessage: `已生成教学设计，包含 ${design.slides.length} 页课件`,
      scenesGenerated: 0,
      totalScenes: design.slides.length,
    });

    log.info(`Generated teaching design: ${design.slides.length} slides, ${design.procedures.length} procedures`);
    log.info('Three-source fusion applied:', {
      hasMaterials: parsedMaterials.textContent.length > 0,
      hasImages: parsedMaterials.images.length > 0,
      hasRAG: ragContext.length > 0,
    });

    // Log final validation status
    if (validationResult) {
      log.info('Final validation status:', {
        isValid: validationResult.isValid,
        attempts: currentAttempt,
        finalStats: validationResult.stats,
        criticalIssues: validationResult.issues.length,
        warnings: validationResult.warnings.length,
      });
    }

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
