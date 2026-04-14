import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, string> = {
    已完成: "bg-emerald-50 text-emerald-700 border-emerald-200",
    已生成: "bg-indigo-50 text-indigo-700 border-indigo-200",
    当前页: "bg-slate-900 text-white border-slate-900",
    AI生成中: "bg-violet-50 text-violet-700 border-violet-200",
    待优化: "bg-amber-50 text-amber-700 border-amber-200",
    已解析: "bg-sky-50 text-sky-700 border-sky-200",
    解析中: "bg-violet-50 text-violet-700 border-violet-200",
    解析失败: "bg-red-50 text-red-700 border-red-200",
    已入库: "bg-emerald-50 text-emerald-700 border-emerald-200",
    知识融合中: "bg-orange-50 text-orange-700 border-orange-200",
  };

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-1 text-[11px] ${
        map[status] || "bg-slate-50 text-slate-700 border-slate-200"
      }`}
    >
      {status}
    </Badge>
  );
}
