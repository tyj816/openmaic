/**
 * Teaching Design Regenerator
 * 
 * Implements partial regeneration capability for TeachingDesign
 * Allows users to modify specific slides without regenerating the entire design
 */

import { nanoid } from 'nanoid';
import type { TeachingDesign, TeachingSlide, KeyPointWithSource, RagChunk } from '@/lib/types/teaching';
import type { AICallFn } from './pipeline-types';
import { parseJsonResponse } from './json-repair';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingRegenerator');

/**
 * Instruction parsing result
 */
interface ParsedInstruction {
  targetType: 'slide' | 'unknown';
  targetIndex?: number; // 0-based index
  targetId?: string;
  modificationRequest: string;
}

/**
 * Regeneration options
 */
export interface RegenerationOptions {
  design: TeachingDesign;
  instruction: string;
  aiCall: AICallFn;
  preserveSource?: boolean; // Whether to preserve source tracking (default: true)
}

/**
 * Parse user instruction to identify target and modification request
 * 
 * Examples:
 * - "第3页" → { targetType: 'slide', targetIndex: 2 }
 * - "第一页改成..." → { targetType: 'slide', targetIndex: 0, modificationRequest: '改成...' }
 * - "修改第5页的内容，增加..." → { targetType: 'slide', targetIndex: 4, modificationRequest: '增加...' }
 */
function parseInstruction(instruction: string, design: TeachingDesign): ParsedInstruction {
  const result: ParsedInstruction = {
    targetType: 'unknown',
    modificationRequest: instruction,
  };

  // Pattern 1: "第X页" or "第X张"
  const pagePattern = /第([0-9一二三四五六七八九十百]+)[页张]/;
  const pageMatch = instruction.match(pagePattern);
  
  if (pageMatch) {
    const pageNumber = parseChineseNumber(pageMatch[1]);
    if (pageNumber > 0 && pageNumber <= design.slides.length) {
      result.targetType = 'slide';
      result.targetIndex = pageNumber - 1; // Convert to 0-based index
      result.targetId = design.slides[pageNumber - 1].id;
      
      // Extract modification request (text after page reference)
      const modificationText = instruction.replace(pagePattern, '').trim();
      if (modificationText) {
        result.modificationRequest = modificationText;
      }
      
      log.info(`Parsed instruction: target slide ${pageNumber} (index ${result.targetIndex})`);
    }
  }

  return result;
}

/**
 * Convert Chinese number to Arabic number
 * Supports: 一二三四五六七八九十 and 1-100
 */
function parseChineseNumber(str: string): number {
  // Try Arabic number first
  const arabicNum = parseInt(str, 10);
  if (!isNaN(arabicNum)) {
    return arabicNum;
  }

  // Chinese number mapping
  const chineseMap: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  };

  // Handle simple cases (一到十)
  if (chineseMap[str]) {
    return chineseMap[str];
  }

  // Handle 十X (11-19)
  if (str.startsWith('十') && str.length === 2) {
    return 10 + (chineseMap[str[1]] || 0);
  }

  // Handle X十 (20, 30, ..., 90)
  if (str.endsWith('十') && str.length === 2) {
    return (chineseMap[str[0]] || 0) * 10;
  }

  // Handle X十Y (21-99)
  if (str.length === 3 && str[1] === '十') {
    return (chineseMap[str[0]] || 0) * 10 + (chineseMap[str[2]] || 0);
  }

  return 0;
}

/**
 * Build regeneration prompt for a specific slide
 */
