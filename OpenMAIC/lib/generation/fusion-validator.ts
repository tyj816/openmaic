/**
 * Three-Source Fusion Validator
 * 
 * Validates teaching design to ensure it meets three-source fusion requirements:
 * - Material usage >= 25%
 * - Knowledge base usage >= 25%
 * - At least 2 sources used
 * - All keyPoints have source field
 * - Knowledge source must have verifiable ragChunkId or chunk reference
 */

import type { TeachingDesign, SourceUsageStats, KeyPointWithSource, RagChunk } from '@/lib/types/teaching';
import { createLogger } from '@/lib/logger';

const log = createLogger('FusionValidator');

/**
 * Extract 3-5 keywords from a text chunk
 * Simple keyword extraction based on:
 * - Length (prefer longer words)
 * - Frequency (if multiple chunks)
 * - Remove common stop words
 */
function extractKeywords(text: string, count: number = 5): string[] {
  // Common Chinese stop words
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
    '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
    '自己', '这', '那', '里', '就是', '可以', '这个', '能', '他', '她', '它',
  ]);

  // Split into words (Chinese characters + English words)
  const words = text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
  
  // Filter and score words
  const wordScores = new Map<string, number>();
  words.forEach(word => {
    // Skip stop words and short words
    if (stopWords.has(word) || word.length < 2) {
      return;
    }
    
    // Score based on length (prefer 2-6 character words)
    const lengthScore = word.length >= 2 && word.length <= 6 ? word.length : 1;
    const currentScore = wordScores.get(word) || 0;
    wordScores.set(word, currentScore + lengthScore);
  });

  // Sort by score and take top N
  const sortedWords = Array.from(wordScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);

  return sortedWords;
}

/**
 * Normalize text for better matching
 * - Convert to lowercase
 * - Normalize Unicode characters (full-width to half-width, etc.)
 * - Remove extra whitespace
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Normalize Unicode (NFC form)
    .normalize('NFC')
    // Convert full-width characters to half-width
    .replace(/[\uff01-\uff5e]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate if a keyPoint's content aligns with RAG chunks
 * Uses multiple matching strategies for better accuracy
 * 
 * @param keyPoint - The key point to validate
 * @param ragChunks - Available RAG chunks
 * @returns true if content matches any chunk
 */
function validateRagAlignment(
  keyPoint: KeyPointWithSource,
  ragChunks: RagChunk[]
): boolean {
  if (!ragChunks || ragChunks.length === 0) {
    // No chunks available, cannot validate
    return false;
  }

  const content = normalizeText(keyPoint.content);

  // Strategy 1: Direct substring matching (most reliable)
  // Extract key phrases (2-6 characters) from content
  const contentPhrases = content.match(/[\u4e00-\u9fa5]{2,6}|[a-z]{3,}/gi) || [];
  
  for (const chunk of ragChunks) {
    const chunkNormalized = normalizeText(chunk.content);
    
    // Check if any significant phrase from content appears in chunk
    let matchCount = 0;
    for (const phrase of contentPhrases) {
      const phraseNormalized = normalizeText(phrase);
      if (phraseNormalized.length >= 2 && chunkNormalized.includes(phraseNormalized)) {
        matchCount++;
      }
    }
    
    // If at least 30% of phrases match, consider it aligned
    const matchRate = contentPhrases.length > 0 ? matchCount / contentPhrases.length : 0;
    if (matchRate >= 0.3) {
      return true;
    }
  }

  // Strategy 2: Keyword-based matching (fallback)
  for (const chunk of ragChunks) {
    const keywords = extractKeywords(chunk.content, 8); // Extract more keywords
    
    // Check if content contains any of the chunk's keywords (normalized)
    const matchCount = keywords.filter(keyword => {
      const keywordNormalized = normalizeText(keyword);
      return content.includes(keywordNormalized);
    }).length;

    // Consider aligned if at least 2 keywords match OR match rate > 25%
    const matchRate = keywords.length > 0 ? matchCount / keywords.length : 0;
    if (matchCount >= 2 || matchRate >= 0.25) {
      return true;
    }
  }

  return false;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[]; // Critical issues that should trigger retry
  warnings: string[]; // Non-critical warnings (logged but don't trigger retry)
  stats: SourceUsageStats;
  ragAlignment?: {
    successCount: number;
    failureCount: number;
    alignmentRate: number;
  };
}

/**
 * Validate teaching design against three-source fusion requirements
 * Enhanced with RAG source verification and adaptive constraints
 * 
 * Validation now distinguishes between:
 * - Critical issues: Trigger retry (e.g., missing source fields, unverified knowledge claims)
 * - Warnings: Logged but don't trigger retry (e.g., low usage percentages)
 */
