import { nanoid } from 'nanoid';
import { queryFastGPT } from '@/lib/ai/fastgpt-client';
import { buildTeachingContextBundle } from './teaching-context-builder';
import { parseTeachingMaterials } from './teaching-material-parser';
import { generateSceneOutlinesFromRequirements } from './outline-generator';
import { generateSceneContent } from './scene-generator';
import { buildCompleteScene } from './scene-builder';
import type { AICallFn, GenerationCallbacks, GenerationResult } from './pipeline-types';
import type { ImageMapping, PdfImage, SceneOutline, UserRequirements } from '@/lib/types/generation';
import type { ContentBlock, KeyPointWithSource, RagChunk, ReferenceMaterial, TeachingDesign, TeachingProcedure, TeachingRequest, TeachingSlide } from '@/lib/types/teaching';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingSceneWorkflow');

function buildKnowledgeQuery(request: TeachingRequest) {
  return [
    '请基于知识库，为以下教学任务提供可直接用于课件设计的知识支持：',
    `学科：${request.subject}`,
    `课题：${request.topic}`,
    `年级：${request.gradeLevel}`,
    `课时：${request.duration}分钟`,
    request.objectives?.knowledge?.length ? `知识目标：${request.objectives.knowledge.join('；')}` : '',
    request.objectives?.skills?.length ? `能力目标：${request.objectives.skills.join('；')}` : '',
    request.additionalNotes ? `补充要求：${request.additionalNotes}` : '',
    '请重点输出：核心知识点、适合课件呈现的例子、易错点、总结建议。',
  ].filter(Boolean).join('\n');
}

function buildRequirements(request: TeachingRequest, mergedContext: string, summaries: string[], imageCount: number): UserRequirements {
  const objectives = [
    ...(request.objectives?.knowledge || []),
    ...(request.objectives?.skills || []),
    ...(request.objectives?.attitude || []),
  ];
  return {
    language: request.language,
    requirement: [
      `请为${request.gradeLevel}${request.subject}《${request.topic}》生成正式教学PPT。`,
      `课时约${request.duration}分钟。`,
      '只生成内容讲解页，不要生成封面页、目录页、总结页，这三类页面由系统自动补充。',
      '系统还会自动补充 1 页“课堂小测”，用于比赛版的课堂检测展示。',
      '只允许 slide 类型，不要输出 quiz、interactive、pbl。',
      '每页要有明确的教学目的，内容饱满、结构清晰、适合课堂展示。',
      objectives.length ? `教学目标：${objectives.join('；')}` : '',
      request.additionalNotes ? `教师补充：${request.additionalNotes}` : '',
      summaries.length ? `参考资料：${summaries.join('；')}` : '',
      imageCount > 0 ? `共有 ${imageCount} 张参考图片可供使用，请优先在合适页面图文结合。` : '',
      '以下是三源融合上下文，请充分利用：',
      mergedContext,
    ].filter(Boolean).join('\n'),
  };
}

function bodyOutlines(raw: SceneOutline[], request: TeachingRequest, ragChunks?: RagChunk[]) {
  const normalized = raw.filter((o) => o.title?.trim()).slice(0, 6).map((o, i) => ({
    ...o,
    id: o.id || nanoid(),
    type: 'slide' as const,
    order: i + 1,
    description: o.description || `围绕“${o.title}”展开课堂讲解。`,
    keyPoints: o.keyPoints?.length ? o.keyPoints.slice(0, 5) : [`理解${o.title}的核心内容`],
    teachingObjective: o.teachingObjective || o.keyPoints?.[0] || `掌握${o.title}的核心内容`,
    suggestedImageIds: o.suggestedImageIds?.slice(0, 2),
    quizConfig: undefined,
    interactiveConfig: undefined,
    pblConfig: undefined,
  }));
  if (normalized.length) return normalized;
  const fallback = request.objectives?.knowledge?.slice(0, 3) || ragChunks?.slice(0, 3).map((c) => c.content.slice(0, 20)) || ['核心知识', '重点分析', '课堂应用'];
  return fallback.map((title, i) => ({ id: nanoid(), type: 'slide' as const, title, description: `围绕“${title}”展开课堂讲解。`, keyPoints: [title], teachingObjective: title, order: i + 1, language: request.language }));
}

