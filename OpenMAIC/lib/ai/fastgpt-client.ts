/**
 * FastGPT Knowledge Base Client
 * 
 * Provides a clean interface to query FastGPT knowledge base
 * for teaching content enhancement.
 * 
 * IMPORTANT: This implementation strictly follows the verified API format:
 * - URL: http://10.15.40.245:3000/api/v1/chat/completions
 * - Auth: Bearer token in Authorization header
 * - Response: data.choices?.[0]?.message?.content
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('FastGPT');

export interface FastGPTQueryOptions {
  timeoutMs?: number;
}

export interface FastGPTQueryResult {
  answer: string;
  raw?: unknown;
}

/**
 * Query FastGPT knowledge base
 * 
 * @param query - The question to ask the knowledge base
 * @param options - Optional configuration
 * @returns The answer from FastGPT
 * @throws Error if configuration is missing or request fails
 */
export async function queryFastGPT(
  query: string,
  options?: FastGPTQueryOptions,
): Promise<FastGPTQueryResult> {
  // Validate environment variables
  const baseUrl = process.env.FASTGPT_BASE_URL;
  const apiKey = process.env.FASTGPT_API_KEY;

  if (!baseUrl) {
    throw new Error('FASTGPT_BASE_URL is not configured in environment variables');
  }

  if (!apiKey) {
    throw new Error('FASTGPT_API_KEY is not configured in environment variables');
  }

  // Generate a unique chat ID for this request
  const chatId = `teaching-${generateShortId()}`;

  // Build request body (strictly following verified format)
  const requestBody = {
    chatId,
    stream: false,
    detail: true,
    messages: [
      {
        role: 'user',
        content: query,
      },
    ],
  };

  const url = `${baseUrl}/api/v1/chat/completions`;

  log.info(`Querying FastGPT with chatId: ${chatId}`);

  try {
    const controller = new AbortController();
    const timeoutId = options?.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      log.error(`FastGPT request failed with status ${response.status}`);
      throw new Error(`FastGPT API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // 🔍 调试：打印完整响应结构
    log.info('FastGPT raw response:', JSON.stringify(data, null, 2));

    // FastGPT 可能返回两种格式：
    // 1. OpenAI 格式: { choices: [{ message: { content: "..." } }] }
    // 2. 直接 JSON 格式: { title: "...", sections: [...] }
    let answer: string;

    if (data.choices?.[0]?.message?.content) {
      // OpenAI 格式
      answer = data.choices[0].message.content;
    } else if (typeof data === 'object' && data !== null) {
      // 直接返回的 JSON 对象，转成字符串
      answer = JSON.stringify(data);
    } else if (typeof data === 'string') {
      // 纯文本
      answer = data;
    } else {
      log.warn('FastGPT returned unexpected format');
      log.warn('Response structure:', JSON.stringify(data, null, 2));
      throw new Error('FastGPT returned unexpected response format');
    }

    if (!answer) {
      log.warn('FastGPT returned empty answer');
      throw new Error('FastGPT returned empty answer');
    }

    log.info(`FastGPT query successful, answer length: ${answer.length} chars`);

    return {
      answer,
      raw: data,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        log.error('FastGPT request timeout');
        throw new Error('FastGPT request timeout');
      }
      log.error(`FastGPT query failed: ${error.message}`);
      throw error;
    }
    log.error('FastGPT query failed with unknown error');
    throw new Error('FastGPT query failed');
  }
}

/**
 * Generate a short random ID for chat sessions
 * Uses crypto.randomUUID if available, falls back to simple random
 */
function generateShortId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2, 10);
}