export function validateTeachingDesign(
  design: TeachingDesign,
  ragChunks?: RagChunk[],
  hasMaterials: boolean = false // NEW: indicate if materials were provided
): ValidationResult {
  const issues: string[] = []; // Critical issues
  const warnings: string[] = []; // Non-critical warnings
  const stats = calculateSourceUsageStats(design);

  log.info('Validating teaching design:', {
    slideCount: design.slides.length,
    totalKeyPoints: stats.totalItems,
    materialUsage: stats.materialUsage,
    ragUsage: stats.ragUsage,
    teacherUsage: stats.teacherUsage,
    hasMaterials,
  });

  // Rule 1: Check if all keyPoints have source field (CRITICAL)
  let missingSourceCount = 0;
  design.slides.forEach((slide, slideIndex) => {
    slide.keyPoints.forEach((kp, kpIndex) => {
      const keyPoint = kp as KeyPointWithSource;
      if (!keyPoint.source) {
        missingSourceCount++;
        log.warn(`Slide ${slideIndex + 1}, KeyPoint ${kpIndex + 1} missing source field:`, keyPoint.content);
      }
    });
  });

  if (missingSourceCount > 0) {
    issues.push(`有 ${missingSourceCount} 个知识点缺少 source 字段标记`);
  }

  // Rule 2: Enhanced - Check if knowledge source has verifiable chunk reference AND content alignment
  // Split into CRITICAL (unverified) and WARNING (misaligned)
  let unverifiedKnowledgeCount = 0;
  let ragAlignmentSuccessCount = 0;
  let ragAlignmentFailureCount = 0;
  const availableChunkIds = new Set(ragChunks?.map(c => c.id) || []);
  
  design.slides.forEach((slide, slideIndex) => {
    slide.keyPoints.forEach((kp, kpIndex) => {
      const keyPoint = kp as KeyPointWithSource;
      if (keyPoint.source === 'knowledge') {
        // Check if content mentions chunk reference or has ragChunkId
        const hasChunkReference = /知识库片段\d+/.test(keyPoint.content);
        const hasValidChunkId = keyPoint.ragChunkId && availableChunkIds.has(keyPoint.ragChunkId);
        
        if (!hasChunkReference && !hasValidChunkId) {
          unverifiedKnowledgeCount++;
          log.warn(
            `Slide ${slideIndex + 1}, KeyPoint ${kpIndex + 1} marked as knowledge but lacks verification:`,
            {
              content: keyPoint.content.substring(0, 50),
              hasChunkReference,
              hasValidChunkId,
              ragChunkId: keyPoint.ragChunkId,
            }
          );
        }

        // NEW: Validate RAG content alignment (WARNING only, not critical)
        if (ragChunks && ragChunks.length > 0) {
          const isAligned = validateRagAlignment(keyPoint, ragChunks);
          if (isAligned) {
            ragAlignmentSuccessCount++;
          } else {
            ragAlignmentFailureCount++;
            log.warn(
              `Slide ${slideIndex + 1}, KeyPoint ${kpIndex + 1} marked as knowledge but content doesn't align with RAG chunks:`,
              {
                content: keyPoint.content.substring(0, 80),
                ragChunkId: keyPoint.ragChunkId,
              }
            );
          }
        }
      }
    });
  });

  // CRITICAL: Unverified knowledge claims (no chunk reference or ID)
  if (unverifiedKnowledgeCount > 0) {
    issues.push(
      `有 ${unverifiedKnowledgeCount} 个标记为 knowledge 的知识点缺少可验证的来源（必须包含"知识库片段X"或有效的 ragChunkId）`
    );
  }

  // WARNING: RAG alignment issues (content doesn't match chunks well)
  if (ragAlignmentFailureCount > 0) {
    warnings.push(
      `有 ${ragAlignmentFailureCount} 个标记为 knowledge 的知识点内容与知识库片段匹配度较低（可能是泛化描述或改写）`
    );
  }

  // Rule 3: Check if at least 2 sources are used (WARNING only - soft constraint)
  const availableSources = [
    hasMaterials, // materials available
    ragChunks && ragChunks.length > 0, // knowledge base available
    true, // teacher intent always available
  ].filter(Boolean).length;

  const sourcesUsed = [
    stats.materialUsage > 0,
    stats.ragUsage > 0,
    stats.teacherUsage > 0,
  ].filter(Boolean).length;

  const minSourcesRequired = Math.min(2, availableSources);
  if (sourcesUsed < minSourcesRequired) {
    warnings.push(`仅使用了 ${sourcesUsed} 种来源，建议至少使用 ${minSourcesRequired} 种来源以丰富教学内容`);
  }

  // Rule 4: Check material usage (WARNING only - soft suggestion, not hard requirement)
  if (hasMaterials) {
    const materialPercentage = stats.totalItems > 0 
      ? (stats.materialUsage / stats.totalItems) * 100 
      : 0;

    if (materialPercentage < 10) {
      warnings.push(
        `参考资料使用率较低（${materialPercentage.toFixed(1)}%），建议适当增加参考资料的使用（当前 ${stats.materialUsage}/${stats.totalItems}）`
      );
    }
  }

  // Rule 5: Check knowledge base usage (WARNING only - soft suggestion, not hard requirement)
  const hasRagContent = ragChunks && ragChunks.length > 0 && ragChunks.some(c => c.content.length > 0);
  if (hasRagContent) {
    const ragPercentage = stats.totalItems > 0 
      ? (stats.ragUsage / stats.totalItems) * 100 
      : 0;

    if (ragPercentage < 10) {
      warnings.push(
        `知识库使用率较低（${ragPercentage.toFixed(1)}%），建议适当增加知识库内容的使用（当前 ${stats.ragUsage}/${stats.totalItems}）`
      );
    }
  }

  // Only critical issues affect validity (warnings are informational only)
  const isValid = issues.length === 0;

  // Calculate RAG alignment rate
  const totalRagItems = ragAlignmentSuccessCount + ragAlignmentFailureCount;
  const ragAlignmentRate = totalRagItems > 0 
    ? (ragAlignmentSuccessCount / totalRagItems) * 100 
    : 0;

  if (isValid) {
    log.info('✅ Validation passed (no critical issues):', {
      materialPercentage: hasMaterials ? `${((stats.materialUsage / stats.totalItems) * 100).toFixed(1)}%` : 'N/A (no materials)',
      ragPercentage: hasRagContent ? `${((stats.ragUsage / stats.totalItems) * 100).toFixed(1)}%` : 'N/A (no RAG content)',
      sourcesUsed,
      availableSources,
      warningCount: warnings.length,
      ragAlignment: totalRagItems > 0 ? {
        successCount: ragAlignmentSuccessCount,
        failureCount: ragAlignmentFailureCount,
        alignmentRate: `${ragAlignmentRate.toFixed(1)}%`,
      } : 'N/A',
    });
    
    // Log warnings separately if any
    if (warnings.length > 0) {
      log.warn('⚠️ Non-critical warnings:', warnings);
    }
  } else {
    log.warn('❌ Validation failed (critical issues found):', {
      issueCount: issues.length,
      issues,
      warningCount: warnings.length,
      warnings,
      stats,
      ragAlignment: totalRagItems > 0 ? {
        successCount: ragAlignmentSuccessCount,
        failureCount: ragAlignmentFailureCount,
        alignmentRate: `${ragAlignmentRate.toFixed(1)}%`,
      } : 'N/A',
    });
  }

  return {
    isValid,
    issues,
    warnings,
    stats,
    ragAlignment: totalRagItems > 0 ? {
      successCount: ragAlignmentSuccessCount,
      failureCount: ragAlignmentFailureCount,
      alignmentRate: ragAlignmentRate,
    } : undefined,
  };
}

