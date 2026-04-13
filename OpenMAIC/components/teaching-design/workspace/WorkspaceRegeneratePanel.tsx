import { RefreshCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SectionTitle } from "../SectionTitle";

export function WorkspaceRegeneratePanel() {
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
          <Textarea
            defaultValue="请描述你希望如何调整这一页内容：弱化第3页文字密度，增加互动提问，并让导入部分更适合五年级学生课堂表达。"
            className="min-h-[120px] rounded-[24px] border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button className="h-11 rounded-2xl bg-slate-900 px-5 hover:bg-slate-800">
              <RefreshCcw className="mr-2 h-4 w-4" />
              再生成当前页
            </Button>
            <Button variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white px-5">
              <Sparkles className="mr-2 h-4 w-4" />
              生成优化建议
            </Button>
          </div>

          <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 px-4 py-3 text-sm text-violet-800">
            仅修改当前 slide，不影响整体结构。
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
