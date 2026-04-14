"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BaseChartElement } from "@/components/slide-renderer/components/element/ChartElement/BaseChartElement";
import { BaseImageElement } from "@/components/slide-renderer/components/element/ImageElement/BaseImageElement";
import { BaseLatexElement } from "@/components/slide-renderer/components/element/LatexElement/BaseLatexElement";
import { BaseLineElement } from "@/components/slide-renderer/components/element/LineElement/BaseLineElement";
import { BaseShapeElement } from "@/components/slide-renderer/components/element/ShapeElement/BaseShapeElement";
import { BaseTableElement } from "@/components/slide-renderer/components/element/TableElement/BaseTableElement";
import { BaseTextElement } from "@/components/slide-renderer/components/element/TextElement/BaseTextElement";
import { BaseVideoElement } from "@/components/slide-renderer/components/element/VideoElement/BaseVideoElement";
import { useSlideBackgroundStyle } from "@/lib/hooks/use-slide-background-style";
import type { TeachingDesign } from "@/lib/types/teaching";
import type { DesignSummary, Slide } from "@/lib/types/teaching-design-ui";
import { ElementTypes, type PPTElement } from "@/lib/types/slides";

interface WorkspacePreviewPanelProps {
  designSummary: DesignSummary;
  activeSlide: Slide;
  previewMode: string;
  onPreviewModeChange: (mode: string) => void;
  onBack: () => void;
  design: TeachingDesign | null;
  recentlyUpdated?: boolean;
}

export function WorkspacePreviewPanel(props: WorkspacePreviewPanelProps) {
  const { designSummary, activeSlide, previewMode, onPreviewModeChange, onBack, design, recentlyUpdated = false } = props;

  return (
    <Card className="overflow-hidden rounded-[32px] border-white/70 bg-white/95 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
      <CardContent className="p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-100">阶段 3 · 教学设计工作台</Badge>
              <Badge className={`rounded-full ${recentlyUpdated ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "border-violet-200 bg-violet-50 text-violet-700"}`} variant={recentlyUpdated ? undefined : "outline"}>
                {recentlyUpdated ? "已根据指令优化" : "导出预览"}
              </Badge>
            </div>
            <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-slate-900">{designSummary.title}</h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900">{designSummary.version}</Badge>
              <Clock3 className="h-4 w-4" />最近更新：{designSummary.updatedAt}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-2xl border-slate-200 bg-white" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />返回意图页
            </Button>
            <Tabs value={previewMode} onValueChange={onPreviewModeChange} className="w-auto">
              <TabsList className="rounded-2xl bg-slate-100 p-1">
                <TabsTrigger value="slide" className="rounded-xl">PPT 真实预览</TabsTrigger>
                <TabsTrigger value="doc" className="rounded-xl">DOCX 结构预览</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="mb-5 grid gap-4 xl:grid-cols-3">
          <InfoCard title="教学目标" items={designSummary.goals} />
          <TagCard title="教学重点" items={designSummary.highlights} tone="slate" />
          <TagCard title="教学难点" items={designSummary.difficulties} tone="amber" />
        </div>

        <motion.div
          layout
          animate={recentlyUpdated ? { boxShadow: "0 0 0 1px rgba(16,185,129,0.28), 0 22px 70px rgba(16,185,129,0.18)" } : { boxShadow: "0 0 0 1px rgba(148,163,184,0.12), 0 0 0 rgba(0,0,0,0)" }}
          transition={{ duration: 0.35 }}
          className={`rounded-[30px] border bg-white p-4 shadow-inner ${recentlyUpdated ? "border-emerald-200" : "border-slate-200"}`}
        >
          {previewMode === "slide" ? <RealSlidePreview activeSlide={activeSlide} design={design} recentlyUpdated={recentlyUpdated} /> : <LessonPlanPreview design={design} />}
        </motion.div>
      </CardContent>
    </Card>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3 space-y-2">
        {items.map((item) => <div key={item} className="flex gap-2 text-sm text-slate-600"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{item}</span></div>)}
      </div>
    </div>
  );
}

function TagCard({ title, items, tone }: { title: string; items: string[]; tone: "slate" | "amber" }) {
  const cls = tone === "amber" ? "rounded-full bg-amber-100 px-3 py-1 text-amber-700 hover:bg-amber-100" : "rounded-full border-slate-200 bg-white px-3 py-1 text-slate-700";
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => <Badge key={item} variant={tone === "amber" ? undefined : "outline"} className={cls}>{item}</Badge>)}
      </div>
    </div>
  );
}

