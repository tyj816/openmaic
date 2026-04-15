"use client";

import { ArrowLeft, Clock3, Download, FileText, GraduationCap, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TeachingDesignTopbarProps {
  stage: "intent" | "workspace";
  onBack?: () => void;
  canExport?: boolean;
  onExportPpt?: () => void;
  onExportDocx?: () => void;
  isExportingPpt?: boolean;
  isExportingDocx?: boolean;
}

export function TeachingDesignTopbar({
  stage,
  onBack,
  canExport = false,
  onExportPpt,
  onExportDocx,
  isExportingPpt = false,
  isExportingDocx = false,
}: TeachingDesignTopbarProps) {
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
              <h1 className="text-[15px] font-semibold tracking-tight">
                Teaching Design Workspace
              </h1>
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
         
          {stage === "workspace" ? (
            <>
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 bg-white/80"
                onClick={onExportPpt}
                disabled={!canExport || isExportingPpt || isExportingDocx}
              >
                {isExportingPpt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isExportingPpt ? "导出 PPT 中..." : "导出 PPT"}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 bg-white/80"
                onClick={onExportDocx}
                disabled={!canExport || isExportingDocx || isExportingPpt}
              >
                {isExportingDocx ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                {isExportingDocx ? "导出 DOCX 中..." : "导出教案 DOCX"}
              </Button>
            </>
          ) : null}
          
        </div>
      </div>
    </div>
  );
}
