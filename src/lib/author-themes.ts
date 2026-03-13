/**
 * 10 genre-based author site themes.
 * Each theme defines colors (HSL), font pairing, and visual mood.
 * The `id` is stored in author_profiles.site_theme.
 *
 * Themes 1-3 are the original "business" themes.
 * Themes 4-10 match the document specification exactly.
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
  // --- Original 3 business themes ---
  {
    id: "classic-elegant",
    name: "Classic Elegant",
    genre: "Business / Leadership",
    description: "Navy & gold - polished, authoritative, corporate.",
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
    id: "wealth-prestige",
    name: "Wealth & Prestige",
    genre: "Finance / Investing",
    description: "Racing green & gold - premium, sophisticated, trust-building.",
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

  // --- 7 new document-specified themes ---
  {
    id: "bold-impact",
    name: "Bold Impact",
    genre: "Motivation / Fitness / Sports",
    description: "Charcoal black & electric red - powerful, commanding.",
    colors: {
      heroBackground: "0 0% 10%",        // #1A1A1A
      heroForeground: "0 0% 95%",
      accent: "355 76% 56%",             // #E63946
      accentForeground: "0 0% 100%",
      cardBorder: "0 0% 22%",
      sectionAlt: "0 0% 13%",
      footerBackground: "0 0% 6%",
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
    genre: "Wellness / Mindfulness",
    description: "Soft sage & teal - peaceful, grounded.",
    colors: {
      heroBackground: "120 10% 95%",      // #F0F4F0
      heroForeground: "160 20% 18%",
      accent: "170 55% 39%",             // #2A9D8F
      accentForeground: "0 0% 100%",
      cardBorder: "120 8% 85%",
      sectionAlt: "120 8% 97%",
      footerBackground: "160 20% 14%",
      footerForeground: "120 8% 60%",
    },
    headingFont: "'Cormorant Garamond', serif",
    bodyFont: "'Nunito', sans-serif",
    borderRadius: "1rem",
    mood: "light",
  },
  {
    id: "tech-forward",
    name: "Tech Forward",
    genre: "Technology / Science / Innovation",
    description: "Dark slate blue & electric blue - modern, innovative.",
    colors: {
      heroBackground: "217 33% 17%",      // #1E293B
      heroForeground: "210 20% 92%",
      accent: "217 91% 60%",             // #3B82F6
      accentForeground: "0 0% 100%",
      cardBorder: "217 20% 28%",
      sectionAlt: "217 25% 20%",
      footerBackground: "217 33% 12%",
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
    colors: {
      heroBackground: "40 33% 94%",       // #F5F0E8
      heroForeground: "350 40% 20%",
      accent: "350 40% 32%",             // #722F37
      accentForeground: "40 33% 96%",
      cardBorder: "40 20% 82%",
      sectionAlt: "40 28% 96%",
      footerBackground: "350 40% 14%",
      footerForeground: "40 15% 65%",
    },
    headingFont: "'EB Garamond', serif",
    bodyFont: "'Crimson Text', serif",
    borderRadius: "0.25rem",
    mood: "warm",
  },
  {
    id: "creative-eclectic",
    name: "Creative Spark",
    genre: "Children's Books / Art / Creativity",
    description: "Soft lavender & vibrant purple - playful, joyful.",
    colors: {
      heroBackground: "263 50% 97%",      // #F3EEFF
      heroForeground: "263 30% 18%",
      accent: "263 82% 58%",             // #7C3AED
      accentForeground: "0 0% 100%",
      cardBorder: "263 25% 85%",
      sectionAlt: "263 40% 98%",
      footerBackground: "263 30% 14%",
      footerForeground: "263 15% 60%",
    },
    headingFont: "'Poppins', sans-serif",
    bodyFont: "'Quicksand', sans-serif",
    borderRadius: "0.75rem",
    mood: "cool",
  },
  {
    id: "thriller-dark",
    name: "Thriller Dark",
    genre: "Mystery / Thriller / Crime / Horror",
    description: "Near-black & blood orange - intense, gripping.",
    colors: {
      heroBackground: "0 0% 7%",          // #111111
      heroForeground: "0 0% 92%",
      accent: "20 100% 60%",             // #FF6B35
      accentForeground: "0 0% 100%",
      cardBorder: "0 0% 18%",
      sectionAlt: "0 0% 10%",
      footerBackground: "0 0% 4%",
      footerForeground: "0 0% 45%",
    },
    headingFont: "'Bebas Neue', sans-serif",
    bodyFont: "'Barlow', sans-serif",
    borderRadius: "0.25rem",
    mood: "dark",
  },
  {
    id: "romance-bloom",
    name: "Romance Bloom",
    genre: "Romance / Women's Fiction / Family",
    description: "Blush pink & rose gold - warm, romantic.",
    colors: {
      heroBackground: "345 100% 97%",     // #FFF0F3
      heroForeground: "345 25% 22%",
      accent: "350 25% 59%",             // #B76E79
      accentForeground: "0 0% 100%",
      cardBorder: "345 30% 85%",
      sectionAlt: "345 60% 98%",
      footerBackground: "345 25% 16%",
      footerForeground: "345 15% 60%",
    },
    headingFont: "'Libre Baskerville', serif",
    bodyFont: "'Raleway', sans-serif",
    borderRadius: "0.75rem",
    mood: "warm",
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
