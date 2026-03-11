export interface WebsiteConfig {
  siteType: "full" | "landing" | "link-in-bio";
  subdomain: string;
  template: string;
  colorScheme: string;
  fontPairing: string;
}

export interface SitePage {
  id: string;
  type: "home" | "about" | "products" | "blog" | "contact";
  title: string;
  enabled: boolean;
  sections: PageSection[];
}

export interface PageSection {
  id: string;
  type: "hero" | "features" | "testimonials" | "pricing" | "faq" | "cta" | "newsletter" | "about" | "products-grid" | "blog-list" | "contact-form";
  title: string;
  content: string;
  order: number;
}

export interface ProductCard {
  id: string;
  title: string;
  description: string;
  price: string;
  category: "build" | "bridge" | "yield";
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface SeoData {
  pageId: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  trackingId: string;
}

export const SITE_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  full: { label: "Full Website", description: "5+ pages — Home, About, Products, Blog, Contact" },
  landing: { label: "Landing Page", description: "One high-converting page with email capture" },
  "link-in-bio": { label: "Link-in-Bio", description: "Mobile-first page linking to all your products" },
};

export const TEMPLATE_OPTIONS = [
  { id: "author-minimal", name: "Author Minimal", description: "Clean, typography-focused. Great for literary non-fiction." },
  { id: "expert-authority", name: "Expert Authority", description: "Bold sections, social proof emphasis. Ideal for thought leaders." },
  { id: "warm-storyteller", name: "Warm Storyteller", description: "Soft gradients, inviting imagery. Perfect for memoir/self-help." },
  { id: "bold-speaker", name: "Bold Speaker", description: "High-impact layout with video hero. Best for coaches & speakers." },
  { id: "modern-creative", name: "Modern Creative", description: "Asymmetric layouts, artistic flair. Great for unique voices." },
  { id: "classic-professional", name: "Classic Professional", description: "Traditional structure, trust-building. Suited for business/finance." },
];

export const FONT_PAIRINGS = [
  { id: "playfair-lato", display: "Playfair Display", body: "Lato" },
  { id: "merriweather-opensans", display: "Merriweather", body: "Open Sans" },
  { id: "cormorant-montserrat", display: "Cormorant Garamond", body: "Montserrat" },
  { id: "dm-serif-inter", display: "DM Serif Display", body: "Inter" },
  { id: "source-serif-source-sans", display: "Source Serif Pro", body: "Source Sans Pro" },
  { id: "libre-baskerville-raleway", display: "Libre Baskerville", body: "Raleway" },
];

export const COLOR_SCHEMES = [
  { id: "auto", name: "Auto-match from book cover", colors: ["#D4A843", "#1A2B4A", "#FFF8F0"] },
  { id: "navy-gold", name: "Navy & Gold", colors: ["#1A2B4A", "#D4A843", "#F8F6F0"] },
  { id: "forest-cream", name: "Forest & Cream", colors: ["#2D5016", "#E8D5B7", "#FFFAF5"] },
  { id: "charcoal-coral", name: "Charcoal & Coral", colors: ["#333333", "#E86C5D", "#FAFAFA"] },
  { id: "midnight-silver", name: "Midnight & Silver", colors: ["#0F1629", "#C0C0C0", "#F5F5F7"] },
  { id: "burgundy-ivory", name: "Burgundy & Ivory", colors: ["#722F37", "#FFFFF0", "#F5F0EB"] },
];

export const SECTION_TYPES: Record<string, { label: string; emoji: string }> = {
  hero: { label: "Hero Section", emoji: "🌟" },
  features: { label: "Features / Benefits", emoji: "✨" },
  testimonials: { label: "Testimonials", emoji: "💬" },
  pricing: { label: "Pricing", emoji: "💰" },
  faq: { label: "FAQ", emoji: "❓" },
  cta: { label: "Call to Action", emoji: "🎯" },
  newsletter: { label: "Newsletter Signup", emoji: "📬" },
  about: { label: "About", emoji: "👤" },
  "products-grid": { label: "Products Grid", emoji: "🛍" },
  "blog-list": { label: "Blog Posts", emoji: "📝" },
  "contact-form": { label: "Contact Form", emoji: "✉️" },
};
