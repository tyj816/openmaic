/**
 * Teaching Design PPTX Export Hook
 * 
 * Wraps existing useExportPPTX logic for TeachingDesign
 * Uses adapter to convert TeachingDesign → Scene[] → PPTX
 */

'use client';

import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import type { TeachingDesign } from '@/lib/types/teaching';
import { teachingDesignToScenes, getTeachingDesignExportName } from '@/lib/adapters/teaching-to-scene';
import { buildPptxBlob } from '@/lib/export/use-export-pptx';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingExport');

/**
 * Hook for exporting TeachingDesign to PPTX
 * 
 * This reuses the existing buildPptxBlob logic by converting
 * TeachingDesign to Scene[] format
 */
export function useExportTeachingPPTX() {
  const [exporting, setExporting] = useState(false);

  const exportPPTX = useCallback(async (design: TeachingDesign) => {
    if (exporting) return;

    setExporting(true);
    log.info('Starting PPTX export for teaching design:', design.title);

    try {
      // Convert TeachingDesign to Scene[]
      const tempStageId = 'temp_export_stage';
      const scenes = teachingDesignToScenes(design, tempStageId);

      log.info(`Converted to ${scenes.length} scenes for export`);

      // Extract slides from scenes
      const slides = scenes.map((scene) => {
        if (scene.content.type === 'slide') {
          return scene.content.canvas;
        }
        throw new Error('Non-slide content in teaching design');
      });

      // Build PPTX blob using existing logic
      const viewportSize = 1000;
      const viewportRatio = 0.5625; // 16:9
      const ratioPx2Inch = 96 * (viewportSize / 960);
      const ratioPx2Pt = (96 / 72) * (viewportSize / 960);

      const blob = await buildPptxBlob(
        slides,
        scenes,
        viewportRatio,
        viewportSize,
        ratioPx2Inch,
        ratioPx2Pt,
      );

      // Save file
      const fileName = getTeachingDesignExportName(design);
      saveAs(blob, `${fileName}.pptx`);

      toast.success('PPT 导出成功！');
      log.info('PPTX export complete');
    } catch (error) {
      log.error('PPTX export failed:', error);
      toast.error('PPT 导出失败');
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  return {
    exportPPTX,
    exporting,
  };
}
