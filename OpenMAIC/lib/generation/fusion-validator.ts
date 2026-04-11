/**
 * Three-Source Fusion Validator
 * 
 * Validates teaching design to ensure it meets three-source fusion requirements:
 * - Material usage >= 25%
 * - Knowledge base usage >= 25%
 * - At least 2 sources used
 * - All keyPoints have source field
 */

import type { TeachingDesign, SourceUsageStats, KeyPointWithSource } from '@/lib/types/teaching';
import { createLogger } from '@/lib/logger';

const log = createLogger('FusionValidator');

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  stats: SourceUsageStats;
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

/**
 * Validate teaching design against three-source fusion requirements
 */
export function validateTeachingDesign(design: TeachingDesign): ValidationResult {
  const issues: string[] = [];
  const stats = calculateSourceUsageStats(design);

  log.info('Validating teaching design:', {
    slideCount: design.slides.length,
    totalKeyPoints: stats.totalItems,
    materialUsage: stats.materialUsage,
    ragUsage: stats.ragUsage,
    teacherUsage: stats.teacherUsage,
  });

  // Rule 1: Check if all keyPoints have source field
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

  // Rule 2: Check if at least 2 sources are used
  const sourcesUsed = [
    stats.materialUsage > 0,
    stats.ragUsage > 0,
    stats.teacherUsage > 0,
  ].filter(Boolean).length;

  if (sourcesUsed < 2) {
    issues.push(`仅使用了 ${sourcesUsed} 种来源，要求至少使用 2 种来源`);
  }

  // Rule 3: Check material usage >= 25%
  const materialPercentage = stats.totalItems > 0 
    ? (stats.materialUsage / stats.totalItems) * 100 
    : 0;

  if (materialPercentage < 25) {
    issues.push(
      `参考资料使用率为 ${materialPercentage.toFixed(1)}%，要求至少 25%（当前 ${stats.materialUsage}/${stats.totalItems}）`
    );
  }

  // Rule 4: Check knowledge base usage >= 25%
  const ragPercentage = stats.totalItems > 0 
    ? (stats.ragUsage / stats.totalItems) * 100 
    : 0;

  if (ragPercentage < 25) {
    issues.push(
      `知识库使用率为 ${ragPercentage.toFixed(1)}%，要求至少 25%（当前 ${stats.ragUsage}/${stats.totalItems}）`
    );
  }

  const isValid = issues.length === 0;

  if (isValid) {
    log.info('✅ Validation passed:', {
      materialPercentage: `${materialPercentage.toFixed(1)}%`,
      ragPercentage: `${ragPercentage.toFixed(1)}%`,
      sourcesUsed,
    });
  } else {
    log.warn('❌ Validation failed:', {
      issueCount: issues.length,
      issues,
      stats,
    });
  }

  return {
    isValid,
    issues,
    stats,
  };
}

/**
 * Build retry prompt with validation issues
 */
export function buildRetryPrompt(issues: string[], attemptNumber: number): string {
  const header = `⚠️ 第 ${attemptNumber} 次生成未满足三源融合要求，请严格遵守以下规则：\n`;
  
  const rules = [
    '1. 每个 keyPoint 必须包含 source 字段（"teacher" | "material" | "knowledge"）',
    '2. 至少 25% 的 keyPoints 必须标记为 source: "material"（来自参考资料）',
    '3. 至少 25% 的 keyPoints 必须标记为 source: "knowledge"（来自知识库）',
    '4. 必须使用至少 2 种不同的来源',
    '5. 充分利用参考资料中的关键术语、概念和知识库中的专业知识',
  ];

  const issueList = issues.map((issue, index) => `   ${index + 1}. ${issue}`).join('\n');

  return `${header}\n${rules.join('\n')}\n\n当前问题：\n${issueList}\n\n请重新生成，确保满足所有要求。`;
}
