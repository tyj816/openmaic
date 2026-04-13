"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TeachingDesignTopbar } from "@/components/teaching-design/TeachingDesignTopbar";
import { WorkspaceSidebar } from "@/components/teaching-design/workspace/WorkspaceSidebar";
import { WorkspacePreviewPanel } from "@/components/teaching-design/workspace/WorkspacePreviewPanel";
import { WorkspaceRegeneratePanel } from "@/components/teaching-design/workspace/WorkspaceRegeneratePanel";
import { WorkspaceEvidencePanel } from "@/components/teaching-design/workspace/WorkspaceEvidencePanel";
import {
  mockDesignSummary,
  mockSlides,
  mockLessonSections,
  mockEvidenceItems,
  mockWorkflowSteps,
} from "@/lib/mocks/teaching-design-workspace";

export default function TeachingDesignWorkspacePage() {
  const router = useRouter();
  const [activeSlideId, setActiveSlideId] = useState(3);
  const [previewMode, setPreviewMode] = useState("slide");

  const activeSlide = useMemo(
    () => mockSlides.find((item) => item.id === activeSlideId) ?? mockSlides[0],
    [activeSlideId]
  );

  const handleBack = () => {
    router.push("/teaching-design/intent");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f5f7fb_45%,#eef2f7_100%)] text-slate-900">
      <TeachingDesignTopbar stage="workspace" onBack={handleBack} />

      <div className="mx-auto max-w-[1720px] px-5 py-6 lg:px-8">
        <div className="mb-5 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <WorkspaceSidebar
            slides={mockSlides}
            lessonSections={mockLessonSections}
            activeSlideId={activeSlideId}
            onSlideSelect={setActiveSlideId}
          />

          <main className="space-y-5">
            <WorkspacePreviewPanel
              designSummary={mockDesignSummary}
              activeSlide={activeSlide}
              previewMode={previewMode}
              onPreviewModeChange={setPreviewMode}
              onBack={handleBack}
            />

            <WorkspaceRegeneratePanel />
          </main>

          <WorkspaceEvidencePanel
            evidenceItems={mockEvidenceItems}
            workflowSteps={mockWorkflowSteps}
          />
        </div>
      </div>
    </div>
  );
}
