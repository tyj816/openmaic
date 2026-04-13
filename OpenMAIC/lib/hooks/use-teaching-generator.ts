/**
 * Teaching Generator Hook
 * 
 * Replaces useSceneGenerator for teaching design generation
 * 
 * Flow:
 * 1. TeachingRequest → generateTeachingDesign (outline)
 * 2. For each slide → generate canvas
 * 3. Return complete TeachingDesign
 */

import { useState, useCallback } from 'react';
import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import type { TeachingRequest, TeachingDesign, ReferenceMaterial } from '@/lib/types/teaching';
import type { ImageMapping } from '@/lib/types/generation';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingGenerator');

export interface TeachingGeneratorOptions {
  model: LanguageModel;
  materials?: ReferenceMaterial[];
  imageMapping?: ImageMapping;
  visionEnabled?: boolean;
  researchContext?: string;
  modelString?: string;
  apiKey?: string;
  baseUrl?: string;
  providerType?: string;
  requiresApiKey?: boolean;
}

export interface TeachingGeneratorState {
  isGenerating: boolean;
  progress: number;
  statusMessage: string;
  error?: string;
  design?: TeachingDesign;
}

/**
 * Hook for teaching design generation
 */
export function useTeachingGenerator() {
  const [state, setState] = useState<TeachingGeneratorState>({
    isGenerating: false,
    progress: 0,
    statusMessage: '',
  });

  const generate = useCallback(
    async (
      request: TeachingRequest,
      options: TeachingGeneratorOptions,
    ): Promise<TeachingDesign | null> => {
      setState({
        isGenerating: true,
        progress: 0,
        statusMessage: '开始生成教学设计...',
      });

      try {
        // Stage 1: Generate teaching design outline via API
        log.info('Stage 1: Generating teaching design outline');
        setState((prev) => ({
          ...prev,
          progress: 10,
          statusMessage: '正在生成教学大纲...',
        }));

        const outlineResponse = await fetch('/api/generate/teaching-outline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request,
            materials: options.materials,
            imageMapping: options.imageMapping,
            visionEnabled: options.visionEnabled,
            researchContext: options.researchContext,
            modelString: options.modelString,
            apiKey: options.apiKey,
            baseUrl: options.baseUrl,
            providerType: options.providerType,
            requiresApiKey: options.requiresApiKey,
          }),
        });

        if (!outlineResponse.ok) {
          const errorData = await outlineResponse.json();
          throw new Error(errorData.error || 'Failed to generate teaching outline');
        }

        const { design } = await outlineResponse.json();
        log.info(`Generated design with ${design.slides.length} slides`);

        setState((prev) => ({
          ...prev,
          progress: 50,
          statusMessage: '教学大纲生成完成，开始生成课件页面...',
        }));

        // Stage 2: Generate canvas for each slide via API
        log.info('Stage 2: Generating canvas for each slide');
        const totalSlides = design.slides.length;

        for (let i = 0; i < design.slides.length; i++) {
          const slide = design.slides[i];

          setState((prev) => ({
            ...prev,
            progress: 50 + Math.floor((i / totalSlides) * 50),
            statusMessage: `正在生成第 ${i + 1}/${totalSlides} 页课件...`,
          }));

          log.info(`Generating canvas for slide ${i + 1}/${totalSlides}: ${slide.title}`);

          const slideResponse = await fetch('/api/generate/teaching-slide', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              slide,
              assignedImages: options.materials?.flatMap(m => m.parsedImages || []),
              imageMapping: options.imageMapping,
              visionEnabled: options.visionEnabled,
              language: request.language,
              modelString: options.modelString,
              apiKey: options.apiKey,
              baseUrl: options.baseUrl,
              providerType: options.providerType,
              requiresApiKey: options.requiresApiKey,
            }),
          });

          if (slideResponse.ok) {
            const { canvas } = await slideResponse.json();
            slide.canvas = canvas;
            log.info(`Canvas generated for slide: ${slide.title}`);
          } else {
            log.warn(`Failed to generate canvas for slide: ${slide.title}`);
          }
        }

        // Complete
        setState({
          isGenerating: false,
          progress: 100,
          statusMessage: '教学设计生成完成！',
          design,
        });

        log.info('Teaching design generation complete');
        return design;
      } catch (error) {
        log.error('Teaching generation failed:', error);
        setState({
          isGenerating: false,
          progress: 0,
          statusMessage: '生成失败',
          error: String(error),
        });
        return null;
      }
    },
    [],
  );

  const setDesign = useCallback((design: TeachingDesign) => {
    setState((prev) => ({
      ...prev,
      design,
    }));
  }, []);

  return {
    ...state,
    generate,
    setDesign,
  };
}
