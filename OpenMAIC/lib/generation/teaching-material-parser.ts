/**
 * Teaching Material Parser
 * 
 * Parses uploaded reference materials (PDF, images) and extracts content
 * for teaching design generation.
 */

import type { ReferenceMaterial, ParsedImage } from '@/lib/types/teaching';
import { createLogger } from '@/lib/logger';

const log = createLogger('MaterialParser');

/**
 * Parsed materials result
 */
export interface ParsedMaterialsResult {
  textContent: string;
  images: ParsedImage[];
  summaries: string[];
}

/**
 * Parse teaching materials (PDF + images)
 * 
 * @param materials - Array of reference materials to parse
 * @returns Parsed content including text, images, and summaries
 */
export async function parseTeachingMaterials(
  materials: ReferenceMaterial[]
): Promise<ParsedMaterialsResult> {
  if (!materials || materials.length === 0) {
    return {
      textContent: '',
      images: [],
      summaries: [],
    };
  }

  log.info(`Parsing ${materials.length} reference materials`);

  const allText: string[] = [];
  const allImages: ParsedImage[] = [];
  const summaries: string[] = [];

  for (const material of materials) {
    try {
      // Parse based on material type
      switch (material.type) {
        case 'pdf':
          if (material.parsedText) {
            allText.push(`\n## 【${material.name}】\n${material.parsedText}`);
            summaries.push(`${material.name}: PDF文档，${material.metadata.pageCount || 0}页`);
          }
          if (material.parsedImages && material.parsedImages.length > 0) {
            allImages.push(...material.parsedImages);
            log.info(`Extracted ${material.parsedImages.length} images from ${material.name}`);
          }
          break;

        case 'image':
          // For uploaded images, add to images array
          if (material.parsedImages && material.parsedImages.length > 0) {
            allImages.push(...material.parsedImages);
            summaries.push(`${material.name}: 图片资源`);
          }
          break;

        case 'txt':
          if (material.parsedText) {
            allText.push(`\n## 【${material.name}】\n${material.parsedText}`);
            summaries.push(`${material.name}: 文本文档`);
          }
          break;

        default:
          log.warn(`Unsupported material type: ${material.type}`);
      }
    } catch (error) {
      log.error(`Failed to parse material ${material.name}:`, error);
      // Continue with other materials (graceful degradation)
    }
  }

  const textContent = allText.join('\n\n');

  log.info(`Parsing complete: ${textContent.length} chars text, ${allImages.length} images`);

  return {
    textContent,
    images: allImages,
    summaries,
  };
}
