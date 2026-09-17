import feliciaTanPhoto from "@/assets/felicia-tan.png";
import toBabyWithLoveCover from "@/assets/to-baby-with-love-cover.png";
import lostAndFoundCover from "@/assets/lost-and-found-cover.png";
import giftFromHeavenCover from "@/assets/gift-from-heaven-cover.png";

export interface Book {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  coverImage: string;
  amazonUrl: string;
  badges: string[];
  genre: string;
  price?: string;
  kindlePrice?: string;
  paperbackPrice?: string;
  pages?: number;
  rating?: number;
  categories?: string[];
}

export interface Author {
  slug: string;
  name: string;
  photo: string;
  title: string;
  bio: string;
  shortBio: string;
  credentials: string[];
  books: Book[];
  genres: string[];
  websiteUrl?: string;
  linkedinUrl?: string;
  amazonAuthorUrl?: string;
  
  badge: "listed" | "verified" | "featured" | "ab-verified";
  services: string[];
}

export const authors: Author[] = [
  {
    slug: "felicia-tan",
    name: "Felicia Tan",
    photo: feliciaTanPhoto,
    title: "International Bestselling Author & Life Designer",
    bio: "Felicia Tan is an inspiring author who turned her decade-long journey to motherhood into a powerful trilogy that has touched thousands of hearts. Through her raw, honest storytelling about IVF, pregnancy loss, and ultimate triumph, she offers hope to women facing similar challenges. She miscarried twice — first a baby boy at the 23rd gestational week, then twin boys at the 21st gestational week. They were all born alive but didn't make it. After 10 years of marriage, she welcomed her rainbow baby, Titus, conceived naturally — a miracle she never thought possible. Felicia is the Founder and President of Art of Life, a platform dedicated to embracing life, envisioning dreams, and empowering communities. She is also a certified Health & MAP Coach, keynote speaker on fertility and faith, and a passionate advocate for women navigating pregnancy loss.",
    shortBio: "3x published author whose motherhood trilogy hit #1 on Amazon in India and #2 in UK. Founder of Art of Life, keynote speaker on fertility and faith.",
    credentials: ["Published 3-book motherhood trilogy", "10-year journey from heartbreak to hope", "Founder of Art of Life", "Keynote speaker on fertility and faith"],
    books: [
      {
        slug: "to-baby-with-love",
        title: "To Baby With Love",
        subtitle: "A Mother's Journey Through Hope, Loss & Renewal",
        description: "A heartfelt journey through IUI and IVF, coping with premature birth loss, and finding the courage to not give up on the dream of motherhood.",
        coverImage: toBabyWithLoveCover,
        amazonUrl: "https://www.amazon.com/dp/B0DKWG8Y85",
        badges: ["#1 Best Seller"],
        genre: "Memoir",
        kindlePrice: "$0.99",
        paperbackPrice: "$12.99",
        pages: 82,
        rating: 5.0,
      },
      {
        slug: "lost-and-found",
        title: "Lost And Found",
        subtitle: "A Mother's Memoir on Finding Faith Through Loss",
        description: "The story of twin sons, Cervical Incompetence, and finding faith, peace, and hope through unimaginable loss. Features expert contributions and real stories from other mothers.",
        coverImage: lostAndFoundCover,
        amazonUrl: "https://artoflife.sg/product/lost-and-found-book/?v=1fdc0f893412",
        badges: [],
        genre: "Memoir",
        price: "$30.00",
        pages: 196,
        rating: 4.7,
      },
      {
        slug: "a-gift-from-heaven",
        title: "A Gift From Heaven",
        subtitle: "A Mother's Search for Her Rainbow Baby After the Storms",
        description: "A miracle pregnancy after 10 years of marriage — conceived naturally after multiple losses. A mother's tale of faith, perseverance, and being rewarded with a rainbow baby.",
        coverImage: giftFromHeavenCover,
        amazonUrl: "https://artoflife.sg/product/a-gift-from-heaven-book/?v=1fdc0f893412",
        badges: [],
        genre: "Memoir",
        price: "$30.00",
        pages: 184,
        rating: 4.8,
      },
    ],
    genres: ["Memoir", "Parenting", "Self-Help"],
    websiteUrl: "https://artoflife.sg/",
    linkedinUrl: "https://www.linkedin.com/in/feliciadesigner/",
    amazonAuthorUrl: "https://www.amazon.com/stores/Felicia-Tan/author/B0GNDPGKL2",
    badge: "featured",
    services: ["Speaking", "Coaching"],
  },
];
export function getAuthorBySlug(slug: string): Author | undefined {
  return authors.find((a) => a.slug === slug);
}

export function getBookBySlug(slug: string): { book: Book; author: Author } | undefined {
  for (const author of authors) {
    const book = author.books.find((b) => b.slug === slug);
    if (book) return { book, author };
  }
  return undefined;
}

export function getAllBooks(): { book: Book; author: Author }[] {
  return authors.flatMap((author) =>
    author.books.map((book) => ({ book, author }))
  );
}
