"use client";

import { useRouter } from "next/navigation";
import { TeachingDesignTopbar } from "@/components/teaching-design/TeachingDesignTopbar";
import { IntentConversationPanel } from "@/components/teaching-design/intent/IntentConversationPanel";
import { IntentStatusPanel } from "@/components/teaching-design/intent/IntentStatusPanel";
import {
  mockProjectSummary,
  mockGuidancePrompts,
  mockIntentMessages,
} from "@/lib/mocks/teaching-design-intent";

export default function TeachingDesignIntentPage() {
  const router = useRouter();

  const handleGenerate = () => {
    router.push("/teaching-design/workspace");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f5f7fb_45%,#eef2f7_100%)] text-slate-900">
      <TeachingDesignTopbar stage="intent" />

      <div className="mx-auto max-w-[1440px] px-5 py-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <IntentConversationPanel
            projectSummary={mockProjectSummary}
            guidancePrompts={mockGuidancePrompts}
            messages={mockIntentMessages}
            onGenerate={handleGenerate}
          />

          <IntentStatusPanel />
        </div>
      </div>
    </div>
  );
}
