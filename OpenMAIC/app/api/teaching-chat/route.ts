import { NextRequest } from 'next/server';
import { handleTeachingConversation, type ChatMessage } from '@/lib/agent/teaching-intent-agent';
import { getModel } from '@/lib/ai/providers';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('TeachingChatAPI');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body as { messages: ChatMessage[] };

    log.info('Received chat request with', messages.length, 'messages');

    if (!messages || !Array.isArray(messages)) {
      return apiError('INVALID_REQUEST', 400, 'Messages array is required');
    }

    // Configure model (using GLM-4.7 as default)
    const modelConfig = {
      providerId: 'glm' as const,
      modelId: 'glm-4.7',
      apiKey: process.env.GLM_API_KEY || 'a61159bfaa7949b98ca9863e4350217b.qZiaDB1pjuLuuADv',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      providerType: 'openai' as const,
      requiresApiKey: true,
    };

    log.info('Getting model...');
    const { model } = getModel(modelConfig);

    // Call agent
    log.info('Calling agent...');
    const response = await handleTeachingConversation(messages, model);
    
    log.info('Agent response:', {
      hasReply: !!response.reply,
      ready: response.ready,
      hasTeachingRequest: !!response.teachingRequest,
      hasSession: !!response.session,
    });

    return apiSuccess({
      reply: response.reply || '抱歉，我遇到了一些问题，请重试。',
      ready: response.ready || false,
      teachingRequest: response.teachingRequest || undefined,
      session: response.session || { ready: false },
    });
  } catch (error) {
    log.error('Failed to process teaching chat:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