function buildSlideRegenerationPrompt(
  originalSlide: TeachingSlide,
  modificationRequest: string,
  design: TeachingDesign,
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `你是一位经验丰富的教学设计专家。
你的任务是根据用户的修改要求，重新生成指定的教学课件页面。

输出格式必须是 JSON，包含以下字段：
{
  "title": "页面标题",
  "description": "这一页的教学目的（1-2句）",
  "type": "cover" | "content" | "transition" | "end",
  "keyPoints": [
    {
      "content": "本页要点内容",
      "source": "teacher" | "material" | "knowledge",
      "ragChunkId": "知识库片段ID（仅当source为knowledge时需要）"
    }
  ],
  "narration": "教师讲解词（可选）"
}

重要说明：
1. keyPoints 必须使用对象格式，包含 content 和 source 字段
2. source 字段标记内容来源：
   - "teacher": 来自教师设计的内容
   - "material": 来自参考资料的内容
   - "knowledge": 来自知识库的内容（需要填写 ragChunkId）
3. 如果原内容有 source 和 ragChunkId，尽量保留（除非用户明确要求修改）
4. 新增内容默认标记为 source: "teacher"
5. 保持教学设计的专业性和连贯性`;

  const userPrompt = `## 课程基本信息
课题：${design.title}
学科：${design.subject}
年级：${design.gradeLevel}
课时：${design.duration}分钟

## 原页面内容
标题：${originalSlide.title}
类型：${originalSlide.type || 'content'}
教学目的：${originalSlide.description || '未指定'}

要点内容：
${originalSlide.keyPoints.map((kp, i) => {
  const sourceLabel = kp.source ? ` [来源: ${kp.source}]` : '';
  const ragLabel = kp.ragChunkId ? ` [RAG ID: ${kp.ragChunkId}]` : '';
  return `${i + 1}. ${kp.content}${sourceLabel}${ragLabel}`;
}).join('\n')}

${originalSlide.narration ? `讲解词：\n${originalSlide.narration}` : ''}

## 修改要求
${modificationRequest}

---

请根据以上信息和修改要求，生成新的页面内容JSON。
注意：
1. 保持与整体教学设计的连贯性
2. 如果修改要求不明确，在原内容基础上进行合理调整
3. 保留原有的 source 和 ragChunkId（除非明确需要修改）
4. 新增内容标记为 source: "teacher"`;

  return { systemPrompt, userPrompt };
}

/**
 * Regenerate a specific slide in the teaching design
 */
async function regenerateSlide(
  design: TeachingDesign,
  targetIndex: number,
  modificationRequest: string,
  aiCall: AICallFn,
  preserveSource: boolean = true,
): Promise<TeachingSlide> {
  const originalSlide = design.slides[targetIndex];
  
  log.info(`Regenerating slide ${targetIndex + 1}/${design.slides.length}:`, {
    originalTitle: originalSlide.title,
    keyPointCount: originalSlide.keyPoints.length,
    modificationRequest,
  });

  // Build prompt
  const { systemPrompt, userPrompt } = buildSlideRegenerationPrompt(
    originalSlide,
    modificationRequest,
    design,
  );

  // Call LLM
  const response = await aiCall(systemPrompt, userPrompt);
  const slideData = parseJsonResponse<Partial<TeachingSlide>>(response);

  if (!slideData) {
    throw new Error('Failed to parse regenerated slide response');
  }

  // Normalize keyPoints format
  const normalizedKeyPoints: KeyPointWithSource[] = (slideData.keyPoints || []).map((kp: any) => {
    if (typeof kp === 'string') {
      return { content: kp, source: 'teacher' as const };
    } else if (kp && typeof kp === 'object' && 'content' in kp) {
      return {
        content: kp.content,
        source: kp.source || 'teacher',
        sourceDetail: kp.sourceDetail,
        ragChunkId: kp.ragChunkId,
      };
    } else {
      return { content: String(kp), source: 'teacher' as const };
    }
  });

  // Preserve source tracking if requested
  if (preserveSource && originalSlide.keyPoints.length > 0) {
    log.info('Preserving source tracking from original slide');
    // Try to match keyPoints by content similarity
    normalizedKeyPoints.forEach((newKp) => {
      const matchingOriginal = originalSlide.keyPoints.find(
        (origKp) => origKp.content.includes(newKp.content.substring(0, 20)) ||
                    newKp.content.includes(origKp.content.substring(0, 20))
      );
      if (matchingOriginal && matchingOriginal.source) {
        newKp.source = matchingOriginal.source;
        newKp.ragChunkId = matchingOriginal.ragChunkId;
        newKp.sourceDetail = matchingOriginal.sourceDetail;
      }
    });
  }

  // Build new slide (preserve ID and order)
  const regeneratedSlide: TeachingSlide = {
    id: originalSlide.id, // Keep original ID
    order: originalSlide.order, // Keep original order
    title: slideData.title || originalSlide.title,
    description: slideData.description || originalSlide.description,
    type: slideData.type || originalSlide.type,
    keyPoints: normalizedKeyPoints,
    contentBlocks: originalSlide.contentBlocks, // Preserve content blocks (will be regenerated in Stage 2)
    narration: slideData.narration || originalSlide.narration,
    canvas: originalSlide.canvas, // Preserve canvas (will be regenerated in Stage 2)
    relatedProcedureId: originalSlide.relatedProcedureId,
  };

  log.info(`Slide regenerated successfully:`, {
    newTitle: regeneratedSlide.title,
    newKeyPointCount: regeneratedSlide.keyPoints.length,
    sourcesPreserved: regeneratedSlide.keyPoints.filter(kp => kp.source && kp.source !== 'teacher').length,
  });

  return regeneratedSlide;
}

