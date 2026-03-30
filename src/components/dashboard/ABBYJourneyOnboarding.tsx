import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  onComplete: (selectedPath?: string) => void;
}

const STEPS = [
  { id: "hero", label: "Your Book Is More Than a Book" },
  { id: "flow", label: "28 Revenue Streams" },
  { id: "comparison", label: "Know Your Products" },
  { id: "start", label: "Start Your Analysis" },
];

/* ─── Accordion for Step 3 ─── */
function ComparisonAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  const sections = [
    {
      title: "Workbook vs. Home Study vs. Online Course — What's the Difference?",
      items: [
        { name: "Workbook", desc: "A downloadable PDF exercise book ($19-$47). Think of it like a homework packet." },
        { name: "Home Study", desc: "A self-paced multimedia kit — videos + worksheets + templates ($97-$497). Think of it like a box set." },
        { name: "Online Course", desc: "A structured learning experience with modules, quizzes, and community ($97-$997). Think of it like a semester of school." },
      ],
    },
    {
      title: "1-on-1 Coaching vs. Group Coaching vs. Mastermind — What's the Difference?",
      items: [
        { name: "1-on-1 Coaching", desc: "Private sessions with one client ($150-$500/hr). Like a personal trainer." },
        { name: "Group Coaching", desc: "One coach, 10-30 students in live group calls ($97-$497/mo). Like a group fitness class." },
        { name: "Mastermind", desc: "A peer group of 5-12 high-achievers who meet regularly ($5K-$25K/yr). Like a private advisory board." },
      ],
    },
    {
      title: "Keynote vs. In-House Speaker vs. Training Program — What's the Difference?",
      items: [
        { name: "In-House Speaker", desc: "A customized presentation for a company's team ($2K-$10K). Like a corporate workshop." },
        { name: "Training Program", desc: "A multi-session skills program for organizations ($5K-$50K). Like a corporate university course." },
      ],
    },
  ];

  return (
    <div className="space-y-2">
      {sections.map((section, i) => (
        <div key={i} className="rounded-lg border border-[#E8D5A8]/40 bg-[#FAF3E0]/30 overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#1A1F36] hover:bg-[#FAF3E0]/50 transition-colors"
          >
            {section.title}
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {section.items.map((item) => (
                    <div key={item.name} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mt-2 shrink-0" />
                      <div>
                        <span className="font-semibold text-sm text-[#1A1F36]">{item.name}:</span>{" "}
                        <span className="text-sm text-[#1A1F36]/70">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

/* ─── Path Card ─── */
function PathCard({
  title, subtitle, description, revenue, time, buttonLabel, borderColor, buttonColor, badge, onClick,
}: {
  title: string; subtitle: string; description: string; revenue: string; time: string;
  buttonLabel: string; borderColor: string; buttonColor: string; badge?: string; onClick: () => void;
}) {
  return (
    <div className={`relative rounded-xl border-2 p-5 bg-white flex flex-col gap-3 hover:shadow-lg transition-shadow`} style={{ borderColor }}>
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: borderColor }}>
          {badge}
        </span>
      )}
      <h4 className="font-bold text-base text-[#1A1F36]">{title}</h4>
      <p className="text-xs font-semibold text-[#1A1F36]/60">{subtitle}</p>
      <p className="text-sm text-[#1A1F36]/70 leading-relaxed">{description}</p>
      <div className="mt-auto space-y-1 pt-2">
        <p className="text-xs font-semibold text-[#C9A84C]">{revenue}</p>
        <p className="text-[11px] text-[#1A1F36]/50">{time}</p>
      </div>
      <Button
        onClick={onClick}
        className="w-full text-sm font-semibold text-white mt-2"
        style={{ backgroundColor: buttonColor }}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

/* ─── Zoomable Image ─── */
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg cursor-zoom-in"
        onClick={() => setZoomed(true)}
      />
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setZoomed(false)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={src}
              alt={alt}
              className="max-w-full max-h-full rounded-lg"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Main Component ─── */
export default function ABBYJourneyOnboarding({ userId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const dismiss = useCallback(async (selectedPath?: string) => {
    // Mark as seen in DB
    await supabase
      .from("author_profiles")
      .update({ has_seen_journey_onboarding: true } as any)
      .eq("user_id", userId);
    onComplete(selectedPath);
    // If a plan was selected, navigate to subscription flow
    if (selectedPath) {
      navigate(`/dashboard?section=subscription&plan=${selectedPath}`);
    }
  }, [userId, onComplete, navigate]);

  const next = () => setStep((s) => Math.min(s + 1, 3));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-[#1A1F36]/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#E8D5A8]/30 bg-[#FAF3E0]/30">
          <span className="text-xs font-semibold text-[#1A1F36]/50">Step {step + 1} of 4</span>
          <button onClick={() => dismiss()} className="text-[#1A1F36]/40 hover:text-[#1A1F36] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              {step === 0 && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <h2 className="font-bold text-2xl text-[#1A1F36]">
                      Congratulations! Your Book Is the Foundation of a Business Empire
                    </h2>
                    <p className="text-sm text-[#1A1F36]/60 max-w-lg mx-auto">
                      Most authors stop at the book. You're about to discover 28 ways to monetize your expertise.
                    </p>
                  </div>
                  <img src="/images/journey-staircase.webp" alt="ABBY Journey Staircase" className="w-full rounded-lg" loading="lazy" />
                  <CopyrightCaption />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <h2 className="font-bold text-2xl text-[#1A1F36]">
                      One Book. 28 Revenue Streams. Your Empire.
                    </h2>
                    <p className="text-sm text-[#1A1F36]/60 max-w-lg mx-auto">
                      Every stream feeds into the others. Abby builds them all for you.
                    </p>
                  </div>
                  <ZoomableImage src="/images/journey-flow-diagram.webp" alt="28 Revenue Streams Flow Diagram" />
                  <CopyrightCaption />
                  <div className="rounded-lg bg-[#FAF3E0] border border-[#E8D5A8]/40 p-4 text-center">
                    <p className="text-sm text-[#1A1F36]/70 leading-relaxed">
                      Don't worry — you don't need to understand all 28 right now.<br />
                      <span className="font-semibold text-[#1A1F36]">Abby will guide you step by step, starting with the easiest wins.</span>
                    </p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <h2 className="font-bold text-2xl text-[#1A1F36]">
                      What's the Difference? A Simple Guide
                    </h2>
                    <p className="text-sm text-[#1A1F36]/60 max-w-lg mx-auto">
                      Authors often confuse similar products. Here's a plain-English breakdown.
                    </p>
                  </div>
                  <img src="/images/journey-comparison.webp" alt="Product Comparison Guide" className="w-full rounded-lg" loading="lazy" />
                  <CopyrightCaption />
                  <ComparisonAccordion />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <h2 className="font-bold text-2xl text-[#1A1F36]">
                      Let Abby Analyze Your Book First
                    </h2>
                    <p className="text-sm text-[#1A1F36]/60 max-w-lg mx-auto">
                      Before choosing a path, let Abby read your manuscript, build your free microsite, and create a personalized business plan. Then you'll know exactly which revenue streams are right for you.
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-[#C9A84C] bg-[#FAF3E0]/50 p-6 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mx-auto">
                      <span className="text-3xl">🧠</span>
                    </div>
                    <h3 className="font-bold text-lg text-[#1A1F36]">Your Personalized Roadmap Awaits</h3>
                    <div className="space-y-2 text-sm text-[#1A1F36]/70 max-w-md mx-auto">
                      <p>✅ Abby reads your manuscript & extracts your frameworks</p>
                      <p>✅ Builds your free author microsite & directory listing</p>
                      <p>✅ Creates a tailored business plan with revenue projections</p>
                      <p>✅ Recommends your ideal Build → Build Channels → Yield path</p>
                    </div>
                    <Button
                      onClick={() => {
                        dismiss();
                        navigate("/dashboard?section=analyze");
                      }}
                      className="bg-[#C9A84C] text-white hover:bg-[#B8963B] text-base font-semibold px-8 py-3 mt-2"
                    >
                      Start My ABBY Analysis →
                    </Button>
                  </div>
                  <p className="text-[10px] text-[#1A1F36]/40 text-center leading-relaxed">
                    After your analysis, Abby will recommend the right subscription path based on your goals, genre, and audience size.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8D5A8]/30 bg-[#FAF3E0]/20">
          {/* Progress dots */}
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-[#C9A84C]" : "bg-[#C9A84C]/20"}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => dismiss()} className="text-xs text-[#1A1F36]/40 hover:text-[#1A1F36]/70 transition-colors">
              I'll explore later
            </button>
            {step < 3 ? (
              <Button
                onClick={next}
                className="bg-[#C9A84C] text-white hover:bg-[#B8963B] text-sm font-semibold px-5"
              >
                {step === 0 ? "Show Me How" : step === 1 ? "What's the Difference Between Them?" : "Let's Get Started"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => dismiss()}
                className="bg-[#C9A84C] text-white hover:bg-[#B8963B] text-sm font-semibold px-5"
              >
                Take Me to My Dashboard
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
