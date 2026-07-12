"use client";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/store/toast-store";
import { cn } from "@/lib/utils";

const STYLES: Record<ToastVariant, string> = {
  success: "border-success/20 bg-white text-success",
  error: "border-destructive/20 bg-white text-destructive",
  info: "border-info/20 bg-white text-info-foreground",
};

const ICON = { success: CheckCircle2, error: XCircle, info: Info };

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[9999] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => {
        const Icon = ICON[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-[calc(100vw-2rem)] max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-card animate-in fade-in-0 slide-in-from-bottom-4",
              STYLES[t.variant]
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-foreground">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
