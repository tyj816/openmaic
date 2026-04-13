"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Clock3, FileImage } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DesignSummary, Slide } from "@/lib/types/teaching-design-ui";

interface WorkspacePreviewPanelProps {
  designSummary: DesignSummary;
  activeSlide: Slide;
  previewMode: string;
  onPreviewModeChange: (mode: string) => void;
  onBack: () => void;
}

export function WorkspacePreviewPanel({
  designSummary,
  activeSlide,
  previewMode,
  onPreviewModeChange,
  onBack,
}: WorkspacePreviewPanelProps) {
  return (
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

            <Tabs value={previewMode} onValueChange={onPreviewModeChange} className="w-auto">
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
            <SlidePreview activeSlide={activeSlide} />
          ) : (
            <LessonPlanPreview />
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

function SlidePreview({ activeSlide }: { activeSlide: Slide }) {
  return (
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
                    1. 用"辉煌"与"遗址"图片对照，建立强烈情境冲击
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    2. 聚焦关键词句，梳理课文中由赞叹到沉痛的情感变化
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    3. 设置讨论问题，引导学生表达"为什么要记住这段历史"
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
  );
}

function LessonPlanPreview() {
  return (
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
                完成阅读反思卡，并以"如果文物会说话"为题写一段简短表达。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
