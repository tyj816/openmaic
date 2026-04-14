"use client";

import { motion } from "framer-motion";
import { FileImage, FileText, Loader2, Paperclip, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "../SectionTitle";
import { StatusBadge } from "../StatusBadge";
import type { UploadedFile } from "@/lib/types/teaching-design-ui";

interface UploadDrawerCardProps {
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  onSelectPdf: () => void;
  onSelectDocx: () => void;
  onSelectImage: () => void;
}

export function UploadDrawerCard({ uploadedFiles, isUploading, onSelectPdf, onSelectDocx, onSelectImage }: UploadDrawerCardProps) {
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
            PDF / DOCX / 图片
          </Badge>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60"
        >
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start p-0 text-left hover:bg-transparent"
            onClick={onSelectPdf}
            disabled={isUploading}
          >
            <div>
              <FileText className="mb-3 h-5 w-5 text-slate-700" />
              <div className="text-sm font-semibold">上传 PDF</div>
              <div className="mt-1 text-xs text-slate-500">教材 / 讲义</div>
            </div>
          </Button>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50/60"
        >
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start p-0 text-left hover:bg-transparent"
            onClick={onSelectDocx}
            disabled={isUploading}
          >
            <div>
              <ScrollText className="mb-3 h-5 w-5 text-slate-700" />
              <div className="text-sm font-semibold">上传 DOCX/DOC</div>
              <div className="mt-1 text-xs text-slate-500"> 教案与备课文档</div>
            </div>
          </Button>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 transition-colors hover:border-cyan-300 hover:bg-cyan-50/60"
        >
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start p-0 text-left hover:bg-transparent"
            onClick={onSelectImage}
            disabled={isUploading}
          >
            <div>
              <FileImage className="mb-3 h-5 w-5 text-slate-700" />
              <div className="text-sm font-semibold">上传图片</div>
              <div className="mt-1 text-xs text-slate-500">参考图片</div>
            </div>
          </Button>
        </motion.div>
      </div>

      <div className="mt-4 space-y-3">
        {uploadedFiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
            暂无上传资料。可先上传 PDF 或 Word 文档，后续会作为 materials 参与教学设计生成。
          </div>
        ) : null}

        {uploadedFiles.map((file) => (
          <div key={file.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
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

      {isUploading ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在解析上传资料...
        </div>
      ) : null}
    </motion.div>
  );
}
