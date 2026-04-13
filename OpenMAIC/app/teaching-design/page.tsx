"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeachingDesignIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/teaching-design/intent");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-lg text-slate-600">正在跳转到教学设计工作台...</div>
      </div>
    </div>
  );
}
