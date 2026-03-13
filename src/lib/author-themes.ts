/**
 * 10 genre-based author site themes.
 * Each theme defines 12 CSS custom properties + font pairing.
 * The `id` is stored in author_profiles.site_theme.
 */

export interface AuthorTheme {
  id: string;
  name: string;
  genre: string;
  description: string;
  /** CSS custom properties — hex values */
  vars: {
    primary: string;
    primaryText: string;
    accent: string;
    accentText: string;
    secondaryBg: string;
    secondaryText: string;
    cardBg: string;
    cardBorder: string;
    bodyText: string;
    headingText: string;
    mutedText: string;
  };
  /** HSL values (legacy, used by existing inline styles) */
  colors: {
    heroBackground: string;
    heroForeground: string;
    accent: string;
    accentForeground: string;
    cardBorder: string;
    sectionAlt: string;
    footerBackground: string;
    footerForeground: string;
  };
  headingFont: string;
  bodyFont: string;
  borderRadius: string;
  mood: "light" | "dark" | "warm" | "cool";
}

export const AUTHOR_THEMES: AuthorTheme[] = [
  {
    id: "classic-elegant",
    name: "Classic Elegant",
    genre: "Business / Leadership",
    description: "Navy & gold - polished, authoritative, corporate.",
    vars: {
      primary: "#0B1D3A",
      primaryText: "#FFFFFF",
      accent: "#C5A55A",
      accentText: "#0B1D3A",
      secondaryBg: "#FDF6EC",
      secondaryText: "#1A1A1A",
      cardBg: "#FFFFFF",
      cardBorder: "#E8E0D0",
      bodyText: "#4A4A4A",
      headingText: "#1A1A1A",
      mutedText: "#888888",
    },
    colors: {
      heroBackground: "222 47% 14%",
      heroForeground: "45 60% 92%",
      accent: "43 74% 54%",
      accentForeground: "222 47% 14%",
      cardBorder: "43 30% 80%",
      sectionAlt: "45 30% 96%",
      footerBackground: "222 47% 11%",
      footerForeground: "45 20% 70%",
    },
    headingFont: "'Playfair Display', serif",
    bodyFont: "'Lato', sans-serif",
    borderRadius: "0.5rem",
    mood: "dark",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    genre: "Self-Help / Personal Growth",
    description: "Clean greens, soft whites - fresh, approachable.",
    vars: {
      primary: "#1A2E1A",
      primaryText: "#FFFFFF",
      accent: "#6B9E6B",
      accentText: "#FFFFFF",
      secondaryBg: "#F5F9F5",
      secondaryText: "#1A1A1A",
      cardBg: "#FFFFFF",
      cardBorder: "#D4E4D4",
      bodyText: "#3A3A3A",
      headingText: "#1A2E1A",
      mutedText: "#777777",
    },
    colors: {
      heroBackground: "120 27% 14%",
      heroForeground: "0 0% 100%",
      accent: "120 20% 52%",
      accentForeground: "0 0% 100%",
      cardBorder: "120 16% 84%",
      sectionAlt: "120 16% 97%",
      footerBackground: "120 27% 10%",
      footerForeground: "120 8% 60%",
    },
    headingFont: "'Inter', sans-serif",
    bodyFont: "'Inter', sans-serif",
    borderRadius: "0.75rem",
    mood: "light",
  },
  {
    id: "warm-storyteller",
    name: "Warm Storyteller",
    genre: "Memoir / Biography",
    description: "Rich browns & amber - warm, inviting, personal.",
    vars: {
      primary: "#3D1F0B",
      primaryText: "#FFF8F0",
      accent: "#D4843E",
      accentText: "#FFFFFF",
      secondaryBg: "#FFF8F0",
      secondaryText: "#2A1A0A",
      cardBg: "#FFFFFF",
      cardBorder: "#E8D5C0",
      bodyText: "#4A3A2A",
      headingText: "#3D1F0B",
      mutedText: "#8A7A6A",
    },
    colors: {
      heroBackground: "25 70% 14%",
      heroForeground: "30 100% 97%",
      accent: "28 63% 54%",
      accentForeground: "0 0% 100%",
      cardBorder: "30 35% 83%",
      sectionAlt: "30 100% 97%",
      footerBackground: "25 70% 10%",
      footerForeground: "30 15% 55%",
    },
    headingFont: "'Merriweather', serif",
    bodyFont: "'Source Sans 3', sans-serif",
    borderRadius: "0.5rem",
    mood: "warm",
  },
  {
    id: "bold-impact",
    name: "Bold Impact",
    genre: "Motivation / Fitness",
    description: "Charcoal black & electric red - powerful, commanding.",
    vars: {
      primary: "#1A0A0A",
      primaryText: "#FFFFFF",
      accent: "#D42B2B",
      accentText: "#FFFFFF",
      secondaryBg: "#FFF5F5",
      secondaryText: "#1A1A1A",
      cardBg: "#FFFFFF",
      cardBorder: "#F0D0D0",
      bodyText: "#3A3A3A",
      headingText: "#1A0A0A",
      mutedText: "#777777",
    },
    colors: {
      heroBackground: "0 33% 7%",
      heroForeground: "0 0% 100%",
      accent: "0 66% 50%",
      accentForeground: "0 0% 100%",
      cardBorder: "0 33% 88%",
      sectionAlt: "0 100% 98%",
      footerBackground: "0 33% 5%",
      footerForeground: "0 0% 50%",
    },
    headingFont: "'Oswald', sans-serif",
    bodyFont: "'Roboto', sans-serif",
    borderRadius: "0.25rem",
    mood: "dark",
  },
  {
    id: "serene-wisdom",
    name: "Serene Wisdom",
    genre: "Spirituality / Wellness",
    description: "Deep teal & sage - peaceful, grounded.",
    vars: {
      primary: "#0A2A2A",
      primaryText: "#E8F5F0",
      accent: "#4A9E8E",
      accentText: "#FFFFFF",
      secondaryBg: "#F0FAF7",
      secondaryText: "#1A2A2A",
      cardBg: "#FFFFFF",
      cardBorder: "#C8E8E0",
      bodyText: "#3A4A4A",
      headingText: "#0A2A2A",
      mutedText: "#6A8A8A",
    },
    colors: {
      heroBackground: "180 60% 10%",
      heroForeground: "160 30% 93%",
      accent: "170 36% 46%",
      accentForeground: "0 0% 100%",
      cardBorder: "160 33% 85%",
      sectionAlt: "160 50% 97%",
      footerBackground: "180 60% 7%",
      footerForeground: "160 15% 55%",
    },
    headingFont: "'Cormorant Garamond', serif",
    bodyFont: "'Nunito', sans-serif",
    borderRadius: "1rem",
    mood: "cool",
  },
  {
    id: "tech-forward",
    name: "Tech Forward",
    genre: "Technology / Science",
    description: "Dark slate & electric blue - modern, innovative.",
    vars: {
      primary: "#0A1628",
      primaryText: "#E0F0FF",
      accent: "#2B7BD4",
      accentText: "#FFFFFF",
      secondaryBg: "#F0F6FC",
      secondaryText: "#1A1A2A",
      cardBg: "#FFFFFF",
      cardBorder: "#D0E0F0",
      bodyText: "#3A3A4A",
      headingText: "#0A1628",
      mutedText: "#6A7A8A",
    },
    colors: {
      heroBackground: "217 55% 10%",
      heroForeground: "210 50% 93%",
      accent: "212 65% 50%",
      accentForeground: "0 0% 100%",
      cardBorder: "210 33% 88%",
      sectionAlt: "210 40% 97%",
      footerBackground: "217 55% 7%",
      footerForeground: "210 15% 50%",
    },
    headingFont: "'Space Grotesk', sans-serif",
    bodyFont: "'IBM Plex Sans', sans-serif",
    borderRadius: "0.5rem",
    mood: "dark",
  },
  {
    id: "heritage-literary",
    name: "Literary Classic",
    genre: "Fiction / Literary / Poetry",
    description: "Parchment & deep burgundy - timeless, refined.",
    vars: {
      primary: "#2A1A1A",
      primaryText: "#F5F0E8",
      accent: "#8B2252",
      accentText: "#FFFFFF",
      secondaryBg: "#F8F5F0",
      secondaryText: "#2A1A1A",
      cardBg: "#FFFFFF",
      cardBorder: "#E0D8D0",
      bodyText: "#4A3A3A",
      headingText: "#2A1A1A",
      mutedText: "#7A6A6A",
    },
    colors: {
      heroBackground: "0 22% 13%",
      heroForeground: "30 27% 93%",
      accent: "337 60% 34%",
      accentForeground: "0 0% 100%",
      cardBorder: "20 13% 84%",
      sectionAlt: "30 20% 96%",
      footerBackground: "0 22% 10%",
      footerForeground: "20 10% 55%",
    },
    headingFont: "'Libre Baskerville', serif",
    bodyFont: "'Crimson Text', serif",
    borderRadius: "0.25rem",
    mood: "warm",
  },
  {
    id: "creative-eclectic",
    name: "Creative Spark",
    genre: "Children's / Art / Creativity",
    description: "Soft lavender & vibrant purple - playful, joyful.",
    vars: {
      primary: "#2A1A3A",
      primaryText: "#FFF8FF",
      accent: "#9B4DCA",
      accentText: "#FFFFFF",
      secondaryBg: "#F8F0FF",
      secondaryText: "#2A1A2A",
      cardBg: "#FFFFFF",
      cardBorder: "#E0D0F0",
      bodyText: "#3A2A4A",
      headingText: "#2A1A3A",
      mutedText: "#7A6A8A",
    },
    colors: {
      heroBackground: "270 38% 16%",
      heroForeground: "300 100% 98%",
      accent: "274 52% 55%",
      accentForeground: "0 0% 100%",
      cardBorder: "270 33% 85%",
      sectionAlt: "270 100% 97%",
      footerBackground: "270 38% 11%",
      footerForeground: "270 15% 55%",
    },
    headingFont: "'Fredoka One', cursive",
    bodyFont: "'Quicksand', sans-serif",
    borderRadius: "0.75rem",
    mood: "cool",
  },
  {
    id: "thriller-dark",
    name: "Thriller Dark",
    genre: "Mystery / Thriller / Crime",
    description: "Near-black & blood orange - intense, gripping.",
    vars: {
      primary: "#0A0A0A",
      primaryText: "#F0E8E0",
      accent: "#E05A1A",
      accentText: "#FFFFFF",
      secondaryBg: "#F5F0EC",
      secondaryText: "#1A1A1A",
      cardBg: "#FFFFFF",
      cardBorder: "#D8D0C8",
      bodyText: "#3A3A3A",
      headingText: "#0A0A0A",
      mutedText: "#6A6A6A",
    },
    colors: {
      heroBackground: "0 0% 4%",
      heroForeground: "25 20% 93%",
      accent: "20 80% 49%",
      accentForeground: "0 0% 100%",
      cardBorder: "25 10% 82%",
      sectionAlt: "25 15% 95%",
      footerBackground: "0 0% 3%",
      footerForeground: "0 0% 42%",
    },
    headingFont: "'Bebas Neue', sans-serif",
    bodyFont: "'Barlow', sans-serif",
    borderRadius: "0.25rem",
    mood: "dark",
  },
  {
    id: "romance-bloom",
    name: "Romance Bloom",
    genre: "Romance / Women's Fiction",
    description: "Blush pink & rose gold - warm, romantic.",
    vars: {
      primary: "#2A0A1A",
      primaryText: "#FFF0F5",
      accent: "#D4728A",
      accentText: "#FFFFFF",
      secondaryBg: "#FFF5F8",
      secondaryText: "#2A1A1A",
      cardBg: "#FFFFFF",
      cardBorder: "#F0D0D8",
      bodyText: "#4A3A3A",
      headingText: "#2A0A1A",
      mutedText: "#8A6A7A",
    },
    colors: {
      heroBackground: "330 60% 10%",
      heroForeground: "340 100% 97%",
      accent: "348 50% 64%",
      accentForeground: "0 0% 100%",
      cardBorder: "340 40% 88%",
      sectionAlt: "340 60% 98%",
      footerBackground: "330 60% 7%",
      footerForeground: "340 15% 55%",
    },
    headingFont: "'Playfair Display', serif",
    bodyFont: "'Lora', serif",
    borderRadius: "0.75rem",
    mood: "warm",
  },
];