/**
 * Regenerate teaching design based on user instruction
 * 
 * Main entry point for partial regeneration
 * 
 * @param options - Regeneration options
 * @returns Updated TeachingDesign with modified content
 * 
 * @example
 * ```typescript
 * const updatedDesign = await regenerateTeachingDesign({
 *   design: originalDesign,
 *   instruction: "第3页改成更详细的内容",
 *   aiCall: myAICallFunction,
 * });
 * ```
 */
export async function regenerateTeachingDesign(
  options: RegenerationOptions,
): Promise<TeachingDesign> {
  const { design, instruction, aiCall, preserveSource = true } = options;

  log.info('Starting teaching design regeneration:', {
    designId: design.id,
    slideCount: design.slides.length,
    instruction,
  });

  // Step 1: Parse instruction
  const parsed = parseInstruction(instruction, design);

  if (parsed.targetType === 'unknown' || parsed.targetIndex === undefined) {
    throw new Error(`无法解析修改指令："${instruction}"。请明确指定要修改的页面，例如"第3页"或"第一页"`);
  }

  // Step 2: Validate target
  if (parsed.targetIndex < 0 || parsed.targetIndex >= design.slides.length) {
    throw new Error(`页面索引超出范围：${parsed.targetIndex + 1}（总共${design.slides.length}页）`);
  }

  // Step 3: Regenerate target slide
  const regeneratedSlide = await regenerateSlide(
    design,
    parsed.targetIndex,
    parsed.modificationRequest,
    aiCall,
    preserveSource,
  );

  // Step 4: Build new design (only replace target slide)
  const newSlides = [...design.slides];
  newSlides[parsed.targetIndex] = regeneratedSlide;

  const updatedDesign: TeachingDesign = {
    ...design,
    slides: newSlides,
    updatedAt: new Date(),
    version: design.version + 1,
  };

  log.info('Teaching design regeneration completed:', {
    designId: updatedDesign.id,
    version: updatedDesign.version,
    modifiedSlideIndex: parsed.targetIndex,
    modifiedSlideTitle: regeneratedSlide.title,
  });

  return updatedDesign;
}

/**
 * Batch regenerate multiple slides
 * 
 * @param design - Original teaching design
 * @param instructions - Array of { slideIndex, instruction } pairs
 * @param aiCall - AI call function
 * @param preserveSource - Whether to preserve source tracking
 * @returns Updated TeachingDesign
 */
export async function batchRegenerateSlides(
  design: TeachingDesign,
  instructions: Array<{ slideIndex: number; instruction: string }>,
  aiCall: AICallFn,
  preserveSource: boolean = true,
): Promise<TeachingDesign> {
  log.info(`Batch regenerating ${instructions.length} slides`);

  let currentDesign = design;

  for (const { slideIndex, instruction } of instructions) {
    if (slideIndex < 0 || slideIndex >= currentDesign.slides.length) {
      log.warn(`Skipping invalid slide index: ${slideIndex}`);
      continue;
    }

    const regeneratedSlide = await regenerateSlide(
      currentDesign,
      slideIndex,
      instruction,
      aiCall,
      preserveSource,
    );

    const newSlides = [...currentDesign.slides];
    newSlides[slideIndex] = regeneratedSlide;

    currentDesign = {
      ...currentDesign,
      slides: newSlides,
      updatedAt: new Date(),
      version: currentDesign.version + 1,
    };
  }

  log.info('Batch regeneration completed:', {
    totalSlides: instructions.length,
    finalVersion: currentDesign.version,
  });

  return currentDesign;
}
