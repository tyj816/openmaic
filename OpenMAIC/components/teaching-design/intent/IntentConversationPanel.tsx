"use client";

import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowUp, AudioLines, Loader2, Mic, MicOff, Paperclip, Send, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { UploadDrawerCard } from "./UploadDrawerCard";
import { useVoiceRecorder } from "@/lib/hooks/use-voice-recorder";
import type { IntentMessage, ProjectSummary, UploadedFile } from "@/lib/types/teaching-design-ui";

interface IntentConversationPanelProps {
  projectSummary: ProjectSummary;
  guidancePrompts: string[];
  messages: IntentMessage[];
  inputValue: string;
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  isThinking: boolean;
  isGenerating: boolean;
  generationStatus?: string;
  error: string | null;
  canGenerate: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  onGenerate: () => void;
  onUploadPdf: (file: File) => Promise<void>;
  onUploadDocx: (file: File) => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
}

export function IntentConversationPanel({
  projectSummary,
  guidancePrompts,
  messages,
  inputValue,
  uploadedFiles,
  isUploading,
  isThinking,
  isGenerating,
  generationStatus,
  error,
  canGenerate,
  onInputChange,
  onSendMessage,
  onGenerate,
  onUploadPdf,
  onUploadDocx,
  onUploadImage,
}: IntentConversationPanelProps) {
  const [showUploadCard, setShowUploadCard] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docxInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const { isRecording, isTranscribing, toggleRecording } = useVoiceRecorder({
    onTranscriptionComplete: (text) => {
      onInputChange(text);
      setVoiceError(null);
    },
    onError: (errorMessage) => {
      setVoiceError(errorMessage);
    },
  });

  const handleSubmit = () => {
    onSendMessage(inputValue);
  };

  return (
    <Card className="overflow-hidden rounded-[32px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
      <CardContent className="p-0">
        <div className="px-4 pb-4 pt-2 lg:px-5 lg:pb-5 lg:pt-2">
          <div className="-mt-1 mb-0 flex flex-wrap items-start justify-between gap-2">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 leading-none">
                <Badge className="rounded-full bg-violet-100 text-violet-700 hover:bg-violet-100">
                  阶段 1 · 意图理解
                </Badge>
              </div>

              <h2 className="mt-0 text-[25px] font-semibold tracking-tight leading-tight text-slate-900">
                先通过对话，弄清楚这节课你真正想教什么
              </h2>
              <p className="mt-0 text-sm leading-5 text-slate-600">
                现在会基于真实对话持续提取课题、学科、年级和课时，并在信息完整后进入教学设计生成。
              </p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50/80 px-3 py-2">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">当前识别</div>
              <div className="mt-0 text-base font-semibold text-slate-900">
                {projectSummary.topic}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-2 text-xs">
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

          <div className="mb-0.5 flex flex-wrap gap-2">
            {guidancePrompts.map((item) => (
              <div
                key={item}
                className="rounded-full border border-dashed border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-sm text-indigo-700"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-2.5 shadow-inner">
            <ScrollArea className="h-[500px] pr-3">
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

          <div className="mt-4 rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">继续补充教学意图</div>
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
                    value={inputValue}
                    onChange={(event) => onInputChange(event.target.value)}
                    placeholder="例如：五年级语文，《圆明园的毁灭》，2 课时，希望增加讨论与表达任务。"
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-12 shadow-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSubmit();
                      }
                    }}
                    disabled={isThinking || isGenerating}
                  />
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isThinking || isGenerating}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>

                <Button 
                  variant="outline" 
                  className={`h-12 rounded-2xl border-slate-200 px-4 ${
                    isRecording ? 'bg-rose-50 border-rose-300' : 'bg-white'
                  }`}
                  onClick={toggleRecording}
                  disabled={isThinking || isGenerating || isTranscribing}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4 text-rose-500 animate-pulse" />
                      停止录音
                    </>
                  ) : isTranscribing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-rose-500" />
                      识别中...
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4 text-rose-500" />
                      语音输入
                    </>
                  )}
                </Button>

                <Button className="h-12 rounded-2xl bg-slate-900 px-5 hover:bg-slate-800" onClick={handleSubmit} disabled={isThinking || isGenerating}>
                  {isThinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {isThinking ? "理解中..." : "发送"}
                </Button>
              </div>

              <AnimatePresence>
                {showUploadCard && (
                  <UploadDrawerCard
                    uploadedFiles={uploadedFiles}
                    isUploading={isUploading}
                    onSelectPdf={() => fileInputRef.current?.click()}
                    onSelectDocx={() => docxInputRef.current?.click()}
                    onSelectImage={() => imageInputRef.current?.click()}
                  />
                )}
              </AnimatePresence>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await onUploadPdf(file);
                  event.target.value = "";
                }}
              />

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await onUploadImage(file);
                  event.target.value = "";
                }}
              />

              <input
                ref={docxInputRef}
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await onUploadDocx(file);
                  event.target.value = "";
                }}
              />
            </div>

            {error || voiceError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error || voiceError}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-violet-800">
                <AudioLines className="h-4 w-4" />
                {isGenerating
                  ? generationStatus || "正在生成教学设计..."
                  : isUploading
                    ? "正在解析或导入资料，完成后将自动加入参考资料..."
                    : isThinking
                      ? "正在分析你的教学意图..."
                      : canGenerate
                        ? "关键信息已齐，可以开始生成教学设计"
                        : "请继续补充课题、学科、年级或课时信息"}
              </div>
              <Button
                className="rounded-2xl bg-slate-900 hover:bg-slate-800"
                onClick={onGenerate}
                disabled={isGenerating || !canGenerate}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {isGenerating ? "生成中..." : "生成教学设计"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
