export type IconStyle =
  | "phosphor-duotone"
  | "phosphor-fill"
  | "hugeicons"
  | "solar"
  | "lucide"
  | "sf";
export type IconBackground =
  | "graphite-glyph"
  | "graphite-accent"
  | "glass-glow"
  | "glass-ice"
  | "tonal"
  | "glyph-only";

export const ICON_STYLES: readonly IconStyle[] = [
  "phosphor-duotone",
  "phosphor-fill",
  "hugeicons",
  "solar",
  "lucide",
  "sf",
];
export const ICON_BACKGROUNDS: readonly IconBackground[] = [
  "graphite-glyph",
  "graphite-accent",
  "glass-glow",
  "glass-ice",
  "tonal",
  "glyph-only",
];

/** Styles drawn from bundled SVG data (every style except native SF Symbols). */
export type SvgIconStyle = Exclude<IconStyle, "sf">;

export const ICON_STYLE_LABELS: Record<
  IconStyle,
  { label: string; detail: string }
> = {
  "phosphor-duotone": { label: "Duotone", detail: "Soft two-layer glyphs" },
  "phosphor-fill": { label: "Solid", detail: "Bold filled shapes" },
  hugeicons: { label: "Outline", detail: "Rounded, even strokes" },
  solar: { label: "Solar", detail: "Chunky duotone" },
  lucide: { label: "Line", detail: "Crisp and minimal" },
  sf: { label: "SF Symbols", detail: "Apple system symbols" },
};

export const ICON_BACKGROUND_LABELS: Record<
  IconBackground,
  { label: string; detail: string }
> = {
  "graphite-glyph": { label: "Graphite", detail: "Coloured glyph on graphite" },
  "graphite-accent": {
    label: "Graphite accent",
    detail: "White glyph, coloured accent",
  },
  "glass-glow": { label: "Glass glow", detail: "Glass lit from within" },
  "glass-ice": { label: "Glass ice", detail: "Frosted, one finish" },
  tonal: { label: "Tonal", detail: "Deep tint of each colour" },
  "glyph-only": { label: "Glyph only", detail: "No tile" },
};
