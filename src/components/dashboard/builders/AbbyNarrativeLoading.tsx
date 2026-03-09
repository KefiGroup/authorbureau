import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BookOpen, Search, BarChart3, Lightbulb, Wand2, CheckCircle2 } from "lucide-react";

interface Props {
  messages: string[];
  builderLabel: string;
  bookTitle: string;
  onComplete?: () => void;
}

const ICONS = [BookOpen, Search, Lightbulb, BarChart3, Wand2, Sparkles, CheckCircle2];

export default function AbbyNarrativeLoading({ messages, builderLabel, bookTitle, onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);

  // Each message stays for ~3s, then transitions
  useEffect(() => {
    if (currentIdx >= messages.length) {
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => {
      setCompleted(prev => [...prev, currentIdx]);
      setCurrentIdx(prev => prev + 1);
    }, 3000 + Math.random() * 1500); // 3-4.5s per step for natural feel
    return () => clearTimeout(timer);
  }, [currentIdx, messages.length, onComplete]);

  const progress = Math.min(((currentIdx) / messages.length) * 100, 100);

  return (
    <div className="max-w-lg mx-auto py-8">
      {/* Abby avatar + title */}
      <div className="text-center mb-8">
        <motion.div
          className="w-16 h-16 rounded-2xl bg-secondary/15 flex items-center justify-center mx-auto mb-4"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="h-8 w-8 text-secondary" />
        </motion.div>
        <h3 className="font-heading text-lg font-bold mb-1">Abby is building your {builderLabel}</h3>
        <p className="text-xs text-muted-foreground">
          Analyzing <span className="font-medium text-foreground">"{bookTitle}"</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full mb-8 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-secondary to-secondary/70 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Message list with animated states */}
      <div className="space-y-3">
        {messages.map((msg, idx) => {
          const isComplete = completed.includes(idx);
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;
          const Icon = ICONS[idx % ICONS.length];

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: isPending ? 0.3 : 1,
                y: 0,
              }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                isCurrent
                  ? "bg-secondary/10 border border-secondary/20"
                  : isComplete
                  ? "bg-accent/5"
                  : "bg-transparent"
              }`}
            >
              <div className="shrink-0">
                {isComplete ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center"
                  >
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                  </motion.div>
                ) : isCurrent ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center"
                  >
                    <Icon className="h-3.5 w-3.5 text-secondary" />
                  </motion.div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <p className={`text-sm ${
                isCurrent ? "text-foreground font-medium" : isComplete ? "text-muted-foreground" : "text-muted-foreground/40"
              }`}>
                {msg}
                {isCurrent && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block ml-0.5"
                  >
                    ...
                  </motion.span>
                )}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Fun fact at the bottom */}
      <AnimatePresence mode="wait">
        {currentIdx >= 2 && currentIdx < messages.length && (
          <motion.p
            key={currentIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-[10px] text-muted-foreground/50 mt-8 italic"
          >
            {currentIdx % 2 === 0
              ? "Abby has analyzed 10,000+ manuscripts to perfect her recommendations"
              : "Authors who follow Abby's plan earn 3-5x more from their books"}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
