// Mock 数据：意图理解页
import type { ProjectSummary, IntentMessage, UploadedFile } from "@/lib/types/teaching-design-ui";

export const mockProjectSummary: ProjectSummary = {
  subject: "小学语文",
  grade: "五年级",
  topic: "《圆明园的毁灭》",
  duration: "2课时 / 80分钟",
};

export const mockGuidancePrompts = [
  "请描述你的教学目标",
  "是否需要结合教材？",
  "是否需要课堂互动？",
];

export const mockIntentMessages: IntentMessage[] = [
  {
    id: 1,
    role: "ai",
    title: "AI 教学设计助手",
    content:
      "你好，我会先通过对话理解你的教学意图。你这节课最希望学生学会什么？更偏文本理解、情感体验，还是表达训练？",
    meta: "引导提问 · 第 1 轮",
  },
  {
    id: 2,
    role: "teacher",
    title: "教师",
    content:
      "我想让学生感受到圆明园昔日辉煌与毁灭后的反差，既理解课文内容，也形成一点历史责任感。",
    meta: "教师回答",
  },
  {
    id: 3,
    role: "ai",
    title: "AI 教学设计助手",
    content:
      "明白了。你是否需要结合教材批注和历史图片资料？另外，这节课是否需要加入讨论或表达任务？",
    meta: "引导提问 · 第 2 轮",
  },
  {
    id: 4,
    role: "teacher",
    title: "教师",
    content:
      "需要结合上传资料，最好有一个讨论活动，让学生说说为什么要记住这段历史，而且表达要自然，不要太说教。",
    meta: "教师回答",
  },
  {
    id: 5,
    role: "ai",
    title: "AI 教学设计助手",
    content:
      "好的，我已经提取到你的教学目标、资料偏好与互动偏好。你可以继续补充细节，或者直接生成教学设计工作台。",
    meta: "意图总结",
  },
];

export const mockUploadedFiles: UploadedFile[] = [
  {
    id: 1,
    name: "教材原文与教师批注.pdf",
    type: "PDF",
    size: "12.4 MB",
    status: "已解析",
  },
  {
    id: 2,
    name: "历史图片素材_圆明园遗址.jpg",
    type: "图片",
    size: "3.1 MB",
    status: "已入库",
  },
  {
    id: 3,
    name: "跨学科拓展资料.pdf",
    type: "PDF",
    size: "6.8 MB",
    status: "知识融合中",
  },
];
