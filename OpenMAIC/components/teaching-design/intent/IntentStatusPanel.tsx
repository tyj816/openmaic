import { Brain, CheckCircle2, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SectionTitle } from "../SectionTitle";

interface TeachingSessionState {
  topic?: string;
  subject?: string;
  gradeLevel?: string;
  duration?: number;
  objectives?: string[];
  additionalNotes?: string;
  useKnowledgeBase?: boolean;
  hasMaterials?: boolean;
  ready: boolean;
}

interface IntentStatusPanelProps {
  teacherMessageCount: number;
  uploadedFileCount: number;
  isUploading: boolean;
  isThinking: boolean;
  isGenerating: boolean;
  generationStatus?: string;
  generationProgress?: number;
  error: string | null;
  completion: number;
  session: TeachingSessionState;
}

function getMissingFields(session: TeachingSessionState) {
  const missing: string[] = [];
  if (!session.topic) missing.push("课题");
  if (!session.subject) missing.push("学科");
  if (!session.gradeLevel) missing.push("年级");
  if (!session.duration) missing.push("课时");
  return missing;
}

export function IntentStatusPanel({
  teacherMessageCount,
  uploadedFileCount,
  isUploading,
  isThinking,
  isGenerating,
  generationStatus,
  generationProgress,
  error,
  completion,
  session,
}: IntentStatusPanelProps) {
  const missingFields = getMissingFields(session);

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
              <div className="text-xs text-slate-500">对话识别 → 资料补充 → 结构化生成</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <div>
                  <div className="text-sm font-medium text-slate-900">已收到教师输入</div>
                  <div className="text-xs text-slate-500">当前已记录 {teacherMessageCount} 条有效补充</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <div>
                  <div className="text-sm font-medium text-slate-900">资料接入状态</div>
                  <div className="text-xs text-slate-500">已上传 {uploadedFileCount} 份参考资料</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 text-sm font-medium text-slate-900">当前已识别信息</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="rounded-full bg-white">课题：{session.topic || "待补充"}</Badge>
                <Badge variant="outline" className="rounded-full bg-white">学科：{session.subject || "待补充"}</Badge>
                <Badge variant="outline" className="rounded-full bg-white">年级：{session.gradeLevel || "待补充"}</Badge>
                <Badge variant="outline" className="rounded-full bg-white">课时：{session.duration ? `${session.duration} 分钟` : "待补充"}</Badge>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
              <div className="flex items-center gap-3">
                {isUploading || isGenerating || isThinking ? (
                  <Loader2 className="h-4 w-4 animate-spin text-violet-700" />
                ) : (
                  <Brain className="h-4 w-4 text-violet-700" />
                )}
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {isGenerating ? "教学设计生成中" : isUploading ? "资料解析中" : isThinking ? "意图理解中" : session.ready ? "已可进入生成" : "继续补充关键信息"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isGenerating
                      ? generationStatus || "正在生成教学设计..."
                      : session.ready
                        ? "关键信息已齐，建议直接生成教学设计"
                        : missingFields.length > 0
                          ? `还缺：${missingFields.join("、")}`
                          : "可继续补充教学目标与互动要求"}
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-700" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">出现错误</div>
                    <div className="text-xs text-slate-500">{error}</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">{isGenerating ? "生成进度" : "理解完成度"}</div>
              <div className="text-xs text-slate-500">{isGenerating ? `${generationProgress ?? 0}%` : `${completion}%`}</div>
            </div>
            <Progress value={isGenerating ? generationProgress ?? 0 : completion} className="h-2 rounded-full" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-white/70 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.06)]">
        <CardContent className="p-6">
          <SectionTitle
            icon={Sparkles}
            title="当前建议"
          />

          <div className="space-y-3">
            {missingFields.length > 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                建议优先补充：{missingFields.join("、")}。
              </div>
            ) : null}

            {uploadedFileCount === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                如有教材、讲义或教师批注，可上传 PDF 作为参考资料。
              </div>
            ) : null}

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {session.ready
                ? "关键信息已完整，可以直接进入教学设计生成。"
                : "若希望课堂更有互动性，也可以继续补充讨论活动、表达任务或重点难点。"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
