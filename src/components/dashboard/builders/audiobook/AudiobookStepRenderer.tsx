/**
 * ⚠️ TEMPORARY STUB — The full Audiobook Studio UI was inadvertently removed
 * during a cleanup pass and could not be recovered from git (sandboxed git
 * could not read historical blob content).
 *
 * This stub keeps BA11Builder compiling. The full studio UI must be rebuilt
 * (5 steps: Setup, Manuscript Optimization, Voice, Chapter Production,
 * Publish & Distribute) before the audiobook node is usable end-to-end.
 *
 * Tracking: see chat for cleanup-2026-04-25 audit.
 */
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  stepId: string;
  stepData: Record<string, any>;
  setStepData: (data: Record<string, any>) => void;
  onMarkEdited: (stepId: string) => void;
  bookId: string;
  bookTitle: string;
  plan: unknown;
  generationState: string;
  setGenerationState: (s: any) => void;
  userId: string;
}

export default function AudiobookStepRenderer({ stepId, bookTitle }: Props) {
  return (
    <Card className="p-6 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Audiobook Studio — Step "{stepId}"
          </p>
          <p className="text-amber-800 dark:text-amber-300">
            The full Audiobook Studio UI for <strong>{bookTitle || "your book"}</strong> is
            being rebuilt. The previous version was removed during a code cleanup and could
            not be recovered from version control.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            All other audiobook backend functionality (chapter generation, ElevenLabs voice
            production, distribution packaging) is intact — only the in-builder UI needs
            to be re-implemented.
          </p>
        </div>
      </div>
    </Card>
  );
}
