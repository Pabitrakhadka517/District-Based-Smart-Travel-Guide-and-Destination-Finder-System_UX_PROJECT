import Link from "next/link";
import { Landmark, MapPin, ArrowRight, Star } from "lucide-react";
import type { District } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";

export function DistrictCard({ district: d }: { district: District }) {
  const attractionCount = d.attractionCount ?? d.destinationCount;
  return (
    <Link href={`/districts/${d.slug}`} className="group relative block overflow-hidden rounded-3xl shadow-soft card-hover">
      <div className="relative h-80">
        <CloudinaryImage image={d.heroImage} alt={d.name} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition duration-600 group-hover:scale-[1.07]" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/25 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <div className="flex items-center gap-2">
          <Badge className="bg-white/20 text-white backdrop-blur">{d.province}</Badge>
          <span className="flex items-center gap-1 text-xs text-white/90"><Star size={12} className="fill-accent text-accent" /> {d.rating}</span>
        </div>
        <h3 className="mt-2.5 font-display text-2xl font-bold tracking-tight">{d.name}</h3>
        <p className="mt-1 line-clamp-2 max-w-md text-sm text-white/80">{d.description}</p>
        <div className="mt-4 flex items-center gap-4 text-xs text-white/90">
          <span className="flex items-center gap-1"><Landmark size={13} /> {attractionCount} attractions</span>
          <span className="flex items-center gap-1"><MapPin size={13} /> {d.destinationCount} destinations</span>
          <span className="ml-auto inline-flex translate-x-2 items-center gap-1 font-medium text-accent opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
            Explore <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