function RealSlidePreview({ activeSlide, design, recentlyUpdated }: { activeSlide: Slide; design: TeachingDesign | null; recentlyUpdated: boolean }) {
  const realSlide = design?.slides.find((slide) => slide.id === activeSlide.id);

  return (
    <div className="rounded-[28px] bg-[linear-gradient(140deg,#eef4ff_0%,#f8fbff_28%,#ffffff_58%,#f6f8fc_100%)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Badge className="rounded-full bg-slate-900 px-3 py-1 text-white hover:bg-slate-900">第 {activeSlide.pageNo} 页</Badge>
          {recentlyUpdated ? <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">已同步更新</Badge> : null}
        </div>
      </div>

      {realSlide?.canvas ? (
        <RenderedCanvasSlide slide={realSlide.canvas} />
      ) : (
        <div className="rounded-[26px] border border-dashed border-slate-300 bg-white px-8 py-16 text-center text-sm text-slate-500">
          当前页还没有真实 canvas，暂时无法提供与导出一致的 PPT 预览。
        </div>
      )}
    </div>
  );
}

function RenderedCanvasSlide({ slide }: { slide: TeachingDesign["slides"][number]["canvas"] }) {
  const { backgroundStyle } = useSlideBackgroundStyle(slide?.background);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateWidth = () => {
      setAvailableWidth(node.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const previewMetrics = useMemo(() => {
    if (!slide) {
      return null;
    }

    const viewportWidth = slide.viewportSize;
    const viewportHeight = slide.viewportSize * slide.viewportRatio;
    const framePadding = 48;
    const maxAvailableWidth = availableWidth > framePadding ? availableWidth - framePadding : viewportWidth;
    const previewWidth = Math.min(viewportWidth, maxAvailableWidth);
    const previewHeight = previewWidth * slide.viewportRatio;
    const scale = previewWidth / viewportWidth;

    return {
      viewportWidth,
      viewportHeight,
      previewWidth,
      previewHeight,
      scale,
    };
  }, [availableWidth, slide]);

  if (!slide) return null;

  if (!previewMetrics) {
    return <div ref={containerRef} className="rounded-[26px] border border-slate-200 bg-slate-100 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)]" />;
  }

  const { viewportWidth, viewportHeight, previewWidth, previewHeight, scale } = previewMetrics;

  return (
    <div ref={containerRef} className="rounded-[26px] border border-slate-200 bg-slate-100 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
      <div className="mx-auto w-full" style={{ maxWidth: `${previewWidth}px` }}>
        <div
          className="relative overflow-hidden rounded-[24px] bg-white"
          style={{
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
          }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: `${viewportWidth}px`,
              height: `${viewportHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              ...backgroundStyle,
            }}
          >
            <div className="relative h-full w-full" style={{ color: slide.theme.fontColor, fontFamily: slide.theme.fontName }}>
              {slide.elements.map((element, index) => (
                <StaticSlideElement key={element.id} element={element} index={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaticSlideElement({ element, index }: { element: PPTElement; index: number }) {
  const wrapperStyle = { position: "relative" as const, zIndex: index + 1 };

  switch (element.type) {
    case ElementTypes.TEXT:
      return <div style={wrapperStyle}><BaseTextElement elementInfo={element} /></div>;
    case ElementTypes.IMAGE:
      return <div style={wrapperStyle}><BaseImageElement elementInfo={element} /></div>;
    case ElementTypes.SHAPE:
      return <div style={wrapperStyle}><BaseShapeElement elementInfo={element} /></div>;
    case ElementTypes.LINE:
      return <div style={wrapperStyle}><BaseLineElement elementInfo={element} /></div>;
    case ElementTypes.CHART:
      return <div style={wrapperStyle}><BaseChartElement elementInfo={element} /></div>;
    case ElementTypes.TABLE:
      return <div style={wrapperStyle}><BaseTableElement elementInfo={element} /></div>;
    case ElementTypes.LATEX:
      return <div style={wrapperStyle}><BaseLatexElement elementInfo={element} /></div>;
    case ElementTypes.VIDEO:
      return <div style={wrapperStyle}><BaseVideoElement elementInfo={element} /></div>;
    default:
      return null;
  }
}

function LessonPlanPreview({ design }: { design: TeachingDesign | null }) {
  if (!design) {
    return <div className="rounded-[26px] bg-white px-8 py-16 text-center text-sm text-slate-500">当前没有可预览的教案内容。</div>;
  }

  return (
    <div className="rounded-[26px] bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_42%,#f8fafc_100%)] p-5 shadow-sm">
      <div className="rounded-[22px] border border-slate-200 bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
        <div className="border-b border-slate-100 pb-5">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">DOCX Structure Preview</div>
          <div className="mt-2 text-[28px] font-semibold tracking-tight text-slate-900">{design.title} 教案预览</div>
          <div className="mt-2 text-sm leading-7 text-slate-500">当前预览按 DOCX 导出章节结构展示，方便在导出前检查内容顺序与信息完整性。</div>
        </div>

        <div className="mt-6 space-y-6">
          <section>
            <h3 className="text-base font-semibold text-slate-900">基本信息</h3>
            <div className="mt-3 grid gap-3 rounded-[18px] border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-600 md:grid-cols-2">
              <p><span className="font-medium text-slate-900">课题：</span>{design.title}</p>
              <p><span className="font-medium text-slate-900">学科：</span>{design.subject}</p>
              <p><span className="font-medium text-slate-900">年级：</span>{design.gradeLevel}</p>
              <p><span className="font-medium text-slate-900">课时：</span>{design.duration} 分钟</p>
            </div>
          </section>

          {design.objectives.knowledge.length + design.objectives.skills.length + design.objectives.attitude.length > 0 ? (
            <section>
              <h3 className="text-base font-semibold text-slate-900">一、教学目标</h3>
              <div className="mt-3 space-y-4 text-sm leading-7 text-slate-600">
                {design.objectives.knowledge.length > 0 ? <DocxSubsection title="知识与技能" items={design.objectives.knowledge} /> : null}
                {design.objectives.skills.length > 0 ? <DocxSubsection title="过程与方法" items={design.objectives.skills} /> : null}
                {design.objectives.attitude.length > 0 ? <DocxSubsection title="情感态度与价值观" items={design.objectives.attitude} /> : null}
              </div>
            </section>
          ) : null}

          {(design.keyPoints.length > 0 || design.difficulties.length > 0) ? (
            <section>
              <h3 className="text-base font-semibold text-slate-900">二、教学重难点</h3>
              <div className="mt-3 space-y-4 text-sm leading-7 text-slate-600">
                {design.keyPoints.length > 0 ? <DocxSubsection title="教学重点" items={design.keyPoints} bullet /> : null}
                {design.difficulties.length > 0 ? <DocxSubsection title="教学难点" items={design.difficulties} bullet /> : null}
              </div>
            </section>
          ) : null}

          {design.slides.length > 0 ? (
            <section>
              <h3 className="text-base font-semibold text-slate-900">三、教学过程</h3>
              <div className="mt-4 space-y-4">
                {design.slides.map((slide, index) => (
                  <div key={slide.id} className="rounded-[20px] border border-slate-100 bg-slate-50/70 p-4">
                    <div className="text-sm font-semibold text-slate-900">环节{index + 1}：{slide.title}</div>
                    {slide.description ? <p className="mt-3 text-sm leading-7 text-slate-600"><span className="font-medium text-slate-900">【教学目的】</span>{slide.description}</p> : null}
                    {slide.keyPoints.length > 0 ? (
                      <div className="mt-3">
                        <div className="text-sm font-medium text-slate-900">【教学内容】</div>
                        <div className="mt-2 space-y-2 text-sm leading-7 text-slate-600">
                          {slide.keyPoints.map((item, itemIndex) => (
                            <p key={`${slide.id}-${itemIndex}`}>• {typeof item === "string" ? item : item.content}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {slide.narration ? <p className="mt-3 text-sm leading-7 text-slate-600"><span className="font-medium text-slate-900">【教师讲解】</span>{slide.narration}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {design.procedures.length > 0 ? (
            <section>
              <h3 className="text-base font-semibold text-slate-900">四、教学环节详细设计</h3>
              <div className="mt-4 space-y-4">
                {design.procedures.map((procedure, index) => (
                  <div key={procedure.id} className="rounded-[20px] border border-slate-100 bg-slate-50/70 p-4">
                    <div className="text-sm font-semibold text-slate-900">{index + 1}. {procedure.stageName}（{procedure.duration}分钟）</div>
                    {procedure.teacherActivity ? <p className="mt-3 text-sm leading-7 text-slate-600"><span className="font-medium text-slate-900">【教师活动】</span>{procedure.teacherActivity}</p> : null}
                    {procedure.studentActivity ? <p className="mt-3 text-sm leading-7 text-slate-600"><span className="font-medium text-slate-900">【学生活动】</span>{procedure.studentActivity}</p> : null}
                    {procedure.designIntent ? <p className="mt-3 text-sm leading-7 text-slate-600"><span className="font-medium text-slate-900">【设计意图】</span>{procedure.designIntent}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {design.homework && design.homework.length > 0 ? (
            <section>
              <h3 className="text-base font-semibold text-slate-900">五、课后作业</h3>
              <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">{design.homework.map((item) => <p key={item}>• {item}</p>)}</div>
            </section>
          ) : null}

          {design.boardDesign ? (
            <section>
              <h3 className="text-base font-semibold text-slate-900">六、板书设计</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{design.boardDesign}</p>
            </section>
          ) : null}

          {design.remarks ? (
            <section>
              <h3 className="text-base font-semibold text-slate-900">七、教学反思</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{design.remarks}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DocxSubsection({ title, items, bullet = false }: { title: string; items: string[]; bullet?: boolean }) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <p key={`${title}-${index}`}>{bullet ? `• ${item}` : `${index + 1}. ${item}`}</p>
        ))}
      </div>
    </div>
  );
}
