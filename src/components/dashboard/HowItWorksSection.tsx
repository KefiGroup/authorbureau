import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp } from "lucide-react";

const STAIRCASE_IMAGE = "/images/journey-staircase.webp";
const FLOW_DIAGRAM_IMAGE = "/images/journey-flow-diagram.webp";
const COMPARISON_IMAGE = "/images/journey-comparison.webp";
const THREE_PATHS_IMAGE = "/images/journey-three-paths.webp";

const sections = [
  {
    title: "The Journey: FREE → BRAND → BUILD → YIELD",
    description: "Your book is the foundation. Each tier unlocks more revenue streams, building on the last.",
    image: STAIRCASE_IMAGE,
  },
  {
    title: "How Your 28 Revenue Streams Connect",
    description: "Every stream feeds into the others. Abby builds them all for you, step by step.",
    image: FLOW_DIAGRAM_IMAGE,
  },
  {
    title: "Know Your Products",
    description: "Authors often confuse similar products. Here's a plain-English breakdown.",
    image: COMPARISON_IMAGE,
  },
  {
    title: "Choose Your Path",
    description: "Start where you are. Upgrade when you're ready.",
    image: THREE_PATHS_IMAGE,
  },
];

const accordionData = [
  {
    title: "Workbook vs. Home Study vs. Online Course",
    items: [
      { term: "Workbook", desc: "A downloadable PDF exercise book ($19–$47). Think of it like a homework packet." },
      { term: "Home Study", desc: "A self-paced multimedia kit — videos + worksheets + templates ($97–$497). Think of it like a box set." },
      { term: "Online Course", desc: "A structured learning experience with modules, quizzes, and community ($97–$997). Think of it like a semester of school." },
    ],
  },
  {
    title: "1-on-1 Coaching vs. Group Coaching vs. Mastermind",
    items: [
      { term: "1-on-1 Coaching", desc: "Private sessions with one client ($150–$500/hr). Like a personal trainer." },
      { term: "Group Coaching", desc: "One coach, 10–30 students in live group calls ($97–$497/mo). Like a group fitness class." },
      { term: "Mastermind", desc: "A peer group of 5–12 high-achievers who meet regularly ($5K–$25K/yr). Like a private advisory board." },
    ],
  },
  {
    title: "Keynote vs. In-House Speaker vs. Training Program",
    items: [
      { term: "In-House Speaker", desc: "A customized presentation for a company's team ($2K–$10K). Like a corporate workshop." },
      { term: "Training Program", desc: "A multi-session skills program for organizations ($5K–$50K). Like a corporate university course." },
    ],
  },
];

export default function HowItWorksSection() {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">How It Works</h1>
        <p className="text-muted-foreground mt-1">Your complete guide to the ABBY Journey Framework and 28 revenue streams.</p>
      </div>

      {sections.map((s, i) => (
        <section key={i} className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
          <p className="text-sm text-muted-foreground">{s.description}</p>
          <button onClick={() => setLightbox(s.image)} className="block w-full">
            <img
              src={s.image}
              alt={s.title}
              className="w-full rounded-xl border border-border cursor-zoom-in hover:shadow-lg transition-shadow"
              loading="lazy"
            />
          </button>
          <p className="text-[10px] text-muted-foreground text-right mt-1">© Authors Bureau. All rights reserved.</p>

          {/* Accordion for "Know Your Products" section */}
          {i === 2 && (
            <div className="space-y-2 pt-2">
              {accordionData.map((acc, ai) => (
                <div key={ai} className="rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === ai ? null : ai)}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <span>{acc.title}</span>
                    {openAccordion === ai ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <AnimatePresence>
                    {openAccordion === ai && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2">
                          {acc.items.map((item, ii) => (
                            <div key={ii} className="text-sm">
                              <span className="font-semibold text-foreground">{item.term}:</span>{" "}
                              <span className="text-muted-foreground">{item.desc}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 rounded-full bg-background/80 p-2 text-foreground hover:bg-background transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox}
              alt="Journey diagram"
              className="max-w-full max-h-[90vh] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
