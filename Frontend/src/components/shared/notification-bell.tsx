"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface NotificationBellProps {
  items: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

/** Presentational bell/dropdown — the caller supplies the data and mutation
 *  callbacks, since it's shared by both the traveller navbar (`useNotifications`)
 *  and the admin layout (`useAdminNotifications`), and a single component
 *  can't conditionally call one hook or the other based on a prop. */
export function NotificationBell({ items, unreadCount, onMarkRead, onMarkAllRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const btnRef   = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The navbar mounts two instances at once (desktop + mobile, toggled via
  // CSS breakpoints, not unmounted) — a hardcoded id here would duplicate
  // across both, so each instance gets its own.
  const panelId = useId();

  useFocusTrap(open, panelRef, () => setOpen(false));

  /* Click-outside close, matching the pattern used by the navbar's Explore menu. */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleItemClick = (n: Notification) => {
    if (!n.read) onMarkRead(n.id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        ref={btnRef}
        variant="ghost"
        size="icon"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="menu"
          aria-label="Notifications"
          tabIndex={-1}
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-border bg-white p-2 shadow-card"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-medium text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications yet" description="We'll let you know when something changes." />
          ) : (
            <ul className="max-h-96 space-y-0.5 overflow-y-auto">
              {items.map((n) => {
                const row = (
                  <div
                    className={cn(
                      "flex items-start gap-2 rounded-xl px-2 py-2.5 text-sm transition hover:bg-muted/60",
                      !n.read && "bg-brand-50/60"
                    )}
                  >
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", !n.read ? "bg-accent" : "bg-transparent")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground">{n.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} role="menuitem">
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => handleItemClick(n)}
                        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {row}
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleItemClick(n)}
                        className="w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {row}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
