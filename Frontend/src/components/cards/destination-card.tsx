import type { Destination } from "@/types";
import { EntityImageCard } from "@/components/cards/entity-image-card";
import { formatCurrency } from "@/lib/utils";
import { categorySolidBadge } from "@/lib/category-colors";

interface DestinationCardProps {
  destination: Destination;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function DestinationCard({ destination: d, selected, onToggleSelect }: DestinationCardProps) {
  return (
    <EntityImageCard
      href={`/destinations/${d.slug}`}
      wishlistId={d.id}
      image={d.heroImage}
      name={d.name}
      tagline={d.tagline}
      rating={d.rating}
      ratingSuffix={`(${d.reviewCount.toLocaleString()})`}
      categoryLabel={d.category}
      categoryBadgeClassName={categorySolidBadge(d.category)}
      trending={d.trending}
      selected={selected}
      onToggleSelect={onToggleSelect}
      footer={
        <>
          <div className="flex flex-wrap gap-1">
            {d.tags.slice(0, 2).map((t) => <span key={t} className="text-xs text-muted-foreground">#{t.replace(/\s/g, "")}</span>)}
          </div>
          <span className="text-sm font-semibold text-brand-600">from {formatCurrency(d.budget.budget)}</span>
        </>
      }
    />
  );
}
