/**
 * Teaching Slide Generator
 * 
 * Generates canvas (Slide with PPTElements) for each TeachingSlide
 * Reuses existing scene-generator logic for element generation
 */

import { nanoid } from 'nanoid';
import katex from 'katex';
import { MAX_VISION_IMAGES } from '@/lib/constants/generation';
import type { TeachingSlide, ParsedImage } from '@/lib/types/teaching';
import type { Slide, PPTElement, SlideTheme, SlideBackground } from '@/lib/types/slides';
import type { ImageMapping } from '@/lib/types/generation';
import { formatImageDescription, formatImagePlaceholder } from './prompt-formatters';
import { parseJsonResponse } from './json-repair';
import type { AICallFn } from './pipeline-types';
import { buildPrompt, PROMPT_IDS } from './prompts';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingSlideGen');

/**
 * Generated slide data from AI (before processing)
 */
interface GeneratedSlideData {
  elements: Array<Record<string, unknown>>;
  background?: {
    type: 'solid' | 'gradient';
    color?: string;
    gradient?: unknown;
  };
  remark?: string;
}

/**
 * Generate canvas for a teaching slide
 * 
 * Input: TeachingSlide (high-level: title + keyPoints)
 * Output: Slide (low-level: PPTElements)
 * 
 * This reuses the existing slide generation logic from scene-generator.ts
 */
export async function generateSlideFromTeachingSlide(
  teachingSlide: TeachingSlide,
  aiCall: AICallFn,
  assignedImages?: ParsedImage[],
  imageMapping?: ImageMapping,
  visionEnabled?: boolean,
  language: 'zh-CN' | 'en-US' = 'zh-CN',
): Promise<Slide | null> {
  // Build assigned images description
  let assignedImagesText = '无可用图片，禁止插入任何 image 元素';
  let visionImages: Array<{ id: string; src: string }> | undefined;

  if (assignedImages && assignedImages.length > 0) {
    if (visionEnabled && imageMapping) {
      const withSrc = assignedImages.filter((img) => imageMapping[img.id]);
      const visionSlice = withSrc.slice(0, MAX_VISION_IMAGES);
      const textOnlySlice = withSrc.slice(MAX_VISION_IMAGES);
      const noSrcImages = assignedImages.filter((img) => !imageMapping[img.id]);

      const visionDescriptions = visionSlice.map((img) =>
        formatImagePlaceholder(img, language),
      );
      const textDescriptions = [...textOnlySlice, ...noSrcImages].map((img) =>
        formatImageDescription(img, language),
      );
      assignedImagesText = [...visionDescriptions, ...textDescriptions].join('\n');

      visionImages = visionSlice.map((img) => ({
        id: img.id,
        src: imageMapping[img.id],
        width: img.width,
        height: img.height,
      }));
    } else {
      assignedImagesText = assignedImages
        .map((img) => formatImageDescription(img, language))
        .join('\n');
    }
  }

  // Canvas dimensions
  const canvasWidth = 1000;
  const canvasHeight = 562.5;

  // Use the original high-quality slide content prompt system
  const prompts = buildPrompt(PROMPT_IDS.SLIDE_CONTENT, {
    title: teachingSlide.title,
    description: teachingSlide.description || teachingSlide.keyPoints.join('; '),
    keyPoints: teachingSlide.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n'),
    assignedImages: assignedImagesText,
    canvas_width: canvasWidth,
    canvas_height: canvasHeight,
    teacherContext: '', // Empty for teaching slides
  });

  if (!prompts) {
    log.error(`Failed to build prompts for slide: ${teachingSlide.title}`);
    return null;
  }

  log.debug(`Generating canvas for slide: ${teachingSlide.title}`);

  try {
    const response = await aiCall(prompts.system, prompts.user, visionImages);
    const generatedData = parseJsonResponse<GeneratedSlideData>(response);

    if (!generatedData || !generatedData.elements || !Array.isArray(generatedData.elements)) {
      log.error(`Failed to parse AI response for: ${teachingSlide.title}`);
      return null;
    }

    log.debug(`Got ${generatedData.elements.length} elements for: ${teachingSlide.title}`);

    // Fix elements with missing required fields
    const fixedElements = fixElementDefaults(generatedData.elements, assignedImages);
    log.debug(`After element fixing: ${fixedElements.length} elements`);

    // Process LaTeX elements
    const latexProcessedElements = processLatexElements(fixedElements);
    log.debug(`After LaTeX processing: ${latexProcessedElements.length} elements`);

    // Resolve image IDs to actual URLs
    const resolvedElements = resolveImageIds(latexProcessedElements, imageMapping);
    log.debug(`After image resolution: ${resolvedElements.length} elements`);

    // Process elements, assign unique IDs
    const processedElements: PPTElement[] = resolvedElements.map((el) => ({
      ...el,
      id: `${el.type}_${nanoid(8)}`,
      rotate: 0,
    })) as PPTElement[];

    // Process background
    let background: SlideBackground | undefined;
    if (generatedData.background) {
      if (generatedData.background.type === 'solid' && generatedData.background.color) {
        background = { type: 'solid', color: generatedData.background.color };
      } else if (generatedData.background.type === 'gradient' && generatedData.background.gradient) {
        background = {
          type: 'gradient',
          gradient: generatedData.background.gradient as any,
        };
      }
    }

    // Build complete Slide object
    const defaultTheme: SlideTheme = {
      backgroundColor: '#ffffff',
      themeColors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4'],
      fontColor: '#333333',
      fontName: 'Microsoft YaHei',
      outline: { color: '#d14424', width: 2, style: 'solid' },
      shadow: { h: 0, v: 0, blur: 10, color: '#000000' },
    };

    const slide: Slide = {
      id: teachingSlide.id,
      viewportSize: 1000,
      viewportRatio: 0.5625,
      theme: defaultTheme,
      elements: processedElements,
      background,
      type: teachingSlide.type,
    };

    // Store narration in remark field
    if (teachingSlide.narration) {
      (slide as any).remark = teachingSlide.narration;
    }

    log.info(`Generated canvas for slide: ${teachingSlide.title} (${processedElements.length} elements)`);

    return slide;
  } catch (error) {
    log.error(`Failed to generate canvas for slide: ${teachingSlide.title}`, error);
    return null;
  }
}

