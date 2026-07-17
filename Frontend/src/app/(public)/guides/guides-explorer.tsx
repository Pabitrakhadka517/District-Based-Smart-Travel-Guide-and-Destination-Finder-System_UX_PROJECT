"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, ArrowUpRight, BookOpen } from "lucide-react";
import type { GuideArticle } from "@/types";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, cn } from "@/lib/utils";

const CATS = ["All", "Tips", "Itineraries", "Culture", "Food", "Trekking"];

export function GuidesExplorer({ guides }: { guides: GuideArticle[] }) {
  const [cat, setCat] = useState("All");
  const featured = guides.find((g) => g.featured) ?? guides[0] ?? null;
  const list = useMemo(() => guides.filter((g) => cat === "All" || g.category === cat), [guides, cat]);

  return (
    <>
      <section className="mesh-light border-b border-border/70">
        <div className="container py-16">
          <span className="kicker">Travel guides</span>
          <h1 className="h1 mt-3 text-brand-600">Stories & advice from the trail</h1>
          <p className="lead mt-3 max-w-2xl">Itineraries, trekking know-how, food trails and cultural deep-dives to help you travel Nepal better.</p>
        </div>
      </section>

      {/* featured */}
      {featured && (
        <section className="section-tight">
          <Link href={`/guides/${featured.slug}`} className="group grid overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft md:grid-cols-2">
            <div className="relative h-64 md:h-auto">
              <CloudinaryImage image={featured.cover} alt={featured.title} fill sizes="50vw" className="object-cover transition duration-[600ms] group-hover:scale-[1.05]" />
            </div>
            <div className="flex flex-col justify-center p-8">
              <Badge variant="accent" className="w-fit bg-accent/10">{featured.category}</Badge>
              <h2 className="mt-3 font-display text-2xl font-bold text-brand-600 group-hover:text-secondary">{featured.title}</h2>
              <p className="mt-2 text-muted-foreground">{featured.excerpt}</p>
              <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                <CloudinaryImage image={featured.authorAvatar} alt={featured.author} width={28} height={28} className="rounded-full" />
                {featured.author} · {formatDate(featured.date)} · {featured.readMinutes} min read
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* grid */}
      <section className="section pt-0">
        <SectionHeader title="All guides" action={
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}>
                <Badge variant={cat === c ? "accent" : "outline"} className={cn("cursor-pointer", cat === c && "bg-accent text-accent-foreground")}>{c}</Badge>
              </button>
            ))}
          </div>
        } />
        {list.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No guides in this category"
            description="Try a different category to see more stories and advice."
            action={{ label: "Show all guides", onClick: () => setCat("All") }}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((g) => (
              <Link key={g.id} href={`/guides/${g.slug}`} className="group overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft card-hover">
                <div className="relative h-48 overflow-hidden">
                  <CloudinaryImage image={g.cover} alt={g.title} fill sizes="33vw" className="object-cover transition duration-[600ms] group-hover:scale-[1.07]" />
                  <Badge className="absolute left-3 top-3 bg-white/95 text-brand-600">{g.category}</Badge>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold text-brand-600 group-hover:text-secondary">{g.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.excerpt}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock size={13} /> {g.readMinutes} min</span>
                    <ArrowUpRight size={16} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
