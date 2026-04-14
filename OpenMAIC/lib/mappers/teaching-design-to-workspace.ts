import type { TeachingDesign, TeachingSlide, KeyPointWithSource } from '@/lib/types/teaching';
import type { DesignSummary, EvidenceItem, LessonSection, Slide, WorkflowStep, WorkspaceViewModel } from '@/lib/types/teaching-design-ui';

function formatDate(value: Date | string | undefined): string {
  if (!value) return '刚刚';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '刚刚';
  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function mapKeyPointContent(keyPoint: string | KeyPointWithSource): string {
  return typeof keyPoint === 'string' ? keyPoint : keyPoint.content;
}

function mapSlideType(type?: TeachingSlide['type']): string {
  switch (type) {
    case 'cover':
      return '封面页';
    case 'transition':
      return '过渡页';
    case 'end':
      return '总结页';
    case 'contents':
      return '目录页';
    default:
      return '讲解页';
  }
}

function summarizeCanvas(slide: TeachingSlide): string | undefined {
  const elementCount = slide.canvas?.elements?.length ?? 0;
  if (!slide.canvas) return undefined;
  return `已有画布数据 · ${elementCount} 个元素`;
}

function mapSlides(slides: TeachingDesign['slides']): Slide[] {
  return slides.map((slide, index) => ({
    id: slide.id,
    type: mapSlideType(slide.type),
    title: slide.title,
    tag: `P${index + 1}`,
    status: slide.canvas ? '已完成' : '已生成',
    desc: slide.description || mapKeyPointContent(slide.keyPoints[0] || '待补充页面摘要'),
    pageNo: index + 1,
    bullets: slide.keyPoints.map(mapKeyPointContent).slice(0, 5),
    narration: slide.narration,
    hasCanvas: !!slide.canvas,
    canvasSummary: summarizeCanvas(slide),
  }));
}

function mapLessonSections(design: TeachingDesign): LessonSection[] {
  if (design.procedures.length > 0) {
    return design.procedures.map((procedure) => ({
      id: procedure.id,
      title: procedure.stageName,
      detail: `${procedure.duration} 分钟 · ${procedure.teacherActivity}`,
    }));
  }

  return [
    {
      id: 'objectives',
      title: '教学目标',
      detail: design.objectives.knowledge[0] || '已生成教学目标',
    },
    {
      id: 'key-points',
      title: '教学重点',
      detail: design.keyPoints[0] || '已生成教学重点',
    },
  ];
}

function mapEvidenceItems(design: TeachingDesign): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  for (const slide of design.slides) {
    for (const keyPoint of slide.keyPoints) {
      const normalized = typeof keyPoint === 'string' ? { content: keyPoint } : keyPoint;
      const source = normalized.source || 'teacher';
      items.push({
        type:
          source === 'knowledge'
            ? '知识库'
            : source === 'material'
              ? '上传资料'
              : '教师需求',
        chunkId: normalized.ragChunkId || normalized.sourceDetail || `${slide.id}-${items.length + 1}`,
        content: normalized.content,
        slideId: slide.id,
        slideTitle: slide.title,
        source,
        sourceDetail: normalized.sourceDetail,
      });
    }
  }

  return items;
}

function mapWorkflowSteps(): WorkflowStep[] {
  return [
    { label: '阶段1：已完成', done: true, active: false },
    { label: '阶段2：已完成', done: true, active: false },
    { label: '当前：预览与修改', done: false, active: true },
  ];
}

function mapDesignSummary(design: TeachingDesign): DesignSummary {
  return {
    title: design.title,
    version: `V${design.version}.0`,
    updatedAt: formatDate(design.updatedAt),
    goals: [
      ...design.objectives.knowledge,
      ...design.objectives.skills,
      ...design.objectives.attitude,
    ].slice(0, 6),
    highlights: design.keyPoints,
    difficulties: design.difficulties,
    ...(design.boardDesign ? { boardDesign: design.boardDesign } : {}),
    ...(design.homework ? { homework: design.homework } : {}),
  };
}

export function mapTeachingDesignToWorkspace(design: TeachingDesign): WorkspaceViewModel {
  return {
    designSummary: mapDesignSummary(design),
    slides: mapSlides(design.slides),
    lessonSections: mapLessonSections(design),
    evidenceItems: mapEvidenceItems(design),
    workflowSteps: mapWorkflowSteps(),
  };
}
