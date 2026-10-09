import { useEffect } from "react";
import { cn } from "cn";
import type { Toast } from "@/lib/types";
import { useBoardStore } from "@/store/board-store";

function ToastItem({ toast }: { toast: Toast }) {
  const dismissToast = useBoardStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, dismissToast]);

  return (
    <div
      role="status"
      className={cn(
        "toast-enter pointer-events-auto rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-lg",
        toast.variant === "destructive"
          ? "border-rose-300/40 bg-rose-200 text-rose-950"
          : toast.variant === "success"
            ? "border-emerald-400/20 bg-zinc-900 text-emerald-200"
            : "border-white/10 bg-zinc-900 text-zinc-100"
      )}
    >
      {toast.message}
    </div>
  );
}

export function Toaster() {
  const toasts = useBoardStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
