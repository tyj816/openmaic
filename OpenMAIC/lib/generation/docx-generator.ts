/**
 * DOCX Generator - Generate Word teaching plan from TeachingDesign
 * 
 * Converts TeachingDesign structure to a formatted Word document (.docx)
 * Preserves source tracking (teacher/material/knowledge) for transparency
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  convertInchesToTwip,
  AlignmentType as NumberingAlignment,
  LevelFormat,
} from 'docx';
import type { TeachingDesign, KeyPointWithSource } from '@/lib/types/teaching';
import { createLogger } from '@/lib/logger';

const log = createLogger('DocxGenerator');

/**
 * Check if content already contains source label
 */
function hasSourceLabel(content: string): boolean {
  return /[（(]来自知识库片段\d+[）)]|[（(]来自参考资料[）)]|[（(]教师设计[）)]/.test(content);
}

/**
 * Format source label for display
 * Unified format: knowledge -> (来自知识库片段X), material -> (来自参考资料), teacher -> (教师设计)
 * Only adds label if content doesn't already contain one
 */
function formatSourceLabel(content: string, source?: 'teacher' | 'material' | 'knowledge', ragChunkId?: string): string {
  // If content already has a source label, don't add another
  if (hasSourceLabel(content)) {
    return '';
  }
  
  if (!source) return '';
  
  switch (source) {
    case 'teacher':
      return '（教师设计）';
    case 'material':
      return '（来自参考资料）';
    case 'knowledge':
      // Don't add ragChunkId-based label since LLM already added numbered label
      return '';
    default:
      return '';
  }
}

/**
 * Deduplicate source labels to avoid repetition
 */
function deduplicateSourceLabels(items: Array<{ content: string; source?: string; ragChunkId?: string }>): Array<{ content: string; source?: string; ragChunkId?: string }> {
  const seen = new Set<string>();
  return items.map(item => {
    const key = `${item.source}-${item.ragChunkId || ''}`;
    if (seen.has(key) && item.source) {
      // Remove source for duplicates
      return { ...item, source: undefined, ragChunkId: undefined };
    }
    if (item.source) {
      seen.add(key);
    }
    return item;
  });
}

/**
 * Create a heading paragraph with consistent styling
 */
function createHeading(text: string, level: HeadingLevel): Paragraph {
  const spacingConfig = {
    [HeadingLevel.TITLE]: { before: 0, after: 360 },
    [HeadingLevel.HEADING_1]: { before: 360, after: 180 },
    [HeadingLevel.HEADING_2]: { before: 240, after: 120 },
    [HeadingLevel.HEADING_3]: { before: 180, after: 100 },
  };

  return new Paragraph({
    text,
    heading: level,
    spacing: spacingConfig[level] || { before: 240, after: 120 },
  });
}

/**
 * Create a normal paragraph with consistent spacing
 */
function createParagraph(text: string, options?: {
  bold?: boolean;
  indent?: number;
  spacing?: { before?: number; after?: number };
}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        font: '宋体',
      }),
    ],
    indent: options?.indent ? {
      left: convertInchesToTwip(options.indent),
    } : undefined,
    spacing: {
      before: options?.spacing?.before ?? 100,
      after: options?.spacing?.after ?? 100,
      line: 360, // 1.5 line spacing
    },
  });
}

/**
 * Create a numbered list item
 */
function createNumberedItem(text: string, level: number = 0): Paragraph {
  return new Paragraph({
    text,
    numbering: {
      reference: 'default-numbering',
      level,
    },
    spacing: {
      before: 80,
      after: 80,
      line: 360,
    },
  });
}

/**
 * Create a bullet list item with consistent styling
 */
function createBulletItem(text: string, level: number = 0): Paragraph {
  return new Paragraph({
    text,
    bullet: {
      level,
    },
    spacing: {
      before: 80,
      after: 80,
      line: 360,
    },
  });
}

/**
 * Create basic information table
 */
