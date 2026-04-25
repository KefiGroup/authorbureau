export type CategoryAccent = "brand" | "build" | "yield";

export interface AccentClasses {
  text: string;
  bg: string;
  bgSoft: string;
  bgVeryLight: string;
  border: string;
  borderSoft: string;
  ring: string;
  buttonBg: string;
  divider: string;
  gradientCard: string;
}

export const ACCENT_CLASSES: Record<CategoryAccent, AccentClasses> = {
  brand: {
    text: "text-builder-brand",
    bg: "bg-builder-brand",
    bgSoft: "bg-builder-brand/15",
    bgVeryLight: "bg-builder-brand/5",
    border: "border-builder-brand",
    borderSoft: "border-builder-brand/30",
    ring: "ring-builder-brand/30",
    buttonBg: "bg-builder-brand text-white hover:bg-builder-brand/90 border-transparent",
    divider: "bg-builder-brand/20",
    gradientCard: "bg-gradient-to-br from-builder-brand/10 via-builder-brand/5 to-transparent",
  },
  build: {
    text: "text-builder-bridge",
    bg: "bg-builder-bridge",
    bgSoft: "bg-builder-bridge/15",
    bgVeryLight: "bg-builder-bridge/5",
    border: "border-builder-bridge",
    borderSoft: "border-builder-bridge/30",
    ring: "ring-builder-bridge/30",
    buttonBg: "bg-builder-bridge text-white hover:bg-builder-bridge/90 border-transparent",
    divider: "bg-builder-bridge/20",
    gradientCard: "bg-gradient-to-br from-builder-bridge/10 via-builder-bridge/5 to-transparent",
  },
  yield: {
    text: "text-builder-yield",
    bg: "bg-builder-yield",
    bgSoft: "bg-builder-yield/15",
    bgVeryLight: "bg-builder-yield/5",
    border: "border-builder-yield",
    borderSoft: "border-builder-yield/30",
    ring: "ring-builder-yield/30",
    buttonBg: "bg-builder-yield text-white hover:bg-builder-yield/90 border-transparent",
    divider: "bg-builder-yield/20",
    gradientCard: "bg-gradient-to-br from-builder-yield/10 via-builder-yield/5 to-transparent",
  },
};

export function categoryToAccent(catId: string): CategoryAccent {
  if (catId === "marketing-channels") return "build";
  if (catId === "authority-builders") return "yield";
  return "brand";
}
