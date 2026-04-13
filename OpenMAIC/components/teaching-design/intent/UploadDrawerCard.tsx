"use client";

import { motion } from "framer-motion";
import { FileImage, FileText, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "../SectionTitle";
import { StatusBadge } from "../StatusBadge";
import { mockUploadedFiles } from "@/lib/mocks/teaching-design-intent";

export function UploadDrawerCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-[64px] left-0 z-20 w-[420px] rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.14)]"
    >
      <SectionTitle
        icon={Paperclip}
        title="资料上传"
        extra={
          <Badge variant="secondary" className="rounded-full">
            隐式入口
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60"
        >
          <FileText className="mb-3 h-5 w-5 text-slate-700" />
          <div className="text-sm font-semibold">上传 PDF</div>
          <div className="mt-1 text-xs text-slate-500">教材 / 讲义 / 教师批注</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 transition-colors hover:border-cyan-300 hover:bg-cyan-50/60"
        >
          <FileImage className="mb-3 h-5 w-5 text-slate-700" />
          <div className="text-sm font-semibold">上传图片</div>
          <div className="mt-1 text-xs text-slate-500">历史图片 / 板书素材</div>
        </motion.div>
      </div>

      <div className="mt-4 space-y-3">
        {mockUploadedFiles.map((file) => (
          <div
            key={file.id}
            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
          >
            <div className="truncate text-sm font-medium text-slate-900">{file.name}</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {file.type}
                </Badge>
                <span>{file.size}</span>
              </div>
              <StatusBadge status={file.status} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
