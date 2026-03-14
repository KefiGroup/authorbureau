export interface SalesCopyData {
  hero: {
    title: string;
    tagline: string;
    ctaText: string;
    imageUrl?: string;
  };
  problem: {
    headline: string;
    painPoints: string[];
  };
  transformation: {
    before: string[];
    after: string[];
  };
  introduction: {
    paragraph: string;
  };
  whatsInside: {
    items: string[];
  };
  howItWorks: {
    steps: { title: string; description: string }[];
  };
  author: {
    name: string;
    bio: string;
    credentials: string;
    photoUrl?: string;
  };
  socialProof: {
    testimonials: { name: string; quote: string; title?: string }[];
  };
  pricing: {
    price: string;
    comparePrice?: string;
    currency: string;
    ctaText: string;
    included: string[];
  };
  faq: {
    items: { q: string; a: string }[];
  };
  finalCta: {
    headline: string;
    subheadline: string;
    ctaText: string;
    urgency?: string;
  };
}

export const DEFAULT_SALES_COPY: SalesCopyData = {
  hero: { title: "", tagline: "", ctaText: "Start Now" },
  problem: { headline: "Are you struggling with...", painPoints: [""] },
  transformation: { before: [""], after: [""] },
  introduction: { paragraph: "" },
  whatsInside: { items: [""] },
  howItWorks: {
    steps: [
      { title: "Enroll", description: "Sign up and get instant access" },
      { title: "Learn", description: "Follow the structured program" },
      { title: "Transform", description: "Apply what you learn and see results" },
    ],
  },
  author: { name: "", bio: "", credentials: "" },
  socialProof: { testimonials: [] },
  pricing: { price: "", currency: "USD", ctaText: "Enroll Now", included: [] },
  faq: { items: [] },
  finalCta: { headline: "Ready to Transform?", subheadline: "", ctaText: "Get Started Today" },
};
