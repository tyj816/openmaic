/**
 * API Route: Regenerate Teaching Design
 * 
 * Handles partial regeneration of teaching design based on user feedback
 * Includes canvas regeneration to maintain visual consistency
 */

import { NextRequest, NextResponse } from 'next/server';
import { regenerateTeachingDesign } from '@/lib/generation/teaching-regenerator';
import { getModel } from '@/lib/ai/providers';
import { generateText } from 'ai';
import type { TeachingDesign } from '@/lib/types/teaching';
import { createLogger } from '@/lib/logger';

const log = createLogger('RegenerateTeachingAPI');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      design, 
      instruction, 
      modelString, 
      apiKey, 
      baseUrl,
      language = 'zh-CN',
      imageMapping = {},
      assignedImages = [],
    } = body as {
      design: TeachingDesign;
      instruction: string;
      modelString?: string;
      apiKey?: string;
      baseUrl?: string;
      language?: string;
      imageMapping?: Record<string, string>;
      assignedImages?: any[];
    };

    if (!design || !instruction) {
      return NextResponse.json(
        { success: false, error: 'Missing design or instruction' },
        { status: 400 }
      );
    }

    log.info('Regenerating teaching design:', {
      designId: design.id,
      instruction,
      slideCount: design.slides.length,
    });

    // 使用传入的模型配置或默认 GLM
    const modelConfig = {
      providerId: 'glm' as const,
      modelId: modelString?.split(':')[1] || 'glm-4.7',
      apiKey: apiKey || process.env.GLM_API_KEY || '',
      baseUrl: baseUrl || process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      providerType: 'openai' as const,
      requiresApiKey: true,
    };

    const { model } = getModel(modelConfig);

    // AI 调用函数
    const aiCall = async (systemPrompt: string, userPrompt: string) => {
      const { text } = await generateText({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      });
      return text;
    };

    // Step 1: 调用再生成逻辑（修改 slide 内容）
    const updatedDesign = await regenerateTeachingDesign({
      design,
      instruction,
      aiCall,
    });

    log.info('Slide content regenerated, now regenerating canvas...');

    // Step 2: 找到被修改的 slide，重新生成 canvas
    // 通过 version 判断哪个 slide 被修改了
    const modifiedSlideIndex = updatedDesign.slides.findIndex(
      (slide, index) => slide !== design.slides[index]
    );

    if (modifiedSlideIndex !== -1) {
      const modifiedSlide = updatedDesign.slides[modifiedSlideIndex];
      
      log.info(`Regenerating canvas for slide ${modifiedSlideIndex + 1}: ${modifiedSlide.title}`);

      // 调用 teaching-slide API 重新生成 canvas
      const slideResponse = await fetch(`${req.nextUrl.origin}/api/generate/teaching-slide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slide: modifiedSlide,
          assignedImages,
          imageMapping,
          visionEnabled: false,
          language,
          modelString,
          apiKey,
          baseUrl,
          providerType: 'openai',
          requiresApiKey: true,
        }),
      });

      if (slideResponse.ok) {
        const { canvas } = await slideResponse.json();
        modifiedSlide.canvas = canvas;
        log.info(`Canvas regenerated successfully for slide: ${modifiedSlide.title}`);
      } else {
        log.warn(`Failed to regenerate canvas for slide: ${modifiedSlide.title}`);
      }
    }

    log.info('Teaching design regenerated successfully:', {
      designId: updatedDesign.id,
      version: updatedDesign.version,
      canvasRegenerated: modifiedSlideIndex !== -1,
    });

    return NextResponse.json({
      success: true,
      design: updatedDesign,
    });
  } catch (error) {
    log.error('Failed to regenerate teaching design:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