function buildQuizKeyPoints(sourceSlides: SceneOutline[]) {
  const sourcePoints = Array.from(
    new Set(
      sourceSlides
        .flatMap((o) => o.keyPoints)
        .filter((p) => typeof p === 'string' && p.trim().length > 0),
    ),
  ).slice(0, 3);
  return sourcePoints.map((point, index) => {
    const cleanPoint = point.replace(/^问题\d+[:：]\s*/, '').trim();
    const answerHint = cleanPoint.length > 16 ? cleanPoint.slice(0, 16) : cleanPoint;
    return `第${index + 1}题｜围绕“${cleanPoint}”设计 1 个检测问题\n参考答案：${answerHint}`;
  });
}

function fullOutlines(request: TeachingRequest, bodies: SceneOutline[]) {
  const cover: SceneOutline = { id: nanoid(), type: 'slide', title: request.topic, description: '课程封面页。', keyPoints: [request.subject, request.gradeLevel, `${request.duration}分钟课堂`], teachingObjective: `明确本节课主题：${request.topic}`, order: 1, language: request.language };
  const contents: SceneOutline = { id: nanoid(), type: 'slide', title: '本课结构', description: '目录页。', keyPoints: bodies.map((o) => o.title).slice(0, 5), teachingObjective: '帮助学生形成整体学习框架', order: 2, language: request.language };
  const middle = bodies.map((o, i) => ({ ...o, order: i + 3, language: request.language }));
  const quiz: SceneOutline = {
    id: nanoid(),
    type: 'slide',
    title: '课堂小测',
    description: '课堂检测页，用于用 2-3 个小问题帮助学生快速回顾并检验理解。',
    keyPoints: buildQuizKeyPoints(bodies),
    teachingObjective: '通过轻量测验完成课堂即时检测',
    order: middle.length + 3,
    language: request.language,
  };
  const end: SceneOutline = { id: nanoid(), type: 'slide', title: '课堂总结', description: '总结页。', keyPoints: Array.from(new Set(middle.flatMap((o) => o.keyPoints))).slice(0, 4), teachingObjective: '帮助学生完成知识回顾与总结', order: middle.length + 4, language: request.language };
  return [cover, contents, ...middle, quiz, end];
}

function slideType(index: number, total: number): TeachingSlide['type'] {
  if (index === 0) return 'cover';
  if (index === 1) return 'contents';
  if (index === total - 1) return 'end';
  return 'content';
}

function isQuizLikeOutline(outline: SceneOutline) {
  return /小测|检测|练习|quiz/i.test(outline.title) || /检测|问题/.test(outline.description || '');
}

function tokens(content: string) {
  return content.split(/[，。；：、“”‘’《》\s,.;:()（）【】\-]+/).map((v) => v.trim()).filter((v) => v.length >= 2).slice(0, 6);
}

function sourceOf(content: string, request: TeachingRequest, materialText: string, ragChunks?: RagChunk[]): KeyPointWithSource {
  if (typeof content !== 'string') {
    return { content: String(content), source: 'teacher', sourceDetail: '教学系统生成' };
  }
  const ks = tokens(content);
  const teacherText = [request.topic, ...(request.objectives?.knowledge || []), ...(request.objectives?.skills || []), request.additionalNotes || ''].join(' ');
  const chunk = ragChunks?.find((c) => ks.some((k) => c.content.includes(k)));
  if (chunk) return { content, source: 'knowledge', ragChunkId: chunk.id, sourceDetail: chunk.sourceName ? `知识库：${chunk.sourceName}` : '知识库检索结果' };
  if (ks.some((k) => materialText.includes(k))) return { content, source: 'material', sourceDetail: '来自上传参考资料' };
  if (ks.some((k) => teacherText.includes(k))) return { content, source: 'teacher', sourceDetail: '来自教师需求' };
  
  return { content, source: 'teacher', sourceDetail: '教学系统生成' };

}

