"use client";
import { X, Loader2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { ReactNode } from "react";

interface EntityFormModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
  children: ReactNode;
  submitLabel?: string;
}

/** Shared modal chrome for admin create/edit forms — each entity supplies its own fields as children. */
export function EntityFormModal({
  title, onClose, onSubmit, submitting, error, children, submitLabel = "Save",
}: EntityFormModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, dialogRef, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entity-form-modal-title"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="entity-form-modal-title" className="font-display text-lg font-semibold text-brand-600">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {children}
            {error && <Alert variant="error">{error}</Alert>}
          </div>
          <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