function createBasicInfoTable(design: TeachingDesign): Table {
  const rows = [
    new TableRow({
      children: [
        new TableCell({
          children: [createParagraph('课题', { bold: true })],
          width: { size: 20, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [createParagraph(design.title)],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [createParagraph('学科', { bold: true })],
          width: { size: 20, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [createParagraph(design.subject)],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [createParagraph('年级', { bold: true })],
        }),
        new TableCell({
          children: [createParagraph(design.gradeLevel)],
        }),
        new TableCell({
          children: [createParagraph('课时', { bold: true })],
        }),
        new TableCell({
          children: [createParagraph(`${design.duration} 分钟`)],
        }),
      ],
    }),
  ];

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

/**
 * Create objectives section with numbered lists
 */
function createObjectivesSection(design: TeachingDesign): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createHeading('一、教学目标', HeadingLevel.HEADING_2),
  ];

  let itemNumber = 1;

  if (design.objectives.knowledge && design.objectives.knowledge.length > 0) {
    paragraphs.push(createHeading('知识与技能', HeadingLevel.HEADING_3));
    design.objectives.knowledge.forEach(item => {
      paragraphs.push(createNumberedItem(item));
    });
    itemNumber++;
  }

  if (design.objectives.skills && design.objectives.skills.length > 0) {
    paragraphs.push(createHeading('过程与方法', HeadingLevel.HEADING_3));
    design.objectives.skills.forEach(item => {
      paragraphs.push(createNumberedItem(item));
    });
    itemNumber++;
  }

  if (design.objectives.attitude && design.objectives.attitude.length > 0) {
    paragraphs.push(createHeading('情感态度与价值观', HeadingLevel.HEADING_3));
    design.objectives.attitude.forEach(item => {
      paragraphs.push(createNumberedItem(item));
    });
  }

  return paragraphs;
}

/**
 * Create key points and difficulties section with unified list style
 */
function createKeyPointsSection(design: TeachingDesign): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createHeading('二、教学重难点', HeadingLevel.HEADING_2),
  ];

  if (design.keyPoints && design.keyPoints.length > 0) {
    paragraphs.push(createHeading('教学重点', HeadingLevel.HEADING_3));
    design.keyPoints.forEach(item => {
      paragraphs.push(createBulletItem(item));
    });
  }

  if (design.difficulties && design.difficulties.length > 0) {
    paragraphs.push(createHeading('教学难点', HeadingLevel.HEADING_3));
    design.difficulties.forEach(item => {
      paragraphs.push(createBulletItem(item));
    });
  }

  return paragraphs;
}

/**
 * Create teaching process section from slides with deduplicated sources
 */
function createTeachingProcessSection(design: TeachingDesign): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createHeading('三、教学过程', HeadingLevel.HEADING_2),
  ];

  design.slides.forEach((slide, index) => {
    // Slide title as stage heading
    paragraphs.push(
      createHeading(`环节${index + 1}：${slide.title}`, HeadingLevel.HEADING_3)
    );

    // Slide description (teaching purpose)
    if (slide.description) {
      paragraphs.push(
        createParagraph(`【教学目的】${slide.description}`)
      );
    }

    // Key points with source tracking (deduplicated)
    if (slide.keyPoints && slide.keyPoints.length > 0) {
      paragraphs.push(
        createParagraph('【教学内容】', { bold: true })
      );

      // Deduplicate sources within this slide
      const deduplicatedPoints = deduplicateSourceLabels(slide.keyPoints);
      
      deduplicatedPoints.forEach((kp: KeyPointWithSource) => {
        const sourceLabel = formatSourceLabel(kp.content, kp.source, kp.ragChunkId);
        const fullText = `${kp.content}${sourceLabel}`;
        paragraphs.push(createBulletItem(fullText));
      });
    }

    // Narration (speaker notes)
    if (slide.narration) {
      paragraphs.push(
        createParagraph('【教师讲解】', { bold: true })
      );
      paragraphs.push(
        createParagraph(slide.narration, { indent: 0.3 })
      );
    }
  });

  return paragraphs;
}

/**
 * Create procedures section with fixed bold labels
 */
