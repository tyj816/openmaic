// 教学设计 UI 层类型定义
// 这些类型仅用于前端 UI 状态管理与 ViewModel 映射

export interface ProjectSummary {
  subject: string;
  grade: string;
  topic: string;
  duration: string;
}

export interface IntentMessage {
  id: string;
  role: "ai" | "teacher";
  title: string;
  content: string;
  meta: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: string;
  status: string;
}

export interface Slide {
  id: string;
  type: string;
  title: string;
  tag: string;
  status: string;
  desc: string;
  pageNo: number;
  bullets: string[];
  narration?: string;
  hasCanvas?: boolean;
  canvasSummary?: string;
}

export interface LessonSection {
  id: string;
  title: string;
  detail: string;
}

export interface DesignSummary {
  title: string;
  version: string;
  updatedAt: string;
  goals: string[];
  highlights: string[];
  difficulties: string[];
  boardDesign?: string;
  homework?: string[];
}

export interface EvidenceItem {
  type: string;
  chunkId: string;
  content: string;
  slideId: string;
  slideTitle: string;
  source?: string;
  sourceDetail?: string;
}

export interface WorkflowStep {
  label: string;
  done: boolean;
  active: boolean;
}

export interface WorkspaceViewModel {
  designSummary: DesignSummary;
  slides: Slide[];
  lessonSections: LessonSection[];
  evidenceItems: EvidenceItem[];
  workflowSteps: WorkflowStep[];
}
