import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Send, ArrowRight } from "lucide-react";

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
 * Parse ===CHOICE_SINGLE: Option A | Option B=== or ===CHOICE_MULTI: ... === markers.
 * Returns structured choices with auto-generated letters (A, B, C...).
 */
function parseMarkerChoices(content: string): { choices: Choice[]; multiSelect: boolean } | null {
  const singleMatch = content.match(/===CHOICE_SINGLE:\s*(.*?)\s*===/);
  const multiMatch = content.match(/===CHOICE_MULTI:\s*(.*?)\s*===/);

  const match = singleMatch || multiMatch;
  if (!match) return null;

  const options = match[1].split("|").map(o => o.trim()).filter(Boolean);
  if (options.length < 2) return null;

  const choices: Choice[] = options.map((text, i) => ({
    letter: String.fromCharCode(65 + i), // A, B, C...
    text: text.replace(/\*\*/g, "").trim(),
  }));

  return { choices, multiSelect: !!multiMatch };
}

/**
 * Parse ===NEXT: Button Label=== markers.
 * Returns the button label text, or null if not found.
 */
export function parseNextMarker(content: string): string | null {
  const match = content.match(/===NEXT:\s*(.*?)\s*===/);
  return match ? match[1].trim() : null;
}

/**
 * Parses lettered choice options from an assistant message.
 * First checks for ===CHOICE_SINGLE/MULTI:=== markers (v2.4 format).
 * Falls back to pattern matching: A) text, A. text, etc.
 */
export function parseChoices(content: string): { choices: Choice[]; multiSelect: boolean } | null {
  // v2.4 marker format takes priority
  const markerResult = parseMarkerChoices(content);
  if (markerResult) return markerResult;

  // Guardrail: don't convert proposal/plan content into clickable choices.
  // In Abby plan turns, numbered lists are content, not user options.
  const lower = content.toLowerCase();
  const looksLikeProposal = /(transformation promise|brand products|build authority|yield revenue|monetisation map|we(?:'|’)ll build in this order|part\s+\d+\s*[—-]|weeks?\s*\d)/i.test(content);
  const asksForSelection = /(pick one|choose one|select one|which option|which one|your choice|what do you want to choose|click to select)/i.test(lower);
  if (looksLikeProposal && !asksForSelection) return null;

  // Try lettered patterns: A) text, A. text, - A) text, • A) text
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
    return { choices, multiSelect: detectMultiSelect(content, choices) };
  }

  // Try numbered emoji patterns: 1️⃣ text, 2️⃣ text
  const emojiNumRegex = /(?:^|\n)\s*(?:[-•*]\s*)?([1-9])\uFE0F?\u20E3\s*(.+)/g;
  while ((match = emojiNumRegex.exec(content)) !== null) {
    const letter = match[1];
    const text = match[2].replace(/\*\*/g, "").replace(/\[STOP\]/g, "").trim();
    if (text && !choices.find(c => c.letter === letter)) {
      choices.push({ letter, text });
    }
  }
  if (choices.length >= 2) {
    return { choices, multiSelect: detectMultiSelect(content, choices) };
  }

  // Try plain numbered patterns — skip if there's a ===NEXT:=== or confirmation context
  const hasNextMarker = /===NEXT:/i.test(content);
  const hasConfirmationAtEnd = /ready\s*(for|to)\b/i.test(content.toLowerCase()) && content.includes("[STOP]");
  if (!hasConfirmationAtEnd && !hasNextMarker) {
    const numRegex = /(?:^|\n)\s*(?:[-•*]\s*)?(\d+)\s*[).]\s*(.+)/g;
    while ((match = numRegex.exec(content)) !== null) {
      const letter = match[1];
      const text = match[2].replace(/\*\*/g, "").replace(/\[STOP\]/g, "").trim();
      if (text && !choices.find(c => c.letter === letter)) {
        choices.push({ letter, text });
      }
    }
    if (choices.length >= 2) {
      return { choices, multiSelect: detectMultiSelect(content, choices) };
    }
  }

  return null;
}

/** Detect if the question asks for single or multiple selection */
function detectMultiSelect(content: string, choices: Choice[]): boolean {
  const lower = content.toLowerCase();
  if (/pick .*(all|multiple|any)|select .*(all|multiple|any)|choose .*(all|multiple|any)/i.test(lower)) return true;
  if (/one or more/i.test(lower)) return true;
  if (choices.length > 0 && /^\d+$/.test(choices[0].letter)) return false;
  // Default lettered choices to single-select (v2.4 uses explicit CHOICE_MULTI for multi)
  return false;
}

/**
 * Detects if a message has a ===NEXT:=== button or ends with a confirmation question at [STOP].
 * Returns quick-reply options if so.
 */
export function parseConfirmation(content: string): string[] | null {
  // Must end with [STOP]
  if (!content.includes("[STOP]")) return null;
  // Already has choice markers — skip
  if (parseChoices(content)) return null;

  // Check for ===NEXT: Button Label=== marker
  const nextLabel = parseNextMarker(content);
  if (nextLabel) {
    return [nextLabel];
  }

  const lower = content.toLowerCase();
  // Ready/shall patterns for plan generation
  if (/ready\s*(for|to)\b/i.test(lower) || /shall (i|we)\b/i.test(lower) || /would you like (me |us )?to\b/i.test(lower) || /want (me |us )?to\b/i.test(lower) || /let'?s (go|do|start|build|begin)/i.test(lower)) {
    if (/business plan/i.test(lower)) {
      return ["Yes, I'm excited to see my business plan! 🚀", "Not yet, I have more questions"];
    }
    return ["Yes, let's go! 🚀", "Not yet, I have more questions"];
  }
  // Generic question at [STOP]
  if (/\?\s*\n*\s*\[STOP\]/i.test(content)) {
    return ["Continue →", "I have a question"];
  }
  return null;
}

export default function ChatChoiceButtons({ choices, multiSelect = false, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (letter: string) => {
    if (disabled) return;
    if (!multiSelect) {
      // Single select: immediately submit
      const choice = choices.find(c => c.letter === letter);
      onSubmit(choice ? choice.text : letter);
      setSelected(new Set([letter]));
      return;
    }
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
      onSubmit(choice ? choice.text : sorted[0]);
    } else {
      const labels = sorted.map(l => {
        const c = choices.find(ch => ch.letter === l);
        return c ? c.text : l;
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
      {multiSelect && selected.size > 0 && (
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