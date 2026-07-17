import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, MapPin } from "lucide-react";
import { getFestivals } from "@/services/content";
import { SectionHeader } from "@/components/shared/section-header";
import { Reveal } from "@/components/shared/reveal";
import { Badge } from "@/components/ui/badge";
import { CTASection } from "@/components/shared/cta-section";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { EmptyState } from "@/components/shared/empty-state";
import { img, PHOTO } from "@/data/images";
import { FESTIVAL_TYPE_SOLID } from "@/lib/category-colors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Festivals & Culture", description: "Nepal's vibrant festival calendar — Dashain, Tihar, Holi, Tiji and more." };

export default async function FestivalsPage() {
  const festivals = await getFestivals();
  return (
    <>
      <section className="relative h-[44vh] min-h-[320px]">
        <Image src={img(PHOTO.square1, 1920)} alt="Nepali festivals" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 to-brand-900/30" />
        <div className="container relative flex h-full flex-col justify-end pb-12 text-white">
          <span className="kicker text-accent">Festivals & culture</span>
          <h1 className="h1 mt-3">A calendar of colour</h1>
          <p className="mt-3 max-w-2xl text-white/85">Festivals are the beating heart of Nepali life. Time your visit to witness centuries-old celebrations.</p>
        </div>
      </section>

      <section className="section">
        <SectionHeader eyebrow="Year-round celebrations" title="Major festivals of Nepal" subtitle="From the fifteen days of Dashain to the masked dances of Tiji in the high mountains." />
        {festivals.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No festivals to show right now"
            description="Check back soon — we're always adding more of Nepal's celebrations."
          />
        ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((f, i) => (
            <Reveal key={f.id} delay={i * 0.05}>
              <Link href={`/festivals/${f.slug}`} className="group block overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft card-hover">
                <div className="relative h-48 overflow-hidden">
                  <CloudinaryImage image={f.image} alt={f.name} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition duration-[600ms] group-hover:scale-[1.07]" />
                  <Badge className="absolute left-3 top-3 bg-white/95 text-brand-600">{f.month}</Badge>
                  <Badge className={cn("absolute right-3 top-3", FESTIVAL_TYPE_SOLID[f.type] ?? FESTIVAL_TYPE_SOLID.Cultural)}>{f.type}</Badge>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold text-brand-600 transition group-hover:text-secondary">{f.name}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{f.description}</p>
                  <div className="mt-4 flex items-center gap-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin size={13} /> {f.where}</span>
                    <span className="flex items-center gap-1"><CalendarDays size={13} /> {f.duration}</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
        )}
      </section>

      <div className="pb-10"><CTASection title="Plan around a festival" subtitle="Match your trip dates to Nepal's most spectacular celebrations." /></div>
    </>
  );
}
