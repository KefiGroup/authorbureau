import { useState } from "react";
import { X, Sparkles } from "lucide-react";

interface Props {
  message: string;
  storageKey: string;
}

export default function OnboardingBanner({ message, storageKey }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === "true"; } catch { return false; }
  });

  if (dismissed) return null;

  return (
    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 flex items-start gap-3 mb-4">
      <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-amber-900 dark:text-amber-200">{message}</p>
      <button
        onClick={() => {
          setDismissed(true);
          try { localStorage.setItem(storageKey, "true"); } catch (error) { console.error(error); }
        }}
        className="text-amber-600/60 hover:text-amber-600 transition-colors shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