/**
 * Check if a string looks like an image ID reference
 */
function isImageIdReference(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('data:')) return false;
  if (value.startsWith('http://') || value.startsWith('https://')) return false;
  if (value.startsWith('/')) return false;
  return /^img_\d+$/i.test(value);
}

/**
 * Resolve image ID references to actual base64 URLs
 */
function resolveImageIds(
  elements: GeneratedSlideData['elements'],
  imageMapping?: ImageMapping,
): GeneratedSlideData['elements'] {
  return elements
    .map((el) => {
      if (el.type === 'image') {
        if (!('src' in el)) {
          log.warn(`Image element missing src, removing element`);
          return null;
        }
        const src = el.src as string;

        if (isImageIdReference(src)) {
          if (!imageMapping || !imageMapping[src]) {
            log.warn(`No mapping for image ID: ${src}, removing element`);
            return null;
          }
          log.debug(`Resolved image ID "${src}" to base64 URL`);
          return { ...el, src: imageMapping[src] };
        }
      }

      return el;
    })
    .filter((el): el is NonNullable<typeof el> => el !== null);
}

/**
 * Fix elements with missing required fields
 */
function fixElementDefaults(
  elements: GeneratedSlideData['elements'],
  assignedImages?: ParsedImage[],
): GeneratedSlideData['elements'] {
  return elements.map((el) => {
    // Fix line elements
    if (el.type === 'line') {
      const lineEl = el as Record<string, unknown>;

      if (!lineEl.points || !Array.isArray(lineEl.points) || lineEl.points.length !== 2) {
        lineEl.points = ['', ''];
      }

      if (!lineEl.start || !Array.isArray(lineEl.start)) {
        lineEl.start = [el.left ?? 0, el.top ?? 0];
      }
      if (!lineEl.end || !Array.isArray(lineEl.end)) {
        lineEl.end = [(el.left ?? 0) + (el.width ?? 100), (el.top ?? 0) + (el.height ?? 0)];
      }

      if (!lineEl.style) {
        lineEl.style = 'solid';
      }

      if (!lineEl.color) {
        lineEl.color = '#333333';
      }

      return lineEl as typeof el;
    }

    // Fix text elements
    if (el.type === 'text') {
      const textEl = el as Record<string, unknown>;

      if (!textEl.defaultFontName) {
        textEl.defaultFontName = 'Microsoft YaHei';
      }
      if (!textEl.defaultColor) {
        textEl.defaultColor = '#333333';
      }
      if (!textEl.content) {
        textEl.content = '';
      }

      return textEl as typeof el;
    }

    // Fix image elements
    if (el.type === 'image') {
      const imageEl = el as Record<string, unknown>;

      if (imageEl.fixedRatio === undefined) {
        imageEl.fixedRatio = true;
      }

      // Correct dimensions using known aspect ratio
      if (assignedImages && typeof imageEl.src === 'string') {
        const imgMeta = assignedImages.find((img) => img.id === imageEl.src);
        if (imgMeta?.width && imgMeta?.height) {
          const knownRatio = imgMeta.width / imgMeta.height;
          const curW = (el.width || 400) as number;
          const curH = (el.height || 300) as number;
          if (Math.abs(curW / curH - knownRatio) / knownRatio > 0.1) {
            const newH = Math.round(curW / knownRatio);
            if (newH > 462) {
              const newW = Math.round(462 * knownRatio);
              imageEl.width = newW;
              imageEl.height = 462;
            } else {
              imageEl.height = newH;
            }
          }
        }
      }

      return imageEl as typeof el;
    }

    // Fix shape elements
    if (el.type === 'shape') {
      const shapeEl = el as Record<string, unknown>;

      if (!shapeEl.viewBox) {
        shapeEl.viewBox = `0 0 ${el.width ?? 100} ${el.height ?? 100}`;
      }
      if (!shapeEl.path) {
        const w = el.width ?? 100;
        const h = el.height ?? 100;
        shapeEl.path = `M0 0 L${w} 0 L${w} ${h} L0 ${h} Z`;
      }
      if (!shapeEl.fill) {
        shapeEl.fill = '#5b9bd5';
      }
      if (shapeEl.fixedRatio === undefined) {
        shapeEl.fixedRatio = false;
      }

      return shapeEl as typeof el;
    }

    return el;
  });
}

/**
 * Process LaTeX elements: render latex string to HTML using KaTeX
 */
function processLatexElements(
  elements: GeneratedSlideData['elements'],
): GeneratedSlideData['elements'] {
  return elements
    .map((el) => {
      if (el.type !== 'latex') return el;

      const latexStr = el.latex as string | undefined;
      if (!latexStr) {
        log.warn('Latex element missing latex string, removing');
        return null;
      }

      try {
        const html = katex.renderToString(latexStr, {
          throwOnError: false,
          displayMode: true,
          output: 'html',
        });

        return {
          ...el,
          html,
          fixedRatio: true,
        };
      } catch (err) {
        log.warn(`Failed to render latex "${latexStr}":`, err);
        return null;
      }
    })
    .filter((el): el is NonNullable<typeof el> => el !== null);
}
