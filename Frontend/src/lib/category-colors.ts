import type { Category, AttractionCategory, Difficulty } from "@/types";

/** The 9 canonical tourism categories from the NepaYatra brand palette. */
export type CanonicalCategory =
  | "Adventure" | "Nature" | "Religious" | "Heritage" | "Wildlife"
  | "Lakes" | "Trekking" | "Cultural" | "Festivals";

export const CATEGORY_STYLE: Record<CanonicalCategory, string> = {
  Adventure: "bg-accent/10 text-accent border-accent/20",
  Nature: "bg-success/10 text-success border-success/20",
  Religious: "bg-gold/10 text-gold border-gold/20",
  Heritage: "bg-sandstone/10 text-sandstone border-sandstone/20",
  Wildlife: "bg-forest/10 text-forest border-forest/20",
  Lakes: "bg-secondary/10 text-secondary border-secondary/20",
  Trekking: "bg-brand-50 text-brand-600 border-brand-200",
  Cultural: "bg-maroon/10 text-maroon border-maroon/20",
  Festivals: "bg-crimson/10 text-crimson border-crimson/20"
};

const CATEGORY_MAP: Record<Category, CanonicalCategory> = {
  Heritage: "Heritage",
  Adventure: "Adventure",
  Nature: "Nature",
  Trekking: "Trekking",
  Religious: "Religious",
  Wildlife: "Wildlife",
  Cultural: "Cultural",
  Lake: "Lakes",
  City: "Trekking" // no matching brand category — falls back to the neutral brand tone
};

const ATTRACTION_CATEGORY_MAP: Record<AttractionCategory, CanonicalCategory> = {
  "Religious Sites": "Religious",
  "Historical Sites": "Heritage",
  "Natural Attractions": "Nature",
  "Lakes & Rivers": "Lakes",
  "Mountains & Trekking Routes": "Trekking",
  "Adventure Activities": "Adventure",
  "Cultural Heritage Sites": "Cultural",
  "Viewpoints": "Nature",
  "National Parks & Wildlife": "Wildlife",
  "Local Experiences": "Cultural"
};

/** Normalizes the two overlapping place-category taxonomies onto the 9 canonical brand categories. */
export function normalizeCategory(raw: Category | AttractionCategory | string): CanonicalCategory {
  if (raw in CATEGORY_MAP) return CATEGORY_MAP[raw as Category];
  if (raw in ATTRACTION_CATEGORY_MAP) return ATTRACTION_CATEGORY_MAP[raw as AttractionCategory];
  return "Trekking";
}

export function categoryStyle(raw: Category | AttractionCategory | string): string {
  return CATEGORY_STYLE[normalizeCategory(raw)];
}

/** Solid (non-tint) fill for accent bars/dots/legend markers. */
export const CATEGORY_SOLID: Record<CanonicalCategory, string> = {
  Adventure: "bg-accent",
  Nature: "bg-success",
  Religious: "bg-gold",
  Heritage: "bg-sandstone",
  Wildlife: "bg-forest",
  Lakes: "bg-secondary",
  Trekking: "bg-brand-600",
  Cultural: "bg-maroon",
  Festivals: "bg-crimson"
};

export function categorySolid(raw: Category | AttractionCategory | string): string {
  return CATEGORY_SOLID[normalizeCategory(raw)];
}

/** Solid bg + contrast-safe text, for badges overlaid on photos. */
export const CATEGORY_SOLID_BADGE: Record<CanonicalCategory, string> = {
  Adventure: "bg-accent text-accent-foreground",
  Nature: "bg-success text-white",
  Religious: "bg-gold text-gold-foreground",
  Heritage: "bg-sandstone text-sandstone-foreground",
  Wildlife: "bg-forest text-white",
  Lakes: "bg-secondary text-secondary-foreground",
  Trekking: "bg-brand-600 text-white",
  Cultural: "bg-maroon text-white",
  Festivals: "bg-crimson text-white"
};

export function categorySolidBadge(raw: Category | AttractionCategory | string): string {
  return CATEGORY_SOLID_BADGE[normalizeCategory(raw)];
}

export const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  Easy: "bg-success/10 text-success border-success/20",
  Moderate: "bg-secondary/10 text-secondary border-secondary/20",
  Challenging: "bg-warning/10 text-warning-foreground border-warning/30",
  Strenuous: "bg-destructive/10 text-destructive border-destructive/20"
};

export const FESTIVAL_TYPE_STYLE: Record<"Religious" | "Cultural" | "Harvest" | "National", string> = {
  Religious: "bg-gold/10 text-gold border-gold/20",
  Cultural: "bg-maroon/10 text-maroon border-maroon/20",
  Harvest: "bg-success/10 text-success border-success/20",
  National: "bg-brand-50 text-brand-600 border-brand-200"
};

/** Solid bg + contrast-safe text, for festival-type badges overlaid on photos. */
export const FESTIVAL_TYPE_SOLID: Record<"Religious" | "Cultural" | "Harvest" | "National", string> = {
  Religious: "bg-gold text-gold-foreground",
  Cultural: "bg-maroon text-white",
  Harvest: "bg-success text-white",
  National: "bg-brand-600 text-white"
};

export type ExpenseCategory = "accommodation" | "food" | "transportation" | "activities" | "other";

export const EXPENSE_CATEGORY_STYLE: Record<ExpenseCategory, { text: string; bar: string }> = {
  accommodation: { text: "text-brand-600", bar: "bg-brand-400" },
  food: { text: "text-gold", bar: "bg-gold" },
  transportation: { text: "text-accent", bar: "bg-accent" },
  activities: { text: "text-secondary", bar: "bg-secondary" },
  other: { text: "text-muted-foreground", bar: "bg-muted-foreground/40" }
};

export type ChecklistCategory = "Documents" | "Booking" | "Packing" | "Safety" | "General";

export const CHECKLIST_CATEGORY_STYLE: Record<ChecklistCategory, string> = {
  Documents: "bg-brand-50 text-brand-600",
  Booking: "bg-secondary/10 text-secondary",
  Packing: "bg-gold/10 text-gold",
  Safety: "bg-warning/10 text-warning-foreground",
  General: "bg-muted text-muted-foreground"
};

/** Content "kind" chip (destination/attraction/trek/festival/guide) — an entity-type axis, distinct from tourism category. Matches the map's marker-pin colors exactly. */
export const KIND_STYLE: Record<"destination" | "attraction" | "trek" | "festival" | "guide", string> = {
  destination: "bg-accent/10 text-accent border-accent/20",
  attraction: "bg-secondary/10 text-secondary border-secondary/20",
  trek: "bg-success/10 text-success border-success/20",
  festival: "bg-purple/10 text-purple border-purple/20",
  guide: "bg-teal/10 text-teal border-teal/20"
};
