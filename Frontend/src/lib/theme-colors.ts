/**
 * Single source of truth for NepaYatra's brand hex values.
 * Consumed by tailwind.config.ts (Tailwind classes) and by components that
 * can't use Tailwind classes (inline SVG fills/gradients).
 */

export const BRAND_SCALE = {
  50: "#eff6fb",
  100: "#daebf6",
  200: "#add2eb",
  300: "#73b3de",
  400: "#3993d0",
  500: "#256d9d",
  600: "#1b4f72", // Everest Blue
  700: "#153c57",
  800: "#102e42",
  900: "#0b1f2d"
} as const;

export const BRAND = BRAND_SCALE[600]; // Everest Blue
export const SECONDARY = "#5DADE2"; // Mountain Sky
export const ACCENT = "#F28C28"; // Himalayan Sunrise
export const SUCCESS = "#2E8B57"; // Evergreen Forest
export const GOLD = "#D4A017"; // Temple Gold
export const SANDSTONE = "#B8926B"; // Heritage category
export const FOREST = "#2F6F3E"; // Wildlife category
export const MAROON = "#7A2E3B"; // Cultural category
export const CRIMSON = "#A6243F"; // Festivals category
export const PURPLE = "#7C3AED"; // Festivals map marker
export const TEAL = "#0D9488"; // Guides map marker
export const DESTRUCTIVE = "#DC3545"; // Error
export const WARNING = "#F4B400";
export const INFO = "#3B82F6";

export const BACKGROUND = "#F8FAFC";
export const CARD = "#FFFFFF";
export const SECTION_BACKGROUND = "#F1F5F9";

export const FOREGROUND = "#1E293B"; // Primary heading
export const BODY_TEXT = "#475569";
export const SECONDARY_TEXT = "#64748B";
export const FADED_TEXT = "#94A3B8"; // Muted/decorative text — fails AA at normal text size

export const BORDER = "#E2E8F0";
export const BORDER_HOVER = "#CBD5E1";

export const DARK_TEXT = FOREGROUND;
