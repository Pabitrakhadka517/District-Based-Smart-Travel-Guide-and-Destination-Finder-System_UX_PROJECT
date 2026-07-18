"use client";
import { AlertTriangle, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/use-focus-trap";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" tints the icon and confirm button destructive-red; "default" uses brand colors. */
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, description,
  confirmLabel = "Confirm", cancelLabel = "Cancel",
  variant = "danger", loading = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, dialogRef, onCancel);

  if (!open) return null;

  const danger = variant === "danger";

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      tabIndex={-1}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span
            className={
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl " +
              (danger ? "bg-destructive/10 text-destructive" : "bg-brand-50 text-brand-600")
            }
          >
            <AlertTriangle size={20} />
          </span>
          <div>
            <p id="confirm-dialog-title" className="font-semibold text-foreground">{title}</p>
            <p id="confirm-dialog-description" className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            <X size={14} /> {cancelLabel}
          </Button>
          <Button
            size="sm"
            variant={danger ? "destructive" : "accent"}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
