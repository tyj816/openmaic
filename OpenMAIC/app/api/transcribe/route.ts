import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('TranscribeAPI');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: '未提供音频文件' }, { status: 400 });
    }

    // 检查环境变量中的 ASR 配置
    const qwenApiKey = process.env.ASR_QWEN_API_KEY;
    const qwenBaseUrl = process.env.ASR_QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1';

    if (!qwenApiKey) {
      return NextResponse.json(
        { error: '未配置语音识别服务，请在 .env.local 中设置 ASR_QWEN_API_KEY' },
        { status: 500 }
      );
    }

    log.info('Starting audio transcription...');

    // 将 webm 转换为 Qwen 支持的格式（如果需要）
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

    // 调用通义千问语音识别 API
    const transcribeFormData = new FormData();
    transcribeFormData.append('model', 'paraformer-v2');
    transcribeFormData.append('file', audioBlob, 'audio.webm');

    const response = await fetch(`${qwenBaseUrl}/audio/transcription`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${qwenApiKey}`,
      },
      body: transcribeFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('Transcription failed:', errorText);
      return NextResponse.json(
        { error: '语音识别失败，请重试' },
        { status: response.status }
      );
    }

    const result = await response.json();
    log.info('Transcription successful');

    // Qwen API 返回格式：{ output: { text: "..." } }
    const text = result.output?.text || result.text || '';

    if (!text) {
      return NextResponse.json({ error: '未识别到语音内容' }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    log.error('Transcription error:', error);
    return NextResponse.json(
      {
        error: '语音识别服务异常',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
