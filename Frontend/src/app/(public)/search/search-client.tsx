"use client";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, SlidersHorizontal, MapPin, X, Clock, CalendarDays, BookOpen,
  Mountain, Tent, Landmark, Bird, TreePine, Zap, MapPinned, Star,
  ArrowRight, ChevronRight, Filter, TrendingUp, Drama, CheckCircle2,
  Sun, Activity, Globe, WifiOff,
} from "lucide-react";
import { useSearch, useDistricts, useSearchAutocomplete, usePopularSearches } from "@/hooks/use-content";
import { useDebouncedValue } from "@/hooks/use-debounced";
import { DestinationCard } from "@/components/cards/destination-card";
import { AttractionCard } from "@/components/cards/attraction-card";
import { TrekCard } from "@/components/cards/trek-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { cn, formatCurrency } from "@/lib/utils";
import { categoryStyle } from "@/lib/category-colors";
import type { Festival, GuideArticle, District, Destination } from "@/types";

/* ─── constants ──────────────────────────────────────────────────────── */

const RECENT_KEY       = "nepayatra_recent_searches";
// Real destination budgets (NPR) run from ~1,100 to ~159,600 per day (avg ~4,100) —
// this ceiling covers the vast majority; a handful of premium multi-day treks exceed it.
const MAX_BUDGET_DEFAULT = 20000;
const MIN_BUDGET = 1000;

const QUICK_FILTERS = [
  { label: "Adventure",  value: "Adventure", icon: Zap      },
  { label: "Religious",  value: "Religious", icon: Landmark },
  { label: "Heritage",   value: "Heritage",  icon: Drama    },
  { label: "Wildlife",   value: "Wildlife",  icon: Bird     },
  { label: "Trekking",   value: "Trekking",  icon: Tent     },
  { label: "Nature",     value: "Nature",    icon: TreePine },
  { label: "Cultural",   value: "Cultural",  icon: Star     },
  { label: "Lakes",      value: "Lake",      icon: Mountain },
] as const;

const DIFFICULTIES = ["Easy", "Moderate", "Challenging", "Strenuous"] as const;
const SEASONS      = ["Spring", "Summer", "Autumn", "Winter"] as const;

const RATING_OPTIONS = [
  { label: "Any rating", value: 0 },
  { label: "3★ & above", value: 3 },
  { label: "4★ & above", value: 4 },
];

const SORT_OPTIONS = [
  { label: "Highest rated",    value: "rating"       },
  { label: "Most reviewed",    value: "reviews"      },
  { label: "Price: low → high",value: "price-low"    },
  { label: "Price: high → low",value: "price-high"   },
  { label: "Alphabetical",     value: "alphabetical" },
  { label: "Newest first",     value: "newest"       },
];

type SuggType = "recent" | "popular" | "district" | "destination" | "attraction" | "trek" | "festival" | "guide";
interface Sugg { id: string; label: string; type: SuggType; meta?: string; }

const SUGG_ICON: Record<SuggType, typeof Search> = {
  district:    MapPinned,
  destination: Mountain,
  attraction:  Landmark,
  trek:        Tent,
  festival:    CalendarDays,
  guide:       BookOpen,
  recent:      Clock,
  popular:     TrendingUp,
};

/* ─── localStorage helpers ───────────────────────────────────────────── */

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]; }
  catch { return []; }
}
function saveRecent(q: string) {
  try {
    const next = [q, ...getRecent().filter(s => s !== q)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}
function removeRecent(q: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(getRecent().filter(s => s !== q)));
  } catch {}
}
function clearAllRecent() {
  try { localStorage.removeItem(RECENT_KEY); } catch {}
}

/* ─── compact result cards ───────────────────────────────────────────── */

