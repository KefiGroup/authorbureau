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
  reviewCount?: number;
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
  // Order: Pauline, Felicia, Bob (left to right)
  {
    slug: "pauline-teo",
    name: "Pauline Teo",
    photo: "/src/assets/pauline-teo.jpeg",
    title: "International Bestselling Author & Founder of Authors Bureau",
    bio: "Pauline Teo is an International Bestselling Author with her book, \"Be SUCKcessful\", reaching #1 on Amazon. She has previously authored 2 other Bestselling books titled \"Value Investing for Women\" and \"Invest Like Buffett for Parents\", both in their 3rd reprints. As a proud mother of 2, Pauline has been instrumental in leading a startup since 2011, eventually steering the company to become the largest Financial Education company in Singapore and Malaysia. She oversaw its successful listing, 8I Holdings, in 2014 (ASX:8I) and the spin-off of another subsidiary, 8VI Ltd (ASX:8VI) in 2018. With a Master's Degree in Instructional Design and Technology specializing in Adult Learning, she brings 25+ years of industry experience to her transformational teachings.",
    shortBio: "#1 Amazon Bestselling Author of 3 books, led a startup to ASX listing, and has spent 25+ years transforming lives through finance and personal development.",
    credentials: ["International Bestselling Author", "3x Published Author", "25+ Years Experience", "Master of Arts (Instructional Design & Technology)"],
    books: [
      {
        slug: "be-suckcessful",
        title: "Be SUCKcessful",
        subtitle: "We SUCK Before We SUCCEED",
        description: "A raw, honest guide to embracing failure as the foundation for success. Pauline Teo shares her journey from setbacks to building a publicly listed company.",
        coverImage: "/src/assets/besuckcessful-cover.jpg",
        amazonUrl: "https://a.co/d/e3tGN8E",
        badges: ["#1 Best Seller", "#1 New Release"],
        genre: "Self-Help",
        kindlePrice: "$0.99",
        paperbackPrice: "$8.99",
        pages: 248,
        rating: 4.8,
        reviewCount: 42,
      },
      {
        slug: "value-investing-for-women",
        title: "Value Investing for Women",
        subtitle: "A must-read for financial independence",
        description: "A must-read for all women who wish to juggle their career, marriage, children, and financial freedom. Learn how to generate passive income and build a million-dollar net worth.",
        coverImage: "/src/assets/value-investing-women-cover.png",
        amazonUrl: "https://www.amazon.com/Value-Investing-Women-Pauline-Teo-ebook/dp/B09HQ12ZSG",
        badges: ["3rd Reprint"],
        genre: "Finance",
        kindlePrice: "$6.99",
        pages: 180,
        rating: 4.6,
        reviewCount: 28,
      },
      {
        slug: "invest-like-buffett",
        title: "Invest Like Buffett: Value Investing for Parents",
        subtitle: "Warren Buffett's principles for families",
        description: "Learn Warren Buffett's value investing principles and teach your children the path to financial freedom from an early age.",
        coverImage: "/src/assets/invest-like-buffett-cover.jpg",
        amazonUrl: "https://www.amazon.com/Invest-Like-Buffett-Investing-Parents-ebook/dp/B09HPZVYDP",
        badges: ["3rd Reprint"],
        genre: "Finance",
        kindlePrice: "$6.99",
        pages: 160,
        rating: 4.5,
        reviewCount: 22,
      },
    ],
    genres: ["Personal Development", "Finance", "Self-Help"],
    websiteUrl: "https://www.paulineteo.com/",
    linkedinUrl: "https://www.linkedin.com/in/paulineteo/",
    amazonAuthorUrl: "https://www.amazon.com/stores/Pauline-Teo/author/B0G9VQKXS2",
    
    badge: "ab-verified",
    services: ["Speaking", "Coaching", "Courses"],
  },
  {
    slug: "felicia-tan",
    name: "Felicia Tan",
    photo: "/src/assets/felicia-tan.png",
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
        coverImage: "/src/assets/to-baby-with-love-cover.jpg",
        amazonUrl: "https://www.amazon.com/dp/B0DKWG8Y85",
        badges: ["#1 Best Seller"],
        genre: "Memoir",
        kindlePrice: "$0.99",
        paperbackPrice: "$12.99",
        pages: 128,
        rating: 5.0,
        reviewCount: 35,
      },
      {
        slug: "lost-and-found",
        title: "Lost And Found",
        subtitle: "A Mother's Memoir on Finding Faith Through Loss",
        description: "The story of twin sons, Cervical Incompetence, and finding faith, peace, and hope through unimaginable loss. Features expert contributions and real stories from other mothers.",
        coverImage: "/src/assets/lost-and-found-cover.jpg",
        amazonUrl: "https://artoflife.sg/product/lost-and-found-book/?v=1fdc0f893412",
        badges: [],
        genre: "Memoir",
        kindlePrice: "$9.99",
        paperbackPrice: "$16.90",
        pages: 196,
        rating: 4.7,
        reviewCount: 18,
      },
      {
        slug: "a-gift-from-heaven",
        title: "A Gift From Heaven",
        subtitle: "A Mother's Search for Her Rainbow Baby After the Storms",
        description: "A miracle pregnancy after 10 years of marriage — conceived naturally after multiple losses. A mother's tale of faith, perseverance, and being rewarded with a rainbow baby.",
        coverImage: "/src/assets/a-gift-from-heaven-cover.jpg",
        amazonUrl: "https://artoflife.sg/product/a-gift-from-heaven-book/?v=1fdc0f893412",
        badges: [],
        genre: "Memoir",
        kindlePrice: "$9.99",
        paperbackPrice: "$16.90",
        pages: 184,
        rating: 4.8,
        reviewCount: 15,
      },
    ],
    genres: ["Memoir", "Parenting", "Self-Help"],
    websiteUrl: "https://artoflife.sg/",
    linkedinUrl: "https://www.linkedin.com/in/feliciadesigner/",
    
    badge: "featured",
    services: ["Speaking", "Coaching"],
  },
  {
    slug: "robert-battista",
    name: "Robert J. Battista",
    photo: "/src/assets/bob-battista.jpg",
    title: "Best Selling Author & Healthtech AI Thought Leader",
    bio: "Bob Battista is a writer, strategist, and technology executive focused on how emerging forms of intelligence should be designed, governed, and lived with responsibly. He is the founder of KEFI, a philosophy and framework for governed intelligence, and the builder behind TripSit.ai, We-Health.ai, 2percent.ai, Yassu.ai, and Salt.ai — platforms that apply this framework to pharma, healthcare, and enterprise. Across his career, he has worked at the intersection of technology, healthcare, data, and organizational decision-making, helping institutions navigate moments when new tools outpace existing norms.",
    shortBio: "Founder of KEFI and builder of 5 AI platforms transforming pharma and healthcare. His debut book hit #1 New Release and Best Seller on Amazon.",
    credentials: ["AI Thought Leader", "Technology Executive", "KEFI Founder", "Published Author"],
    books: [
      {
        slug: "hemispheric-intelligence",
        title: "Hemispheric Intelligence",
        subtitle: "AI Done Right (and Left)",
        description: "A work of architectural thinking about the future of intelligence. As AI moves from tools to infrastructure, the challenge is no longer whether machines can think, but how intelligence itself should be structured when consequences are real and irreversible.",
        coverImage: "/src/assets/hemispheric-intelligence-cover.png",
        amazonUrl: "https://a.co/d/gxEmLou",
        badges: ["#1 New Release", "Best Seller"],
        genre: "Technology",
        kindlePrice: "$0.99",
        paperbackPrice: "$6.99",
        pages: 312,
        rating: 4.7,
        reviewCount: 31,
      },
    ],
    genres: ["Technology", "AI", "Philosophy"],
    websiteUrl: "https://www.bbattista.com/",
    linkedinUrl: "https://www.linkedin.com/in/bob-battista-ceo/",
    amazonAuthorUrl: "https://www.amazon.com/stores/author/B0GFXBRXH2",
    badge: "ab-verified",
    services: ["Speaking", "Consulting"],
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
