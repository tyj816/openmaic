import type { IntentMessage, ProjectSummary, UploadedFile } from '@/lib/types/teaching-design-ui';
import type { ReferenceMaterial, TeachingRequest } from '@/lib/types/teaching';

export interface IntentToTeachingRequestInput {
  projectSummary: ProjectSummary;
  messages: IntentMessage[];
  materials: ReferenceMaterial[];
  language?: 'zh-CN' | 'en-US';
}

function normalizeDuration(duration: string): number {
  const match = duration.match(/(\d+)/);
  return match ? Number(match[1]) : 45;
}

function collectTeacherMessages(messages: IntentMessage[]): string[] {
  return messages
    .filter((message) => message.role === 'teacher')
    .map((message) => message.content.trim())
    .filter(Boolean);
}

function buildObjectives(teacherMessages: string[]): TeachingRequest['objectives'] {
  if (teacherMessages.length === 0) return undefined;

  const lastMessage = teacherMessages[teacherMessages.length - 1];
  const knowledge = teacherMessages.slice(0, 2);
  const skills = teacherMessages.length > 1 ? [teacherMessages[teacherMessages.length - 1]] : [lastMessage];
  const attitude = teacherMessages.some((msg) => /情感|责任|价值|表达|体验/.test(msg))
    ? [teacherMessages.find((msg) => /情感|责任|价值|表达|体验/.test(msg)) || lastMessage]
    : undefined;

  return {
    knowledge,
    skills,
    ...(attitude ? { attitude } : {}),
  };
}

function buildAdditionalNotes(teacherMessages: string[], materials: ReferenceMaterial[]): string | undefined {
  const notes: string[] = [];
  if (teacherMessages.length > 0) {
    notes.push(`教师补充：${teacherMessages.join('；')}`);
  }
  if (materials.length > 0) {
    notes.push(`已上传资料：${materials.map((material) => material.name).join('、')}`);
  }
  return notes.length > 0 ? notes.join('\n') : undefined;
}

export function mapIntentToTeachingRequest({
  projectSummary,
  messages,
  materials,
  language = 'zh-CN',
}: IntentToTeachingRequestInput): TeachingRequest {
  const teacherMessages = collectTeacherMessages(messages);

  return {
    subject: projectSummary.subject,
    topic: projectSummary.topic,
    gradeLevel: projectSummary.grade,
    duration: normalizeDuration(projectSummary.duration),
    language,
    objectives: buildObjectives(teacherMessages),
    additionalNotes: buildAdditionalNotes(teacherMessages, materials),
    uploadedMaterials: materials.map((material) => material.id),
    useKnowledgeBase: true,
  };
}
