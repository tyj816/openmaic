'use client';

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
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
  Mic,
  PanelRightOpen,
  Presentation,
  RefreshCcw,
  Send,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

const projectSummary = {
  subject: "小学语文",
  grade: "五年级",
  topic: "《圆明园的毁灭》",
  duration: "2课时 / 80分钟",
};

const agentSteps = [
  { label: "教师意图理解", done: true, active: false },
  { label: "资料解析", done: true, active: false },
  { label: "知识融合", done: true, active: false },
  { label: "设计生成", done: false, active: true },
  { label: "预览修订", done: false, active: false },
];

const chatMessages = [
  {
    id: 1,
    role: "ai",
    title: "AI 教学设计助手",
    content:
      "你好，我会先帮你澄清教学意图。你这节课最希望学生学会什么？是偏文本理解、情感体验，还是表达训练？",
    meta: "意图理解 · 第 1 轮",
  },
  {
    id: 2,
    role: "teacher",
    title: "教师",
    content:
      "我想让学生感受到圆明园昔日辉煌与毁灭后的反差，既理解课文内容，也能形成一点历史责任感。",
    meta: "教师回答",
  },
  {
    id: 3,
    role: "ai",
    title: "AI 教学设计助手",
    content:
      "明白了。是否需要结合你上传的教材批注与历史图片资料？另外，这节课你希望加入互动讨论或表达任务吗？",
    meta: "引导补充 · 第 2 轮",
  },
  {
    id: 4,
    role: "teacher",
    title: "教师",
    content:
      "需要结合上传资料，最好有一个讨论活动，让学生说说为什么要记住这段历史。",
    meta: "教师回答",
  },
];

