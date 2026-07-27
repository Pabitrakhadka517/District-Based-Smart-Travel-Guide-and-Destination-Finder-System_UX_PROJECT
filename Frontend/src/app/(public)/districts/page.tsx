import type { Metadata } from "next";
import { Map, Landmark, Star, Globe } from "lucide-react";
import { getDistricts } from "@/services/content";
import { DistrictsList } from "./districts-list";

export const metadata: Metadata = {
  title: "Explore Nepal's 77 Districts – NepaYatra",
  description:
    "Discover Nepal's 77 unique districts — from Himalayan peaks to tropical lowlands. Browse by province, attraction type and traveller rating.",
};

export default async function DistrictsPage() {
  const districts = await getDistricts();

  const totalAttractions  = districts.reduce((s, d) => s + (d.attractionCount ?? 0), 0);
  const totalDestinations = districts.reduce((s, d) => s + d.destinationCount, 0);
  const provinces         = new Set(districts.map((d) => d.province)).size;
  const avgRating         = districts.length
    ? (districts.reduce((s, d) => s + d.rating, 0) / districts.length).toFixed(1)
    : "—";

  return (
    <>
      {/* ── hero ── */}
      <section className="mesh-brand py-20 text-white">
        <div className="container">
          <span className="kicker text-white/60">Nepal Travel Guide</span>
          <h1 className="h1 mt-3">Explore Nepal&apos;s Districts</h1>
          <p className="lead mt-3 max-w-2xl text-white/80">
            Nepal&apos;s 77 districts each offer something remarkable — from ancient temples and snow-capped peaks
            to wildlife sanctuaries and vibrant festivals. Pick a region and start exploring.
          </p>

          {/* live stat strip */}
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {[
              { icon: Globe,    value: String(districts.length),   label: "Districts"    },
              { icon: Map,      value: String(provinces),          label: "Provinces"    },
              { icon: Landmark, value: String(totalAttractions),   label: "Attractions"  },
              { icon: Star,     value: String(avgRating),          label: "Avg. Rating"  },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-5 text-center backdrop-blur-sm">
                <Icon size={20} className="text-accent" />
                <p className="font-display text-3xl font-bold">{value}</p>
                <p className="text-xs text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── filterable district list ── */}
      <section className="section">
        <DistrictsList districts={districts} />
      </section>
    </>
  );
}
