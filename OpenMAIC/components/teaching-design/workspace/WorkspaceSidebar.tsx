"use client";

import { motion } from "framer-motion";
import { BookOpen, LayoutTemplate, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionTitle } from "../SectionTitle";
import { StatusBadge } from "../StatusBadge";
import type { Slide, LessonSection } from "@/lib/types/teaching-design-ui";

interface WorkspaceSidebarProps {
  slides: Slide[];
  lessonSections: LessonSection[];
  activeSlideId: string;
  onSlideSelect: (id: string) => void;
  recentlyUpdatedSlideId?: string | null;
  previewMode: string;
}

export function WorkspaceSidebar({
  slides,
  lessonSections,
  activeSlideId,
  onSlideSelect,
  recentlyUpdatedSlideId,
  previewMode,
}: WorkspaceSidebarProps) {
  return (
    <aside className="space-y-5">
      {previewMode === "slide" ? (
        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
          <CardContent className="p-5">
            <SectionTitle
              icon={LayoutTemplate}
              title="PPT 结构导航"
              extra={
                <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 text-indigo-700">
                  结构导航
                </Badge>
              }
            />

            <div className="space-y-3">
              {slides.map((slide) => {
                const isActive = slide.id === activeSlideId;
                const isRecentlyUpdated = slide.id === recentlyUpdatedSlideId;

                return (
                  <motion.button
                    key={slide.id}
                    whileHover={{ y: -1 }}
                    onClick={() => onSlideSelect(slide.id)}
                    className={`w-full rounded-[24px] border p-4 text-left transition-all ${
                      isActive
                        ? "border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-md shadow-indigo-100"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/70"
                    } ${isRecentlyUpdated ? "ring-2 ring-emerald-200 ring-offset-2 ring-offset-white" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold ${
                            isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {slide.pageNo}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-slate-900">{slide.type}</div>
                            <Badge variant="outline" className="rounded-full text-[10px]">
                              {slide.tag}
                            </Badge>
                            {isRecentlyUpdated ? (
                              <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                已更新
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 text-sm text-slate-700">{slide.title}</div>
                          <div className="mt-2 text-xs leading-5 text-slate-500">{slide.desc}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <StatusBadge status={isActive ? "当前页" : slide.status} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
          <CardContent className="p-5">
            <SectionTitle
              icon={BookOpen}
              title="DOCX 教案结构"
              extra={
                <Badge variant="outline" className="rounded-full border-cyan-200 bg-cyan-50 text-cyan-700">
                  文档式梳理
                </Badge>
              }
            />

            <div className="space-y-3">
              {lessonSections.map((section, index) => (
                <div key={section.id} className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-700 shadow-sm">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{section.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{section.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-white/80 p-4 text-xs leading-6 text-slate-500">
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <Sparkles className="h-4 w-4 text-amber-500" />
                当前展示为演示级教学结构视图
              </div>
              <div className="mt-2">重点突出“内容组织、教学节奏、活动安排”，便于现场讲解修改闭环。</div>
            </div>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