const guidancePrompts = [
  "请描述你的教学目标",
  "是否需要结合上传资料？",
  "是否需要互动环节？",
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

const designSummary = {
  title: "《圆明园的毁灭》教学设计",
  version: "V4.0",
  updatedAt: "今天 16:18",
  goals: [
    "理解课文内容与作者情感表达",
    "借助图文资料建立历史情境与价值判断",
    "通过互动讨论完成观点表达与情感迁移",
  ],
  highlights: ["图文对照导入", "问题链推进", "讨论式表达"],
  difficulties: ["情感体验迁移", "从资料走向观点表达"],
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
    title: "教学重点",
    detail: "辉煌与毁灭的对照阅读、问题链推进",
  },
  {
    id: "c",
    title: "教学过程",
    detail: "导入—细读—讨论—总结—迁移",
  },
  {
    id: "d",
    title: "板书设计",
    detail: "辉煌 / 毁灭 / 铭记",
  },
  {
    id: "e",
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

function PipelineNode({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex min-w-[128px] items-center gap-3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${
          done
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : active
            ? "border-violet-200 bg-violet-50 text-violet-700"
            : "border-slate-200 bg-white text-slate-400"
        }`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
      </div>
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">{done ? "已完成" : active ? "进行中" : "待开始"}</div>
      </div>
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

export default function TeachingDesignWorkspace() {
  const [activeSlideId, setActiveSlideId] = useState(3);
  const [previewMode, setPreviewMode] = useState("slide");

  const activeSlide = useMemo(
    () => slides.find((item) => item.id === activeSlideId) ?? slides[0],
    [activeSlideId]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f5f7fb_45%,#eef2f7_100%)] text-slate-900">
      <div className="border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
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
                教学设计智能体工作台 · 对话理解 · 结构生成 · 可解释修订
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

      <div className="mx-auto max-w-[1680px] px-5 py-5 lg:px-8">
        <div className="space-y-5">
          <Card className="overflow-hidden rounded-[30px] border-white/70 bg-white/85 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="p-6 lg:p-7">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-full bg-violet-100 text-violet-700 hover:bg-violet-100">
                          对话式意图输入
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
                        >
                          AI 主动引导中
                        </Badge>
                      </div>
                      <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-slate-900">
                        先告诉我这节课你真正想教什么
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                        通过多轮对话理解教师意图，而不是让教师填写表单。AI 会主动追问教学目标、资料使用方式与互动需求，并将意图转化为结构化教学设计。
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

                  <div className="mb-5 flex flex-wrap gap-3">
                    {guidancePrompts.map((item) => (
                      <div
                        key={item}
                        className="rounded-full border border-dashed border-indigo-200 bg-indigo-50/80 px-4 py-2 text-sm text-indigo-700"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-3 shadow-inner">
                    <ScrollArea className="h-[420px] pr-3">
                      <div className="space-y-4 p-2">
                        {chatMessages.map((message) => (
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

                  <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">继续补充你的教学意图</div>
                      <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50">
                        多轮对话
                      </Badge>
                    </div>

                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Input
                          defaultValue="我还希望这一页不要太说教，互动提问要更自然一些。"
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
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,0.85)_100%)] p-6 xl:border-l xl:border-t-0">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <Brain className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">智能体工作流状态</div>
                      <div className="text-xs text-slate-500">教师输入 → AI 理解 → 生成结构化方案</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {agentSteps.map((step) => (
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
                        <PipelineNode label={step.label} done={step.done} active={step.active} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">意图抽取摘要</div>
                      <Badge className="rounded-full bg-sky-100 text-sky-700 hover:bg-sky-100">
                        已同步
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        核心目标：文本理解 + 情感体验 + 历史责任感
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        资料偏好：结合教材批注与历史图片
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        教学偏好：加入互动讨论，减少说教感
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-dashed border-violet-200 bg-violet-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2 text-violet-700 shadow-sm">
                        <AudioLines className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-violet-900">智能体提示</div>
                        <div className="mt-1 text-sm leading-6 text-violet-800/90">
                          对话区已经成为工作台入口核心。教师先表达意图，AI 再组织资料与设计结构，避免页面看起来像表单系统或后台配置页。
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-12 gap-5">
            <aside className="col-span-12 xl:col-span-2">
              <div className="sticky top-5 space-y-5">
                <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-5">
                    <SectionTitle
                      icon={Upload}
                      title="资料与控制"
                      extra={
                        <Badge variant="secondary" className="rounded-full">
                          辅助输入区
                        </Badge>
                      }
                    />

                    <div className="grid gap-3">
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
                          className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
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

                    <Separator className="my-5" />

                    <div className="grid gap-3">
                      <Button className="h-11 justify-start rounded-2xl bg-slate-900 hover:bg-slate-800">
                        <Wand2 className="mr-2 h-4 w-4" />
                        生成教学设计
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 justify-start rounded-2xl border-slate-200 bg-white"
                      >
                        <Presentation className="mr-2 h-4 w-4" />
                        生成 PPT
                        <Badge className="ml-auto rounded-full bg-violet-100 text-violet-700 hover:bg-violet-100">
                          PPT
                        </Badge>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 justify-start rounded-2xl border-slate-200 bg-white"
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        生成教案
                        <Badge className="ml-auto rounded-full bg-cyan-100 text-cyan-700 hover:bg-cyan-100">
                          DOCX
                        </Badge>
                      </Button>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900">生成进度</div>
                        <div className="text-xs text-slate-500">82%</div>
                      </div>
                      <Progress value={82} className="h-2 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>

            <main className="col-span-12 xl:col-span-5">
              <div className="space-y-5">
                <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                            结构化教学设计
                          </Badge>
                          <Badge
                            variant="outline"
                            className="rounded-full border-violet-200 bg-violet-50 text-violet-700"
                          >
                            AI 已生成
                          </Badge>
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
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

                      <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">教学摘要</div>
                        <div className="mt-2 grid gap-2 text-sm text-slate-600">
                          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm">
                            <span>目标数量</span>
                            <span className="font-semibold text-slate-900">{designSummary.goals.length} 项</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm">
                            <span>课件结构</span>
                            <span className="font-semibold text-slate-900">{slides.length} 页</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm">
                            <span>教案模块</span>
                            <span className="font-semibold text-slate-900">{lessonSections.length} 段</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 xl:grid-cols-3">
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
                  </CardContent>
                </Card>

                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
                    <CardContent className="p-5">
                      <SectionTitle
                        icon={LayoutTemplate}
                        title="Slide 结构"
                        extra={
                          <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 text-indigo-700">
                            主结构区
                          </Badge>
                        }
                      />

                      <ScrollArea className="h-[640px] pr-3">
                        <div className="space-y-3">
                          {slides.map((slide, index) => {
                            const isActive = slide.id === activeSlideId;

                            return (
                              <motion.button
                                key={slide.id}
                                whileHover={{ y: -1 }}
                                onClick={() => setActiveSlideId(slide.id)}
                                className={`w-full rounded-[26px] border p-4 text-left transition-all ${
                                  isActive
                                    ? "border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-md shadow-indigo-100"
                                    : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/70"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <div
                                      className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold ${
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
                                      <div className="mt-1 text-sm text-slate-800">{slide.title}</div>
                                      <div className="mt-2 text-xs leading-5 text-slate-500">{slide.desc}</div>
                                    </div>
                                  </div>

                                  <StatusBadge status={slide.status} />
                                </div>

                                {isActive && (
                                  <div className="mt-4 grid gap-2 lg:grid-cols-2">
                                    <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
                                      版式建议：图文双栏 + 互动提问卡片
                                    </div>
                                    <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
                                      同步输出：PPT / 教案段落联动
                                    </div>
                                  </div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
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
                          <div key={section.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-700 shadow-sm">
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

                      <div className="mt-5 rounded-[24px] border border-dashed border-violet-200 bg-violet-50/70 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                          <Sparkles className="h-4 w-4" />
                          结构同步说明
                        </div>
                        <div className="mt-2 text-sm leading-6 text-violet-800/90">
                          当前教学设计已完成“课件结构 + 教案结构”联动生成。选择任一 Slide 后，可在右侧同步查看预览、证据与修改影响。
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </main>

            <aside className="col-span-12 xl:col-span-5">
              <div className="sticky top-5 space-y-5">
                <Card className="overflow-hidden rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900">
                            预览 + 修改闭环
                          </Badge>
                          <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                            可解释生成
                          </Badge>
                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-900">
                          生成 → 查看 → 修改 → 再生成
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          当前聚焦 {activeSlide.tag}，支持幻灯片预览、教案切换与局部再生成。
                        </div>
                      </div>

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

                    <motion.div layout className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-inner">
                      {previewMode === "slide" ? (
                        <div className="rounded-[24px] bg-[linear-gradient(135deg,#eef4ff_0%,#ffffff_38%,#f7f7ff_100%)] p-4 shadow-sm">
                          <div className="aspect-[16/9] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_15px_50px_rgba(15,23,42,0.08)]">
                            <div className="flex h-full flex-col">
                              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                                <div>
                                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                    {activeSlide.type}
                                  </div>
                                  <div className="mt-1 text-lg font-semibold text-slate-900">
                                    {activeSlide.title}
                                  </div>
                                </div>
                                <Badge className="rounded-full bg-violet-100 text-violet-700 hover:bg-violet-100">
                                  {activeSlide.tag}
                                </Badge>
                              </div>

                              <div className="grid flex-1 grid-cols-5 gap-4 p-5">
                                <div className="col-span-3 flex flex-col justify-between rounded-2xl bg-slate-50 p-4">
                                  <div>
                                    <div className="mb-3 text-sm font-semibold text-slate-800">核心内容结构</div>
                                    <div className="space-y-2 text-sm leading-6 text-slate-600">
                                      <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                                        1. 通过辉煌与遗址图片对照，建立情境冲击
                                      </div>
                                      <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                                        2. 聚焦关键词句，提炼“昔日辉煌”与“今日毁灭”的反差
                                      </div>
                                      <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                                        3. 引入互动问题，鼓励学生完成观点表达
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white">
                                    <div className="text-xs uppercase tracking-[0.2em] text-white/70">AI Suggestion</div>
                                    <div className="mt-2 text-sm leading-6">
                                      当前页适合采用“图片冲击 + 问题链引导”的演示结构，减少说明文字，提升课堂参与感与比赛展示感。
                                    </div>
                                  </div>
                                </div>

                                <div className="col-span-2 flex flex-col gap-4">
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Visual Block</div>
                                    <div className="mt-3 flex h-32 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#dbeafe_0%,#eef2ff_50%,#f8fafc_100%)]">
                                      <div className="text-center">
                                        <FileImage className="mx-auto h-7 w-7 text-slate-500" />
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

                              <div className="border-t border-slate-100 px-5 py-3">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>版式：图文双栏 / 问题链引导 / 情感递进</span>
                                  <span>适配输出：PPT · 演示版</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[24px] bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_42%,#f8fafc_100%)] p-4 shadow-sm">
                          <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_15px_50px_rgba(15,23,42,0.08)]">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Lesson Plan Preview</div>
                                <div className="mt-1 text-lg font-semibold text-slate-900">
                                  《圆明园的毁灭》教案结构预览
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
                                  围绕文本理解、情感体验与历史责任感展开，同时设计表达任务，帮助学生完成价值迁移。
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

                    <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900">当前聚焦</div>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-white">
                          {activeSlide.tag} · {activeSlide.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600">{activeSlide.title}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-5">
                    <SectionTitle
                      icon={PanelRightOpen}
                      title="引用与 RAG 证据"
                      extra={
                        <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          RAG 已命中
                        </Badge>
                      }
                    />

                    <div className="space-y-3">
                      {evidenceItems.map((item, index) => (
                        <motion.div
                          key={`${item.chunkId}-${index}`}
                          whileHover={{ y: -1 }}
                          className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 transition-all hover:border-slate-200 hover:bg-white"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
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
                          </div>
                          <div className="mt-3 text-sm leading-6 text-slate-600">{item.content}</div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-5">
                    <SectionTitle
                      icon={RefreshCcw}
                      title="修改指令与再生成"
                      extra={
                        <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-amber-700">
                          局部可控
                        </Badge>
                      }
                    />

                    <div className="space-y-4">
                      <Textarea
                        defaultValue="请弱化第3页文字密度，增加互动提问，并让导入部分更适合五年级学生课堂表达，同时保持历史情感的递进。"
                        className="min-h-[120px] rounded-[24px] border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                      />

                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                          <div className="text-sm font-semibold text-slate-900">修改影响范围</div>
                          <div className="mt-2 text-sm leading-6 text-slate-600">
                            将优先影响 <span className="font-medium text-slate-900">{activeSlide.tag} 当前页结构</span>，
                            并同步检查相关教案段落、前后页节奏与互动问题设置。
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                          <div className="text-sm font-semibold text-slate-900">输出策略</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge className="rounded-full bg-violet-100 text-violet-700 hover:bg-violet-100">
                              PPT 局部更新
                            </Badge>
                            <Badge className="rounded-full bg-cyan-100 text-cyan-700 hover:bg-cyan-100">
                              教案同步修订
                            </Badge>
                            <Badge variant="outline" className="rounded-full border-slate-200 bg-white">
                              保留引用链路
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button className="h-11 rounded-2xl bg-slate-900 px-5 hover:bg-slate-800">
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          再生成当前内容
                        </Button>
                        <Button variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white px-5">
                          <Sparkles className="mr-2 h-4 w-4" />
                          生成优化建议
                        </Button>
                      </div>

                      <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-xl bg-white p-2 text-violet-700 shadow-sm">
                            <Brain className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-violet-900">AI 修改提示</div>
                            <div className="mt-1 text-sm leading-6 text-violet-800/90">
                              当前修改更适合通过“减少说明文字、增加图像观察、插入自然提问”来完成。这样既能保留知识表达，也能提升课堂互动与演示感染力。
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}