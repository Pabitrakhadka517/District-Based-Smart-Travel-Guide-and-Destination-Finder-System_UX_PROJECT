"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { Heart, Menu, ChevronDown, User, X, LogOut } from "lucide-react";
import { Logo } from "./logo";
import { ConfirmDialog } from "./confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import { useLogout } from "@/hooks/use-content";

const explore = [
  { href: "/districts",                       label: "All Districts",       desc: "Browse all 77 regions of Nepal" },
  { href: "/search?category=Religious",        label: "Religious Sites",     desc: "Temples, monasteries & stupas" },
  { href: "/search?category=Heritage",         label: "Historical Sites",    desc: "Ancient ruins & monuments" },
  { href: "/search?category=Nature",           label: "Natural Attractions", desc: "Parks, forests & scenic spots" },
  { href: "/search?category=Lake",             label: "Lakes & Rivers",      desc: "Phewa, Rara, Tilicho & more" },
  { href: "/treks",                            label: "Trekking Routes",     desc: "Everest, Annapurna & beyond" },
  { href: "/search?category=Wildlife",         label: "National Parks",      desc: "Chitwan, Bardia & wildlife" },
  { href: "/search?category=Adventure",        label: "Adventure",           desc: "Rafting, bungee & paragliding" },
  { href: "/search?category=Cultural",         label: "Cultural Heritage",   desc: "Art, festivals & traditions" },
  { href: "/map",                              label: "Map Explorer",        desc: "Find any destination on the map" },
];
const links = [
  { href: "/search",    label: "Destinations" },
  { href: "/map",       label: "Map" },
  { href: "/guides",    label: "Guides" },
  { href: "/booking",   label: "Book a Trip" },
  { href: "/reviews",   label: "Reviews" },
  { href: "/about",     label: "About" },
];

/* Utility: collect all keyboard-focusable elements inside a container */
function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.closest("[hidden]"));
}

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

  const { isLoggedIn, isAdmin, hasHydrated } = useAuth();
  const logout = useLogout();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const exploreBtnRef  = useRef<HTMLButtonElement>(null);
  const exploreMenuRef = useRef<HTMLDivElement>(null);
  const drawerRef      = useRef<HTMLDivElement>(null);
  const menuBtnRef     = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loggedIn = hasHydrated && isLoggedIn();
  const admin    = hasHydrated && isAdmin();

  /* Close mobile menu on route change */
  useEffect(() => { setOpen(false); }, [pathname]);

  /* ── Explore dropdown: click-outside close ── */
  useEffect(() => {
    if (!exploreOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        exploreBtnRef.current && !exploreBtnRef.current.contains(e.target as Node) &&
        exploreMenuRef.current && !exploreMenuRef.current.contains(e.target as Node)
      ) {
        setExploreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exploreOpen]);

  /* ── Explore dropdown: Escape closes ── */
  useEffect(() => {
    if (!exploreOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExploreOpen(false);
        exploreBtnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [exploreOpen]);

  /* ── Mobile drawer: Escape close + focus trap ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtnRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = getFocusable(drawerRef.current);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  /* Arrow-key navigation inside the Explore dropdown menu */
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent, idx: number) => {
    const items = exploreMenuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    }
  }, []);

  return (
    <header className={cn("sticky top-0 z-50 transition-all duration-300", scrolled ? "glass border-b border-white/40" : "bg-transparent")}>
      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        description="You'll need to log in again to access your dashboard, wishlist and bookings."
        confirmLabel="Log out"
        cancelLabel="Stay logged in"
        variant="danger"
        loading={logout.isPending}
        onConfirm={() => { setConfirmLogout(false); logout.mutate(); }}
        onCancel={() => setConfirmLogout(false)}
      />
      <nav aria-label="Main navigation" className="container flex h-[68px] items-center justify-between gap-4">
        <Logo />

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {/* Explore mega-dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setExploreOpen(true)}
            onMouseLeave={() => setExploreOpen(false)}
          >
            <button
              ref={exploreBtnRef}
              aria-expanded={exploreOpen}
              aria-haspopup="menu"
              aria-controls="explore-menu"
              onClick={() => setExploreOpen((v) => !v)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " " || e.key === "ArrowDown") && !exploreOpen) {
                  e.preventDefault();
                  setExploreOpen(true);
                  /* Focus first menu item on next paint */
                  requestAnimationFrame(() => {
                    exploreMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
                  });
                }
              }}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Explore <ChevronDown size={14} className={cn("transition", exploreOpen && "rotate-180")} aria-hidden="true" />
            </button>

            {exploreOpen && (
              <div
                id="explore-menu"
                ref={exploreMenuRef}
                role="menu"
                aria-label="Explore Nepal"
                className="absolute left-0 top-full w-[480px] pt-2"
              >
                <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-white p-2 shadow-card">
                  {explore.map((item, idx) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      tabIndex={0}
                      onKeyDown={(e) => handleMenuKeyDown(e, idx)}
                      onClick={() => setExploreOpen(false)}
                      className="rounded-xl p-3 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    >
                      <p className="text-sm font-semibold text-brand-600">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname.startsWith(l.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                pathname.startsWith(l.href) ? "text-brand-600 font-semibold" : "text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-2 lg:flex">
          {loggedIn ? (
            <>
              <Link href="/wishlist">
                <Button variant="ghost" size="icon" aria-label="View wishlist"><Heart size={18} aria-hidden="true" /></Button>
              </Link>
              <Link href={admin ? "/admin" : "/dashboard"}>
                <Button variant="ghost" size="icon" aria-label="Go to dashboard"><User size={18} aria-hidden="true" /></Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmLogout(true)}
                disabled={logout.isPending}
                aria-label="Log out of your account"
              >
                <LogOut size={15} aria-hidden="true" /> Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="outline" size="sm">Log in</Button></Link>
              <Link href="/register"><Button size="sm" variant="accent">Sign up</Button></Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          ref={menuBtnRef}
          className="rounded-lg p-1.5 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          id="mobile-menu"
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="glass border-t border-white/40 lg:hidden"
        >
          <div className="container flex flex-col py-4">
            {[...explore, ...links].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname.startsWith(l.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="border-b border-border/50 py-3 text-sm font-medium last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex gap-2">
              {loggedIn ? (
                <>
                  <Link href={admin ? "/admin" : "/dashboard"} className="flex-1">
                    <Button variant="outline" className="w-full"><User size={15} aria-hidden="true" /> Dashboard</Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive"
                    onClick={() => logout.mutate()}
                    disabled={logout.isPending}
                    aria-label="Log out of your account"
                  >
                    <LogOut size={15} aria-hidden="true" /> Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="flex-1"><Button variant="outline" className="w-full">Log in</Button></Link>
                  <Link href="/register" className="flex-1"><Button variant="accent" className="w-full">Sign up</Button></Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
