"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useExportTeachingPPTX } from "@/lib/export/use-export-teaching-pptx";
import { TeachingDesignTopbar } from "@/components/teaching-design/TeachingDesignTopbar";
import { WorkspaceSidebar } from "@/components/teaching-design/workspace/WorkspaceSidebar";
import { WorkspacePreviewPanel } from "@/components/teaching-design/workspace/WorkspacePreviewPanel";
import { WorkspaceRegeneratePanel } from "@/components/teaching-design/workspace/WorkspaceRegeneratePanel";
import { WorkspaceEvidencePanel } from "@/components/teaching-design/workspace/WorkspaceEvidencePanel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { TeachingDesign } from "@/lib/types/teaching";
import type { WorkspaceViewModel } from "@/lib/types/teaching-design-ui";
import { mapTeachingDesignToWorkspace } from "@/lib/mappers/teaching-design-to-workspace";
import { loadTeachingDesignDraft } from "@/lib/utils/teaching-design-session";

export default function TeachingDesignWorkspacePage() {
  const [currentDesign, setCurrentDesign] = useState<TeachingDesign | null>(null);
  const [activeSlideId, setActiveSlideId] = useState<string>("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [previewMode, setPreviewMode] = useState("slide");
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [recentlyUpdatedSlideId, setRecentlyUpdatedSlideId] = useState<string | null>(null);
  const { exportPPTX, exporting: isExportingPpt } = useExportTeachingPPTX();
  const clearUpdateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const draft = loadTeachingDesignDraft();
    setCurrentDesign(draft);
    setActiveSlideId(draft?.slides[0]?.id || "");
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    return () => {
      if (clearUpdateTimerRef.current) {
        window.clearTimeout(clearUpdateTimerRef.current);
      }
    };
  }, []);

  const workspaceData = useMemo<WorkspaceViewModel | null>(() => {
    if (!currentDesign) return null;
    return mapTeachingDesignToWorkspace(currentDesign);
  }, [currentDesign]);

  const activeSlide = useMemo(
    () => workspaceData?.slides.find((item) => item.id === activeSlideId) ?? workspaceData?.slides[0],
    [activeSlideId, workspaceData],
  );

  const handleBack = () => {
    window.location.href = "/teaching-design/intent";
  };

  const handleExportPpt = async () => {
    if (!currentDesign) return;
    await exportPPTX(currentDesign);
  };

  const handleExportDocx = async () => {
    if (!currentDesign || isExportingDocx) return;

    setIsExportingDocx(true);
    try {
      const response = await fetch("/api/generate-docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teachingDesign: currentDesign,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "DOCX 导出失败");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentDesign.title}_教案.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "DOCX 导出失败");
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleDesignRegenerated = (newDesign: TeachingDesign) => {
    const preservedSlideId = activeSlideId || newDesign.slides[0]?.id || null;
    setCurrentDesign(newDesign);

    if (preservedSlideId) {
      setActiveSlideId(preservedSlideId);
      setRecentlyUpdatedSlideId(preservedSlideId);
    }

    if (clearUpdateTimerRef.current) {
      window.clearTimeout(clearUpdateTimerRef.current);
    }

    clearUpdateTimerRef.current = window.setTimeout(() => {
      setRecentlyUpdatedSlideId(null);
    }, 2600);
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f5f7fb_45%,#eef2f7_100%)] text-slate-900">
        <TeachingDesignTopbar
          stage="workspace"
          onBack={handleBack}
          canExport={false}
          onExportPpt={handleExportPpt}
          onExportDocx={handleExportDocx}
          isExportingPpt={isExportingPpt}
          isExportingDocx={isExportingDocx}
        />

        <div className="mx-auto max-w-[1720px] px-5 py-6 lg:px-8">
          <div className="mb-5 grid gap-5 xl:grid-cols-[232px_minmax(0,1fr)_272px]">
            <div className="space-y-5">
              <div className="h-[420px] animate-pulse rounded-[28px] border border-white/70 bg-white/70 shadow-[0_10px_50px_rgba(15,23,42,0.04)]" />
            </div>
            <div className="space-y-5">
              <div className="h-[620px] animate-pulse rounded-[32px] border border-white/70 bg-white/75 shadow-[0_10px_50px_rgba(15,23,42,0.04)]" />
              <div className="h-[220px] animate-pulse rounded-[32px] border border-white/70 bg-white/75 shadow-[0_10px_50px_rgba(15,23,42,0.04)]" />
            </div>
            <div className="space-y-5">
              <div className="h-[520px] animate-pulse rounded-[32px] border border-white/70 bg-white/70 shadow-[0_10px_50px_rgba(15,23,42,0.04)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!workspaceData || !activeSlide) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f5f7fb_45%,#eef2f7_100%)] text-slate-900">
        <TeachingDesignTopbar
          stage="workspace"
          onBack={handleBack}
          canExport={false}
          onExportPpt={handleExportPpt}
          onExportDocx={handleExportDocx}
          isExportingPpt={isExportingPpt}
          isExportingDocx={isExportingDocx}
        />

        <div className="mx-auto flex min-h-[calc(100vh-90px)] max-w-[920px] items-center px-5 py-8 lg:px-8">
          <div className="w-full rounded-[36px] border border-white/70 bg-white/95 p-10 text-center shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <h1 className="mt-6 text-[30px] font-semibold tracking-tight text-slate-900">
              当前没有可用教学设计
            </h1>
            <p className="mx-auto mt-3 max-w-[520px] text-sm leading-7 text-slate-500">
              请先在意图理解页完成教学设计生成。
            </p>
            <Button className="mt-8 h-11 rounded-2xl bg-slate-900 px-6 hover:bg-slate-800" onClick={handleBack}>
              返回意图页
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f5f7fb_45%,#eef2f7_100%)] text-slate-900">
      <TeachingDesignTopbar
        stage="workspace"
        onBack={handleBack}
        canExport={Boolean(currentDesign)}
        onExportPpt={handleExportPpt}
        onExportDocx={handleExportDocx}
        isExportingPpt={isExportingPpt}
        isExportingDocx={isExportingDocx}
      />

      <div className="mx-auto max-w-[1720px] px-5 py-6 lg:px-8">
        <div className="mb-5 grid gap-5 xl:grid-cols-[232px_minmax(0,1fr)_272px]">
          <WorkspaceSidebar
            slides={workspaceData.slides}
            lessonSections={workspaceData.lessonSections}
            activeSlideId={activeSlideId}
            onSlideSelect={setActiveSlideId}
            recentlyUpdatedSlideId={recentlyUpdatedSlideId}
            previewMode={previewMode}
          />

          <main className="space-y-5">
            <WorkspacePreviewPanel
              designSummary={workspaceData.designSummary}
              activeSlide={activeSlide}
              previewMode={previewMode}
              onPreviewModeChange={setPreviewMode}
              onBack={handleBack}
              design={currentDesign}
              recentlyUpdated={recentlyUpdatedSlideId === activeSlide.id}
            />

            <WorkspaceRegeneratePanel
              design={currentDesign}
              activeSlide={activeSlide}
              onDesignRegenerated={handleDesignRegenerated}
            />
          </main>

          <WorkspaceEvidencePanel
            evidenceItems={workspaceData.evidenceItems}
            workflowSteps={workspaceData.workflowSteps}
            activeSlideId={activeSlideId}
          />
        </div>
      </div>
    </div>
  );
}
