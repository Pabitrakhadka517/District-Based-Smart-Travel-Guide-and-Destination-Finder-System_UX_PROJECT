import { Clock, Ticket } from "lucide-react";
import type { TouristAttraction } from "@/types";
import { EntityImageCard } from "@/components/cards/entity-image-card";
import { categorySolidBadge } from "@/lib/category-colors";

interface AttractionCardProps {
  attraction: TouristAttraction;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function AttractionCard({ attraction: a, selected, onToggleSelect }: AttractionCardProps) {
  const feeLabel = a.entryFee?.foreigner ? `NPR ${a.entryFee.foreigner}` : "Free entry";

  return (
    <EntityImageCard
      href={`/attractions/${a.slug}`}
      wishlistId={a.id}
      image={a.heroImage}
      name={a.name}
      tagline={a.tagline}
      rating={a.rating}
      categoryLabel={a.category}
      categoryBadgeClassName={categorySolidBadge(a.category)}
      trending={a.trending}
      selected={selected}
      onToggleSelect={onToggleSelect}
      footer={
        <>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock size={12} /> {a.openingHours ? a.openingHours.split("(")[0].trim() : "Open daily"}</span>
          <span className="flex items-center gap-1 text-xs font-medium text-brand-600"><Ticket size={12} /> {feeLabel}</span>
        </>
      }
    />
  );
}
