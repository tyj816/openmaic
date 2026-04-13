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

export interface FastGPTQuoteItem {
  id: string;
  chunkIndex?: number;
  datasetId?: string;
  collectionId?: string;
  sourceId?: string;
  sourceName?: string;
  q?: string; // Quote content
  a?: string; // Answer content
}

export interface FastGPTQueryResult {
  answer: string;
  raw?: unknown;
  quoteList?: FastGPTQuoteItem[]; // Extracted quote list for source verification
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
    log.info('🔍 [DEBUG] FastGPT complete raw response structure:');
    log.info(JSON.stringify(data, null, 2));

    // Extract quoteList from responseData if available
    let quoteList: FastGPTQuoteItem[] | undefined;
    
    // Step 1: Extract quote metadata from datasetSearchNode
    const quoteMetadata: Map<string, any> = new Map();
    if (data.responseData && Array.isArray(data.responseData)) {
      const datasetSearchNode = data.responseData.find(
        (node: any) => node.moduleType === 'datasetSearchNode'
      );
      
      if (datasetSearchNode?.quoteList && Array.isArray(datasetSearchNode.quoteList)) {
        datasetSearchNode.quoteList.forEach((quote: any) => {
          quoteMetadata.set(quote.id, quote);
        });
        log.info(`🔍 [1/4] Found ${quoteMetadata.size} quote metadata entries`);
      }
    }
    
    // Step 2: Extract actual content from AI chat node's historyPreview
    const contentMap: Map<string, string> = new Map();
    if (data.responseData && Array.isArray(data.responseData)) {
      const chatNode = data.responseData.find(
        (node: any) => node.moduleType === 'chatNode'
      );
      
      if (chatNode?.historyPreview && Array.isArray(chatNode.historyPreview)) {
        for (const historyItem of chatNode.historyPreview) {
          if (historyItem.obj === 'System' && historyItem.value) {
            // Extract content from <Cites> tags
            const citesMatch = historyItem.value.match(/<Cites>\s*\n?\s*(\{[\s\S]*?\})\s*\n?\s*<\/Cites>/);
            if (citesMatch) {
              try {
                let citesContent = citesMatch[1].trim();
                
                // The content field in the JSON contains raw text with newlines
                // We need to extract it differently to avoid JSON parsing issues
                const idMatch = citesContent.match(/"id":\s*"([^"]+)"/);
                const contentMatch = citesContent.match(/"content":\s*"([\s\S]*?)"\s*\n?\s*\}/);
                
                if (idMatch && contentMatch) {
                  const id = idMatch[1];
                  // The content is already a string, but may have escaped characters
                  // We need to unescape it properly
                  let content = contentMatch[1];
                  
                  // Unescape common escape sequences
                  content = content
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '\r')
                    .replace(/\\t/g, '\t')
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\');
                  
                  contentMap.set(id, content);
                  log.info(`🔍 [1/4] Extracted content for ID ${id}: ${content.length} chars`);
                } else {
                  log.warn('🔍 [1/4] Could not extract id or content from Cites');
                }
              } catch (e) {
                log.error('🔍 [1/4] Failed to parse Cites content:', e);
                log.error('🔍 [1/4] Cites match content (first 500 chars):', citesMatch[1].substring(0, 500));
              }
            } else {
              log.warn('🔍 [1/4] No <Cites> tags found in System message');
            }
          }
        }
      }
    }
    
    // Step 3: Merge metadata with content
    if (quoteMetadata.size > 0) {
      quoteList = Array.from(quoteMetadata.entries()).map(([id, metadata]) => {
        const content = contentMap.get(id) || '';
        const quote: FastGPTQuoteItem = {
          id: metadata.id,
          chunkIndex: metadata.chunkIndex,
          datasetId: metadata.datasetId,
          collectionId: metadata.collectionId,
          sourceId: metadata.sourceId,
          sourceName: metadata.sourceName,
          q: content, // Use extracted content as 'q'
          a: undefined,
        };
        
        log.info(`🔍 [1/4] Merged quote[${id}]:`, {
          id: quote.id,
          sourceName: quote.sourceName,
          contentLength: content.length,
          contentPreview: content.substring(0, 150) + '...',
        });
        
        return quote;
      });
      
      const totalQuoteChars = quoteList.reduce((sum, q) => sum + (q.q?.length || 0), 0);
      log.info(`🔍 [1/4] SUMMARY: Extracted ${quoteList.length} quote chunks (${totalQuoteChars} chars total) from FastGPT response`);
      
      if (totalQuoteChars === 0) {
        log.error('🔍 [1/4] ⚠️ CRITICAL: All quotes have 0 content after merging!');
      }
    } else {
      log.warn('🔍 [1/4] No quote metadata found in datasetSearchNode');
    }

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
      quoteList,
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
