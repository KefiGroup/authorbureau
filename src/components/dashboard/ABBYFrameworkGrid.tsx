import { ChevronRight } from "lucide-react";

interface FrameworkProduct {
  label: string;
  section: string;
  active: boolean;
  comingSoon?: boolean;
}

interface FrameworkCategory {
  step: number;
  letter: string;
  subtitle: string;
  title: string;
  badgeColor: string;
  products: FrameworkProduct[];
}

const FRAMEWORK: FrameworkCategory[] = [
  {
    step: 1,
    letter: "A",
    subtitle: "AUTOMATE",
    title: "Digital Products",
    badgeColor: "bg-blue-500",
    products: [
      { label: "Online Courses", section: "courses", active: false },
      { label: "Workbooks", section: "workbooks", active: false, comingSoon: true },
      { label: "Webinars", section: "webinars", active: false, comingSoon: true },
      { label: "Social Media", section: "social-media", active: false, comingSoon: true },
      { label: "Audio Book", section: "audiobook", active: false, comingSoon: true },
      { label: "Home Study Courses", section: "home-study", active: false, comingSoon: true },
      { label: "Monthly Memberships", section: "memberships", active: false, comingSoon: true },
      { label: "Upsells / Downsells", section: "upsells", active: false, comingSoon: true },
      { label: "Affiliates", section: "affiliates", active: false, comingSoon: true },
      { label: "Website", section: "website", active: false, comingSoon: true },
    ],
  },
  {
    step: 2,
    letter: "B",
    subtitle: "BUILD",
    title: "Coaching & Consulting",
    badgeColor: "bg-amber-500",
    products: [
      { label: "1-on-1 Coaching", section: "coaching", active: false },
      { label: "Group Coaching", section: "group-coaching", active: false, comingSoon: true },
      { label: "Big Ticket", section: "big-ticket", active: false, comingSoon: true },
      { label: "Revenue Sharing", section: "revenue-sharing", active: false, comingSoon: true },
    ],
  },
  {
    step: 3,
    letter: "B",
    subtitle: "BROADCAST",
    title: "Speaking",
    badgeColor: "bg-rose-400",
    products: [
      { label: "Speaking Topics", section: "speaking", active: false },
      { label: "Podcasts", section: "podcast", active: false, comingSoon: true },
      { label: "Book Sales", section: "book-sales", active: false, comingSoon: true },
      { label: "JVs", section: "jvs", active: false, comingSoon: true },
      { label: "Fund Raising", section: "fundraising", active: false, comingSoon: true },
      { label: "In-House Speaker", section: "in-house", active: false, comingSoon: true },
    ],
  },
  {
    step: 4,
    letter: "Y",
    subtitle: "YIELD",
    title: "Seminars & Events",
    badgeColor: "bg-emerald-500",
    products: [
      { label: "Retreats & Bootcamps", section: "retreats", active: false, comingSoon: true },
      { label: "Certification", section: "certification", active: false, comingSoon: true },
      { label: "Masterminds", section: "masterminds", active: false, comingSoon: true },
      { label: "Conventions", section: "conventions", active: false, comingSoon: true },
      { label: "Training Programs", section: "training", active: false, comingSoon: true },
      { label: "Conferences", section: "conferences", active: false, comingSoon: true },
      { label: "Exhibitors / JV", section: "exhibitors", active: false, comingSoon: true },
    ],
  },
];

interface Props {
  isPremium: boolean;
  onNavigate?: (section: string) => void;
  onUpgrade: () => void;
}

export default function ABBYFrameworkGrid({ isPremium, onNavigate, onUpgrade }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {FRAMEWORK.map((cat) => {
        const liveCount = cat.products.filter((p) => p.active).length;
        return (
          <button
            key={cat.step}
            type="button"
            onClick={() => {
              if (!isPremium) {
                onUpgrade();
              } else {
                onNavigate?.(cat.products[0].section);
              }
            }}
            className="rounded-2xl border border-border bg-card p-6 text-left transition-all hover:shadow-[var(--shadow-card-hover)] hover:border-secondary/40 cursor-pointer group relative"
          >
            {/* Step badge + header */}
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-lg shrink-0 ${cat.badgeColor}`}>
                {cat.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold uppercase tracking-wider ${
                  cat.step === 1 ? "text-blue-600" :
                  cat.step === 2 ? "text-amber-600" :
                  cat.step === 3 ? "text-rose-500" :
                  "text-emerald-600"
                }`}>
                  {cat.letter} · {cat.subtitle}
                </p>
                <h3 className="font-heading text-lg font-bold mt-0.5">{cat.title}</h3>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-secondary transition-colors shrink-0 mt-1" />
            </div>

            {/* Product count + live */}
            <div className="flex items-center gap-3 mt-4">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                cat.step === 1 ? "bg-blue-100 text-blue-700" :
                cat.step === 2 ? "bg-amber-100 text-amber-700" :
                cat.step === 3 ? "bg-rose-100 text-rose-600" :
                "bg-emerald-100 text-emerald-700"
              }`}>
                {cat.products.length} products
              </span>
              {liveCount > 0 && (
                <span className="text-xs font-medium text-emerald-600">{liveCount} live</span>
              )}
            </div>

            {/* Status dots */}
            <div className="flex items-center gap-1.5 mt-3">
              {cat.products.map((product, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    product.active
                      ? cat.step === 1 ? "bg-blue-500" :
                        cat.step === 2 ? "bg-amber-500" :
                        cat.step === 3 ? "bg-rose-400" :
                        "bg-emerald-500"
                      : "bg-muted-foreground/20"
                  }`}
                  title={product.label}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