function buildQuizCanvas(slideId: string, title: string, keyPoints: KeyPointWithSource[]) {
  const cardTop = 150;
  const cardHeight = 108;
  const gap = 18;
  const colors = ['#EEF2FF', '#ECFDF5', '#FFF7ED'];
  const accents = ['#4F46E5', '#059669', '#EA580C'];

  const elements: any[] = [
    {
      id: `${slideId}_quiz_title`,
      type: 'text',
      left: 72,
      top: 54,
      width: 856,
      height: 68,
      rotate: 0,
      defaultFontName: 'Microsoft YaHei',
      defaultColor: '#0F172A',
      content: `<p style="font-size:30px;font-weight:700;">${title}</p><p style="font-size:16px;color:#475569;">请学生快速作答，检测本课核心理解</p>`,
    },
  ];

  keyPoints.slice(0, 3).forEach((point, index) => {
    const top = cardTop + index * (cardHeight + gap);
    const answer = point.content.split('参考答案：')[1]?.trim() || '请依据课堂内容作答';
    const questionText = point.content.split('参考答案：')[0]?.trim() || point.content;
    elements.push(
      {
        id: `${slideId}_quiz_shape_${index + 1}`,
        type: 'shape',
        left: 72,
        top,
        width: 856,
        height: cardHeight,
        rotate: 0,
        viewBox: '0 0 856 108',
        path: 'M0 18 C0 8 8 0 18 0 L838 0 C848 0 856 8 856 18 L856 90 C856 100 848 108 838 108 L18 108 C8 108 0 100 0 90 Z',
        fill: colors[index % colors.length],
        fixedRatio: false,
      },
      {
        id: `${slideId}_quiz_badge_${index + 1}`,
        type: 'shape',
        left: 92,
        top: top + 18,
        width: 88,
        height: 30,
        rotate: 0,
        viewBox: '0 0 88 30',
        path: 'M15 0 L73 0 C81 0 88 7 88 15 C88 23 81 30 73 30 L15 30 C7 30 0 23 0 15 C0 7 7 0 15 0 Z',
        fill: accents[index % accents.length],
        fixedRatio: false,
      },
      {
        id: `${slideId}_quiz_badge_text_${index + 1}`,
        type: 'text',
        left: 108,
        top: top + 23,
        width: 58,
        height: 20,
        rotate: 0,
        defaultFontName: 'Microsoft YaHei',
        defaultColor: '#FFFFFF',
        content: `<p style="font-size:13px;font-weight:700;text-align:center;">第 ${index + 1} 题</p>`,
      },
      {
        id: `${slideId}_quiz_question_${index + 1}`,
        type: 'text',
        left: 196,
        top: top + 18,
        width: 700,
        height: 42,
        rotate: 0,
        defaultFontName: 'Microsoft YaHei',
        defaultColor: '#0F172A',
        content: `<p style="font-size:18px;font-weight:600;">${questionText}</p>`,
      },
      {
        id: `${slideId}_quiz_answer_${index + 1}`,
        type: 'text',
        left: 196,
        top: top + 62,
        width: 620,
        height: 24,
        rotate: 0,
        defaultFontName: 'Microsoft YaHei',
        defaultColor: '#475569',
        content: `<p style="font-size:14px;">参考答案：${answer}</p>`,
      },
      {
        id: `${slideId}_quiz_mark_${index + 1}`,
        type: 'text',
        left: 826,
        top: top + 58,
        width: 70,
        height: 24,
        rotate: 0,
        defaultFontName: 'Microsoft YaHei',
        defaultColor: accents[index % accents.length],
        content: `<p style="font-size:13px;font-weight:700;text-align:right;">即时检测</p>`,
      },
    );
  });

  return {
    id: slideId,
    viewportSize: 1000,
    viewportRatio: 0.5625,
    theme: {
      backgroundColor: '#ffffff',
      themeColors: ['#4F46E5', '#059669', '#EA580C', '#0F172A', '#475569'],
      fontColor: '#0F172A',
      fontName: 'Microsoft YaHei',
      outline: { color: '#D1D5DB', width: 1, style: 'solid' as const },
      shadow: { h: 0, v: 0, blur: 8, color: '#000000' },
    },
    background: {
      type: 'gradient' as const,
      gradient: {
        type: 'linear' as const,
        rotate: 135,
        colors: [
          { pos: 0, color: '#F8FAFC' },
          { pos: 100, color: '#EEF2FF' },
        ],
      },
    },
    elements,
  };
}

