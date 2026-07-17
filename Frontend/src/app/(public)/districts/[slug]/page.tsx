import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  MapPin, Star, ChevronRight, Calendar, Compass, Users,
  Mountain, Clock, TreePine, Zap, BookOpen, CalendarDays,
  ArrowRight, Landmark, Building2, Bird, Waves, Camera,
  Tent, Leaf, Sun, Flame, Snowflake, Map, Info, TrendingUp,
  Activity, Eye,
} from "lucide-react";
import { getDistrict, getDistricts, getDistrictFull } from "@/services/content";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { Reveal, RevealList, RevealItem } from "@/components/shared/reveal";
import { AttractionCard } from "@/components/cards/attraction-card";
import { TrekCard } from "@/components/cards/trek-card";
import { DistrictCard } from "@/components/cards/district-card";
import { DestinationCard } from "@/components/cards/destination-card";
import { ReviewCard } from "@/components/cards/review-card";
import { DistrictAttractions } from "./district-attractions";
import { DistrictMap } from "./district-map";
import { DistrictWeatherWidget } from "@/components/districts/weather-widget";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { cn } from "@/lib/utils";
import { FESTIVAL_TYPE_STYLE } from "@/lib/category-colors";
import type { TouristAttraction, AttractionCategory, Festival, GuideArticle } from "@/types";

/* ─── static generation ────────────────────────────────────────────── */

export async function generateStaticParams() {
  return (await getDistricts()).map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const district = await getDistrict(slug);
  return {
    title: district ? `${district.name} District – Nepal Travel Guide` : "District",
    description: district?.description,
  };
}

/* ─── helpers ───────────────────────────────────────────────────────── */

const ALL_CATS: AttractionCategory[] = [
  "Religious Sites", "Historical Sites", "Natural Attractions",
  "Lakes & Rivers", "Mountains & Trekking Routes", "Adventure Activities",
  "Cultural Heritage Sites", "Viewpoints", "National Parks & Wildlife",
  "Local Experiences",
];

const CAT_ICON: Record<AttractionCategory, typeof Mountain> = {
  "Religious Sites":            Landmark,
  "Historical Sites":           Clock,
  "Natural Attractions":        TreePine,
  "Lakes & Rivers":             Waves,
  "Mountains & Trekking Routes": Mountain,
  "Adventure Activities":       Zap,
  "Cultural Heritage Sites":    Building2,
  "Viewpoints":                 Eye,
  "National Parks & Wildlife":  Bird,
  "Local Experiences":          Users,
};

const SEASONS = [
  {
    name: "Spring", months: "Mar – May", icon: Leaf,
    mood: "Rhododendron blooms, clear skies, ideal for lower-altitude trekking.",
    crowd: "High season",
  },
  {
    name: "Summer", months: "Jun – Aug", icon: Sun,
    mood: "Monsoon rains, lush greenery. Some trails closed; great for culture.",
    crowd: "Low season",
  },
  {
    name: "Autumn", months: "Sep – Nov", icon: Flame,
    mood: "Crystal skies, major festivals, best visibility in the mountains.",
    crowd: "Peak season",
  },
  {
    name: "Winter", months: "Dec – Feb", icon: Snowflake,
    mood: "Snow-dusted peaks, fewer crowds, lower prices. Cold at altitude.",
    crowd: "Shoulder season",
  },
] as const;

function isBestSeason(name: string, bestSeason?: string): boolean {
  if (!bestSeason) return false;
  return bestSeason.toLowerCase().includes(name.toLowerCase());
}

function deriveDifficulty(attractions: TouristAttraction[]) {
  const cats = new Set(attractions.map((a) => a.category));
  if (cats.has("Mountains & Trekking Routes") || cats.has("Adventure Activities"))
    return { level: "Challenging", badge: "bg-warning/10 text-warning-foreground border-warning/30", desc: "Best for experienced hikers and adventure seekers." };
  if (cats.has("Natural Attractions") || cats.has("Lakes & Rivers") || cats.has("National Parks & Wildlife"))
    return { level: "Moderate", badge: "bg-secondary/10 text-secondary border-secondary/20", desc: "Accessible to most travelers with basic fitness." };
  return { level: "Easy", badge: "bg-success/10 text-success border-success/20", desc: "Suitable for all, including families and seniors." };
}