function FestivalResultCard({ f }: { f: Festival }) {
  return (
    <Link
      href={`/festivals/${f.slug}`}
      className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-soft transition-colors hover:border-secondary/40"
    >
      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl">
        <CloudinaryImage image={f.image} alt={f.name} fill sizes="80px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-brand-600 line-clamp-1">{f.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays size={11} />{f.month}
          <span className="text-border/80">·</span>
          <MapPin size={11} />{f.where}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{f.description}</p>
      </div>
      <Badge variant="secondary" className="shrink-0 self-start text-xs">{f.type}</Badge>
    </Link>
  );
}

function GuideResultCard({ g }: { g: GuideArticle }) {
  return (
    <Link
      href={`/guides/${g.slug}`}
      className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-soft transition-colors hover:border-secondary/40"
    >
      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl">
        <CloudinaryImage image={g.cover} alt={g.title} fill sizes="80px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-brand-600 line-clamp-1">{g.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{g.excerpt}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{g.readMinutes} min read · {g.category}</p>
      </div>
      <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
    </Link>
  );
}

function DistrictResultCard({ d }: { d: District }) {
  return (
    <Link href={`/districts/${d.slug}`} className="group relative overflow-hidden rounded-2xl shadow-soft">
      <div className="relative h-36">
        <CloudinaryImage
          image={d.heroImage} alt={d.name} fill
          sizes="(max-width:640px) 100vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/80 via-brand-900/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <Badge className="mb-1 bg-white/20 text-[10px] text-white backdrop-blur">{d.province}</Badge>
          <p className="font-display font-bold leading-tight">{d.name}</p>
          <p className="mt-0.5 text-[10px] text-white/75">
            {d.destinationCount} destinations · {d.attractionCount ?? 0} attractions
          </p>
        </div>
      </div>
    </Link>
  );
}

/* ─── skeletons ──────────────────────────────────────────────────────── */

function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4">
      <div className="h-16 w-20 shrink-0 animate-pulse rounded-xl bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="h-48 w-full animate-pulse bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function SearchLoadingSkeleton() {
  return (
    <div className="space-y-10">
      <div>
        <div className="mb-4 h-6 w-36 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
      <div>
        <div className="mb-4 h-6 w-24 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map(i => <ListRowSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

/* ─── section heading ────────────────────────────────────────────────── */

function ResultSection({
  icon: Icon, title, count, children,
}: {
  icon: typeof Search; title: string; count: number; children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-brand-600">
        <Icon size={18} className="text-secondary" />
        {title}
        <Badge variant="default" className="ml-0.5 text-xs font-normal">{count}</Badge>
      </h2>
      {children}
    </section>
  );
}

/* ─── URL builder ────────────────────────────────────────────────────── */

function makeSearchUrl(vals: {
  q: string; cats: string[]; dist: string; diff: string; seas: string;
  rating: number; budget: number; srt: string;
}): string {
  const p = new URLSearchParams();
  if (vals.q)               p.set("q",          vals.q);
  if (vals.cats.length)     p.set("categories", vals.cats.join(","));
  if (vals.dist)            p.set("district",   vals.dist);
  if (vals.diff)            p.set("difficulty", vals.diff);
  if (vals.seas)            p.set("season",     vals.seas);
  if (vals.rating > 0)      p.set("minRating",  String(vals.rating));
  if (vals.budget < MAX_BUDGET_DEFAULT) p.set("maxBudget", String(vals.budget));
  if (vals.srt && vals.srt !== "rating") p.set("sort",  vals.srt);
  return `/search?${p.toString()}`;
}

/* ─── main component ─────────────────────────────────────────────────── */

export function SearchClient() {
  const router   = useRouter();
  const sp       = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── filter state — all initialised from URL ── */
  const [q, setQ]             = useState(sp.get("q") ?? "");
  const [categories, setCategories] = useState<string[]>(() => {
    const raw = sp.get("categories") ?? sp.get("category") ?? "";
    return raw ? raw.split(",").filter(Boolean) : [];
  });
  const [district,  setDistrict]  = useState(sp.get("district")  ?? "");
  const [difficulty,setDifficulty]= useState(sp.get("difficulty") ?? "");
  const [season,    setSeason]    = useState(sp.get("season")     ?? "");
  const [minRating, setMinRating] = useState(() => {
    const v = Number(sp.get("minRating") ?? "0"); return isNaN(v) ? 0 : v;
  });
  const [maxBudget, setMaxBudget] = useState(() => {
    const v = Number(sp.get("maxBudget") ?? ""); return !isNaN(v) && v > 0 ? v : MAX_BUDGET_DEFAULT;
  });
  const [sort, setSort]           = useState(sp.get("sort") ?? "rating");
  const [destPage, setDestPage]   = useState(1);
  const [accumulatedDestinations, setAccumulatedDestinations] = useState<Destination[]>([]);

  /* ── UI state ── */
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [focusedIndex,  setFocusedIndex]  = useState(-1);
  const [recent,        setRecent]        = useState<string[]>([]);
  const [showAdvanced,  setShowAdvanced]  = useState(false);

  /* ── debounced values ── */
  const debouncedQ    = useDebouncedValue(q, 400);
  const autocompleteQ = useDebouncedValue(q, 200);

  /* ── data ── */
  const { data: autocomplete } = useSearchAutocomplete(autocompleteQ);
  const { data: allDistricts = [] } = useDistricts();
  const { data: popularSearches = [] } = usePopularSearches();

  /* ── snapshot of current filter state for URL building ── */
  const currentParams = useCallback(() => ({
    q, cats: categories, dist: district, diff: difficulty,
    seas: season, rating: minRating, budget: maxBudget, srt: sort,
  }), [q, categories, district, difficulty, season, minRating, maxBudget, sort]);

  /* ── search trigger condition ── */
  const hasSearched =
    debouncedQ.length > 0 || categories.length > 0 ||
    !!district || !!difficulty || !!season || minRating > 0 ||
    maxBudget < MAX_BUDGET_DEFAULT;

  /* ── query string sent to backend ── */
  const queryString = useMemo(() => {
    if (!hasSearched) return "";
    const p = new URLSearchParams();
    if (debouncedQ)    p.set("q",          debouncedQ);
    if (categories.length) p.set("categories", categories.join(","));
    if (district)      p.set("district",   district);
    if (difficulty)    p.set("difficulty", difficulty);
    if (season)        p.set("season",     season);
    if (minRating > 0) p.set("minRating",  String(minRating));
    if (maxBudget < MAX_BUDGET_DEFAULT) p.set("maxBudget", String(maxBudget));
    p.set("sort", sort);
    if (destPage > 1) p.set("page", String(destPage));
    return p.toString();
  }, [hasSearched, debouncedQ, categories, district, difficulty, season, minRating, maxBudget, sort, destPage]);

  // Any filter change (not the page itself) starts a fresh search from page 1.
  useEffect(() => {
    setDestPage(1);
  }, [debouncedQ, categories, district, difficulty, season, minRating, maxBudget, sort]);

  const { data, isLoading, isError, refetch } = useSearch(queryString);

  // Accumulate destinations across "Load more" pages; a fresh page-1 result replaces them.
  useEffect(() => {
    if (!data) return;
    setAccumulatedDestinations(prev =>
      destPage === 1 ? data.destinations : [...prev, ...data.destinations]
    );
  }, [data, destPage]);

  /* ── parsed results ── */
  const destinations    = accumulatedDestinations;
  const destinationsTotal = data?.destinationsTotal ?? destinations.length;
  const canLoadMoreDestinations = destinations.length < destinationsTotal;
  const attractions     = data?.attractions  ?? [];
  const resultDistricts = data?.districts    ?? [];
  const treks           = data?.treks        ?? [];
  const festivals       = data?.festivals    ?? [];
  const guides          = data?.guides       ?? [];

  const visibleTotal =
    resultDistricts.length + destinationsTotal + attractions.length +
    treks.length + festivals.length + guides.length;

  const hasResults = visibleTotal > 0;

  /* ── active filter count (for badge) ── */
  const activeFilterCount =
    categories.length +
    (district   ? 1 : 0) +
    (difficulty ? 1 : 0) +
    (season     ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (maxBudget < MAX_BUDGET_DEFAULT ? 1 : 0);

  /* ── flat suggestion list (drives keyboard navigation) ── */
  const flatSuggs = useMemo((): Sugg[] => {
    if (q.length < 2) {
      return [
        ...recent.map(s => ({ id: `rec:${s}`,  label: s,      type: "recent"   as SuggType })),
        ...popularSearches.slice(0, 12).map(s => ({ id: `pop:${s}`, label: s, type: "popular" as SuggType })),
      ];
    }
    return [
      ...(autocomplete?.districts    ?? []).slice(0, 2).map(d => ({ id: `dist:${d.id}`,  label: d.name,  type: "district"    as SuggType, meta: d.province   })),
      ...(autocomplete?.destinations ?? []).slice(0, 4).map(d => ({ id: `dest:${d.id}`,  label: d.name,  type: "destination" as SuggType, meta: d.category   })),
      ...(autocomplete?.attractions  ?? []).slice(0, 3).map(a => ({ id: `attr:${a.id}`,  label: a.name,  type: "attraction"  as SuggType, meta: a.category   })),
      ...(autocomplete?.treks        ?? []).slice(0, 2).map(t => ({ id: `trek:${t.id}`,  label: t.name,  type: "trek"        as SuggType, meta: t.difficulty })),
      ...(autocomplete?.festivals    ?? []).slice(0, 2).map(f => ({ id: `fest:${f.id}`,  label: f.name,  type: "festival"    as SuggType, meta: f.type       })),
      ...(autocomplete?.guides       ?? []).slice(0, 2).map(g => ({ id: `guide:${g.id}`, label: g.title, type: "guide"       as SuggType, meta: g.category   })),
    ];
  }, [q, recent, autocomplete, popularSearches]);

  /* ── sync URL → state (back/forward nav & Link clicks) ── */
  useEffect(() => {
    setQ(sp.get("q") ?? "");
    const rawCats = sp.get("categories") ?? sp.get("category") ?? "";
    setCategories(rawCats ? rawCats.split(",").filter(Boolean) : []);
    setDistrict(sp.get("district")  ?? "");
    setDifficulty(sp.get("difficulty") ?? "");
    setSeason(sp.get("season") ?? "");
    setSort(sp.get("sort") ?? "rating");
    const mr = Number(sp.get("minRating") ?? "0");
    setMinRating(isNaN(mr) ? 0 : mr);
    const mb = Number(sp.get("maxBudget") ?? "");
    setMaxBudget(!isNaN(mb) && mb > 0 ? mb : MAX_BUDGET_DEFAULT);
  }, [sp]);

  /* ─── event handlers ─────────────────────────────────────────── */

  function handleFocus() { setRecent(getRecent()); setDropdownOpen(true); setFocusedIndex(-1); }
  function handleBlur()  { setTimeout(() => { setDropdownOpen(false); setFocusedIndex(-1); }, 160); }

  function applySearch(term: string) {
    setQ(term);
    setDropdownOpen(false);
    setFocusedIndex(-1);
    saveRecent(term);
    router.push(makeSearchUrl({ ...currentParams(), q: term }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (focusedIndex >= 0 && flatSuggs[focusedIndex]) {
      applySearch(flatSuggs[focusedIndex].label);
    } else if (q.trim()) {
      applySearch(q.trim());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropdownOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, flatSuggs.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setDropdownOpen(false); setFocusedIndex(-1);
    }
  }

  const handleClearAllRecent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); clearAllRecent(); setRecent([]);
  }, []);

  function handleRemoveRecent(e: React.MouseEvent, s: string) {
    e.stopPropagation(); removeRecent(s); setRecent(prev => prev.filter(r => r !== s));
  }

  function isFocused(sugg: Sugg) {
    const idx = flatSuggs.findIndex(s => s.id === sugg.id);
    return idx !== -1 && focusedIndex === idx;
  }

  /* ── multi-select category toggle ── */
  function toggleCategory(val: string) {
    const next = categories.includes(val)
      ? categories.filter(c => c !== val)
      : [...categories, val];
    setCategories(next);
    router.replace(makeSearchUrl({ ...currentParams(), cats: next }));
  }

  /* ── clear all filters ── */
  function clearAllFilters() {
    setCategories([]); setDistrict(""); setDifficulty(""); setSeason("");
    setMinRating(0); setMaxBudget(MAX_BUDGET_DEFAULT);
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sort && sort !== "rating") p.set("sort", sort);
    router.replace(`/search?${p.toString()}`);
  }

  /* ── suggestion row ── */
  function SuggRow({ sugg }: { sugg: Sugg }) {
    const Icon    = SUGG_ICON[sugg.type];
    const focused = isFocused(sugg);
    return (
      <button
        onMouseDown={() => applySearch(sugg.label)}
        role="option" aria-selected={focused}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
          focused ? "bg-brand-50 text-brand-600" : "text-foreground hover:bg-muted/60"
        )}
      >
        <Icon size={14} className={cn("shrink-0", focused ? "text-secondary" : "text-muted-foreground")} />
        <span className="flex-1 truncate">{sugg.label}</span>
        {sugg.meta && <span className="shrink-0 text-[10px] text-muted-foreground">{sugg.meta}</span>}
      </button>
    );
  }

  /* ───────────────────────────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────────────────────────── */
  return (
    <section className="container py-10">

      {/* ── page header ── */}
      <h1 className="h2 text-brand-600">Explore Nepal</h1>
      <p className="lead mt-1 text-muted-foreground">
        Search across districts, attractions, destinations, treks, festivals and travel guides.
      </p>

      {/* ══════════════════════════════════════════════════════
          SEARCH INPUT  with autocomplete dropdown
      ══════════════════════════════════════════════════════ */}
      <form onSubmit={handleSubmit} className="relative mt-6">
        <div className={cn(
          "flex items-center gap-3 rounded-2xl border bg-white px-4 shadow-soft transition-all",
          dropdownOpen ? "border-secondary/60 ring-2 ring-secondary/20 shadow-md" : "border-border"
        )}>
          <Search size={20} className="shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setFocusedIndex(-1); }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Search places, treks, festivals, guides…"
            aria-label="Search Nepal"
            aria-autocomplete="list"
            aria-expanded={dropdownOpen}
            aria-controls="search-suggestions-listbox"
            role="combobox"
            className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(""); inputRef.current?.focus(); }}
              aria-label="Clear search"
              className="shrink-0 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
          >
            Search
          </button>
        </div>

        {/* ── autocomplete dropdown ── */}
        {dropdownOpen && (
          <div
            id="search-suggestions-listbox"
            role="listbox" aria-label="Search suggestions"
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
          >
            {q.length < 2 ? (
              <div className="space-y-4 p-3">
                {recent.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between px-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recent searches</p>
                      <button
                        onClick={handleClearAllRecent}
                        className="text-[10px] text-muted-foreground transition hover:text-foreground hover:underline"
                      >Clear all</button>
                    </div>
                    <div className="space-y-0.5">
                      {recent.map(s => {
                        const sugg: Sugg = { id: `rec:${s}`, label: s, type: "recent" };
                        const focused = isFocused(sugg);
                        return (
                          <div key={s} className={cn(
                            "group flex items-center rounded-xl transition-colors",
                            focused ? "bg-brand-50" : "hover:bg-muted/60"
                          )}>
                            <button
                              onMouseDown={() => applySearch(s)}
                              role="option" aria-selected={focused}
                              className="flex flex-1 items-center gap-2 px-3 py-2 text-left text-sm text-foreground"
                            >
                              <Clock size={13} className="shrink-0 text-muted-foreground" />{s}
                            </button>
                            <button
                              onMouseDown={(e) => handleRemoveRecent(e, s)}
                              aria-label={`Remove "${s}" from history`}
                              className="mr-1 shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Popular in Nepal</p>
                  <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                    {popularSearches.slice(0, 12).map(s => {
                      const sugg: Sugg = { id: `pop:${s}`, label: s, type: "popular" };
                      const focused = isFocused(sugg);
                      return (
                        <button
                          key={s} onMouseDown={() => applySearch(s)}
                          role="option" aria-selected={focused}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition-colors",
                            focused
                              ? "border-secondary bg-secondary/10 text-secondary"
                              : "border-border text-foreground hover:border-secondary hover:text-secondary"
                          )}
                        >{s}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-h-[22rem] overflow-y-auto p-2">
                {(() => {
                  const distSuggs  = (autocomplete?.districts    ?? []).slice(0, 2);
                  const destSuggs  = (autocomplete?.destinations ?? []).slice(0, 4);
                  const attrSuggs  = (autocomplete?.attractions  ?? []).slice(0, 3);
                  const trekSuggs  = (autocomplete?.treks        ?? []).slice(0, 2);
                  const festSuggs  = (autocomplete?.festivals    ?? []).slice(0, 2);
                  const guideSuggs = (autocomplete?.guides       ?? []).slice(0, 2);
                  const total = distSuggs.length + destSuggs.length + attrSuggs.length + trekSuggs.length + festSuggs.length + guideSuggs.length;

                  if (total === 0) {
                    return (
                      <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                        No suggestions for &quot;{q}&quot; — press Enter to search
                      </p>
                    );
                  }

                  function SuggGroup({ label, items }: { label: string; items: Sugg[] }) {
                    if (items.length === 0) return null;
                    return (
                      <div className="mb-1">
                        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                        {items.map(s => <SuggRow key={s.id} sugg={s} />)}
                      </div>
                    );
                  }

                  return (
                    <>
                      <SuggGroup label="Districts"    items={distSuggs.map(d  => ({ id: `dist:${d.id}`,  label: d.name,  type: "district"    as SuggType, meta: d.province   }))} />
                      <SuggGroup label="Destinations" items={destSuggs.map(d  => ({ id: `dest:${d.id}`,  label: d.name,  type: "destination" as SuggType, meta: d.category   }))} />
                      <SuggGroup label="Attractions"  items={attrSuggs.map(a  => ({ id: `attr:${a.id}`,  label: a.name,  type: "attraction"  as SuggType, meta: a.category   }))} />
                      <SuggGroup label="Treks"        items={trekSuggs.map(t  => ({ id: `trek:${t.id}`,  label: t.name,  type: "trek"        as SuggType, meta: t.difficulty }))} />
                      <SuggGroup label="Festivals"    items={festSuggs.map(f  => ({ id: `fest:${f.id}`,  label: f.name,  type: "festival"    as SuggType, meta: f.type       }))} />
                      <SuggGroup label="Guides"       items={guideSuggs.map(g => ({ id: `guide:${g.id}`, label: g.title, type: "guide"       as SuggType, meta: g.category   }))} />
                      <div className="mt-1 border-t border-border/60 pt-1">
                        <button
                          onMouseDown={() => applySearch(q)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-secondary transition hover:bg-brand-50"
                        >
                          <span>See all results for &quot;{q}&quot;</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </form>

      {/* ══════════════════════════════════════════════════════
          QUICK FILTER CHIPS  (multi-select)
      ══════════════════════════════════════════════════════ */}
      <div className="mt-5 flex flex-wrap gap-2">
        {/* All — clears every category */}
        <button
          onClick={() => {
            setCategories([]);
            router.replace(makeSearchUrl({ ...currentParams(), cats: [] }));
          }}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            categories.length === 0
              ? "border-secondary bg-secondary/10 text-secondary"
              : "border-border bg-white text-muted-foreground hover:border-secondary/50 hover:text-foreground"
          )}
        >
          All
        </button>

        {QUICK_FILTERS.map(({ label, value, icon: Icon }) => {
          const active = categories.includes(value);
          return (
            <button
              key={value}
              onClick={() => toggleCategory(value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                active
                  ? categoryStyle(value)
                  : "border-border bg-white text-muted-foreground hover:border-secondary/50 hover:text-foreground"
              )}
            >
              {active && <CheckCircle2 size={12} className="shrink-0" />}
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════
          DISCOVERY STATE  (no search active yet)
      ══════════════════════════════════════════════════════ */}
      {!hasSearched ? (
        <div className="mt-14 space-y-14">

          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <span className="kicker">Trending searches</span>
                <h2 className="h3 mt-1 text-brand-600">Popular in Nepal</h2>
              </div>
              <Link href="/search?sort=reviews" className="flex items-center gap-1 text-sm font-medium text-secondary hover:underline">
                Explore all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {popularSearches.map(s => (
                <button
                  key={s}
                  onClick={() => applySearch(s)}
                  className="group flex items-center gap-2 rounded-2xl border border-border bg-white px-5 py-3 text-sm text-foreground shadow-soft transition-all hover:border-secondary hover:shadow-md"
                >
                  <TrendingUp size={13} className="text-muted-foreground transition group-hover:text-secondary" />
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="kicker">Browse by type</span>
            <h2 className="h3 mt-1 mb-5 text-brand-600">What are you looking for?</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Destinations", icon: Mountain,  href: "/search?categories=Adventure"  },
                { label: "Holy Sites",   icon: Landmark,  href: "/search?categories=Religious"  },
                { label: "Heritage",     icon: Drama,     href: "/search?categories=Heritage"   },
                { label: "Wildlife",     icon: Bird,      href: "/search?categories=Wildlife"   },
                { label: "Treks",        icon: Tent,      href: "/treks"                        },
                { label: "Nature",       icon: TreePine,  href: "/search?categories=Nature"     },
              ].map(c => (
                <Link
                  key={c.label} href={c.href}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 shadow-soft transition-all hover:border-secondary hover:shadow-md"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-secondary">
                    <c.icon size={22} />
                  </span>
                  <span className="text-sm font-medium text-brand-600">{c.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <span className="kicker">Explore by region</span>
                <h2 className="h3 mt-1 text-brand-600">Browse districts</h2>
              </div>
              <Link href="/districts" className="flex items-center gap-1 text-sm font-medium text-secondary hover:underline">
                All 77 districts <ArrowRight size={14} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {allDistricts.slice(0, 20).map(d => (
                <Link
                  key={d.id} href={`/districts/${d.slug}`}
                  className="rounded-full border border-border bg-white px-4 py-1.5 text-sm text-foreground shadow-soft transition-all hover:border-secondary hover:text-secondary"
                >
                  {d.name}
                </Link>
              ))}
              {allDistricts.length > 20 && (
                <Link
                  href="/districts"
                  className="rounded-full border border-secondary/40 bg-secondary/5 px-4 py-1.5 text-sm font-medium text-secondary transition hover:bg-secondary/10"
                >
                  +{allDistricts.length - 20} more
                </Link>
              )}
            </div>
          </div>
        </div>

      ) : (
        /* ══════════════════════════════════════════════════════
            RESULTS STATE
        ══════════════════════════════════════════════════════ */
        <div className="mt-8 grid gap-8 lg:grid-cols-4">

          {/* ── advanced filters sidebar ── */}
          <aside aria-label="Advanced search filters" className="lg:col-span-1">

            {/* mobile toggle */}
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-white px-5 py-3.5 shadow-soft lg:hidden"
            >
              <span className="flex items-center gap-2 font-medium text-brand-600">
                <Filter size={15} />
                Advanced filters
                {activeFilterCount > 0 && (
                  <Badge variant="accent">{activeFilterCount}</Badge>
                )}
              </span>
              <ChevronRight
                size={16}
                className={cn("text-muted-foreground transition-transform duration-200", showAdvanced && "rotate-90")}
              />
            </button>

            <div className={cn(
              "space-y-6 rounded-2xl border border-border bg-white p-5 shadow-soft",
              "hidden lg:block",
              showAdvanced && "!block mt-2 lg:mt-0"
            )}>
              {/* header */}
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-display font-semibold text-brand-600">
                  <SlidersHorizontal size={15} /> Filters
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-medium text-secondary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* District */}
              <div>
                <label htmlFor="district-select" className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <MapPinned size={14} className="text-secondary" /> District
                </label>
                <select
                  id="district-select"
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    router.replace(makeSearchUrl({ ...currentParams(), dist: e.target.value }));
                  }}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All districts</option>
                  {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <Activity size={14} className="text-secondary" /> Difficulty
                </p>
                <div className="space-y-1.5">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-muted/50">
                    <input
                      type="radio" name="difficulty" value=""
                      checked={difficulty === ""}
                      onChange={() => {
                        setDifficulty("");
                        router.replace(makeSearchUrl({ ...currentParams(), diff: "" }));
                      }}
                      className="h-4 w-4 accent-secondary"
                    />
                    <span className={difficulty === "" ? "font-medium text-brand-600" : "text-foreground"}>Any difficulty</span>
                  </label>
                  {DIFFICULTIES.map(d => (
                    <label key={d} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-muted/50">
                      <input
                        type="radio" name="difficulty" value={d}
                        checked={difficulty === d}
                        onChange={() => {
                          setDifficulty(d);
                          router.replace(makeSearchUrl({ ...currentParams(), diff: d }));
                        }}
                        className="h-4 w-4 accent-secondary"
                      />
                      <span className={difficulty === d ? "font-medium text-brand-600" : "text-foreground"}>{d}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Best Season */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <Sun size={14} className="text-secondary" /> Best season
                </p>
                <div className="space-y-1.5">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-muted/50">
                    <input
                      type="radio" name="season" value=""
                      checked={season === ""}
                      onChange={() => {
                        setSeason("");
                        router.replace(makeSearchUrl({ ...currentParams(), seas: "" }));
                      }}
                      className="h-4 w-4 accent-secondary"
                    />
                    <span className={season === "" ? "font-medium text-brand-600" : "text-foreground"}>Any season</span>
                  </label>
                  {SEASONS.map(s => (
                    <label key={s} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-muted/50">
                      <input
                        type="radio" name="season" value={s}
                        checked={season === s}
                        onChange={() => {
                          setSeason(s);
                          router.replace(makeSearchUrl({ ...currentParams(), seas: s }));
                        }}
                        className="h-4 w-4 accent-secondary"
                      />
                      <span className={season === s ? "font-medium text-brand-600" : "text-foreground"}>{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <Star size={14} className="fill-accent text-accent" /> Min rating
                </p>
                <div className="space-y-1.5">
                  {RATING_OPTIONS.map(({ label, value }) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-muted/50">
                      <input
                        type="radio" name="rating" value={value}
                        checked={minRating === value}
                        onChange={() => {
                          setMinRating(value);
                          router.replace(makeSearchUrl({ ...currentParams(), rating: value }));
                        }}
                        className="h-4 w-4 accent-secondary"
                      />
                      <span className={minRating === value ? "font-medium text-brand-600" : "text-foreground"}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Max budget */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="max-budget" className="flex items-center gap-1.5 text-sm font-medium">
                    <Globe size={14} className="text-secondary" /> Max budget / day
                  </label>
                  <span className="text-xs font-semibold text-brand-600">
                    {maxBudget === MAX_BUDGET_DEFAULT ? "Any" : formatCurrency(maxBudget)}
                  </span>
                </div>
                <input
                  id="max-budget" type="range" min={MIN_BUDGET} max={MAX_BUDGET_DEFAULT} step={500} value={maxBudget}
                  onChange={(e) => {
                    setMaxBudget(Number(e.target.value));
                    router.replace(makeSearchUrl({ ...currentParams(), budget: Number(e.target.value) }));
                  }}
                  className="w-full accent-accent"
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{formatCurrency(MIN_BUDGET)}</span><span>Any</span>
                </div>
              </div>
            </div>
          </aside>

          {/* ── results panel ── */}
          <div className="space-y-10 lg:col-span-3">

            {/* toolbar: count + active filter chips + sort */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Searching…" : (
                    <>
                      <span className="font-semibold text-foreground">{visibleTotal}</span>
                      {" "}result{visibleTotal !== 1 ? "s" : ""}
                      {debouncedQ && <> for &quot;<span className="text-brand-600">{debouncedQ}</span>&quot;</>}
                    </>
                  )}
                </p>

                {/* active category chips — one per selected category */}
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-0.5 text-xs font-medium text-secondary transition hover:bg-secondary/20"
                  >
                    {cat} <X size={11} />
                  </button>
                ))}

                {district && (
                  <button
                    onClick={() => {
                      setDistrict("");
                      router.replace(makeSearchUrl({ ...currentParams(), dist: "" }));
                    }}
                    className="flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-0.5 text-xs font-medium text-secondary transition hover:bg-secondary/20"
                  >
                    {allDistricts.find(d => d.id === district)?.name ?? "District"} <X size={11} />
                  </button>
                )}

                {difficulty && (
                  <button
                    onClick={() => {
                      setDifficulty("");
                      router.replace(makeSearchUrl({ ...currentParams(), diff: "" }));
                    }}
                    className="flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-0.5 text-xs font-medium text-secondary transition hover:bg-secondary/20"
                  >
                    {difficulty} <X size={11} />
                  </button>
                )}

                {season && (
                  <button
                    onClick={() => {
                      setSeason("");
                      router.replace(makeSearchUrl({ ...currentParams(), seas: "" }));
                    }}
                    className="flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-0.5 text-xs font-medium text-secondary transition hover:bg-secondary/20"
                  >
                    {season} <X size={11} />
                  </button>
                )}

                {minRating > 0 && (
                  <button
                    onClick={() => {
                      setMinRating(0);
                      router.replace(makeSearchUrl({ ...currentParams(), rating: 0 }));
                    }}
                    className="flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-0.5 text-xs font-medium text-secondary transition hover:bg-secondary/20"
                  >
                    {minRating}★+ <X size={11} />
                  </button>
                )}
              </div>

              {/* sort */}
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort:</span>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    router.replace(makeSearchUrl({ ...currentParams(), srt: e.target.value }));
                  }}
                  className="h-9 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Sort results by"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── loading ── */}
            {isLoading && <SearchLoadingSkeleton />}

            {/* ── error ── */}
            {!isLoading && isError && (
              <EmptyState
                icon={WifiOff}
                title="Search is temporarily unavailable"
                description="We couldn't reach the search service. Please check your connection and try again."
                action={{ label: "Retry", onClick: () => refetch() }}
              />
            )}

            {/* ── results ── */}
            {!isLoading && !isError && hasResults && (
              <>
                {resultDistricts.length > 0 && (
                  <ResultSection icon={MapPinned} title="Districts" count={resultDistricts.length}>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {resultDistricts.map(d => <DistrictResultCard key={d.id} d={d} />)}
                    </div>
                  </ResultSection>
                )}

                {destinations.length > 0 && (
                  <ResultSection icon={Mountain} title="Destinations" count={destinationsTotal}>
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                      {destinations.map(d => <DestinationCard key={d.id} destination={d} />)}
                    </div>
                    {canLoadMoreDestinations && (
                      <div className="mt-6 flex justify-center">
                        <button
                          onClick={() => setDestPage(p => p + 1)}
                          className="rounded-xl border border-secondary/40 bg-secondary/5 px-5 py-2 text-sm font-medium text-secondary transition hover:bg-secondary/10"
                        >
                          Load more destinations
                        </button>
                      </div>
                    )}
                  </ResultSection>
                )}

                {attractions.length > 0 && (
                  <ResultSection icon={Landmark} title="Attractions" count={attractions.length}>
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                      {attractions.map(a => <AttractionCard key={a.id} attraction={a} />)}
                    </div>
                  </ResultSection>
                )}

                {treks.length > 0 && (
                  <ResultSection icon={Tent} title="Treks" count={treks.length}>
                    <div className="grid gap-6 sm:grid-cols-2">
                      {treks.map(t => <TrekCard key={t.id} trek={t} />)}
                    </div>
                  </ResultSection>
                )}

                {festivals.length > 0 && (
                  <ResultSection icon={CalendarDays} title="Festivals" count={festivals.length}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {festivals.map(f => <FestivalResultCard key={f.id} f={f} />)}
                    </div>
                  </ResultSection>
                )}

                {guides.length > 0 && (
                  <ResultSection icon={BookOpen} title="Guides & Stories" count={guides.length}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {guides.map(g => <GuideResultCard key={g.id} g={g} />)}
                    </div>
                  </ResultSection>
                )}
              </>
            )}

            {/* ── empty state ── */}
            {!isLoading && !isError && !hasResults && data && (
              <div>
                <EmptyState
                  icon={Search}
                  title={`No results for "${debouncedQ || categories.join(", ") || "your search"}"`}
                  description="Try different keywords, remove some filters, or explore popular searches below."
                />
                {activeFilterCount > 0 && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={clearAllFilters}
                      className="rounded-xl border border-secondary/40 bg-secondary/5 px-5 py-2 text-sm font-medium text-secondary transition hover:bg-secondary/10"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
                <div className="mt-8">
                  <p className="mb-3 text-sm font-medium text-muted-foreground">Try these popular searches:</p>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.slice(0, 8).map(s => (
                      <button
                        key={s}
                        onClick={() => applySearch(s)}
                        className="rounded-full border border-border bg-white px-4 py-1.5 text-sm text-foreground transition hover:border-secondary hover:text-secondary"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