function blocks(slide: TeachingSlide): ContentBlock[] {
  const quizLike = /小测|检测|练习|quiz/i.test(slide.title) || /检测|问题/.test(slide.description || '');
  const result: ContentBlock[] = slide.keyPoints.map((p, i) => ({
    id: `${slide.id}_text_${i + 1}`,
    type: 'text' as const,
    text: { 
      content: p.content, 
      style: (quizLike ? 'body' : i === 0 ? 'subtitle' : 'bullet') as 'body' | 'subtitle' | 'bullet'
    },
  }));
  if (slide.suggestedImageIds?.[0] && !quizLike) {
    result.push({ 
      id: `${slide.id}_image_1`, 
      type: 'image' as const, 
      image: { src: slide.suggestedImageIds[0], caption: '参考配图' } 
    });
  }
  return result;
}


function procedures(slides: TeachingSlide[], duration: number): TeachingProcedure[] {
  const d = Math.max(2, Math.round(duration / Math.max(slides.length, 1)));
  return slides.map((slide, i) => ({ id: `${slide.id}_procedure`, order: i + 1, stageName: slide.title, duration: d, teacherActivity: slide.description || `围绕“${slide.title}”组织教学讲解。`, studentActivity: '跟随讲解理解要点，并完成课堂思考。', relatedSlides: [slide.id], designIntent: slide.teachingObjective }));
}

function difficulties(request: TeachingRequest, ragChunks?: RagChunk[]) {
  return Array.from(new Set([...(request.objectives?.skills || []).slice(0, 2), ...((ragChunks || []).map((c) => c.content).filter((c) => /难点|易错|误区|重点/.test(c)).slice(0, 2).map((c) => c.slice(0, 24)))]));
}

