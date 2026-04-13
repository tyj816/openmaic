"use client";

import { motion } from "framer-motion";
import { Bot, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MessageBubbleProps {
  role: "ai" | "teacher";
  title: string;
  content: string;
  meta: string;
}

export function MessageBubble({ role, title, content, meta }: MessageBubbleProps) {
  const isAI = role === "ai";

  return (
    <div className={`flex gap-3 ${isAI ? "justify-start" : "justify-end"}`}>
      {isAI && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-100">
          <Bot className="h-5 w-5" />
        </div>
      )}

      <motion.div
        whileHover={{ y: -1 }}
        className={`max-w-[86%] rounded-[26px] border p-4 shadow-sm ${
          isAI
            ? "border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <Badge
            className={`rounded-full text-[10px] hover:bg-inherit ${
              isAI ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"
            }`}
          >
            {meta}
          </Badge>
        </div>
        <div className="text-sm leading-7 text-slate-700">{content}</div>
      </motion.div>

      {!isAI && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200">
          <GraduationCap className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
