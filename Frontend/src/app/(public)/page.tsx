import Image from "next/image";
import Link from "next/link";
import {
  Compass, Mountain, Star, Users, MapPinned, TreePine, Landmark,
  Waves, Tent, ArrowRight, Bird, Drama, CalendarDays, Clock,
  MapPin, ChevronRight, Leaf, Snowflake, Flame, Sun,
} from "lucide-react";
import { SearchBar } from "@/components/shared/search-bar";
import { SectionHeader } from "@/components/shared/section-header";
import { Reveal, RevealList, RevealItem } from "@/components/shared/reveal";
import { CTASection } from "@/components/shared/cta-section";
import { DistrictCard } from "@/components/cards/district-card";
import { DestinationCard } from "@/components/cards/destination-card";
import { AttractionCard } from "@/components/cards/attraction-card";
import { TrekCard } from "@/components/cards/trek-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import { TopoLines } from "@/components/shared/topo-lines";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import {
  getDistricts, getTrending, getFeatured, getFeaturedTreks,
  getFeaturedGuides, getStats, getTopReviews, getAttractions, getFestivals,
} from "@/services/content";
import { seasons } from "@/data/weather";
import { img, PHOTO } from "@/data/images";
import { HomePersonalizedSection } from "./home-personalized-section";
import { FESTIVAL_TYPE_STYLE } from "@/lib/category-colors";
import type { Festival } from "@/types";

/* ─── static config ─────────────────────────────────────────────────── */

const categories = [
  { label: "Religious Sites",  icon: Landmark, href: "/search?category=Religious" },
  { label: "Heritage Sites",   icon: Drama,    href: "/search?category=Heritage"  },
  { label: "Nature & Scenic",  icon: TreePine, href: "/search?category=Nature"    },
  { label: "Lakes & Rivers",   icon: Waves,    href: "/search?category=Lake"      },
  { label: "Trekking Routes",  icon: Tent,     href: "/treks"                     },
  { label: "Wildlife & Parks", icon: Bird,     href: "/search?category=Wildlife"  },
];

const quickSearches = [
  "Trekking", "Heritage", "Wildlife", "Lakes", "Viewpoints", "Temples",
];

const SEASON_ICON: Record<string, typeof Sun> = {
  Spring: Leaf,
  Summer: Sun,
  Autumn: Flame,
  Winter: Snowflake,
};

/* ─── inline sub-components ─────────────────────────────────────────── */

