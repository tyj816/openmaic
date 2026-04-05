/**
 * Adapter: TeachingDesign → Scene[]
 * 
 * This adapter allows existing PPT export logic to work with TeachingDesign
 * without modifying the export code.
 * 
 * Key mapping:
 * - TeachingSlide.canvas → Scene.content.canvas
 * - TeachingSlide.narration → Slide.remark
 * - No actions in MVP (empty array)
 */

import type { TeachingDesign, TeachingSlide } from '@/lib/types/teaching';
import type { Scene, SlideContent } from '@/lib/types/stage';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingAdapter');

/**
 * Convert TeachingDesign to Scene[] for PPT export
 * 
 * This is the critical adapter that bridges new and old systems
 */
export function teachingDesignToScenes(design: TeachingDesign, stageId: string): Scene[] {
  log.info(`Converting TeachingDesign to Scenes: ${design.slides.length} slides`);

  const scenes: Scene[] = design.slides
    .filter((slide) => slide.canvas !== undefined)
    .map((slide) => teachingSlideToScene(slide, stageId));

  log.info(`Converted ${scenes.length} scenes for export`);

  return scenes;
}

/**
 * Convert a single TeachingSlide to Scene
 */
function teachingSlideToScene(slide: TeachingSlide, stageId: string): Scene {
  if (!slide.canvas) {
    throw new Error(`TeachingSlide ${slide.id} missing canvas`);
  }

  // Ensure narration is stored in canvas.remark
  const canvas = { ...slide.canvas };
  if (slide.narration && !canvas.remark) {
    (canvas as any).remark = slide.narration;
  }

  const content: SlideContent = {
    type: 'slide',
    canvas,
  };

  const scene: Scene = {
    id: slide.id,
    stageId,
    type: 'slide',
    title: slide.title,
    order: slide.order,
    content,
    actions: [], // No actions in MVP
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return scene;
}

/**
 * Extract teaching design metadata for export filename
 */
export function getTeachingDesignExportName(design: TeachingDesign): string {
  return `${design.subject}_${design.topic}_${design.gradeLevel}`.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
}
