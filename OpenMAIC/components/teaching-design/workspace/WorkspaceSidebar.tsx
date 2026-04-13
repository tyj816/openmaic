"use client";

import { motion } from "framer-motion";
import { BookOpen, LayoutTemplate } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionTitle } from "../SectionTitle";
import { StatusBadge } from "../StatusBadge";
import type { Slide, LessonSection } from "@/lib/types/teaching-design-ui";

interface WorkspaceSidebarProps {
  slides: Slide[];
  lessonSections: LessonSection[];
  activeSlideId: number;
  onSlideSelect: (id: number) => void;
}

export function WorkspaceSidebar({
  slides,
  lessonSections,
  activeSlideId,
  onSlideSelect,
}: WorkspaceSidebarProps) {
  return (
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
                  onClick={() => onSlideSelect(slide.id)}
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
  );
}