function FestivalCard({ f }: { f: Festival }) {
  return (
    <Link
      href={`/festivals/${f.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft card-hover"
    >
      <div className="relative h-44 overflow-hidden">
        <CloudinaryImage
          image={f.image} alt={f.name} fill
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
          className="object-cover transition duration-[600ms] group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${FESTIVAL_TYPE_STYLE[f.type] ?? FESTIVAL_TYPE_STYLE.Cultural}`}>
          {f.type}
        </span>
        <div className="absolute inset-x-3 bottom-3">
          <p className="font-display font-bold leading-tight text-white">{f.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-white/80">
            <MapPin size={10} />{f.where}
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

function formatUserCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

/* ─── page ───────────────────────────────────────────────────────────── */

export default async function HomePage() {
  /* parallel fetch — keeps TTFB low */
  const [
    districts, trending, featured, treks, articles,
    platformStats, allReviews, attractionData, festivals,
  ] = await Promise.all([
    getDistricts(),
    getTrending(),
    getFeatured(),
    getFeaturedTreks(),
    getFeaturedGuides(),
    getStats(),
    getTopReviews(),
    getAttractions("?featured=1"),
    getFestivals(),
  ]);

  const trendingDests  = trending.slice(0, 6);
  const topDistricts   = districts.slice(0, 3);
  const topAttractions = attractionData.slice(0, 4);
  const upcomingFests  = festivals.slice(0, 4);
  const featuredDests  = featured.slice(0, 6);
  const topTreks       = treks.slice(0, 3);
  const topArticles    = articles.slice(0, 3);
  const testimonials   = allReviews
    .filter((r) => r.rating >= 4)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  const stats = [
    { value: String(platformStats.districts || 77),          label: "Districts Covered", icon: MapPinned },
    { value: `${platformStats.destinations || 0}+`,           label: "Destinations",      icon: Mountain  },
    { value: formatUserCount(platformStats.users || 0),       label: "Travellers",        icon: Users     },
    { value: platformStats.avgRating ? `${platformStats.avgRating}★` : "4.8★", label: "Avg. Rating", icon: Star },
  ];

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          HERO
          Strong headline · search · quick chips · dual CTAs
      ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] overflow-hidden">
        <Image
          src={img(PHOTO.himalaya1, 1920)} alt="Himalayan landscape"
          fill priority sizes="100vw" className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/75 via-brand-900/40 to-brand-900/88" />
        <TopoLines className="text-white/10" opacity={1} />

        <div className="container relative flex min-h-[92vh] flex-col items-center justify-center py-28 text-center text-white">
          <Reveal>
            <Badge className="bg-white/15 text-white backdrop-blur">🇳🇵 Discover the Himalayas</Badge>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="h1 mt-5 max-w-4xl">
              Your guide to Nepal,{" "}
              <span className="text-accent">one district at a time</span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mt-5 max-w-2xl text-lg text-white/85">
              From sacred temples in Kathmandu to the trails of Everest — discover destinations, plan journeys, and explore all 77 districts of Nepal.
            </p>
          </Reveal>

          {/* Search bar + quick-filter chips */}
          <Reveal delay={0.3}>
            <div className="mt-9 w-full max-w-2xl">
              <SearchBar large />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {quickSearches.map((q) => (
                  <Link
                    key={q}
                    href={`/search?q=${encodeURIComponent(q)}`}
                    className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/30"
                  >
                    {q}
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Primary + secondary CTAs */}
          <Reveal delay={0.4}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/districts">
                <Button size="lg" variant="accent">
                  Explore Districts <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/planner">
                <Button size="lg" className="border border-white/30 bg-white/15 text-white hover:bg-white/25">
                  Start Planning <Compass size={16} />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TRAVEL STATISTICS
          Social proof strip immediately below the fold
      ══════════════════════════════════════════════════════ */}
      <section className="mesh-brand py-14">
        <div className="container">
          <RevealList className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <RevealItem key={s.label}>
                <div className="flex flex-col items-center gap-3 text-center text-white">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                    <s.icon size={22} className="text-accent" />
                  </span>
                  <p className="font-display text-4xl font-bold tracking-tight">{s.value}</p>
                  <p className="text-sm text-white/70">{s.label}</p>
                </div>
              </RevealItem>
            ))}
          </RevealList>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          BROWSE BY CATEGORY
          Quick entry-points to every content type
      ══════════════════════════════════════════════════════ */}
      <section className="section">
        <SectionHeader
          center
          eyebrow="Browse by type"
          title="What are you looking for?"
          subtitle="Pick a category to discover Nepal's best attractions, heritage sites and natural wonders."
        />
        <RevealList className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <RevealItem key={c.label}>
              <Link href={c.href} className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 shadow-soft card-hover">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-secondary">
                  <c.icon size={24} />
                </span>
                <span className="text-sm font-medium text-brand-600">{c.label}</span>
              </Link>
            </RevealItem>
          ))}
        </RevealList>
      </section>

      {/* ══════════════════════════════════════════════════════
          TRENDING DESTINATIONS
          Horizontal scroll on mobile → 3-col grid on desktop
      ══════════════════════════════════════════════════════ */}
      {trendingDests.length > 0 && (
        <section className="bg-white py-20">
          <div className="container">
            <SectionHeader
              eyebrow="Hot right now"
              title="Trending destinations"
              subtitle="Places travellers are searching for and visiting most this season."
              action={
                <Link href="/search?sort=reviews">
                  <Button variant="outline">View all <ArrowRight size={16} /></Button>
                </Link>
              }
            />
            <div className="-mx-4 overflow-x-auto sm:mx-0 sm:overflow-visible">
              <div className="flex gap-5 px-4 pb-3 sm:px-0 sm:pb-0 md:grid md:grid-cols-3">
                {trendingDests.map((d) => (
                  <div key={d.id} className="w-72 shrink-0 md:w-auto">
                    <DestinationCard destination={d} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          FEATURED DISTRICTS
          Regional entry-point — each district is its own story
      ══════════════════════════════════════════════════════ */}
      {topDistricts.length > 0 && (
        <section className="section">
          <SectionHeader
            eyebrow="Explore by region"
            title="Featured districts"
            subtitle="Each of Nepal's 77 districts has its own landscape, culture, and story. Start here."
            action={
              <Link href="/districts">
                <Button variant="outline">All 77 districts <ArrowRight size={16} /></Button>
              </Link>
            }
          />
          <RevealList className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {topDistricts.map((d) => (
              <RevealItem key={d.id}><DistrictCard district={d} /></RevealItem>
            ))}
          </RevealList>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          POPULAR ATTRACTIONS
          Heritage sites, temples, viewpoints, national parks
      ══════════════════════════════════════════════════════ */}
      {topAttractions.length > 0 && (
        <section className="bg-white py-20">
          <div className="container">
            <SectionHeader
              eyebrow="Must-visit sites"
              title="Popular attractions"
              subtitle="UNESCO heritage sites, sacred temples, mountain viewpoints, and breathtaking natural wonders."
              action={
                <Link href="/districts">
                  <Button variant="outline">Browse all attractions <ArrowRight size={16} /></Button>
                </Link>
              }
            />
            <div className="-mx-4 overflow-x-auto sm:mx-0 sm:overflow-visible">
              <div className="flex gap-5 px-4 pb-3 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
                {topAttractions.map((a) => (
                  <div key={a.id} className="w-72 shrink-0 sm:w-auto">
                    <AttractionCard attraction={a} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          UPCOMING FESTIVALS
          Time your trip around Nepal's vibrant celebrations
      ══════════════════════════════════════════════════════ */}
      {upcomingFests.length > 0 && (
        <section className="section">
          <SectionHeader
            eyebrow="Plan around celebrations"
            title="Festivals & celebrations"
            subtitle="Time your visit to experience Nepal's vibrant cultural events, religious festivals, and seasonal harvests."
            action={
              <Link href="/festivals">
                <Button variant="outline">All festivals <ArrowRight size={16} /></Button>
              </Link>
            }
          />
          <RevealList className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {upcomingFests.map((f) => (
              <RevealItem key={f.id}><FestivalCard f={f} /></RevealItem>
            ))}
          </RevealList>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          ICONIC TREKS
          The trails that put Nepal on the world map
      ══════════════════════════════════════════════════════ */}
      {topTreks.length > 0 && (
        <section className="mesh-light">
          <div className="container py-20 md:py-28">
            <SectionHeader
              eyebrow="Lace up your boots"
              title="Iconic treks of Nepal"
              subtitle="From the world's highest base camp to the hidden valleys of Mustang — every trail tells a story."
              action={
                <Link href="/treks">
                  <Button variant="outline">All treks <ArrowRight size={16} /></Button>
                </Link>
              }
            />
            <RevealList className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {topTreks.map((t) => (
                <RevealItem key={t.id}><TrekCard trek={t} /></RevealItem>
              ))}
            </RevealList>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          PERSONALIZED RECOMMENDATIONS (logged-in users only)
          Client island — renders nothing for guests
      ══════════════════════════════════════════════════════ */}
      <HomePersonalizedSection />

      {/* ══════════════════════════════════════════════════════
          RECOMMENDED DESTINATIONS  (Editor's Picks)
          Curated by our travel team for every traveller type
      ══════════════════════════════════════════════════════ */}
      {featuredDests.length > 0 && (
        <section className="section">
          <SectionHeader
            eyebrow="Handpicked for you"
            title="Editor's picks"
            subtitle="Our travel team's favourite destinations across Nepal — curated for every kind of traveller."
            action={
              <Link href="/search">
                <Button variant="outline">Discover more <ArrowRight size={16} /></Button>
              </Link>
            }
          />
          <RevealList className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredDests.map((d) => (
              <RevealItem key={d.id}><DestinationCard destination={d} /></RevealItem>
            ))}
          </RevealList>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          SEASONAL TRAVEL GUIDE
          Nepal is beautiful year-round — know the best time to go
      ══════════════════════════════════════════════════════ */}
      <section className="bg-white py-20">
        <div className="container">
          <SectionHeader
            center
            eyebrow="When to go"
            title="Seasonal travel guide"
            subtitle="Nepal is beautiful year-round. Here's what each season offers for travellers."
          />
          <RevealList className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {seasons.map((s) => {
              const SeasonIcon = SEASON_ICON[s.name.split(" ")[0]] ?? Sun;
              return (
                <RevealItem key={s.name}>
                  <div className="h-full rounded-2xl border border-border bg-white p-6 shadow-soft transition-colors hover:border-secondary/40">
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-secondary">
                        <SeasonIcon size={18} />
                      </span>
                      <span className="flex">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} size={12} className={j < s.rating ? "fill-accent text-accent" : "fill-muted text-muted"} />
                        ))}
                      </span>
                    </div>
                    <p className="mt-3 font-display font-semibold text-brand-600">{s.name}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{s.best}</p>
                  </div>
                </RevealItem>
              );
            })}
          </RevealList>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TESTIMONIALS  (real approved reviews from DB)
          Authentic social proof from verified travellers
      ══════════════════════════════════════════════════════ */}
      {testimonials.length > 0 && (
        <section className="mesh-brand py-20 text-white">
          <div className="container">
            <SectionHeader
              center
              light
              eyebrow="Loved by travellers"
              title="What our community says"
              subtitle="Real reviews from verified travellers who've explored Nepal with NepalYatra."
            />
            <RevealList className="grid gap-6 md:grid-cols-3">
              {testimonials.map((r) => (
                <RevealItem key={r.id}>
                  <div className="glass-dark flex h-full flex-col rounded-2xl p-6">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} size={14} className={j < r.rating ? "fill-accent text-accent" : "fill-white/20 text-white/20"} />
                      ))}
                    </div>
                    {r.title && (
                      <p className="mt-3 font-semibold text-white/95">&quot;{r.title}&quot;</p>
                    )}
                    <p className="mt-2 flex-1 text-sm text-white/80">
                      {r.body.length > 200 ? `${r.body.slice(0, 200)}…` : r.body}
                    </p>
                    <div className="mt-5 flex items-center gap-3 border-t border-white/15 pt-4">
                      <CloudinaryImage
                        image={r.avatar} alt={r.author}
                        width={40} height={40}
                        className="rounded-full ring-2 ring-white/20"
                      />
                      <div>
                        <p className="text-sm font-semibold">{r.author}</p>
                        <p className="text-xs text-white/60">
                          {r.verifiedTraveler ? "✓ Verified traveller" : "Community member"}
                        </p>
                      </div>
                    </div>
                  </div>
                </RevealItem>
              ))}
            </RevealList>
            <Reveal>
              <div className="mt-10 text-center">
                <Link href="/reviews">
                  <Button className="border border-white/30 bg-white/15 text-white hover:bg-white/25">
                    Read all community reviews <ChevronRight size={16} />
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          TRAVEL JOURNAL  (featured guide articles)
          In-depth guides, itineraries, and cultural stories
      ══════════════════════════════════════════════════════ */}
      {topArticles.length > 0 && (
        <section className="section">
          <SectionHeader
            eyebrow="Travel journal"
            title="Guides & stories"
            subtitle="In-depth travel guides, curated itineraries, and cultural stories from Nepal."
            action={
              <Link href="/guides">
                <Button variant="outline">Read all guides <ArrowRight size={16} /></Button>
              </Link>
            }
          />
          <RevealList className="grid gap-6 md:grid-cols-3">
            {topArticles.map((g) => (
              <RevealItem key={g.id}>
                <Link href={`/guides/${g.slug}`} className="group block overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft card-hover">
                  <div className="relative h-44 overflow-hidden">
                    <CloudinaryImage image={g.cover} alt={g.title} fill sizes="33vw" className="object-cover transition duration-[600ms] group-hover:scale-[1.07]" />
                    <Badge className="absolute left-3 top-3 bg-white/95 text-brand-600">{g.category}</Badge>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display font-semibold text-brand-600 group-hover:text-secondary">{g.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.excerpt}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock size={13} /> {g.readMinutes} min read</span>
                      <span className="flex items-center gap-1 font-medium text-secondary group-hover:underline">
                        Read guide <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealList>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          NEWSLETTER
          Soft conversion — monthly travel inspiration
      ══════════════════════════════════════════════════════ */}
      <section className="section pt-0">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-white p-10 shadow-soft md:p-14">
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-brand-100/50 blur-3xl" />
          <div className="relative text-center">
            <Badge variant="secondary" className="mb-4">Stay in the loop</Badge>
            <h2 className="h2 text-brand-600">Get travel inspiration in your inbox</h2>
            <p className="lead mx-auto mt-2 max-w-lg text-muted-foreground">
              Monthly guides, seasonal tips, festival calendars and hidden gems across Nepal. No spam, ever.
            </p>
            <NewsletterForm />
            <p className="mt-4 text-xs text-muted-foreground">
              Join 2,000+ Nepal travel enthusiasts. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      <CTASection />
      <div className="h-10" />
    </>
  );
}