export async function generateTeachingDesignWithSceneWorkflow(request: TeachingRequest, materials: ReferenceMaterial[] | undefined, aiCall: AICallFn, callbacks?: GenerationCallbacks, options?: { imageMapping?: ImageMapping; visionEnabled?: boolean; researchContext?: string; }): Promise<GenerationResult<TeachingDesign>> {
  try {
    const parsedMaterials = await parseTeachingMaterials(materials || []);
    const pdfImages: PdfImage[] = parsedMaterials.images.map((img, i) => ({ id: img.id || `img_${i + 1}`, src: img.src, pageNumber: img.pageNumber || 1, description: img.description, width: img.width, height: img.height }));
    let ragContext = '';
    let ragChunks: RagChunk[] | undefined;
    if (request.useKnowledgeBase) {
      try {
        const result = await queryFastGPT(buildKnowledgeQuery(request), { timeoutMs: 300000 });
        ragContext = result.answer;
        ragChunks = result.quoteList?.map((q) => ({ id: q.id, content: q.q || q.a || '', sourceName: q.sourceName, chunkIndex: q.chunkIndex }));
      } catch (error) {
        log.warn('Knowledge base query failed:', error);
      }
    }
    const bundle = buildTeachingContextBundle(request, parsedMaterials, ragContext, ragChunks);
    log.info('[4/4] Starting scene outlines generation...');
    const requirements = buildRequirements(request, bundle.mergedContext, parsedMaterials.summaries, pdfImages.length);
    log.info(`[4/4] Requirements built: ${requirements.requirement.length} chars`);
    const outlineRes = await generateSceneOutlinesFromRequirements(requirements, parsedMaterials.textContent, pdfImages, aiCall, callbacks, { visionEnabled: options?.visionEnabled, imageMapping: options?.imageMapping, imageGenerationEnabled: true, videoGenerationEnabled: false, researchContext: options?.researchContext || bundle.retrievedKnowledge.relevantChunks.join('\n\n') || ragContext || '无', teacherContext: '请以正式课堂PPT为目标输出内容页，重视信息完整性和版面表现。' });
    log.info('[4/4] Scene outlines generation completed');
    if (!outlineRes.success || !outlineRes.data) return { success: false, error: outlineRes.error || '生成内容页结构失败' };
    const outlines = fullOutlines(request, bodyOutlines(outlineRes.data, request, ragChunks));
    const slides: TeachingSlide[] = [];
    const stageId = `teaching_${nanoid(8)}`;
    for (let i = 0; i < outlines.length; i += 1) {
      const outline = outlines[i];
      log.info(`[${i + 1}/${outlines.length}] Generating content for: ${outline.title}`);
      const quizLike = isQuizLikeOutline(outline);
      const assigned = !quizLike && outline.suggestedImageIds?.length ? pdfImages.filter((img) => outline.suggestedImageIds?.includes(img.id)) : undefined;
      log.info(`[${i + 1}/${outlines.length}] Calling generateSceneContent...`);
      const content = await generateSceneContent(outline, aiCall, assigned, options?.imageMapping, undefined, options?.visionEnabled, undefined, undefined);
      log.info(`[${i + 1}/${outlines.length}] Scene content generated, building complete scene...`);
      if (!content || !('elements' in content)) continue;
      const scene = buildCompleteScene(outline, content, [], stageId);
      const keyPoints = outline.keyPoints.map((p) => sourceOf(p, request, parsedMaterials.textContent, ragChunks));
      const slide: TeachingSlide = {
        id: scene?.id || outline.id,
        order: slides.length + 1,
        title: outline.title,
        description: outline.description,
        type: slideType(i, outlines.length),
        teachingObjective: outline.teachingObjective,
        visualIntent: i === 0 ? '封面导入' : i === 1 ? '目录概览' : i === outlines.length - 1 ? '总结回顾' : quizLike ? '课堂检测' : outline.suggestedImageIds?.length ? '图文讲解' : '要点讲解',
        preferredLayout: i === 0 ? 'hero' : i === 1 ? 'summary' : quizLike ? 'steps' : outline.suggestedImageIds?.length ? 'two-column' : 'summary',
        densityHint: i === 0 ? 'sparse' : quizLike ? 'balanced' : 'balanced',
        suggestedImageIds: quizLike ? undefined : outline.suggestedImageIds,
        keyPoints,
        contentBlocks: [],
        narration: content.remark,
        canvas: quizLike
          ? buildQuizCanvas(scene?.id || outline.id, outline.title, keyPoints)
          : scene?.content.type === 'slide'
            ? scene.content.canvas
            : undefined,
      };
      slide.contentBlocks = blocks(slide);
      slides.push(slide);
      callbacks?.onProgress?.({ currentStage: 1, overallProgress: 45 + Math.floor(((i + 1) / outlines.length) * 55), stageProgress: 45 + Math.floor(((i + 1) / outlines.length) * 55), statusMessage: `正在生成第 ${i + 1}/${outlines.length} 页：${outline.title}`, scenesGenerated: i + 1, totalScenes: outlines.length });
    }
    const keyPoints = Array.from(new Set(slides.flatMap((s) => s.keyPoints.map((p) => p.content)))).slice(0, 6);
    return {
      success: true,
      data: {
        id: `teaching_design_${nanoid(8)}`,
        title: request.topic,
        subject: request.subject,
        gradeLevel: request.gradeLevel,
        duration: request.duration,
        objectives: { knowledge: request.objectives?.knowledge || keyPoints.slice(0, 3), skills: request.objectives?.skills || ['能够概括本课核心知识并完成课堂应用'], attitude: request.objectives?.attitude || ['形成清晰的知识结构与学习反思'] },
        keyPoints,
        difficulties: difficulties(request, ragChunks),
        slides,
        procedures: procedures(slides, request.duration),
        homework: ['结合本课内容完成课后巩固练习。'],
        remarks: request.additionalNotes,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
    };
  } catch (error) {
    log.error('Teaching scene workflow failed:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
