"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, AudioLines, Mic, Paperclip, Send, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { UploadDrawerCard } from "./UploadDrawerCard";
import type { IntentMessage, ProjectSummary } from "@/lib/types/teaching-design-ui";

interface IntentConversationPanelProps {
  projectSummary: ProjectSummary;
  guidancePrompts: string[];
  messages: IntentMessage[];
  onGenerate: () => void;
}

export function IntentConversationPanel({
  projectSummary,
  guidancePrompts,
  messages,
  onGenerate,
}: IntentConversationPanelProps) {
  const [showUploadCard, setShowUploadCard] = useState(false);

  return (
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
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    role={message.role}
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
                {showUploadCard && <UploadDrawerCard />}
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
  );
}
