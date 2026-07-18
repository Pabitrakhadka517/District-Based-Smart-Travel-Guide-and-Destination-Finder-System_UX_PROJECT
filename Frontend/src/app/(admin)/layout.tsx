"use client";
import Link from "next/link";
import { LayoutDashboard, Map, Mountain, MessageSquare, Users, Landmark, Footprints, CalendarDays, BookOpen, AlertTriangle, ClipboardList, CalendarCheck } from "lucide-react";
import { Sidebar } from "@/components/shared/sidebar";
import { NotificationBell } from "@/components/shared/notification-bell";
import { useAdminAnalytics, useAdminNotifications, useMarkAdminNotificationRead, useMarkAllAdminNotificationsRead } from "@/hooks/use-content";
import { useAuth } from "@/store/auth-store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data } = useAdminAnalytics();
  const { user } = useAuth();
  const pending = data?.pendingReviews ?? 0;

  const { data: notifData } = useAdminNotifications();
  const markNotificationRead = useMarkAdminNotificationRead();
  const markAllNotificationsRead = useMarkAllAdminNotificationsRead();

  const items = [
    { href: "/admin",              label: "Dashboard",    icon: LayoutDashboard },
    { href: "/admin/districts",    label: "Districts",    icon: Map },
    { href: "/admin/destinations", label: "Destinations", icon: Mountain },
    { href: "/admin/attractions",  label: "Attractions",  icon: Landmark },
    { href: "/admin/treks",        label: "Treks",        icon: Footprints },
    { href: "/admin/festivals",    label: "Festivals",    icon: CalendarDays },
    { href: "/admin/guides",       label: "Guides",       icon: BookOpen },
    { href: "/admin/bookings",     label: "Bookings",     icon: CalendarCheck },
    { href: "/admin/travel-alerts",label: "Travel Alerts",icon: AlertTriangle },
    { href: "/admin/checklists",   label: "Checklists",   icon: ClipboardList },
    { href: "/admin/reviews",      label: "Reviews",      icon: MessageSquare, badge: pending || undefined },
    { href: "/admin/users",        label: "Users",        icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={items} title="Admin Panel" />
      <div className="flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/80 px-6 backdrop-blur">
          <span className="font-display font-semibold text-brand-600">NepalYatra Admin</span>

          <div className="flex items-center gap-3">
            {pending > 0 && (
              <Link
                href="/admin/reviews"
                className="hidden items-center gap-1.5 rounded-xl bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 sm:flex"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                {pending} pending review{pending !== 1 ? "s" : ""}
              </Link>
            )}

            <NotificationBell
              items={notifData?.items ?? []}
              unreadCount={notifData?.unreadCount ?? 0}
              onMarkRead={(id) => markNotificationRead.mutate(id)}
              onMarkAllRead={() => markAllNotificationsRead.mutate()}
            />

            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                {(user?.name?.[0] ?? "A").toUpperCase()}
              </span>
              <span className="hidden text-sm font-medium text-foreground sm:block">
                {user?.name ?? "Admin"}
              </span>
            </div>

            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">
              Administrator
            </span>
          </div>
        </header>

        <main className="px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
