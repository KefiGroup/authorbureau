import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, FileText, Upload, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ManuscriptUpload from "@/components/dashboard/ManuscriptUpload";
import ABBYFrameworkVisual from "./ABBYFrameworkVisual";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { asBlob } from "html-docx-js-typescript";
import { useToast } from "@/hooks/use-toast";

interface PlanSection {
  key: string;
  label: string;
  emoji: string;
  content: string;
}

function extractSections(fullContent: string): PlanSection[] {
  const sections: PlanSection[] = [];
  const patterns: Array<{ key: string; label: string; emoji: string; regex: RegExp }> = [
    { key: "transformation", label: "Transformation Promise", emoji: "✨", regex: /(?:#{1,3}.*?TRANSFORMATION PROMISE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?STARTER PACKAGE|$)/i },
    { key: "starter", label: "Starter Package", emoji: "🟢", regex: /(?:#{1,3}.*?STARTER PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?PRO PACKAGE|$)/i },
    { key: "pro", label: "Pro Package", emoji: "🔵", regex: /(?:#{1,3}.*?PRO PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?ENTERPRISE PACKAGE|$)/i },
    { key: "enterprise", label: "Enterprise Package", emoji: "🟣", regex: /(?:#{1,3}.*?ENTERPRISE PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?MONETIZATION MAP|$)/i },
    { key: "monetization", label: "Monetization Map", emoji: "📊", regex: /(?:#{1,3}.*?MONETIZATION MAP.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?NEXT STEPS|$)/i },
    { key: "nextsteps", label: "Next Steps", emoji: "🚀", regex: /(?:#{1,3}.*?NEXT STEPS.*?\n)([\s\S]*?)$/i },
  ];
  for (const p of patterns) {
    const match = fullContent.match(p.regex);
    if (match?.[1]?.trim()) {
      sections.push({ key: p.key, label: p.label, emoji: p.emoji, content: match[1].trim() });
    }
  }
  return sections;
}

interface Book {
  id: string;
  title: string;
}

interface Props {
  book: Book;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

export default function BookHubOverview({ book, onConsultAbby, onNavigateTab }: Props) {
  const [hasConsultation, setHasConsultation] = useState(false);
  const [hasManuscript, setHasManuscript] = useState(false);
  const [manuscriptChars, setManuscriptChars] = useState(0);
  const [showManuscriptUpload, setShowManuscriptUpload] = useState(false);

  useEffect(() => {
    async function checkData() {
      const { data: { session } } = await sharedSupabase.auth.getSession();
      const token = session?.access_token;
      const userId = session?.user?.id;
      if (!userId) return;

      // Check consultation via edge function
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consultation-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: "count", book_id: book.id }),
        });
        const result = await resp.json();
        setHasConsultation((result.count ?? 0) > 0);
      } catch {
        setHasConsultation(false);
      }

      // Check manuscript
      const { data: assets } = await supabase
        .from("generated_assets")
        .select("content")
        .eq("book_id", book.id)
        .eq("author_id", userId)
        .eq("asset_type", "source_material")
        .limit(1);
      if (assets && assets.length > 0 && assets[0].content) {
        setHasManuscript(true);
        setManuscriptChars(assets[0].content.length);
      }
    }
    checkData();
  }, [book.id]);

  return (
    <div className="space-y-6">
      {/* Abby's Business Snapshot */}
      <motion.div
        className="rounded-2xl border-2 border-secondary/30 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary/15 flex items-center justify-center flex-shrink-0 text-xl">
            👩‍💼
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-heading font-bold text-base">Abby's Business Snapshot</h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 rounded-full px-2 py-0.5">
                AI Advisor
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {hasConsultation ? (
                <>
                  I've completed your <strong>Needs Analysis</strong> for <strong>"{book.title}"</strong> and designed your customised ABBY Framework below. 
                  Each category shows the products I recommend — with transparent, itemised pricing available when you're ready to build. 
                  Let's turn your expertise into revenue.
                </>
              ) : (
                <>
                  I'll start by conducting a <strong>Needs Analysis</strong> on your book <strong>"{book.title}"</strong> — understanding your goals, audience size, and revenue ambitions. 
                  From there, I'll design a <strong>customised ABBY Framework</strong> mapping the exact products and revenue streams that fit your expertise. 
                  You'll see transparent, itemised à-la-carte pricing for each product — plus a bundled subscription option that saves you more. 
                  Think of me as your strategist <em>and</em> your business partner: I don't just advise, I help you build and grow.
                </>
              )}
            </p>

            {/* Compact manuscript status */}
            <div className="flex items-center gap-2 mt-3 text-xs">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {hasManuscript ? (
                <span className="text-muted-foreground">
                  ✅ Manuscript loaded — {Math.round(manuscriptChars / 1000)}k characters
                  <button
                    onClick={() => setShowManuscriptUpload(!showManuscriptUpload)}
                    className="ml-2 text-secondary hover:underline"
                  >
                    {showManuscriptUpload ? "Hide" : "Replace"}
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setShowManuscriptUpload(!showManuscriptUpload)}
                  className="text-secondary hover:underline flex items-center gap-1"
                >
                  <Upload className="h-3 w-3" />
                  Upload manuscript for Abby to analyze
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={onConsultAbby}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {hasConsultation ? "Continue Analysis with Abby" : "Analyze with Abby"}
              </Button>
              {hasConsultation && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateTab("analyze")}
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Build Next Product
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Expandable manuscript upload */}
      {showManuscriptUpload && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <ManuscriptUpload bookId={book.id} bookTitle={book.title} />
        </motion.div>
      )}

      {/* ABBY Framework Visual — the 27 circles ARE the progress tracker */}
      <ABBYFrameworkVisual
        hasConsultation={true}
        onConsultAbby={onConsultAbby}
        onNavigateTab={onNavigateTab}
      />

    </div>
  );
}
