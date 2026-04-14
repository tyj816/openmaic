import type { TeachingDesign } from "@/lib/types/teaching";
import { saveTeachingDesignDraft } from "@/lib/utils/teaching-design-session";

interface RegenerateTeachingResponse {
  success: boolean;
  design?: TeachingDesign;
  error?: string;
}

interface ActiveSlideContext {
  activeSlideId: string;
  activeSlideIndex?: number;
  activeSlideTitle?: string;
}

function buildAugmentedInstruction(instruction: string, activeSlide: ActiveSlideContext) {
  const parts = [`请修改当前选中的第${activeSlide.activeSlideIndex ?? "?"}页`];

  if (activeSlide.activeSlideTitle) {
    parts.push(`（${activeSlide.activeSlideTitle}）`);
  }

  return `${parts.join("")}：${instruction}`;
}

export async function callRegenerateAPI(params: {
  design: TeachingDesign;
  instruction: string;
  activeSlide: ActiveSlideContext;
}): Promise<TeachingDesign> {
  const response = await fetch("/api/regenerate-teaching", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      design: params.design,
      instruction: params.instruction,
      augmentedInstruction: buildAugmentedInstruction(params.instruction, params.activeSlide),
      activeSlideId: params.activeSlide.activeSlideId,
      activeSlideIndex: params.activeSlide.activeSlideIndex,
      activeSlideTitle: params.activeSlide.activeSlideTitle,
    }),
  });

  const result = (await response.json()) as RegenerateTeachingResponse;

  if (!response.ok || !result.success || !result.design) {
    throw new Error(result.error || "再生成失败，请稍后重试。");
  }

  return result.design;
}

export function updateSessionDesign(design: TeachingDesign) {
  saveTeachingDesignDraft(design);
}