export function getThemeById(id: string): AuthorTheme {
  return AUTHOR_THEMES.find((t) => t.id === id) || AUTHOR_THEMES[0];
}

/** Generate Google Fonts URL for a theme (loads only needed fonts) */
export function getThemeFontsUrl(theme: AuthorTheme): string {
  const fonts = new Set<string>();
  const extractName = (f: string) => f.replace(/^'|'$/g, "");
  fonts.add(extractName(theme.headingFont.split(",")[0]));
  fonts.add(extractName(theme.bodyFont.split(",")[0]));
  const families = [...fonts].map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/** Generate CSS custom property string for a theme */
export function getThemeCSSVars(theme: AuthorTheme): string {
  const v = theme.vars;
  return `
    --theme-primary: ${v.primary};
    --theme-primary-text: ${v.primaryText};
    --theme-accent: ${v.accent};
    --theme-accent-text: ${v.accentText};
    --theme-secondary-bg: ${v.secondaryBg};
    --theme-secondary-text: ${v.secondaryText};
    --theme-card-bg: ${v.cardBg};
    --theme-card-border: ${v.cardBorder};
    --theme-body-text: ${v.bodyText};
    --theme-heading-text: ${v.headingText};
    --theme-muted-text: ${v.mutedText};
    --theme-heading-font: ${theme.headingFont};
    --theme-body-font: ${theme.bodyFont};
    --theme-radius: ${theme.borderRadius};
  `;
}
