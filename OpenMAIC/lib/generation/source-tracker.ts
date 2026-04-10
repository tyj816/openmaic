/**
 * Source Tracker Utilities
 * 
 * Utilities for tracking and displaying content sources in three-source fusion
 */

import type { KeyPointWithSource, SourceUsageStats } from '@/lib/types/teaching';

/**
 * Get source emoji/icon for display
 */
export function getSourceIcon(source?: 'teacher' | 'material' | 'knowledge'): string {
  switch (source) {
    case 'teacher':
      return '👨‍🏫'; // Teacher
    case 'material':
      return '📄'; // Material/Document
    case 'knowledge':
      return '📚'; // Knowledge Base
    default:
      return '❓'; // Unknown
  }
}

/**
 * Get source label in Chinese
 */
export function getSourceLabel(source?: 'teacher' | 'material' | 'knowledge'): string {
  switch (source) {
    case 'teacher':
      return '教师需求';
    case 'material':
      return '参考资料';
    case 'knowledge':
      return '知识库';
    default:
      return '未知来源';
  }
}

/**
 * Format key point with source for display
 */
export function formatKeyPointWithSource(keyPoint: KeyPointWithSource): string {
  const icon = getSourceIcon(keyPoint.source);
  const label = getSourceLabel(keyPoint.source);
  return `${icon} ${keyPoint.content} [来源: ${label}]`;
}

/**
 * Generate source usage report
 */
export function generateSourceUsageReport(stats: SourceUsageStats): string {
  const lines: string[] = [];
  
  lines.push('=== 三源融合统计报告 ===');
  lines.push('');
  lines.push(`总内容项数: ${stats.totalItems}`);
  lines.push('');
  lines.push('来源分布:');
  
  if (stats.totalItems > 0) {
    const materialPct = ((stats.materialUsage / stats.totalItems) * 100).toFixed(1);
    const ragPct = ((stats.ragUsage / stats.totalItems) * 100).toFixed(1);
    const teacherPct = ((stats.teacherUsage / stats.totalItems) * 100).toFixed(1);
    
    lines.push(`  📄 参考资料: ${stats.materialUsage} 项 (${materialPct}%)`);
    lines.push(`  📚 知识库: ${stats.ragUsage} 项 (${ragPct}%)`);
    lines.push(`  👨‍🏫 教师需求: ${stats.teacherUsage} 项 (${teacherPct}%)`);
    lines.push('');
    
    // Check if constraints are met
    const materialMet = parseFloat(materialPct) >= 30;
    const ragMet = parseFloat(ragPct) >= 30;
    
    lines.push('约束检查:');
    lines.push(`  参考资料 ≥ 30%: ${materialMet ? '✅ 满足' : '❌ 不满足'}`);
    lines.push(`  知识库 ≥ 30%: ${ragMet ? '✅ 满足' : '❌ 不满足'}`);
  } else {
    lines.push('  无内容项');
  }
  
  lines.push('');
  lines.push('========================');
  
  return lines.join('\n');
}

/**
 * Validate source distribution meets constraints
 */
export function validateSourceDistribution(stats: SourceUsageStats): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (stats.totalItems === 0) {
    issues.push('没有生成任何内容项');
    return { valid: false, issues };
  }
  
  const materialPct = (stats.materialUsage / stats.totalItems) * 100;
  const ragPct = (stats.ragUsage / stats.totalItems) * 100;
  
  if (materialPct < 30) {
    issues.push(`参考资料使用率过低 (${materialPct.toFixed(1)}% < 30%)`);
  }
  
  if (ragPct < 30) {
    issues.push(`知识库使用率过低 (${ragPct.toFixed(1)}% < 30%)`);
  }
  
  // Check if all content is from single source
  if (stats.materialUsage === stats.totalItems) {
    issues.push('所有内容都来自参考资料，缺乏多源融合');
  } else if (stats.ragUsage === stats.totalItems) {
    issues.push('所有内容都来自知识库，缺乏多源融合');
  } else if (stats.teacherUsage === stats.totalItems) {
    issues.push('所有内容都来自教师需求，缺乏多源融合');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
