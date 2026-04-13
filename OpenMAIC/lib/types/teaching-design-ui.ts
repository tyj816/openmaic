// 教学设计 UI 层类型定义
// 这些类型仅用于前端 UI 状态管理，不涉及业务逻辑

export interface ProjectSummary {
  subject: string;
  grade: string;
  topic: string;
  duration: string;
}

export interface IntentMessage {
  id: number;
  role: "ai" | "teacher";
  title: string;
  content: string;
  meta: string;
}

export interface UploadedFile {
  id: number;
  name: string;
  type: string;
  size: string;
  status: string;
}

export interface Slide {
  id: number;
  type: string;
  title: string;
  tag: string;
  status: string;
  desc: string;
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
}

export interface EvidenceItem {
  type: string;
  chunkId: string;
  content: string;
}

export interface WorkflowStep {
  label: string;
  done: boolean;
  active: boolean;
}
