// Mock 数据：教学设计工作台页
import type {
  DesignSummary,
  Slide,
  LessonSection,
  EvidenceItem,
  WorkflowStep,
} from "@/lib/types/teaching-design-ui";

export const mockDesignSummary: DesignSummary = {
  title: "《圆明园的毁灭》教学设计",
  version: "V5.0",
  updatedAt: "今天 16:42",
  goals: [
    "理解课文主要内容与作者情感表达",
    "借助图文资料建立历史情境与价值判断",
    "通过互动讨论完成观点表达与情感迁移",
  ],
  highlights: ["图文对照导入", "问题链推进", "讨论式表达"],
  difficulties: ["情感体验迁移", "从资料到观点表达"],
  boardDesign: "辉煌 / 毁灭 / 铭记",
  homework: ["阅读反思", "表达任务"],
};

export const mockSlides: Slide[] = [
  {
    id: "1",
    pageNo: 1,
    type: "封面页",
    title: "走近《圆明园的毁灭》",
    tag: "P1",
    status: "已完成",
    desc: "课程标题、主题视觉、课时信息",
    bullets: ["课程标题", "主题视觉", "课时信息"],
    narration: "通过封面页建立课程主题氛围。",
    hasCanvas: false,
  },
  {
    id: "2",
    pageNo: 2,
    type: "导入页",
    title: "从昔日辉煌与今日遗址进入课堂",
    tag: "P2",
    status: "已完成",
    desc: "图像对比 + 引导提问",
    bullets: ["展示昔日辉煌与遗址对比", "引出课堂主题", "激发学生提问"],
    narration: "通过对比导入，建立情感冲击。",
    hasCanvas: true,
    canvasSummary: "已有画布数据 · 6 个元素",
  },
  {
    id: "3",
    pageNo: 3,
    type: "讲解页",
    title: "文本细读：辉煌与毁灭的强烈反差",
    tag: "P3",
    status: "AI生成中",
    desc: "关键词句分析、情感线索、讲解节奏",
    bullets: ["提取关键词句", "梳理情感变化", "结合资料讲解"],
    narration: "聚焦文本中的情感递进。",
    hasCanvas: false,
  },
  {
    id: "4",
    pageNo: 4,
    type: "活动页",
    title: "讨论：我们为什么要记住这段历史",
    tag: "P4",
    status: "待优化",
    desc: "任务说明、表达框架、小组互动",
    bullets: ["设置讨论问题", "小组表达", "观点汇总"],
    narration: "引导学生从资料走向表达。",
    hasCanvas: false,
  },
  {
    id: "5",
    pageNo: 5,
    type: "总结页",
    title: "课堂回顾与价值升华",
    tag: "P5",
    status: "已完成",
    desc: "结构总结、作业衔接、情感提升",
    bullets: ["回顾核心内容", "升华主题", "布置作业"],
    narration: "完成课堂闭环并衔接作业。",
    hasCanvas: false,
  },
];

export const mockLessonSections: LessonSection[] = [
  {
    id: "a",
    title: "教学目标",
    detail: "知识理解、情感体验、观点表达",
  },
  {
    id: "b",
    title: "教学过程",
    detail: "导入—细读—讨论—总结—迁移",
  },
  {
    id: "c",
    title: "板书设计",
    detail: "辉煌 / 毁灭 / 铭记",
  },
  {
    id: "d",
    title: "作业布置",
    detail: "阅读反思 + 表达任务",
  },
];

export const mockEvidenceItems: EvidenceItem[] = [
  {
    type: "教师需求",
    chunkId: "req-0012",
    content: "希望课堂中强化情感体验，同时避免说教感，增加学生表达机会。",
  },
  {
    type: "上传资料",
    chunkId: "pdf-0148",
    content: "教材批注指出应从'昔日辉煌'与'今日遗址'对比中引出价值冲击。",
  },
  {
    type: "知识库",
    chunkId: "kb-0319",
    content: "五年级语文阅读课建议采用问题链推进与图文结合，降低抽象历史理解门槛。",
  },
];

export const mockWorkflowSteps: WorkflowStep[] = [
  { label: "教师意图理解", done: true, active: false },
  { label: "资料解析", done: true, active: false },
  { label: "知识融合", done: true, active: false },
  { label: "设计生成", done: true, active: false },
  { label: "预览修订", done: false, active: true },
];

