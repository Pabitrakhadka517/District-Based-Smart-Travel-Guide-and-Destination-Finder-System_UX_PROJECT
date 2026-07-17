import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, CalendarDays, MapPin, Globe2, Sparkles } from "lucide-react";
import { getFestival, getFestivals, getDistricts } from "@/services/content";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CTASection } from "@/components/shared/cta-section";
import { FESTIVAL_TYPE_SOLID } from "@/lib/category-colors";
import { cn } from "@/lib/utils";

export async function generateStaticParams() { return (await getFestivals()).map((f) => ({ slug: f.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const f = await getFestival(slug);
  return { title: f?.name ?? "Festival", description: f?.description };
}

export default async function FestivalDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [f, allFestivals, districts] = await Promise.all([getFestival(slug), getFestivals(), getDistricts()]);
  if (!f) notFound();

  const district = f.districtId ? districts.find((d) => d.id === f.districtId) : undefined;
  const others = allFestivals.filter((x) => x.id !== f.id).slice(0, 3);

  const facts = [
    { icon: CalendarDays, label: "Month", value: f.month },
    { icon: Sparkles, label: "Season", value: f.season },
    { icon: CalendarDays, label: "Duration", value: f.duration },
    { icon: Globe2, label: "Where", value: f.isNationwide ? "Nationwide" : f.where },
  ];

  return (
    <article>
      <div className="relative h-[42vh] min-h-[300px] overflow-hidden">
        <CloudinaryImage image={f.image} alt={f.name} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/30 to-black/10" />
        <div className="container relative flex h-full flex-col justify-end pb-10 text-white">
          <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-white/75">
            <Link href="/festivals" className="hover:text-white">Festivals</Link>
            <ChevronRight size={14} /><span className="text-white">{f.name}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn(FESTIVAL_TYPE_SOLID[f.type] ?? FESTIVAL_TYPE_SOLID.Cultural)}>{f.type}</Badge>
            {f.isNationwide && <Badge className="bg-white/90 text-brand-600">Celebrated nationwide</Badge>}
          </div>
          <h1 className="h1 mt-3">{f.name}</h1>
        </div>
      </div>

      <div className="container py-10">
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {facts.map((item) => (
            <div key={item.label} className="rounded-2xl border border-border/70 bg-white p-4 shadow-soft">
              <item.icon className="text-secondary" size={18} />
              <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold text-brand-600">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section>
              <h2 className="h3 text-brand-600">About this festival</h2>
              <p className="mt-3 text-muted-foreground">{f.description}</p>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="sticky top-20 space-y-6">
              {district && (
                <div className="rounded-2xl border border-border/70 bg-white p-5 shadow-soft">
                  <h3 className="flex items-center gap-2 font-display font-semibold text-brand-600">
                    <MapPin size={18} /> Where it&apos;s celebrated
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.where}</p>
                  <Link href={`/districts/${district.slug}`} className="mt-3 inline-block">
                    <Button variant="outline" size="sm">Explore {district.name}</Button>
                  </Link>
                </div>
              )}
              <div className="rounded-2xl border border-border/70 bg-white p-5 shadow-soft">
                <h3 className="font-display font-semibold text-brand-600">Plan around it</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Time your trip to catch {f.name} — add it to your itinerary in the trip planner.
                </p>
                <Link href="/planner" className="mt-3 inline-block">
                  <Button variant="accent" size="sm">Open trip planner</Button>
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {others.length > 0 && (
          <div className="mt-16">
            <h2 className="h3 mb-6 text-brand-600">Other festivals</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((o) => (
                <Link key={o.id} href={`/festivals/${o.slug}`} className="group block overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft card-hover">
                  <div className="relative h-40 overflow-hidden">
                    <CloudinaryImage image={o.image} alt={o.name} fill sizes="33vw" className="object-cover transition duration-[600ms] group-hover:scale-[1.07]" />
                    <Badge className={cn("absolute left-3 top-3", FESTIVAL_TYPE_SOLID[o.type] ?? FESTIVAL_TYPE_SOLID.Cultural)}>{o.type}</Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-semibold text-brand-600 transition group-hover:text-secondary">{o.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} /> {o.where}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pb-10">
        <CTASection
          title="Ready to plan your trip?"
          subtitle="Build a day-by-day itinerary around Nepal's festival calendar."
          primary={{ label: "Open trip planner", href: "/planner" }}
          secondary={{ label: "Check the weather", href: "/weather" }}
        />
      </div>
    </article>
  );
}
