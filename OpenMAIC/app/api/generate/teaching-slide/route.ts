/**
 * Teaching Slide Generation API
 * 
 * Handles server-side slide generation for teaching design
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveModel } from '@/lib/server/resolve-model';
import { generateSlideFromTeachingSlide } from '@/lib/generation/teaching-slide-generator';
import type { TeachingSlide, ParsedImage } from '@/lib/types/teaching';
import type { ImageMapping } from '@/lib/types/generation';
import { generateText } from 'ai';
import type { AICallFn } from '@/lib/generation/pipeline-types';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingSlideAPI');

export interface TeachingSlideRequest {
  slide: TeachingSlide;
  assignedImages?: ParsedImage[];
  imageMapping?: ImageMapping;
  visionEnabled?: boolean;
  language?: 'zh-CN' | 'en-US';
  modelString?: string;
  apiKey?: string;
  baseUrl?: string;
  providerType?: string;
  requiresApiKey?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: TeachingSlideRequest = await request.json();
    const { 
      slide, 
      assignedImages, 
      imageMapping, 
      visionEnabled, 
      language = 'zh-CN', 
      modelString,
      apiKey,
      baseUrl,
      providerType,
      requiresApiKey
    } = body;

    if (!slide) {
      return NextResponse.json(
        { error: 'Missing slide data' },
        { status: 400 }
      );
    }

    // Resolve model
    const { model } = resolveModel({
      modelString,
      apiKey,
      baseUrl,
      providerType,
      requiresApiKey,
    });

    // Create AI call function
    const aiCall: AICallFn = async (system, user, visionImages) => {
      const messages: any[] = [{ role: 'user', content: user }];

      // Add vision images if provided
      if (visionImages && visionImages.length > 0) {
        messages[0].content = [
          { type: 'text', text: user },
          ...visionImages.map((img) => ({
            type: 'image',
            image: img.src,
          })),
        ];
      }

      log.debug('Calling LLM for slide generation...');
      log.debug('System prompt length:', system?.length || 0);
      log.debug('User prompt length:', user?.length || 0);

      const result = await generateText({
        model,
        system,
        messages,
        maxRetries: 3,
      });

      log.debug('LLM call successful, response length:', result.text.length);
      return result.text;
    };

    // Generate slide canvas
    log.info(`Generating canvas for slide: ${slide.title}`);
    const canvas = await generateSlideFromTeachingSlide(
      slide,
      aiCall,
      assignedImages,
      imageMapping,
      visionEnabled,
      language
    );

    if (!canvas) {
      return NextResponse.json(
        { error: 'Failed to generate slide canvas' },
        { status: 500 }
      );
    }

    log.info(`Canvas generated successfully for slide: ${slide.title}`);
    return NextResponse.json({ canvas });

  } catch (error) {
    log.error('Teaching slide generation failed:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}