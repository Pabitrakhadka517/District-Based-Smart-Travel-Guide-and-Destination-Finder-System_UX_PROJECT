import type { ReactNode } from "react";
import Link from "next/link";
import { Star, ArrowUpRight } from "lucide-react";
import type { CloudinaryImage as CloudinaryImageType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/components/shared/wishlist-button";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { cn } from "@/lib/utils";

interface EntityImageCardProps {
  href: string;
  wishlistId: string;
  image: CloudinaryImageType;
  name: string;
  tagline: string;
  rating: number;
  /** Optional text after the rating number, e.g. a review count like "(1,204)". */
  ratingSuffix?: ReactNode;
  categoryLabel: string;
  categoryBadgeClassName: string;
  trending?: boolean;
  /** Content for the footer row below the tagline (tags+price, hours+fee, etc). */
  footer: ReactNode;
}

/**
 * Shared shell for the two card types (Destination, Attraction) that are
 * otherwise near-identical: image with badges/rating overlay, wishlist
 * button, title+tagline, and a divider-separated footer row. Trek and
 * District cards look similar at a glance but differ enough in structure
 * (no wishlist button, image-overlaid text, different stat counts) that
 * forcing them through this same shape would cost more in prop complexity
 * than it'd save in duplication — they stay as their own components.
 */
export function EntityImageCard({
  href, wishlistId, image, name, tagline, rating, ratingSuffix,
  categoryLabel, categoryBadgeClassName, trending, footer,
}: EntityImageCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft card-hover">
      <Link href={href} className="block">
        <div className="relative h-56 overflow-hidden">
          <CloudinaryImage image={image} alt={name} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition duration-[600ms] group-hover:scale-[1.07]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />
          <div className="absolute left-3.5 top-3.5 flex gap-2">
            <Badge className={cn("shadow-soft", categoryBadgeClassName)}>{categoryLabel}</Badge>
            {trending && <Badge className="bg-white/95 text-brand-600 shadow-soft"><span aria-hidden="true">🔥</span> Trending</Badge>}
          </div>
          <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-600 shadow-soft">
            <Star size={12} className="fill-accent text-accent" /> {rating.toFixed(1)}
            {ratingSuffix && <span className="font-normal text-muted-foreground">{ratingSuffix}</span>}
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-brand-600 transition group-hover:text-secondary">{name}</h3>
            <ArrowUpRight size={18} className="shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tagline}</p>
          <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
            {footer}
          </div>
        </div>
      </Link>
      {/* Sibling of the Link, not a descendant — a <button> inside an <a> is invalid HTML
          and breaks the accessibility tree. Absolutely positioned against this same
          card wrapper keeps it in the identical visual spot. */}
      <WishlistButton id={wishlistId} className="absolute right-3.5 top-3.5 z-10" />
    </div>
  );
}
