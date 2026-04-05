/**
 * FastGPT Query API Route
 * 
 * Server-side proxy for FastGPT knowledge base queries.
 * This keeps API keys secure and handles CORS issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryFastGPT } from '@/lib/ai/fastgpt-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('FastGPT-API');

export async function POST(request: NextRequest) {
  try {
    const { query, timeoutMs } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 },
      );
    }

    log.info('Received FastGPT query request');

    const result = await queryFastGPT(query, { timeoutMs });

    return NextResponse.json({
      success: true,
      answer: result.answer,
    });
  } catch (error) {
    log.error('FastGPT query failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