function createProceduresSection(design: TeachingDesign): Paragraph[] {
  if (!design.procedures || design.procedures.length === 0) {
    return [];
  }

  const paragraphs: Paragraph[] = [
    createHeading('四、教学环节详细设计', HeadingLevel.HEADING_2),
  ];

  design.procedures.forEach((proc, index) => {
    paragraphs.push(
      createHeading(`${index + 1}. ${proc.stageName}（${proc.duration}分钟）`, HeadingLevel.HEADING_3)
    );

    if (proc.teacherActivity) {
      paragraphs.push(
        createParagraph('【教师活动】', { bold: true })
      );
      paragraphs.push(
        createParagraph(proc.teacherActivity, { indent: 0.3 })
      );
    }

    if (proc.studentActivity) {
      paragraphs.push(
        createParagraph('【学生活动】', { bold: true })
      );
      paragraphs.push(
        createParagraph(proc.studentActivity, { indent: 0.3 })
      );
    }

    if (proc.designIntent) {
      paragraphs.push(
        createParagraph('【设计意图】', { bold: true })
      );
      paragraphs.push(
        createParagraph(proc.designIntent, { indent: 0.3 })
      );
    }
  });

  return paragraphs;
}

/**
 * Create homework section with unified list style
 */
function createHomeworkSection(design: TeachingDesign): Paragraph[] {
  if (!design.homework || design.homework.length === 0) {
    return [];
  }

  const paragraphs: Paragraph[] = [
    createHeading('五、课后作业', HeadingLevel.HEADING_2),
  ];

  design.homework.forEach(item => {
    paragraphs.push(createBulletItem(item));
  });

  return paragraphs;
}

/**
 * Create board design section
 */
function createBoardDesignSection(design: TeachingDesign): Paragraph[] {
  if (!design.boardDesign) {
    return [];
  }

  return [
    createHeading('六、板书设计', HeadingLevel.HEADING_2),
    createParagraph(design.boardDesign),
  ];
}

/**
 * Create remarks section
 */
function createRemarksSection(design: TeachingDesign): Paragraph[] {
  if (!design.remarks) {
    return [];
  }

  return [
    createHeading('七、教学反思', HeadingLevel.HEADING_2),
    createParagraph(design.remarks),
  ];
}

/**
 * Generate DOCX from TeachingDesign
 * 
 * @param design - The teaching design to convert
 * @returns Buffer containing the DOCX file
 */
export async function generateDocxFromTeachingDesign(design: TeachingDesign): Promise<Buffer> {
  log.info('Generating DOCX from teaching design:', {
    title: design.title,
    slideCount: design.slides.length,
    procedureCount: design.procedures?.length || 0,
  });

  try {
    // Build document sections
    const sections: Paragraph[] = [];

    // Title
    sections.push(
      new Paragraph({
        text: design.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 240,
        },
      })
    );

    // Basic information table
    const basicInfoTable = createBasicInfoTable(design);

    // Objectives
    const objectivesSection = createObjectivesSection(design);

    // Key points and difficulties
    const keyPointsSection = createKeyPointsSection(design);

    // Teaching process (from slides)
    const processSection = createTeachingProcessSection(design);

    // Procedures (detailed design)
    const proceduresSection = createProceduresSection(design);

    // Homework
    const homeworkSection = createHomeworkSection(design);

    // Board design
    const boardSection = createBoardDesignSection(design);

    // Remarks
    const remarksSection = createRemarksSection(design);

    // Create document
    const doc = new Document({
      numbering: {
        config: [
          {
            reference: 'default-numbering',
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: '%1.',
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.2) },
                  },
                },
              },
              {
                level: 1,
                format: LevelFormat.DECIMAL,
                text: '%1.%2.',
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.2) },
                  },
                },
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {},
          children: [
            ...sections,
            basicInfoTable,
            ...objectivesSection,
            ...keyPointsSection,
            ...processSection,
            ...proceduresSection,
            ...homeworkSection,
            ...boardSection,
            ...remarksSection,
          ],
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    log.info('DOCX generated successfully:', {
      bufferSize: buffer.length,
      sections: {
        objectives: objectivesSection.length > 0,
        keyPoints: keyPointsSection.length > 0,
        process: processSection.length > 0,
        procedures: proceduresSection.length > 0,
        homework: homeworkSection.length > 0,
        board: boardSection.length > 0,
        remarks: remarksSection.length > 0,
      },
    });

    return buffer;
  } catch (error) {
    log.error('Failed to generate DOCX:', error);
    throw new Error(`DOCX generation failed: ${error}`);
  }
}
