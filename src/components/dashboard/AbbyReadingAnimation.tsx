import { motion, AnimatePresence } from "framer-motion";

interface Props {
  bookTitle: string;
  progress: number;
}

const READING_STAGES = [
  { threshold: 0, text: "Opening your manuscript...", emoji: "📖" },
  { threshold: 15, text: "Reading chapter by chapter...", emoji: "📚" },
  { threshold: 35, text: "Identifying your unique frameworks...", emoji: "🔍" },
  { threshold: 55, text: "Analyzing your methodology...", emoji: "🧠" },
  { threshold: 75, text: "Mapping business opportunities...", emoji: "💡" },
  { threshold: 90, text: "Preparing your strategic brief...", emoji: "✨" },
];

export default function AbbyReadingAnimation({ bookTitle, progress }: Props) {
  const currentStage = [...READING_STAGES].reverse().find(s => progress >= s.threshold) || READING_STAGES[0];

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] max-w-lg mx-auto text-center">
      <motion.div
        className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center text-3xl mb-6"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        👩‍💼
      </motion.div>
      <h2 className="font-heading text-xl font-bold mb-2">Abby is reading your book</h2>
      <p className="text-sm text-muted-foreground mb-6">"{bookTitle}"</p>
      <div className="w-full max-w-xs mb-4">
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-secondary to-secondary/70"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{Math.round(progress)}%</p>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStage.text}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <span className="text-lg">{currentStage.emoji}</span>
          <span>{currentStage.text}</span>
        </motion.div>
      </AnimatePresence>
      <p className="text-[11px] text-muted-foreground mt-8 max-w-sm">
        Abby reads your entire manuscript to understand your unique theories, frameworks, and methodology.
      </p>
    </div>
  );
}
