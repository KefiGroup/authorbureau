import { useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

interface ProductTab {
  label: string;
  icon: string;
  route: string;
}

interface BookProductNavProps {
  authorSlug: string;
  bookSlug: string;
  products: ProductTab[];
  vars: {
    cardBg: string;
    cardBorder: string;
    bodyText: string;
    secondaryBg: string;
    accent: string;
    accentText: string;
  };
  bodyFont: string;
}

const PRODUCT_TYPE_META: Record<string, { icon: string; label: string }> = {
  homestudy: { icon: "🏠", label: "Home Study" },
  onlinecourse: { icon: "🎓", label: "Online Course" },
  coaching: { icon: "🎯", label: "Coaching" },
  group_coaching: { icon: "👥", label: "Group Coaching" },
  audiobook: { icon: "🎧", label: "Audiobook" },
  podcast: { icon: "🎙", label: "Podcast" },
  workbook: { icon: "📝", label: "Workbook" },
  webinar: { icon: "💻", label: "Webinar" },
  membership: { icon: "🔑", label: "Membership" },
  coaching_membership: { icon: "🔑", label: "Coaching Membership" },
  consulting: { icon: "💼", label: "Consulting" },
  speaking: { icon: "🎤", label: "Speaking" },
  keynote: { icon: "🎤", label: "Keynote" },
  mastermind: { icon: "🧠", label: "Mastermind" },
  retreat: { icon: "🏔", label: "Retreat" },
  bootcamp: { icon: "🏔", label: "Bootcamp" },
  certification: { icon: "🏆", label: "Certification" },
  training: { icon: "📋", label: "Training" },
  special_edition: { icon: "✨", label: "Special Edition" },
  convention: { icon: "🎪", label: "Convention" },
  big_ticket: { icon: "💎", label: "Big Ticket" },
};

export function getProductTabMeta(type: string): { icon: string; label: string } {
  return PRODUCT_TYPE_META[type] || { icon: "📦", label: type };
}

export default function BookProductNav({
  authorSlug,
  bookSlug,
  products,
  vars: v,
  bodyFont,
}: BookProductNavProps) {
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  const bookPath = `/${authorSlug}/${bookSlug}`;
  const currentPath = location.pathname;

  // Auto-scroll active tab into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [currentPath]);

  if (products.length === 0) return null;

  const allTabs = [
    { label: "The Book", icon: "📖", route: bookPath },
    ...products.map((p) => ({
      ...p,
      route: `${bookPath}/${p.route}`,
    })),
  ];

  return (
    <div
      className="sticky z-[90] w-full"
      style={{
        top: "56px",
        background: v.cardBg,
        borderTop: `1px solid ${v.cardBorder}`,
        borderBottom: `1px solid ${v.cardBorder}`,
        fontFamily: bodyFont,
      }}
    >
      <div
        ref={scrollRef}
        className="container max-w-7xl flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-none"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {allTabs.map((tab) => {
          const isActive = currentPath === tab.route || currentPath === tab.route + "/";
          return (
            <Link
              key={tab.route}
              ref={isActive ? activeRef : undefined}
              to={tab.route}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.85rem] font-medium transition-all whitespace-nowrap"
              style={{
                scrollSnapAlign: "center",
                background: isActive ? v.accent : "transparent",
                color: isActive ? v.accentText : v.bodyText,
                fontWeight: isActive ? 700 : 500,
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = v.secondaryBg;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