function getActivityIcon(activity: string): typeof Mountain {
  const s = activity.toLowerCase();
  if (s.includes("trek") || s.includes("hik")) return Mountain;
  if (s.includes("raft") || s.includes("kayak") || s.includes("swim")) return Waves;
  if (s.includes("photo")) return Camera;
  if (s.includes("camp")) return Tent;
  if (s.includes("bird") || s.includes("wildlife")) return Bird;
  if (s.includes("forest") || s.includes("nature")) return TreePine;
  if (s.includes("temple") || s.includes("puja") || s.includes("meditat")) return Landmark;
  if (s.includes("climb") || s.includes("peak")) return Mountain;
  return Activity;
}


/* ─── page ──────────────────────────────────────────────────────────── */

export default async function DistrictDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const full = await getDistrictFull(slug);
  if (!full) notFound();

  const {
    district, destinations, attractions, treks, festivals, guides,
    reviews, weather, nearbyDistricts, recommended, counts,
  } = full;

  /* ── derived data ── */
  const topAttractions = [...attractions]
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating)
    .slice(0, 3);

  const activities = [
    ...new Set(attractions.flatMap((a) => a.activities ?? [])),
  ].slice(0, 12);

  const destinationById: Record<string, (typeof destinations)[number]> =
    Object.fromEntries(destinations.map((d) => [d.id, d]));

  const difficulty = deriveDifficulty(attractions);

  const catBreakdown = ALL_CATS.map((cat) => ({
    cat,
    count: attractions.filter((a) => a.category === cat).length,
  }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxCatCount = catBreakdown[0]?.count ?? 1;

  /* ── page ── */
  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════ */}
      <section className="relative min-h-[72vh]">
        <CloudinaryImage
          image={district.heroImage}
          alt={district.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* gradient: rich at bottom, subtle at top */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/95 via-brand-900/40 to-brand-900/10" />

        <div className="container relative flex min-h-[72vh] flex-col justify-end pb-14 text-white">
          {/* breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex items-center gap-1.5 text-xs text-white/60"
          >
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight size={12} />
            <Link href="/districts" className="hover:text-white">Districts</Link>
            <ChevronRight size={12} />
            <span className="text-white/90">{district.name}</span>
          </nav>

          {/* province + rating */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-white/15 text-white backdrop-blur-sm">
              <MapPin size={10} className="mr-1" />
              {district.province} Province
            </Badge>
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur-sm">
              <Star size={12} className="fill-accent text-accent" />
              {district.rating} rating
            </span>
            <span className={cn(
              "rounded-full border px-3 py-1 text-xs backdrop-blur-sm",
              difficulty.badge
            )}>
              {difficulty.level}
            </span>
          </div>

          {/* title */}
          <h1 className="h1 mt-4 max-w-3xl">{district.name}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/80">
            {district.description}
          </p>

          {/* quick stat chips */}
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <Landmark size={14} className="text-accent" />
              {attractions.length} attractions
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <Map size={14} className="text-accent" />
              {counts.destinationCount} destinations
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <Building2 size={14} className="text-accent" />
              {counts.cityCount} cities
            </span>
            {district.bestSeason && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                <Calendar size={14} className="text-accent" />
                Best in {district.bestSeason}
              </span>
            )}
          </div>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#explore"
              className="flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105"
            >
              <Compass size={16} />
              Explore Attractions
            </a>
            <Link
              href="/planner"
              className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              <Map size={16} />
              Plan a Trip
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          QUICK FACTS + BEST TIME TO VISIT
      ═══════════════════════════════════════════════════════ */}
      <section className="section">
        <div className="grid gap-10 lg:grid-cols-2">

          {/* Quick Facts */}
          <div>
            <span className="kicker">At a glance</span>
            <h2 className="h3 mt-2 text-brand-600">Quick Facts</h2>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                { icon: MapPin,     label: "Province",    value: district.province },
                { icon: Landmark,   label: "Attractions", value: `${attractions.length} sites` },
                { icon: Map,        label: "Destinations",value: `${counts.destinationCount} places` },
                { icon: Building2,  label: "Cities",      value: `${counts.cityCount} cities` },
                { icon: Star,       label: "Rating",      value: `${district.rating} / 5` },
                { icon: Calendar,   label: "Best Season", value: district.bestSeason ?? "Year-round" },
                { icon: TrendingUp, label: "Difficulty",  value: difficulty.level },
                { icon: Compass,    label: "Popular For", value: district.popularFor.slice(0, 2).join(", ") || "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-soft"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-secondary">
                    <Icon size={16} />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-brand-600">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* popular-for tags */}
            {district.popularFor.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {district.popularFor.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Best Time to Visit */}
          <div>
            <span className="kicker">When to go</span>
            <h2 className="h3 mt-2 text-brand-600">Best Time to Visit</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {SEASONS.map(({ name, months, icon: Icon, mood, crowd }, idx) => {
                const best = isBestSeason(name, district.bestSeason);
                return (
                  <Reveal key={name} delay={0.05 * idx}>
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-2xl border p-5 transition-colors",
                        best
                          ? "border-accent/40 bg-accent/5 shadow-soft"
                          : "border-border bg-white",
                      )}
                    >
                      {best && (
                        <span className="absolute right-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                          Recommended
                        </span>
                      )}
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                            best ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon size={16} />
                        </span>
                        <div>
                          <p className={cn("font-display font-semibold", best ? "text-accent" : "text-brand-600")}>
                            {name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{months}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{mood}</p>
                      <p className={cn("mt-2 text-[10px] font-semibold uppercase tracking-wider", best ? "text-accent" : "text-muted-foreground")}>
                        {crowd}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          WEATHER
      ═══════════════════════════════════════════════════════ */}
      <section className="section pt-0">
        <div className="mx-auto max-w-2xl">
          <DistrictWeatherWidget weather={weather} districtName={district.name} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          POPULAR ACTIVITIES
      ═══════════════════════════════════════════════════════ */}
      {activities.length > 0 && (
        <section className="bg-brand-50 py-16">
          <div className="container">
            <div className="mb-7 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="kicker">Things to do</span>
                <h2 className="h3 mt-2 text-brand-600">Popular Activities</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {activities.length} activities across {attractions.length} sites
              </p>
            </div>
            <RevealList className="flex flex-wrap gap-3">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity);
                return (
                  <RevealItem key={activity}>
                    <div className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-soft">
                      <Icon size={15} className="shrink-0 text-secondary" />
                      <span className="text-sm font-medium text-brand-600">{activity}</span>
                    </div>
                  </RevealItem>
                );
              })}
            </RevealList>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          POPULAR DESTINATIONS
      ═══════════════════════════════════════════════════════ */}
      {destinations.length > 0 && (
        <section className="section">
          <SectionHeader
            eyebrow="Where to go"
            title={`Popular Destinations in ${district.name}`}
            subtitle="Standout places worth building your trip around."
          />
          <RevealList className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((d) => (
              <RevealItem key={d.id}>
                <DestinationCard destination={d} />
              </RevealItem>
            ))}
          </RevealList>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          TOP ATTRACTIONS
      ═══════════════════════════════════════════════════════ */}
      {topAttractions.length > 0 && (
        <section className="section">
          <SectionHeader
            eyebrow="Must visit"
            title={`Top Attractions in ${district.name}`}
            subtitle="Highest-rated and most-visited sites in the district."
            action={
              <a
                href="#explore"
                className="flex items-center gap-1.5 text-sm font-medium text-secondary transition hover:underline"
              >
                Browse all {attractions.length} <ArrowRight size={14} />
              </a>
            }
          />
          <RevealList className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {topAttractions.map((a) => (
              <RevealItem key={a.id}>
                <AttractionCard attraction={a} />
              </RevealItem>
            ))}
          </RevealList>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          ATTRACTION CATEGORY BREAKDOWN
      ═══════════════════════════════════════════════════════ */}
      {catBreakdown.length > 0 && (
        <section className="bg-white py-20">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="kicker">What you&apos;ll find</span>
                  <h2 className="h3 mt-2 text-brand-600">Attractions by Category</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {attractions.length} total across {catBreakdown.length} categories
                </p>
              </div>
              <RevealList className="grid gap-3 sm:grid-cols-2">
                {catBreakdown.map(({ cat, count }) => {
                  const Icon = CAT_ICON[cat];
                  const pct = Math.round((count / maxCatCount) * 100);
                  return (
                    <RevealItem key={cat}>
                      <div className="rounded-2xl border border-border bg-white p-4 shadow-soft">
                        <div className="mb-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-secondary">
                              <Icon size={15} />
                            </span>
                            <span className="text-sm font-medium text-brand-600">{cat}</span>
                          </div>
                          <span className="text-sm font-bold text-accent">{count}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-accent transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </RevealItem>
                  );
                })}
              </RevealList>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          POPULAR TREKS
      ═══════════════════════════════════════════════════════ */}
      {treks.length > 0 && (
        <section className="mesh-light">
          <div className="container py-20">
            <SectionHeader
              eyebrow="On foot"
              title={`Popular Treks in ${district.name}`}
              subtitle="From short day-hikes to multi-week expeditions."
              action={
                <Link href="/treks" className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline">
                  All treks <ArrowRight size={14} />
                </Link>
              }
            />
            <RevealList className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {treks.map((t) => (
                <RevealItem key={t.id}>
                  <TrekCard trek={t} />
                </RevealItem>
              ))}
            </RevealList>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          FESTIVALS & EVENTS
      ═══════════════════════════════════════════════════════ */}
      {festivals.length > 0 && (
        <section className="section">
          <SectionHeader
            eyebrow="Cultural calendar"
            title="Festivals & Events"
            subtitle="Immerse yourself in Nepal's living traditions and celebrations."
            action={
              <Link href="/festivals" className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline">
                All festivals <ArrowRight size={14} />
              </Link>
            }
          />
          <RevealList className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {festivals.map((f) => (
              <RevealItem key={f.id}>
                <FestivalCard f={f} />
              </RevealItem>
            ))}
          </RevealList>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          LOCAL GUIDES
      ═══════════════════════════════════════════════════════ */}
      {guides.length > 0 && (
        <section className="bg-white py-20">
          <div className="container">
            <SectionHeader
              eyebrow="Travel knowledge"
              title="Local Guides & Stories"
              subtitle="Tips, itineraries and inspiration from seasoned Nepal travelers."
              action={
                <Link href="/guides" className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline">
                  All guides <ArrowRight size={14} />
                </Link>
              }
            />
            <RevealList className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {guides.slice(0, 3).map((g) => (
                <RevealItem key={g.id}>
                  <GuideCard g={g} />
                </RevealItem>
              ))}
            </RevealList>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          INTERACTIVE MAP
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-brand-50 py-20">
        <div className="container">
          <SectionHeader
            eyebrow="Get your bearings"
            title={`${district.name} on the Map`}
            subtitle="Every destination, attraction, trek, festival and guide located in the district."
          />
          <DistrictMap
            district={district}
            destinations={destinations}
            attractions={attractions}
            treks={treks}
            festivals={festivals}
            guides={guides}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          REVIEWS
      ═══════════════════════════════════════════════════════ */}
      {reviews.length > 0 && (
        <section className="section">
          <SectionHeader
            eyebrow="Traveler voices"
            title={`What Travelers Say About ${district.name}`}
            subtitle="Recent approved reviews from destinations across the district."
          />
          <RevealList className="grid gap-4 sm:grid-cols-2">
            {reviews.slice(0, 6).map((r) => (
              <RevealItem key={r.id}>
                <ReviewCard review={r} destinationName={destinationById[r.destinationId]?.name} />
              </RevealItem>
            ))}
          </RevealList>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          NEARBY DISTRICTS
      ═══════════════════════════════════════════════════════ */}
      {nearbyDistricts.length > 0 && (
        <section className="section">
          <SectionHeader
            eyebrow={`${district.province} Province`}
            title="Nearby Districts"
            subtitle={`Other destinations to explore in ${district.province} Province.`}
            action={
              <Link href="/districts" className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline">
                View all districts <ArrowRight size={14} />
              </Link>
            }
          />
          <RevealList className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {nearbyDistricts.map((d) => (
              <RevealItem key={d.id}>
                <DistrictCard district={d} />
              </RevealItem>
            ))}
          </RevealList>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          RECOMMENDED PLACES (sparse-district fallback)
      ═══════════════════════════════════════════════════════ */}
      {destinations.length === 0 && recommended.length > 0 && (
        <section className="bg-white py-20">
          <div className="container">
            <SectionHeader
              eyebrow="Nearby recommendations"
              title="You Might Also Like Nearby"
              subtitle={`${district.name} doesn't have destinations listed yet — here are highlights from neighbouring districts in ${district.province} Province.`}
            />
            <RevealList className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((d) => (
                <RevealItem key={d.id}>
                  <DestinationCard destination={d} />
                </RevealItem>
              ))}
            </RevealList>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          ALL ATTRACTIONS  (searchable / filterable)
      ═══════════════════════════════════════════════════════ */}
      <section id="explore" className="section pt-0">
        <SectionHeader
          eyebrow={`All ${attractions.length} attractions`}
          title={`Discover ${district.name}`}
          subtitle="Search, filter by category and explore every corner of the district."
        />
        <DistrictAttractions attractions={attractions} />
      </section>

      {/* ═══════════════════════════════════════════════════════
          BOTTOM CTA STRIP
      ═══════════════════════════════════════════════════════ */}
      <section className="mesh-brand py-16">
        <div className="container">
          <div className="flex flex-col items-center gap-6 text-center text-white sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="font-display text-2xl font-bold">{district.name} is waiting for you.</p>
              <p className="mt-1 text-white/70 max-w-md">
                Start planning your trip, save your favourite attractions and get personalised recommendations.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/planner"
                className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-brand-600 shadow-soft transition hover:bg-brand-50"
              >
                <Compass size={16} />
                Plan a Trip
              </Link>
              <a
                href="#explore"
                className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Landmark size={16} />
                Explore Attractions
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── inline card components (server-safe) ──────────────────────────── */

function FestivalCard({ f }: { f: Festival }) {
  return (
    <Link
      href={`/festivals/${f.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-white shadow-soft card-hover"
    >
      <div className="relative h-44 overflow-hidden">
        <CloudinaryImage
          image={f.image}
          alt={f.name}
          fill
          sizes="(max-width:640px) 100vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span
          className={cn(
            "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm",
            FESTIVAL_TYPE_STYLE[f.type] ?? FESTIVAL_TYPE_STYLE.Cultural,
          )}
        >
          {f.type}
        </span>
        {f.isNationwide && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-brand-600 backdrop-blur-sm">
            National
          </span>
        )}
        <div className="absolute inset-x-3 bottom-3 text-white">
          <p className="font-display font-bold leading-tight">{f.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/80">
            <MapPin size={10} />
            {f.where}
          </p>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="line-clamp-2 text-xs text-muted-foreground">{f.description}</p>
        <div className="mt-2.5 flex items-center gap-3 border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-medium text-brand-600">
            <CalendarDays size={11} />{f.month}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />{f.duration}
          </span>
        </div>
      </div>
    </Link>
  );
}

function GuideCard({ g }: { g: GuideArticle }) {
  return (
    <Link
      href={`/guides/${g.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-soft card-hover"
    >
      <div className="relative h-44 overflow-hidden">
        <CloudinaryImage
          image={g.cover}
          alt={g.title}
          fill
          sizes="(max-width:640px) 100vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/60 to-transparent" />
        <Badge className="absolute left-3 top-3 bg-white/90 text-brand-600 text-[10px]">
          {g.category}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display font-semibold text-brand-600 group-hover:text-secondary line-clamp-2">
          {g.title}
        </h3>
        <p className="mt-2 flex-1 line-clamp-2 text-xs text-muted-foreground">{g.excerpt}</p>
        <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
          <CloudinaryImage
            image={g.authorAvatar}
            alt={g.author}
            width={22}
            height={22}
            className="rounded-full ring-1 ring-border"
          />
          <span className="truncate font-medium text-foreground">{g.author}</span>
          <span className="ml-auto flex items-center gap-1 shrink-0">
            <BookOpen size={11} />{g.readMinutes} min
          </span>
        </div>
      </div>
    </Link>
  );
}
