import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Send } from "lucide-react";

interface Choice {
  letter: string;
  text: string;
}

interface Props {
  choices: Choice[];
  multiSelect?: boolean;
  onSubmit: (selected: string) => void;
  disabled?: boolean;
}

/**
 * Parses lettered choice options from an assistant message.
 * Matches patterns like:
 *   • A) text / B) text
 *   • A. text / B. text  
 *   • - A) text
 *   • * A) text
 * Returns null if no choices found.
 */
export function parseChoices(content: string): { choices: Choice[]; multiSelect: boolean } | null {
  // Try lettered patterns first: A) text, A. text, - A) text, • A) text
  const letterRegex = /(?:^|\n)\s*(?:[-•*]\s*)?([A-Z])\s*[).]\s*(.+)/g;
  const choices: Choice[] = [];
  let match;
  while ((match = letterRegex.exec(content)) !== null) {
    const letter = match[1];
    const text = match[2].replace(/\*\*/g, "").replace(/\[STOP\]/g, "").trim();
    if (text && !choices.find(c => c.letter === letter)) {
      choices.push({ letter, text });
    }
  }
  if (choices.length >= 2) {
    return { choices, multiSelect: detectMultiSelect(content) };
  }

  // Try numbered emoji patterns: 1️⃣ text, 2️⃣ text, or • 1️⃣ text
  const emojiNumRegex = /(?:^|\n)\s*(?:[-•*]\s*)?([1-9])\uFE0F?\u20E3\s*(.+)/g;
  while ((match = emojiNumRegex.exec(content)) !== null) {
    const letter = match[1];
    const text = match[2].replace(/\*\*/g, "").replace(/\[STOP\]/g, "").trim();
    if (text && !choices.find(c => c.letter === letter)) {
      choices.push({ letter, text });
    }
  }
  if (choices.length >= 2) {
    return { choices, multiSelect: detectMultiSelect(content) };
  }

  // Try plain numbered patterns: 1) text, 1. text, - 1) text
  const numRegex = /(?:^|\n)\s*(?:[-•*]\s*)?(\d+)\s*[).]\s*(.+)/g;
  while ((match = numRegex.exec(content)) !== null) {
    const letter = match[1];
    const text = match[2].replace(/\*\*/g, "").replace(/\[STOP\]/g, "").trim();
    if (text && !choices.find(c => c.letter === letter)) {
      choices.push({ letter, text });
    }
  }
  if (choices.length >= 2) {
    return { choices, multiSelect: detectMultiSelect(content) };
  }

  return null;
}

/** Detect if the question asks for single or multiple selection */
function detectMultiSelect(content: string): boolean {
  const lower = content.toLowerCase();
  // Single-select signals
  if (/pick one[^a-z]|choose one[^a-z]|select one[^a-z]|pick one\b/i.test(lower)) return false;
  if (/which one\b/i.test(lower)) return false;
  // Multi-select signals
  if (/pick .*(all|multiple|any)|select .*(all|multiple|any)|choose .*(all|multiple|any)/i.test(lower)) return true;
  if (/one or more/i.test(lower)) return true;
  // Default to single select
  return false;
}

export default function ChatChoiceButtons({ choices, multiSelect = true, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (letter: string) => {
    if (disabled) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0 || disabled) return;
    const sorted = [...selected].sort();
    if (sorted.length === 1) {
      const choice = choices.find(c => c.letter === sorted[0]);
      onSubmit(`${sorted[0]}${choice ? ` — ${choice.text}` : ""}`);
    } else {
      const labels = sorted.map(l => {
        const c = choices.find(ch => ch.letter === l);
        return c ? `${l}) ${c.text}` : l;
      });
      onSubmit(labels.join(", "));
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
        👆 Click to select {multiSelect ? "(pick one or more)" : "(pick one)"}
      </p>
      <div className="grid gap-2">
        {choices.map((choice) => {
          const isSelected = selected.has(choice.letter);
          return (
            <button
              key={choice.letter}
              onClick={() => toggle(choice.letter)}
              disabled={disabled}
              className={`
                flex items-center gap-3 text-left rounded-xl px-4 py-3 text-sm transition-all border
                ${isSelected
                  ? "border-secondary bg-secondary/10 ring-1 ring-secondary/30 shadow-sm"
                  : "border-border bg-background hover:border-secondary/40 hover:bg-secondary/5"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <span className={`
                flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors
                ${isSelected
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
                }
              `}>
                {isSelected ? <Check className="h-3.5 w-3.5" /> : choice.letter}
              </span>
              <span className="flex-1 leading-snug">{choice.text}</span>
            </button>
          );
        })}
      </div>
      {selected.size > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full gap-2 mt-2"
          size="sm"
        >
          <Send className="h-3.5 w-3.5" />
          Send {selected.size === 1 ? "Selection" : `${selected.size} Selections`}
        </Button>
      )}
    </div>
  );
}