/**
 * Build retry prompt with validation issues
 * Enhanced with RAG verification and alignment requirements
 * Now focuses only on critical issues (not warnings)
 */
export function buildRetryPrompt(issues: string[], attemptNumber: number): string {
  const header = `⚠️ 第 ${attemptNumber} 次生成存在以下关键问题，请修正：\n`;
  
  const rules = [
    '1. 每个 keyPoint 必须包含 source 字段（"teacher" | "material" | "knowledge"）',
    '2. **重要：标记为 knowledge 的内容必须直接来自知识库片段，不允许编造**',
    '3. **必须在内容中明确标注"（来自知识库片段X）"，并填写 ragChunkId 字段**',
    '4. **ragChunkId 必须是上文提供的知识库片段的真实ID，不可编造**',
    '5. 尽量使用参考资料和知识库的内容，但不强制要求固定比例',
    '6. 根据实际情况灵活使用三种来源，确保教学内容的质量和完整性',
  ];

  const issueList = issues.map((issue, index) => `   ${index + 1}. ${issue}`).join('\n');

  return `${header}\n${rules.join('\n')}\n\n当前关键问题：\n${issueList}\n\n请重新生成，确保修正以上问题。注意：\n- 所有标记为 knowledge 的内容必须能在知识库片段中找到对应内容\n- 正确标注片段编号和ID，确保内容可验证、可追溯\n- 不必强求固定的来源比例，根据教学需要灵活使用各种来源`;
}


/**
 * Calculate source usage statistics from teaching design
 */
function calculateSourceUsageStats(design: TeachingDesign): SourceUsageStats {
  let materialUsage = 0;
  let ragUsage = 0;
  let teacherUsage = 0;
  let totalItems = 0;

  // Count from all slides' keyPoints
  design.slides.forEach(slide => {
    slide.keyPoints.forEach(kp => {
      totalItems++;
      const keyPoint = kp as KeyPointWithSource;
      if (keyPoint.source === 'material') {
        materialUsage++;
      } else if (keyPoint.source === 'knowledge') {
        ragUsage++;
      } else if (keyPoint.source === 'teacher') {
        teacherUsage++;
      }
    });
  });

  return {
    materialUsage,
    ragUsage,
    teacherUsage,
    totalItems,
  };
}
