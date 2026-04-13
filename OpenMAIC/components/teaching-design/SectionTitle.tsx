import React from "react";

interface SectionTitleProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  extra?: React.ReactNode;
}

export function SectionTitle({ icon: Icon, title, extra }: SectionTitleProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
      {extra}
    </div>
  );
}
