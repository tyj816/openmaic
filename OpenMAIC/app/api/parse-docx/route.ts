import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import type { ParsedImage } from '@/lib/types/teaching';

const log = createLogger('Parse DOCX');

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      log.error('Invalid Content-Type for DOCX upload:', contentType);
      return apiError(
        'INVALID_REQUEST',
        400,
        `Invalid Content-Type: expected multipart/form-data, got "${contentType}"`,
      );
    }

    const formData = await req.formData();
    const docxFile = formData.get('docx') as File | null;

    if (!docxFile) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'No DOCX file provided');
    }

    // Convert DOCX to buffer
    const arrayBuffer = await docxFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse DOCX using mammoth
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });

    // Extract images (if any)
    const imageResult = await mammoth.convertToHtml({ buffer });
    const images: ParsedImage[] = [];
    
    // Parse images from HTML (mammoth embeds images as base64)
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;
    let imageIndex = 0;
    
    while ((match = imgRegex.exec(imageResult.value)) !== null) {
      const src = match[1];
      if (src.startsWith('data:image')) {
        images.push({
          id: `docx_img_${imageIndex++}`,
          src,
          description: `DOCX 文档中的图片 ${imageIndex}`,
        });
      }
    }

    log.info(`DOCX parsed: ${result.value.length} chars, ${images.length} images`);

    return apiSuccess({
      data: {
        text: result.value,
        images,
        metadata: {
          fileName: docxFile.name,
          fileSize: docxFile.size,
          imageCount: images.length,
        },
      },
    });
  } catch (error) {
    log.error('Error parsing DOCX:', error);
    return apiError('PARSE_FAILED', 500, error instanceof Error ? error.message : 'Unknown error');
  }
}
