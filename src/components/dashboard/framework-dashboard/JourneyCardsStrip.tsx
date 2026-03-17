import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X, Eye, EyeOff } from "lucide-react";

const CARDS = [
  {
    image: "/images/journey-staircase.png",
    label: "The Journey",
    subtitle: "FREE → BRAND → BUILD → YIELD",
  },
  {
    image: "/images/journey-flow-diagram.png",
    label: "How It Connects",
    subtitle: "28 streams, one ecosystem",
  },
  {
    image: "/images/journey-comparison.png",
    label: "Know Your Products",
    subtitle: "What's the difference?",
  },
  {
    image: "/images/journey-three-paths.png",
    label: "Choose Your Path",
    subtitle: "Side Hustler · Serious · Enterprise",
  },
];

const VISIT_KEY = "abby_journey_strip_visits";

export default function JourneyCardsStrip() {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("abby_journey_strip_hidden") === "true"; } catch { return false; }
  });
  const [visitCount, setVisitCount] = useState(0);

  useEffect(() => {
    try {
      const v = parseInt(localStorage.getItem(VISIT_KEY) || "0", 10);
      setVisitCount(v);
      localStorage.setItem(VISIT_KEY, String(v + 1));
    } catch { /* ignore */ }
  }, []);

  const showNewBadge = visitCount < 3;

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("abby_journey_strip_hidden", String(next)); } catch { /* */ }
      return next;
    });
  }, []);

  if (collapsed) {
    return (
      <button
        onClick={toggleCollapsed}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <Eye className="h-3.5 w-3.5" />
        Show Your Author Business Journey
      </button>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-base text-foreground">Your Author Business Journey</h3>
            {showNewBadge && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/25">
                NEW
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/how-it-works"
              className="text-xs text-[#C9A84C] hover:underline font-medium hidden sm:inline-flex items-center gap-1"
            >
              View Full Guide <ChevronRight className="h-3 w-3" />
            </a>
            <button
              onClick={toggleCollapsed}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Hide section"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Horizontal scrollable cards */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
          {CARDS.map((card, i) => (
            <motion.button
              key={i}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLightboxIdx(i)}
              className="snap-start shrink-0 w-[200px] rounded-xl border border-border bg-card overflow-hidden text-left hover:border-[#C9A84C]/40 hover:shadow-md transition-all group"
            >
              <div className="relative h-[110px] overflow-hidden bg-muted">
                <img
                  src={card.image}
                  alt={card.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-foreground">{card.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{card.subtitle}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightboxIdx(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxIdx(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation arrows */}
            {lightboxIdx > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
            )}
            {lightboxIdx < CARDS.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={lightboxIdx}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={CARDS[lightboxIdx].image}
                alt={CARDS[lightboxIdx].label}
                className="w-full rounded-lg touch-pinch-zoom"
                style={{ touchAction: "pinch-zoom" }}
              />
              <div className="text-center mt-3">
                <p className="text-white font-semibold text-sm">{CARDS[lightboxIdx].label}</p>
                <p className="text-white/60 text-xs">{CARDS[lightboxIdx].subtitle}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
