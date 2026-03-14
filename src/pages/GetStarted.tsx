import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Pen, BookOpen, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function GetStarted() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"author" | "reader" | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    const redirect = selected === "author" ? "/dashboard" : "/portal";
    navigate(`/auth?redirect=${encodeURIComponent(redirect)}&role=${selected}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4" style={{ background: "#0B1D3A" }}>
        <div className="max-w-3xl w-full">
          <motion.div initial="hidden" animate="visible" className="text-center mb-10">
            <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#C5A55A" }}>
              Step 1 of 2
            </motion.p>
            <motion.h1 variants={fadeUp} custom={1} className="font-heading text-3xl md:text-4xl font-bold text-white mb-3">
              Choose Your Path
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-white/70 text-lg max-w-lg mx-auto">
              How will you use Authors Bureau? You can always access both portals later.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" animate="visible" className="grid md:grid-cols-2 gap-5 mb-8">
            {/* Author Card */}
            <motion.button
              variants={fadeUp}
              custom={3}
              onClick={() => setSelected("author")}
              className={`text-left rounded-2xl p-7 border-2 transition-all duration-200 bg-background ${
                selected === "author"
                  ? "border-[#C5A55A] shadow-[0_0_20px_rgba(197,165,90,0.25)]"
                  : "border-transparent hover:border-border"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(197,165,90,0.12)" }}>
                  <Pen className="h-5 w-5" style={{ color: "#C5A55A" }} />
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground">I'm an Author</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                I want to write, publish, and monetize my book
              </p>
              <div className="space-y-2">
                {["AI Writing & Publishing Studio", "28 Revenue Stream Builders", "Branded Author Pages"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#C5A55A" }} />
                    {item}
                  </div>
                ))}
              </div>
              {selected === "author" && (
                <div className="mt-4 text-xs font-semibold flex items-center gap-1" style={{ color: "#C5A55A" }}>
                  <CheckCircle2 className="h-4 w-4" /> Selected
                </div>
              )}
            </motion.button>

            {/* Reader Card */}
            <motion.button
              variants={fadeUp}
              custom={4}
              onClick={() => setSelected("reader")}
              className={`text-left rounded-2xl p-7 border-2 transition-all duration-200 bg-background ${
                selected === "reader"
                  ? "border-[#4A9E8E] shadow-[0_0_20px_rgba(74,158,142,0.25)]"
                  : "border-transparent hover:border-border"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(74,158,142,0.12)" }}>
                  <BookOpen className="h-5 w-5" style={{ color: "#4A9E8E" }} />
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground">I'm a Reader</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                I want to discover books, take courses, and grow
              </p>
              <div className="space-y-2">
                {["Buy books & take courses", "Join coaching & memberships", "100-Day Reading Challenge"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#4A9E8E" }} />
                    {item}
                  </div>
                ))}
              </div>
              {selected === "reader" && (
                <div className="mt-4 text-xs font-semibold flex items-center gap-1" style={{ color: "#4A9E8E" }}>
                  <CheckCircle2 className="h-4 w-4" /> Selected
                </div>
              )}
            </motion.button>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5} className="text-center">
            <Button
              onClick={handleContinue}
              disabled={!selected}
              size="lg"
              className="rounded-full font-semibold text-base px-10 disabled:opacity-40"
              style={selected ? {
                backgroundColor: selected === "author" ? "#C5A55A" : "#4A9E8E",
                color: selected === "author" ? "#0B1D3A" : "white",
              } : undefined}
            >
              Continue to Sign Up <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-white/40 mt-3">
              Already have an account?{" "}
              <a href="/auth" className="text-white/60 hover:text-white underline">Sign in</a>
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
