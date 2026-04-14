"use client";

import { motion } from "framer-motion";
import { Brain, CheckCircle2, Link2, PanelRightOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SectionTitle } from "../SectionTitle";
import type { EvidenceItem, WorkflowStep } from "@/lib/types/teaching-design-ui";

interface WorkspaceEvidencePanelProps {
  evidenceItems: EvidenceItem[];
  workflowSteps: WorkflowStep[];
  activeSlideId?: string;
}

export function WorkspaceEvidencePanel({
  evidenceItems,
  workflowSteps,
  activeSlideId,
}: WorkspaceEvidencePanelProps) {
  const visibleEvidenceItems = activeSlideId
    ? evidenceItems.filter((item) => item.slideId === activeSlideId)
    : evidenceItems;

  return (
    <aside className="space-y-5">
      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
        <CardContent className="p-5">
          <SectionTitle
            icon={PanelRightOpen}
            title="引用与证据"
            extra={
              <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                当前页关联
              </Badge>
            }
          />

          <div className="space-y-3">
            {visibleEvidenceItems.length > 0 ? (
              visibleEvidenceItems.map((item, index) => (
                <motion.div
                  key={`${item.slideId}-${item.chunkId}-${index}`}
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
                    <span className="text-xs font-medium text-slate-400">{item.slideTitle}</span>
                  </div>

                  <div className="mt-3 text-sm leading-6 text-slate-700">{item.content}</div>

                  {item.sourceDetail ? (
                    <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
                      {item.sourceDetail}
                    </div>
                  ) : null}
                </motion.div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                当前页暂无可展示引用
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
        <CardContent className="p-5">
          <SectionTitle
            icon={Link2}
            title="工作流状态"
            
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
                      {step.done ? "已完成" : step.active ? "当前进行中" : "待开始"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">整体进度</div>
              <div className="text-xs text-slate-500">{Math.round((workflowSteps.filter((step) => step.done).length / workflowSteps.length) * 100)}%</div>
            </div>
            <Progress value={Math.round((workflowSteps.filter((step) => step.done).length / workflowSteps.length) * 100)} className="h-2 rounded-full" />
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
