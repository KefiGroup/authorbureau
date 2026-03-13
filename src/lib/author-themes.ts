/**
 * 10 genre-based author site themes.
 * Each theme defines colors (HSL), font pairing, and visual mood.
 * The `id` is stored in author_profiles.site_theme.
 */

export interface AuthorTheme {
  id: string;
  name: string;
  genre: string;
  description: string;
  /** HSL values without hsl() wrapper */
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
    description: "Navy & gold — polished, authoritative, corporate.",
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
    bodyFont: "'Source Sans 3', sans-serif",
    borderRadius: "0.5rem",
    mood: "dark",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    genre: "Self-Help / Personal Growth",
    description: "Clean whites, soft grays, one pop color.",
    colors: {
      heroBackground: "0 0% 98%",
      heroForeground: "0 0% 12%",
      accent: "168 60% 42%",
      accentForeground: "0 0% 100%",
      cardBorder: "0 0% 90%",
      sectionAlt: "0 0% 96%",
      footerBackground: "0 0% 7%",
      footerForeground: "0 0% 65%",
    },
    headingFont: "'DM Sans', sans-serif",
    bodyFont: "'DM Sans', sans-serif",
    borderRadius: "0.75rem",
    mood: "light",
  },
  {
    id: "warm-storyteller",
    name: "Warm Storyteller",
    genre: "Memoir / Biography",
    description: "Earthy terracotta, parchment tones — intimate and human.",
    colors: {
      heroBackground: "25 35% 22%",
      heroForeground: "35 40% 92%",
      accent: "18 70% 55%",
      accentForeground: "0 0% 100%",
      cardBorder: "30 25% 80%",
      sectionAlt: "35 30% 95%",
      footerBackground: "25 35% 16%",
      footerForeground: "35 20% 65%",
    },
    headingFont: "'Lora', serif",
    bodyFont: "'Nunito', sans-serif",
    borderRadius: "0.5rem",
    mood: "warm",
  },
  {
    id: "bold-impact",
    name: "Bold Impact",
    genre: "Motivation / Fitness",
    description: "High-contrast black & electric orange — energetic, action-oriented.",
    colors: {
      heroBackground: "0 0% 6%",
      heroForeground: "0 0% 96%",
      accent: "24 95% 55%",
      accentForeground: "0 0% 100%",
      cardBorder: "0 0% 20%",
      sectionAlt: "0 0% 9%",
      footerBackground: "0 0% 4%",
      footerForeground: "0 0% 50%",
    },
    headingFont: "'Oswald', sans-serif",
    bodyFont: "'Inter', sans-serif",
    borderRadius: "0.25rem",
    mood: "dark",
  },
  {
    id: "serene-wisdom",
    name: "Serene Wisdom",
    genre: "Spirituality / Wellness",
    description: "Soft lavender & sage — peaceful, meditative, calming.",
    colors: {
      heroBackground: "260 25% 18%",
      heroForeground: "270 30% 92%",
      accent: "150 30% 55%",
      accentForeground: "0 0% 100%",
      cardBorder: "260 15% 82%",
      sectionAlt: "270 15% 96%",
      footerBackground: "260 25% 13%",
      footerForeground: "270 15% 60%",
    },
    headingFont: "'Cormorant Garamond', serif",
    bodyFont: "'Quicksand', sans-serif",
    borderRadius: "1rem",
    mood: "cool",
  },
  {
    id: "tech-forward",
    name: "Tech Forward",
    genre: "Technology / Science",
    description: "Dark with electric blue accents — futuristic, data-driven.",
    colors: {
      heroBackground: "220 30% 10%",
      heroForeground: "210 20% 92%",
      accent: "210 100% 55%",
      accentForeground: "0 0% 100%",
      cardBorder: "220 20% 25%",
      sectionAlt: "220 20% 13%",
      footerBackground: "220 30% 7%",
      footerForeground: "210 15% 50%",
    },
    headingFont: "'Space Grotesk', sans-serif",
    bodyFont: "'IBM Plex Sans', sans-serif",
    borderRadius: "0.5rem",
    mood: "dark",
  },
  {
    id: "creative-eclectic",
    name: "Creative Eclectic",
    genre: "Art / Design / Creativity",
    description: "Vibrant coral & teal — playful, expressive, artistic.",
    colors: {
      heroBackground: "180 25% 15%",
      heroForeground: "0 0% 95%",
      accent: "5 75% 60%",
      accentForeground: "0 0% 100%",
      cardBorder: "180 20% 75%",
      sectionAlt: "180 15% 95%",
      footerBackground: "180 25% 10%",
      footerForeground: "180 15% 55%",
    },
    headingFont: "'Sora', sans-serif",
    bodyFont: "'Karla', sans-serif",
    borderRadius: "0.75rem",
    mood: "cool",
  },
  {
    id: "heritage-literary",
    name: "Heritage Literary",
    genre: "Fiction / Literature",
    description: "Deep burgundy & cream — classic bookish elegance.",
    colors: {
      heroBackground: "350 40% 18%",
      heroForeground: "40 30% 92%",
      accent: "40 55% 55%",
      accentForeground: "350 40% 15%",
      cardBorder: "350 15% 78%",
      sectionAlt: "40 25% 96%",
      footerBackground: "350 40% 12%",
      footerForeground: "40 15% 60%",
    },
    headingFont: "'EB Garamond', serif",
    bodyFont: "'Libre Baskerville', serif",
    borderRadius: "0.25rem",
    mood: "warm",
  },
  {
    id: "fresh-educator",
    name: "Fresh Educator",
    genre: "Education / Parenting",
    description: "Bright green & warm white — friendly, approachable, trustworthy.",
    colors: {
      heroBackground: "145 35% 96%",
      heroForeground: "145 40% 18%",
      accent: "145 55% 42%",
      accentForeground: "0 0% 100%",
      cardBorder: "145 20% 82%",
      sectionAlt: "145 15% 97%",
      footerBackground: "145 35% 15%",
      footerForeground: "145 15% 65%",
    },
    headingFont: "'Poppins', sans-serif",
    bodyFont: "'Nunito', sans-serif",
    borderRadius: "0.75rem",
    mood: "light",
  },
  {
    id: "wealth-prestige",
    name: "Wealth & Prestige",
    genre: "Finance / Investing",
    description: "Racing green & gold — premium, sophisticated, trust-building.",
    colors: {
      heroBackground: "160 40% 12%",
      heroForeground: "45 50% 90%",
      accent: "43 70% 50%",
      accentForeground: "160 40% 10%",
      cardBorder: "43 25% 75%",
      sectionAlt: "45 20% 96%",
      footerBackground: "160 40% 8%",
      footerForeground: "45 15% 55%",
    },
    headingFont: "'Playfair Display', serif",
    bodyFont: "'Lato', sans-serif",
    borderRadius: "0.375rem",
    mood: "dark",
  },
];

export function getThemeById(id: string): AuthorTheme {
  return AUTHOR_THEMES.find((t) => t.id === id) || AUTHOR_THEMES[0];
}

/** Generate Google Fonts URL for a theme */
export function getThemeFontsUrl(theme: AuthorTheme): string {
  const fonts = new Set<string>();
  const extractName = (f: string) => f.replace(/^'|'$/g, "");
  fonts.add(extractName(theme.headingFont.split(",")[0]));
  fonts.add(extractName(theme.bodyFont.split(",")[0]));
  const families = [...fonts].map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
