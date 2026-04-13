/**
 * API Route: Generate DOCX teaching plan from TeachingDesign
 * 
 * POST /api/generate-docx
 * Body: { teachingDesign: TeachingDesign }
 * Returns: DOCX file download
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDocxFromTeachingDesign } from '@/lib/generation/docx-generator';
import type { TeachingDesign } from '@/lib/types/teaching';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teachingDesign } = body as { teachingDesign: TeachingDesign };

    if (!teachingDesign) {
      return NextResponse.json(
        { error: 'Missing teachingDesign in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!teachingDesign.title || !teachingDesign.slides || teachingDesign.slides.length === 0) {
      return NextResponse.json(
        { error: 'Invalid teachingDesign: missing title or slides' },
        { status: 400 }
      );
    }

    // Generate DOCX
    const buffer = await generateDocxFromTeachingDesign(teachingDesign);

    // Generate filename
    const filename = `${teachingDesign.title}_教案.docx`;
    const encodedFilename = encodeURIComponent(filename);

    // Return file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('DOCX generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate DOCX',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
