"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
}

export interface BulkAction {
  label: string;
  icon?: LucideIcon;
  variant?: "danger" | "default";
  confirmMessage?: string;
  onClick: (ids: string[]) => void;
}

interface Props<T extends { id: string; name?: string }> {
  title: string;
  columns: Column<T>[];
  rows: T[];
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  bulkActions?: BulkAction[];
  emptyMessage?: string;
  pageSize?: number;
}

export function AdminTable<T extends { id: string; name?: string }>({
  title, columns, rows, onAdd, onEdit, onDelete,
  searchValue, onSearchChange, searchPlaceholder = "Search…",
  bulkActions, emptyMessage = "No items found.", pageSize = 20,
}: Props<T>) {
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [pendingBulk, setPendingBulk] = useState<{ action: BulkAction; ids: string[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const showBulk = !!bulkActions?.length;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;
  const colSpan = columns.length + (showBulk ? 1 : 0) + (onEdit || onDelete ? 1 : 0);

  // Whenever the underlying (filtered/searched) row set changes, go back to page 1
  // so the pager never gets stranded past the end of a shorter result set.
  useEffect(() => {
    setPage(1);
  }, [rows.length, searchValue]);

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(pageRows.map((r) => r.id)));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSingleDelete = (row: T) => {
    onDelete?.(row);
    setSelected((prev) => { const n = new Set(prev); n.delete(row.id); return n; });
    setPendingDelete(null);
  };

  const triggerBulk = (action: BulkAction) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (action.confirmMessage) {
      setPendingBulk({ action, ids });
    } else {
      action.onClick(ids);
      setSelected(new Set());
    }
  };

  const confirmBulk = () => {
    if (!pendingBulk) return;
    pendingBulk.action.onClick(pendingBulk.ids);
    setSelected(new Set());
    setPendingBulk(null);
  };

  return (
    <>
      {/* Single-row delete confirmation */}
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete item?"
        description={
          pendingDelete?.name
            ? `Delete "${pendingDelete.name}"? This cannot be undone.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete"
        variant="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && handleSingleDelete(pendingDelete)}
      />

      {/* Bulk action confirmation */}
      <ConfirmDialog
        open={!!pendingBulk}
        title="Confirm action"
        description={pendingBulk?.action.confirmMessage ?? ""}
        confirmLabel="Confirm"
        variant="danger"
        onCancel={() => setPendingBulk(null)}
        onConfirm={confirmBulk}
      />

      <div className="rounded-2xl border border-border bg-white shadow-soft">
        {/* Header: title + search + add */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="shrink-0 font-display font-semibold text-brand-600">{title}</h2>
          {onSearchChange && (
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-xl border border-border bg-muted/40 pl-8 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}
          {onAdd && (
            <Button variant="accent" size="sm" onClick={onAdd} className="ml-auto shrink-0">
              <Plus size={14} /> Add new
            </Button>
          )}
        </div>

        {/* Bulk toolbar — appears when rows are selected */}
        {showBulk && someSelected && (
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-brand-50 px-5 py-2.5">
            <span className="text-xs font-medium text-brand-600">
              {selected.size} selected
            </span>
            <div className="flex flex-wrap gap-2">
              {bulkActions!.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    size="sm"
                    variant="outline"
                    className={cn(
                      "h-7 text-xs",
                      action.variant === "danger" && "border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive/40"
                    )}
                    onClick={() => triggerBulk(action)}
                  >
                    {Icon && <Icon size={12} />} {action.label}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs text-muted-foreground"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                {showBulk && (
                  <th className="w-10 px-5 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all rows"
                      className="accent-secondary"
                    />
                  </th>
                )}
                {columns.map((c) => (
                  <th key={String(c.key)} className="px-5 py-3 font-medium">{c.label}</th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : pageRows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors hover:bg-muted/30",
                    selected.has(row.id) && "bg-brand-50/70"
                  )}
                >
                  {showBulk && (
                    <td className="w-10 px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Select ${row.name ?? row.id}`}
                        className="accent-secondary"
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={String(c.key)} className="px-5 py-3 text-foreground">
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key as string] ?? "")}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            title="Edit"
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-secondary"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => setPendingDelete(row)}
                            title="Delete"
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer: row count + pager */}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
            <span>
              {rows.length} item{rows.length !== 1 ? "s" : ""}
              {someSelected && <span className="ml-2 font-medium text-brand-600">· {selected.size} selected</span>}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted/60 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="tabular-nums">Page {currentPage} of {pageCount}</span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage === pageCount}
                  aria-label="Next page"
                  className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted/60 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
