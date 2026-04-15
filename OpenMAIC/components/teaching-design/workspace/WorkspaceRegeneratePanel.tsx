"use client";

import { useMemo, useState } from "react";
import { RefreshCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { TeachingDesign } from "@/lib/types/teaching";
import type { Slide } from "@/lib/types/teaching-design-ui";
import { callRegenerateAPI, updateSessionDesign } from "@/lib/utils/regenerate-helpers";
import { SectionTitle } from "../SectionTitle";

interface WorkspaceRegeneratePanelProps {
  design: TeachingDesign | null;
  activeSlide: Slide | undefined;
  onDesignRegenerated: (design: TeachingDesign) => void;
}

export function WorkspaceRegeneratePanel({
  design,
  activeSlide,
  onDesignRegenerated,
}: WorkspaceRegeneratePanelProps) {
  const [instruction, setInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeSlideLabel = useMemo(() => {
    if (!activeSlide) return "当前页";
    return `第 ${activeSlide.pageNo} 页 · ${activeSlide.title}`;
  }, [activeSlide]);

  const handleRegenerate = async () => {
    if (!design || !activeSlide) {
      const message = "当前没有可再生成的页面。";
      setError(message);
      toast.error(message);
      return;
    }

    const trimmedInstruction = instruction.trim();
    if (!trimmedInstruction) {
      const message = "请输入修改指令后再生成。";
      setError(message);
      toast.error(message);
      return;
    }

    setIsRegenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const newDesign = await callRegenerateAPI({
        design,
        instruction: trimmedInstruction,
        activeSlide: {
          activeSlideId: activeSlide.id,
          activeSlideIndex: activeSlide.pageNo,
          activeSlideTitle: activeSlide.title,
        },
      });

      updateSessionDesign(newDesign);
      onDesignRegenerated(newDesign);

      const message = "当前页已更新";
      setSuccessMessage(message);
      toast.success(message);
    } catch (err) {
      const message = err instanceof Error ? err.message : "再生成失败，请稍后重试。";
      setError(message);
      toast.error(message);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
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
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            正在编辑：<span className="font-medium text-slate-900">{activeSlideLabel}</span>
            <div className="mt-1 text-xs text-slate-500">默认会把当前选中页作为修改目标，无需在指令里重复写页码。</div>
          </div>

          <Textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            disabled={isRegenerating}
            className="min-h-[120px] rounded-[24px] border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="请输入你希望如何调整当前页内容，例如：减少文字、增加互动提问、突出重点"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="h-11 rounded-2xl bg-slate-900 px-5 hover:bg-slate-800"
              onClick={handleRegenerate}
              disabled={isRegenerating || !design || !activeSlide}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
              {isRegenerating ? "生成中..." : "再生成当前页"}
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white px-5"
              disabled
            >
              <Sparkles className="mr-2 h-4 w-4" />
              生成优化建议
            </Button>
          </div>

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
