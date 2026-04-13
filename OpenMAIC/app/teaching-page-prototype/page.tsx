'use client';

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowUp,
  AudioLines,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileImage,
  FileText,
  GraduationCap,
  LayoutTemplate,
  Link2,
  Mic,
  Paperclip,
  PanelRightOpen,
  Presentation,
  RefreshCcw,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const projectSummary = {
  subject: "小学语文",
  grade: "五年级",
  topic: "《圆明园的毁灭》",
  duration: "2课时 / 80分钟",
};

const guidancePrompts = [
  "请描述你的教学目标",
  "是否需要结合教材？",
  "是否需要课堂互动？",
];

const intentMessages = [
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

const uploadedFiles = [
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

const workflowSteps = [
  { label: "教师意图理解", done: true, active: false },
  { label: "资料解析", done: true, active: false },
  { label: "知识融合", done: true, active: false },
  { label: "设计生成", done: true, active: false },
  { label: "预览修订", done: false, active: true },
];

const designSummary = {
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
};

const slides = [
  {
    id: 1,
    type: "封面页",
    title: "走近《圆明园的毁灭》",
    tag: "P1",
    status: "已完成",
    desc: "课程标题、主题视觉、课时信息",
  },
  {
    id: 2,
    type: "导入页",
    title: "从昔日辉煌与今日遗址进入课堂",
    tag: "P2",
    status: "已完成",
    desc: "图像对比 + 引导提问",
  },
  {
    id: 3,
    type: "讲解页",
    title: "文本细读：辉煌与毁灭的强烈反差",
    tag: "P3",
    status: "AI生成中",
    desc: "关键词句分析、情感线索、讲解节奏",
  },
  {
    id: 4,
    type: "活动页",
    title: "讨论：我们为什么要记住这段历史",
    tag: "P4",
    status: "待优化",
    desc: "任务说明、表达框架、小组互动",
  },
  {
    id: 5,
    type: "总结页",
    title: "课堂回顾与价值升华",
    tag: "P5",
    status: "已完成",
    desc: "结构总结、作业衔接、情感提升",
  },
];

const lessonSections = [
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

const evidenceItems = [
  {
    type: "教师需求",
    chunkId: "req-0012",
    content: "希望课堂中强化情感体验，同时避免说教感，增加学生表达机会。",
  },
  {
    type: "上传资料",
    chunkId: "pdf-0148",
    content: "教材批注指出应从‘昔日辉煌’与‘今日遗址’对比中引出价值冲击。",
  },
  {
    type: "知识库",
    chunkId: "kb-0319",
    content: "五年级语文阅读课建议采用问题链推进与图文结合，降低抽象历史理解门槛。",
  },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    已完成: "bg-emerald-50 text-emerald-700 border-emerald-200",
    AI生成中: "bg-violet-50 text-violet-700 border-violet-200",
    待优化: "bg-amber-50 text-amber-700 border-amber-200",
    已解析: "bg-sky-50 text-sky-700 border-sky-200",
    已入库: "bg-emerald-50 text-emerald-700 border-emerald-200",
    知识融合中: "bg-orange-50 text-orange-700 border-orange-200",
  };

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-1 text-[11px] ${map[status] || "bg-slate-50 text-slate-700 border-slate-200"}`}
    >
      {status}
    </Badge>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  extra,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
      {extra}
    </div>
  );
}

function MessageBubble({
  role,
  title,
  content,
  meta,
}: {
  role: "ai" | "teacher";
  title: string;
  content: string;
  meta: string;
}) {
  const isAI = role === "ai";

  return (
    <div className={`flex gap-3 ${isAI ? "justify-start" : "justify-end"}`}>
      {isAI && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-100">
          <Bot className="h-5 w-5" />
        </div>
      )}

      <motion.div
        whileHover={{ y: -1 }}
        className={`max-w-[86%] rounded-[26px] border p-4 shadow-sm ${
          isAI
            ? "border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <Badge
            className={`rounded-full text-[10px] hover:bg-inherit ${
              isAI ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"
            }`}
          >
            {meta}
          </Badge>
        </div>
        <div className="text-sm leading-7 text-slate-700">{content}</div>
      </motion.div>

      {!isAI && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200">
          <GraduationCap className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

function TopBar({
  stage,
  onBack,
}: {
  stage: "intent" | "workspace";
  onBack?: () => void;
}) {
  return (
    <div className="border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1720px] items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-3">
          {stage === "workspace" && onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-white shadow-lg shadow-indigo-200">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold tracking-tight">Teaching Design Workspace</h1>
              <Badge className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-slate-900">
                AI Agent Studio
              </Badge>
            </div>
            <div className="text-xs text-slate-500">
              {stage === "intent"
                ? "阶段 1 · 教师意图理解 · 对话驱动入口"
                : "阶段 2 · 教学设计工作台 · 预览与再生成"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700"
          >
            当前项目：五年级语文公开课
          </Badge>
          <Button variant="outline" className="rounded-xl border-slate-200 bg-white/80">
            <Clock3 className="mr-2 h-4 w-4" />
            历史版本
          </Button>
          <Button className="rounded-xl bg-slate-900 shadow-sm hover:bg-slate-800">
            <Sparkles className="mr-2 h-4 w-4" />
            发布演示稿
          </Button>
        </div>
      </div>
    </div>
  );
}

function IntentPage({ onGenerate }: { onGenerate: () => void }) {
  const [showUploadCard, setShowUploadCard] = useState(false);

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden rounded-[32px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
          <CardContent className="p-0">
            <div className="p-7 lg:p-8">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full bg-violet-100 text-violet-700 hover:bg-violet-100">
                      阶段 1 · 意图理解
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
                    >
                      AI 主动引导中
                    </Badge>
                  </div>

                  <h2 className="mt-3 text-[30px] font-semibold tracking-tight text-slate-900">
                    先通过对话，弄清楚这节课你真正想教什么
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    这是系统入口页。AI 会主动追问教学目标、资料使用方式与互动需求，而不是让你填写表单。上传资料也是可选的隐式入口，不会打断对话体验。
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">当前课题</div>
                  <div className="mt-2 text-base font-semibold text-slate-900">
                    {projectSummary.topic}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className="rounded-full bg-white">
                      {projectSummary.subject}
                    </Badge>
                    <Badge variant="outline" className="rounded-full bg-white">
                      {projectSummary.grade}
                    </Badge>
                    <Badge variant="outline" className="rounded-full bg-white">
                      {projectSummary.duration}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-3">
                {guidancePrompts.map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-dashed border-indigo-200 bg-indigo-50/80 px-4 py-2 text-sm text-indigo-700"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="rounded-[30px] border border-slate-100 bg-slate-50/80 p-3 shadow-inner">
                <ScrollArea className="h-[520px] pr-3">
                  <div className="space-y-4 p-2">
                    {intentMessages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        role={message.role as "ai" | "teacher"}
                        title={message.title}
                        content={message.content}
                        meta={message.meta}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="mt-6 rounded-[30px] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">继续补充教学意图</div>
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50">
                    多轮对话
                  </Badge>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-2xl border-slate-200 bg-white"
                      onClick={() => setShowUploadCard((v) => !v)}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>

                    <div className="relative flex-1">
                      <Input
                        defaultValue="我还希望互动提问更自然一些，适合五年级学生当堂表达。"
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-12 shadow-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                      />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                    </div>

                    <Button variant="outline" className="h-12 rounded-2xl border-slate-200 bg-white px-4">
                      <Mic className="mr-2 h-4 w-4 text-rose-500" />
                      语音输入
                    </Button>

                    <Button className="h-12 rounded-2xl bg-slate-900 px-5 hover:bg-slate-800">
                      <Send className="mr-2 h-4 w-4" />
                      发送
                    </Button>
                  </div>

                  <AnimatePresence>
                    {showUploadCard && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="absolute bottom-[64px] left-0 z-20 w-[420px] rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.14)]"
                      >
                        <SectionTitle
                          icon={Paperclip}
                          title="资料上传"
                          extra={
                            <Badge variant="secondary" className="rounded-full">
                              隐式入口
                            </Badge>
                          }
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <motion.div
                            whileHover={{ y: -2 }}
                            className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60"
                          >
                            <FileText className="mb-3 h-5 w-5 text-slate-700" />
                            <div className="text-sm font-semibold">上传 PDF</div>
                            <div className="mt-1 text-xs text-slate-500">教材 / 讲义 / 教师批注</div>
                          </motion.div>

                          <motion.div
                            whileHover={{ y: -2 }}
                            className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 transition-colors hover:border-cyan-300 hover:bg-cyan-50/60"
                          >
                            <FileImage className="mb-3 h-5 w-5 text-slate-700" />
                            <div className="text-sm font-semibold">上传图片</div>
                            <div className="mt-1 text-xs text-slate-500">历史图片 / 板书素材</div>
                          </motion.div>
                        </div>

                        <div className="mt-4 space-y-3">
                          {uploadedFiles.map((file) => (
                            <div
                              key={file.id}
                              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
                            >
                              <div className="truncate text-sm font-medium text-slate-900">{file.name}</div>
                              <div className="mt-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Badge variant="outline" className="rounded-full text-[10px]">
                                    {file.type}
                                  </Badge>
                                  <span>{file.size}</span>
                                </div>
                                <StatusBadge status={file.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-violet-800">
                    <AudioLines className="h-4 w-4" />
                    AI 已完成意图抽取，可直接进入生成阶段
                  </div>
                  <Button className="rounded-2xl bg-slate-900 hover:bg-slate-800" onClick={onGenerate}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    生成教学设计
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[32px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">意图理解状态</div>
                  <div className="text-xs text-slate-500">教师输入 → AI 理解 → 进入生成</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">教学目标已提取</div>
                      <div className="text-xs text-slate-500">文本理解 + 情感体验 + 历史责任感</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">资料偏好已提取</div>
                      <div className="text-xs text-slate-500">结合教材批注与历史图片资料</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
                  <div className="flex items-center gap-3">
                    <Brain className="h-4 w-4 text-violet-700" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">互动设计生成中</div>
                      <div className="text-xs text-slate-500">将优先加入讨论与表达任务</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">理解完成度</div>
                  <div className="text-xs text-slate-500">86%</div>
                </div>
                <Progress value={86} className="h-2 rounded-full" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
            <CardContent className="p-6">
              <SectionTitle
                icon={Sparkles}
                title="AI 引导要点"
                extra={
                  <Badge className="rounded-full bg-sky-100 text-sky-700 hover:bg-sky-100">
                    对话驱动
                  </Badge>
                }
              />

              <div className="space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  AI 通过多轮追问替代表单，让教师更自然地表达教学目标与课堂风格。
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  上传资料采用回形针隐式入口，不打断主对话动线。
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  生成按钮只负责进入下一阶段，不在本页混入结构化工作台内容。
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TeachingWorkspacePage({ onBack }: { onBack: () => void }) {
  const [activeSlideId, setActiveSlideId] = useState(3);
  const [previewMode, setPreviewMode] = useState("slide");

  const activeSlide = useMemo(
    () => slides.find((item) => item.id === activeSlideId) ?? slides[0],
    [activeSlideId]
  );

  return (
    <div className="mx-auto max-w-[1720px] px-5 py-6 lg:px-8">
      <div className="mb-5 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="space-y-5">
          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
            <CardContent className="p-5">
              <SectionTitle
                icon={LayoutTemplate}
                title="Slide 结构导航"
                extra={
                  <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 text-indigo-700">
                    结构导航
                  </Badge>
                }
              />

              <div className="space-y-3">
                {slides.map((slide, index) => {
                  const isActive = slide.id === activeSlideId;

                  return (
                    <motion.button
                      key={slide.id}
                      whileHover={{ y: -1 }}
                      onClick={() => setActiveSlideId(slide.id)}
                      className={`w-full rounded-[24px] border p-4 text-left transition-all ${
                        isActive
                          ? "border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-md shadow-indigo-100"
                          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold ${
                              isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-slate-900">{slide.type}</div>
                              <Badge variant="outline" className="rounded-full text-[10px]">
                                {slide.tag}
                              </Badge>
                            </div>
                            <div className="mt-1 text-sm text-slate-700">{slide.title}</div>
                            <div className="mt-2 text-xs leading-5 text-slate-500">{slide.desc}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <StatusBadge status={slide.status} />
                        {isActive && (
                          <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900">
                            当前页
                          </Badge>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
            <CardContent className="p-5">
              <SectionTitle
                icon={BookOpen}
                title="教案结构"
                extra={
                  <Badge variant="outline" className="rounded-full border-cyan-200 bg-cyan-50 text-cyan-700">
                    DOCX
                  </Badge>
                }
              />

              <div className="space-y-3">
                {lessonSections.map((section, index) => (
                  <div key={section.id} className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-700 shadow-sm">
                        0{index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{section.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{section.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-5">
          <Card className="overflow-hidden rounded-[32px] border-white/70 bg-white/95 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
            <CardContent className="p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                      阶段 2 · 教学设计工作台
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full border-violet-200 bg-violet-50 text-violet-700"
                    >
                      预览为核心
                    </Badge>
                  </div>

                  <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-slate-900">
                    {designSummary.title}
                  </h2>

                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900">
                      {designSummary.version}
                    </Badge>
                    <Clock3 className="h-4 w-4" />
                    最近更新：{designSummary.updatedAt}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-2xl border-slate-200 bg-white" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回意图页
                  </Button>

                  <Tabs value={previewMode} onValueChange={setPreviewMode} className="w-auto">
                    <TabsList className="rounded-2xl bg-slate-100 p-1">
                      <TabsTrigger value="slide" className="rounded-xl">
                        幻灯片预览
                      </TabsTrigger>
                      <TabsTrigger value="doc" className="rounded-xl">
                        教案预览
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="mb-5 grid gap-4 xl:grid-cols-3">
                <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="text-sm font-semibold text-slate-900">教学目标</div>
                  <div className="mt-3 space-y-2">
                    {designSummary.goals.map((item) => (
                      <div key={item} className="flex gap-2 text-sm text-slate-600">
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="text-sm font-semibold text-slate-900">教学重点</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {designSummary.highlights.map((item) => (
                      <Badge
                        key={item}
                        variant="outline"
                        className="rounded-full border-slate-200 bg-white px-3 py-1 text-slate-700"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="text-sm font-semibold text-slate-900">教学难点</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {designSummary.difficulties.map((item) => (
                      <Badge
                        key={item}
                        className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 hover:bg-amber-100"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <motion.div layout className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-inner">
                {previewMode === "slide" ? (
                  <div className="rounded-[26px] bg-[linear-gradient(135deg,#eef4ff_0%,#ffffff_38%,#f7f7ff_100%)] p-5 shadow-sm">
                    <div className="aspect-[16/9] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
                      <div className="flex h-full flex-col">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                              {activeSlide.type}
                            </div>
                            <div className="mt-1 text-xl font-semibold text-slate-900">
                              {activeSlide.title}
                            </div>
                          </div>
                          <Badge className="rounded-full bg-violet-100 text-violet-700 hover:bg-violet-100">
                            {activeSlide.tag}
                          </Badge>
                        </div>

                        <div className="grid flex-1 grid-cols-5 gap-5 p-6">
                          <div className="col-span-3 flex flex-col justify-between rounded-2xl bg-slate-50 p-5">
                            <div>
                              <div className="mb-3 text-sm font-semibold text-slate-800">核心内容结构</div>
                              <div className="space-y-3 text-sm leading-6 text-slate-600">
                                <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                                  1. 用“辉煌”与“遗址”图片对照，建立强烈情境冲击
                                </div>
                                <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                                  2. 聚焦关键词句，梳理课文中由赞叹到沉痛的情感变化
                                </div>
                                <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                                  3. 设置讨论问题，引导学生表达“为什么要记住这段历史”
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white">
                              <div className="text-xs uppercase tracking-[0.2em] text-white/70">
                                AI Suggestion
                              </div>
                              <div className="mt-2 text-sm leading-6">
                                当前页建议减少解释性文字，强化图像观察与自然提问，让表达从资料中生长出来。
                              </div>
                            </div>
                          </div>

                          <div className="col-span-2 flex flex-col gap-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                Visual Block
                              </div>
                              <div className="mt-3 flex h-40 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#dbeafe_0%,#eef2ff_50%,#f8fafc_100%)]">
                                <div className="text-center">
                                  <FileImage className="mx-auto h-8 w-8 text-slate-500" />
                                  <div className="mt-2 text-xs text-slate-500">历史图片 / 对照视觉</div>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="text-sm font-semibold text-slate-800">互动提问</div>
                              <div className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                                <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
                                  作者为什么先写辉煌，再写毁灭？
                                </div>
                                <div className="rounded-xl bg-cyan-50 px-3 py-2 text-cyan-700">
                                  如果你站在遗址前，会想到什么？
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 px-6 py-3">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>版式：图文双栏 / 问题链引导 / 情感递进</span>
                            <span>适配输出：PPT · 演示版</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[26px] bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_42%,#f8fafc_100%)] p-5 shadow-sm">
                    <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            Lesson Plan Preview
                          </div>
                          <div className="mt-1 text-xl font-semibold text-slate-900">
                            《圆明园的毁灭》教案预览
                          </div>
                        </div>
                        <Badge className="rounded-full bg-cyan-100 text-cyan-700 hover:bg-cyan-100">
                          DOCX
                        </Badge>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                          <div className="text-sm font-semibold text-slate-900">一、教学目标</div>
                          <div className="mt-2 text-sm leading-6 text-slate-600">
                            围绕文本理解、情感体验与历史责任感展开，同时设计讨论与表达任务，帮助学生完成价值迁移。
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                          <div className="text-sm font-semibold text-slate-900">二、教学过程</div>
                          <div className="mt-2 grid gap-2 text-sm text-slate-600">
                            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">导入：图片对比 + 观察提问</div>
                            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">细读：关键语句分析 + 情感线索提炼</div>
                            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">活动：小组讨论 + 观点表达</div>
                            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">总结：价值升华 + 作业延展</div>
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="text-sm font-semibold text-slate-900">三、板书设计</div>
                            <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600 shadow-sm">
                              辉煌 → 毁灭 → 铭记
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <div className="text-sm font-semibold text-slate-900">四、作业布置</div>
                            <div className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-600 shadow-sm">
                              完成阅读反思卡，并以“如果文物会说话”为题写一段简短表达。
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-white/70 bg-white/95 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
            <CardContent className="p-5">
              <SectionTitle
                icon={RefreshCcw}
                title="修改与再生成"
                extra={
                  <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-amber-700">
                    闭环交互
                  </Badge>
                }
              />

              <div className="space-y-4">
                <Textarea
                  defaultValue="请描述你希望如何调整这一页内容：弱化第3页文字密度，增加互动提问，并让导入部分更适合五年级学生课堂表达。"
                  className="min-h-[120px] rounded-[24px] border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <Button className="h-11 rounded-2xl bg-slate-900 px-5 hover:bg-slate-800">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    再生成当前页
                  </Button>
                  <Button variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white px-5">
                    <Sparkles className="mr-2 h-4 w-4" />
                    生成优化建议
                  </Button>
                </div>

                <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 px-4 py-3 text-sm text-violet-800">
                  仅修改当前 slide，不影响整体结构。
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-5">
          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
            <CardContent className="p-5">
              <SectionTitle
                icon={PanelRightOpen}
                title="引用与 RAG 证据"
                extra={
                  <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    弱化辅助区
                  </Badge>
                }
              />

              <div className="space-y-3">
                {evidenceItems.map((item, index) => (
                  <motion.div
                    key={`${item.chunkId}-${index}`}
                    whileHover={{ y: -1 }}
                    className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4 transition-all hover:border-slate-200 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={`rounded-full px-3 py-1 hover:bg-inherit ${
                          item.type === "教师需求"
                            ? "bg-indigo-100 text-indigo-700"
                            : item.type === "上传资料"
                            ? "bg-cyan-100 text-cyan-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {item.type}
                      </Badge>
                      <span className="text-xs font-medium text-slate-500">
                        ragChunkId: {item.chunkId}
                      </span>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-600">{item.content}</div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
            <CardContent className="p-5">
              <SectionTitle
                icon={Link2}
                title="工作流状态"
                extra={
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50">
                    已生成
                  </Badge>
                }
              />

              <div className="space-y-3">
                {workflowSteps.map((step) => (
                  <div
                    key={step.label}
                    className={`rounded-2xl border p-4 ${
                      step.done
                        ? "border-emerald-100 bg-emerald-50/70"
                        : step.active
                        ? "border-violet-200 bg-violet-50/70"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${
                          step.done
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : step.active
                            ? "border-violet-200 bg-violet-50 text-violet-700"
                            : "border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
                      </div>

                      <div>
                        <div className="text-sm font-medium text-slate-900">{step.label}</div>
                        <div className="text-xs text-slate-500">
                          {step.done ? "已完成" : step.active ? "进行中" : "待开始"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">整体进度</div>
                  <div className="text-xs text-slate-500">92%</div>
                </div>
                <Progress value={92} className="h-2 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default function TeachingDesignAgentDemo() {
  const [stage, setStage] = useState<"intent" | "workspace">("intent");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f5f7fb_45%,#eef2f7_100%)] text-slate-900">
      <TopBar stage={stage} onBack={stage === "workspace" ? () => setStage("intent") : undefined} />

      <AnimatePresence mode="wait">
        {stage === "intent" ? (
          <motion.div
            key="intent"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <IntentPage onGenerate={() => setStage("workspace")} />
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <TeachingWorkspacePage onBack={() => setStage("intent")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}