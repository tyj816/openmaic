/**
 * Teaching Outline Generation API
 * 
 * Handles server-side teaching design outline generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveModel } from '@/lib/server/resolve-model';
import { generateTeachingDesignFromRequest } from '@/lib/generation/teaching-outline-generator';
import type { TeachingRequest, ParsedImage } from '@/lib/types/teaching';
import type { ImageMapping } from '@/lib/types/generation';
import { generateText } from 'ai';
import type { AICallFn, GenerationCallbacks } from '@/lib/generation/pipeline-types';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingOutlineAPI');

export interface TeachingOutlineRequest {
  request: TeachingRequest;
  pdfText?: string;
  pdfImages?: ParsedImage[];
  imageMapping?: ImageMapping;
  visionEnabled?: boolean;
  researchContext?: string;
  modelString?: string;
  apiKey?: string;
  baseUrl?: string;
  providerType?: string;
  requiresApiKey?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: TeachingOutlineRequest = await request.json();
    const { 
      request: teachingRequest, 
      pdfText, 
      pdfImages, 
      imageMapping, 
      visionEnabled, 
      researchContext,
      modelString,
      apiKey,
      baseUrl,
      providerType,
      requiresApiKey
    } = body;

    if (!teachingRequest) {
      return NextResponse.json(
        { error: 'Missing teaching request data' },
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

      log.debug('Calling LLM for outline generation...');
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

    // Callbacks for progress updates (not used in API, but required by function)
    const callbacks: GenerationCallbacks = {
      onProgress: (progress) => {
        log.debug(`Progress: ${progress.overallProgress}% - ${progress.statusMessage}`);
      },
      onError: (error) => {
        log.error('Generation error:', error);
      },
    };

    // Generate teaching design outline
    log.info(`Generating teaching design outline for: ${teachingRequest.topic}`);
    const designResult = await generateTeachingDesignFromRequest(
      teachingRequest,
      pdfText,
      pdfImages,
      aiCall,
      callbacks,
      {
        visionEnabled,
        imageMapping,
        researchContext,
      }
    );

    if (!designResult.success || !designResult.data) {
      return NextResponse.json(
        { error: designResult.error || 'Failed to generate teaching design' },
        { status: 500 }
      );
    }

    log.info(`Teaching design generated successfully with ${designResult.data.slides.length} slides`);
    return NextResponse.json({ design: designResult.data });

  } catch (error) {
    log.error('Teaching outline generation failed:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}