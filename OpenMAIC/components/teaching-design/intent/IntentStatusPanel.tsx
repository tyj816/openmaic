import { Brain, CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SectionTitle } from "../SectionTitle";

export function IntentStatusPanel() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">意图理解状态</div>
              <div className="text-xs text-slate-500">教师输入 → AI 理解 → 进入生成</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <div>
                  <div className="text-sm font-medium text-slate-900">教学目标已提取</div>
                  <div className="text-xs text-slate-500">文本理解 + 情感体验 + 历史责任感</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <div>
                  <div className="text-sm font-medium text-slate-900">资料偏好已提取</div>
                  <div className="text-xs text-slate-500">结合教材批注与历史图片资料</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
              <div className="flex items-center gap-3">
                <Brain className="h-4 w-4 text-violet-700" />
                <div>
                  <div className="text-sm font-medium text-slate-900">互动设计生成中</div>
                  <div className="text-xs text-slate-500">将优先加入讨论与表达任务</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">理解完成度</div>
              <div className="text-xs text-slate-500">86%</div>
            </div>
            <Progress value={86} className="h-2 rounded-full" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
        <CardContent className="p-6">
          <SectionTitle
            icon={Sparkles}
            title="AI 引导要点"
            extra={
              <Badge className="rounded-full bg-sky-100 text-sky-700 hover:bg-sky-100">
                对话驱动
              </Badge>
            }
          />

          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              AI 通过多轮追问替代表单，让教师更自然地表达教学目标与课堂风格。
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              上传资料采用回形针隐式入口，不打断主对话动线。
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              生成按钮只负责进入下一阶段，不在本页混入结构化工作台内容。
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
