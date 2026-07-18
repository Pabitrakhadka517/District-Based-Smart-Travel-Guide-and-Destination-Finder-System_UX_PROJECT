"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart, MapPin, Route, CheckCircle2, Clock, Plus, Compass, Map, Search,
  ArrowRight, Trophy, Star, BookOpen, Award, Flame, Flag, Lock, PenSquare
} from "lucide-react";
import { StatCard } from "@/components/cards/stat-card";
import { AttractionCard } from "@/components/cards/attraction-card";
import { DestinationCard } from "@/components/cards/destination-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/store/auth-store";
import {
  usePlans, useWishlistApi, useFeaturedAttractions,
  usePersonalizedRecommendations, useTrendingRecommendations,
  useUserReviews, useDestinations, useActivityTimeline,
} from "@/hooks/use-content";
import { RecommendationWidget } from "@/components/shared/recommendation-widget";
import { ActivityTimeline } from "./activity-timeline";
import { formatDate } from "@/lib/utils";
import { img, PHOTO } from "@/data/images";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const RECENTLY_VIEWED_KEY = "nepayatra_recently_viewed";

interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  unlocked: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: plansRaw = [], isLoading: plansLoadingRaw } = usePlans();
  const { data: wishlistData } = useWishlistApi();
  const { data: featured = [], isLoading: attractionsLoading } = useFeaturedAttractions();
  const { data: userReviewsRaw = [] } = useUserReviews(user?.id ?? "");

  const { data: recommended = [], isLoading: recsLoadingRaw } = usePersonalizedRecommendations();
  const { data: trending = [], isLoading: trendingLoading } = useTrendingRecommendations();
  const { data: activity = [], isLoading: activityLoadingRaw } = useActivityTimeline();

  // These queries are all gated by isLoggedIn()/user.id, which come from the
  // Zustand auth store's persisted state. The server always renders assuming
  // "not logged in yet" (no localStorage access), but the client's first
  // paint can already reflect the real, rehydrated auth state — so their
  // loading/data values can legitimately differ from the server's. Forcing
  // everything derived from them into a stable "loading" shape until strictly
  // after mount (a plain effect, guaranteed to run post-hydration) avoids a
  // hydration mismatch instead of chasing each differing value individually.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const plans = mounted ? plansRaw : [];
  const plansLoading = !mounted || plansLoadingRaw;
  const userReviews = mounted ? userReviewsRaw : [];
  const recsLoading = !mounted || recsLoadingRaw;
  const activityLoading = !mounted || activityLoadingRaw;
  const wishlistCount = mounted ? (wishlistData?.ids?.length ?? 0) : 0;

  // Recently viewed from localStorage
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
      setRecentIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setRecentIds([]);
    }
  }, []);
  const recentQuery = useDestinations(
    recentIds.length > 0 ? `?ids=${recentIds.slice(0, 8).join(",")}` : ""
  );
  const recentlyViewed = (recentQuery.data ?? []).slice(0, 4);

  const completed = plans.filter((t) => t.status === "completed");
  const ongoing   = plans.filter((t) => t.status === "ongoing");
  const planned   = plans.filter((t) => t.status === "planned");
  const ready     = plans.filter((t) => t.status === "ready");
  const booked    = plans.filter((t) => t.status === "booked");
  const upcomingCount   = planned.length + ready.length + booked.length + ongoing.length;
  const visitedCount    = new Set(completed.flatMap((t) => t.destinationIds)).size;
  const firstName = mounted ? (user?.name?.split(" ")[0] ?? "Traveller") : "Traveller";

  // Continue planning — most recent trip still in the planning phase
  const continuePlan = [...plans]
    .filter((p) => p.status === "draft" || p.status === "planned" || p.status === "ready")
    .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""))[0];

  // Achievement badges
  const badges: BadgeDef[] = [
    { id: "first-trip",   name: "First Trip",           description: "Created your first trip plan",      icon: Flag,      unlocked: plans.length >= 1 },
    { id: "explorer",     name: "Explorer",             description: "Planned 5+ trips",                   icon: Compass,   unlocked: plans.length >= 5 },
    { id: "adventurer",   name: "World Traveler",       description: "Planned 10+ trips",                  icon: Trophy,    unlocked: plans.length >= 10 },
    { id: "wishlist",     name: "Wishlist Lover",       description: "Saved 5+ destinations",              icon: Heart,     unlocked: wishlistCount >= 5 },
    { id: "reviewer",     name: "Reviewer",             description: "Wrote your first review",            icon: Star,      unlocked: userReviews.length >= 1 },
    { id: "pro-reviewer", name: "Prolific Reviewer",    description: "Wrote 5+ reviews",                   icon: BookOpen,  unlocked: userReviews.length >= 5 },
    { id: "completionist",name: "Completionist",        description: "Completed 3+ trips",                 icon: Award,     unlocked: completed.length >= 3 },
    { id: "on-fire",      name: "On Fire",              description: "Currently on an ongoing trip",       icon: Flame,     unlocked: ongoing.length >= 1 },
  ];
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-8">

      {/* welcome banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 text-white">
        <Image
          src={img(PHOTO.swayambhu, 1600)}
          alt="Swayambhunath stupa, Kathmandu"
          fill
          sizes="(max-width: 768px) 100vw, 80vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/80 via-brand-800/70 to-secondary/80" />
        <div className="relative z-10">
        <p className="text-sm text-white/70">{getGreeting()},</p>
        <h1 className="font-display text-3xl font-bold">{firstName} 👋</h1>
        <p className="mt-2 max-w-lg text-white/80">
          {plansLoading
            ? "Loading your trips…"
            : upcomingCount > 0
              ? `You have ${upcomingCount} upcoming trip${upcomingCount !== 1 ? "s" : ""}. Ready for your next Himalayan adventure?`
              : "No upcoming trips yet. Start planning your Himalayan adventure!"}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/planner">
            <Button variant="accent"><Plus size={16} /> Plan a trip</Button>
          </Link>
          <Link href="/districts">
            <Button className="bg-white/15 hover:bg-white/25"><Compass size={16} /> Explore districts</Button>
          </Link>
        </div>
        </div>
      </div>

      {/* Travel statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Places visited"  value={String(visitedCount)}      icon={MapPin}       accent="secondary" />
        <StatCard label="Places saved"    value={String(wishlistCount)}      icon={Heart}        accent="accent"    />
        <StatCard label="Trips completed" value={String(completed.length)}   icon={CheckCircle2} accent="success"   />
        <StatCard label="Upcoming trips"  value={String(upcomingCount)}      icon={Route}        accent="brand"     />
      </div>

      {/* Continue planning */}
      {continuePlan && (
        <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-secondary/15 text-secondary shrink-0">
                <Route size={22} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary mb-1">Continue planning</p>
                <p className="font-display font-semibold text-brand-600">{continuePlan.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(continuePlan.startDate)} – {formatDate(continuePlan.endDate)}
                  {continuePlan.destinationIds.length > 0 && ` · ${continuePlan.destinationIds.length} stop${continuePlan.destinationIds.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <Link href="/planner">
              <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
                Open trip <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* trips + quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="h3 text-brand-600">Your trips</h2>
            <Link href="/planner"><Button variant="ghost" size="sm">Manage</Button></Link>
          </div>
          {plansLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">No trips yet. Create your first trip plan!</p>
              <Link href="/planner" className="mt-3 inline-block">
                <Button variant="accent" size="sm"><Plus size={14} /> Plan a trip</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.slice(0, 5).map((t) => {
                const isTracking = t.status === "booked" || t.status === "ongoing" || t.status === "completed" || t.status === "cancelled";
                const href = isTracking ? "/tracking" : "/planner";
                const badgeVariant =
                  t.status === "completed" ? "success"
                  : t.status === "ongoing"  ? "accent"
                  : t.status === "booked"   ? "success"
                  : t.status === "ready"    ? "success"
                  : t.status === "planned"  ? "secondary"
                  : "outline"; // draft / cancelled
                const statusLabel =
                  t.status === "ready" ? "Ready" : t.status.charAt(0).toUpperCase() + t.status.slice(1);
                return (
                  <Link key={t.id} href={href}>
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-5 shadow-soft transition hover:border-secondary hover:shadow-md">
                      <div className="flex items-center gap-4">
                        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-secondary">
                          {t.status === "completed" ? <CheckCircle2 size={20} /> : t.status === "ongoing" ? <Clock size={20} /> : <Route size={20} />}
                        </span>
                        <div>
                          <p className="font-medium text-brand-600">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(t.startDate)} – {formatDate(t.endDate)} · {t.destinationIds.length} stop{t.destinationIds.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant={badgeVariant}>{statusLabel}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* quick actions */}
        <div>
          <h2 className="h3 mb-4 text-brand-600">Quick actions</h2>
          <div className="space-y-3">
            {([
              ["Search destinations", "/search",    Search],
              ["Browse districts",   "/districts",  Compass],
              ["Open map explorer",  "/map",         Map],
              ["View wishlist",      "/wishlist",    Heart],
              ["Write a review",     "/reviews",     PenSquare],
              ["Travel history",     "/tracking",    Route],
            ] as const).map(([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-soft transition hover:border-secondary"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-secondary">
                  <Icon size={18} />
                </span>
                <span className="text-sm font-medium text-foreground">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* activity timeline */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
        <h2 className="h3 mb-5 text-brand-600">Travel activity</h2>
        <ActivityTimeline events={activity} isLoading={activityLoading} />
      </div>

      {/* featured attractions */}
      {(attractionsLoading || featured.length > 0) && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="h3 text-brand-600">Featured attractions</h2>
            <Link href="/search"><Button variant="ghost" size="sm">View all</Button></Link>
          </div>
          {attractionsLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.slice(0, 3).map((a) => <AttractionCard key={a.id} attraction={a} />)}
            </div>
          )}
        </div>
      )}

      {/* recommended destinations */}
      <RecommendationWidget
        title="Recommended for you"
        destinations={recommended}
        isLoading={recsLoading}
        emptyTitle="Save destinations to get recommendations"
        emptyDescription="Wishlist destinations to personalise your recommendation engine."
        limit={4}
        viewAllHref="/search"
      />

      {/* recently viewed */}
      {recentlyViewed.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="h3 text-brand-600">Recently viewed</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyViewed.map((d) => <DestinationCard key={d.id} destination={d} />)}
          </div>
        </div>
      )}

      {/* trending in Nepal */}
      <RecommendationWidget
        title="Trending in Nepal"
        subtitle="Top-rated destinations right now."
        destinations={trending}
        isLoading={trendingLoading}
        limit={3}
        viewAllHref="/search"
      />

      {/* achievement badges */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="h3 text-brand-600">Travel achievements</h2>
          <span className="text-sm text-muted-foreground">{unlockedCount}/{badges.length} unlocked</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {badges.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                title={b.description}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-4 w-28 text-center transition ${
                  b.unlocked
                    ? "border-secondary/30 bg-secondary/5 text-secondary"
                    : "border-border bg-white opacity-40 grayscale"
                }`}
              >
                {!b.unlocked && (
                  <Lock size={10} className="absolute top-2 right-2 text-muted-foreground" />
                )}
                <span className={`grid h-10 w-10 place-items-center rounded-full ${b.unlocked ? "bg-secondary/15" : "bg-muted"}`}>
                  <Icon size={20} />
                </span>
                <p className="text-xs font-semibold leading-tight">{b.name}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
