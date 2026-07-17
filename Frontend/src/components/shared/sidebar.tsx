"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface SidebarItem { href: string; label: string; icon: LucideIcon; badge?: number; }

export function Sidebar({ items, title }: { items: SidebarItem[]; title?: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-brand-700 bg-brand-600 p-4 lg:flex">
      <div className="px-2 py-3"><Logo light /></div>
      {title && (
        <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-brand-200">
          {title}
        </p>
      )}
      <nav aria-label="Account navigation" className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((it) => {
          const active = pathname === it.href;
          const Icon   = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1 focus-visible:ring-offset-brand-600",
                active
                  ? "bg-brand-700 text-white"
                  : "text-brand-100 hover:bg-brand-700 hover:text-white"
              )}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="flex-1">{it.label}</span>
              {!!it.badge && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {it.badge > 99 ? "99+" : it.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/"
        className="mt-2 shrink-0 rounded-xl border-t border-brand-700/70 px-3 py-2.5 pt-4 text-sm text-brand-200 hover:bg-brand-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1 focus-visible:ring-offset-brand-600"
      >
        ← Back to site
      </Link>
    </aside>
  );
}
