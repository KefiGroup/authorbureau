import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Rocket, CheckCircle2, Loader2, Circle, Pause, PartyPopper, Eye, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RecommendedProduct {
  nodeId: string;
  title: string;
  type: string;
  description: string;
}

type BuildStatus = "pending" | "building" | "done" | "error";

interface BuildItem {
  product: RecommendedProduct;
  status: BuildStatus;
  resultTitle?: string;
}

interface Props {
  bookId: string;
  bookTitle: string;
  recommendedProducts: RecommendedProduct[];
  annualProjectionLow: string;
  annualProjectionHigh: string;
  onComplete?: () => void;
  onNavigateReview?: () => void;
}

const AI_TOOLS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-author-tools`;
const POPULATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/populate-assets`;

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

export default function BuildAuthorBusinessButton({
  bookId, bookTitle, recommendedProducts, annualProjectionLow, annualProjectionHigh,
  onComplete, onNavigateReview,
}: Props) {
  const { user, isPremium, isAdmin } = useAuth();
  const { toast } = useToast();
  const [building, setBuilding] = useState(false);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [items, setItems] = useState<BuildItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const totalProducts = recommendedProducts.length;

  const typeMap: Record<string, string> = {
    workbook: "workbook", course: "course", "online-course": "course",
    social: "social", "social-media": "social", email: "email",
    "email-marketing": "email", speaker: "speaker", keynote: "speaker",
    webinar: "workbook", coaching: "course", audiobook: "workbook",
    "home-study": "workbook",
  };

  const startBuild = async () => {
    if (!user || !isPremium && !isAdmin) {
      toast({ title: "Premium Required", description: "Subscribe to unlock AI builders.", variant: "destructive" });
      return;
    }

    setBuilding(true);
    setPaused(false);
    setCompleted(false);
    const buildItems: BuildItem[] = recommendedProducts.map(p => ({ product: p, status: "pending" as BuildStatus }));
    setItems(buildItems);

    for (let i = 0; i < buildItems.length; i++) {
      if (paused) break;
      setCurrentIndex(i);
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "building" } : item));

      try {
        const token = await getToken();
        const toolType = typeMap[buildItems[i].product.type.toLowerCase()] || "workbook";

        const resp = await fetch(AI_TOOLS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            toolType, bookTitle, bookDescription: "",
            authorName: "Author", additionalContext: buildItems[i].product.description,
          }),
        });

        if (!resp.ok) throw new Error("Generation failed");

        const reader = resp.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) accumulated += delta;
              } catch {}
            }
          }
        }

        // Save asset
        await supabase.from("generated_assets" as any).upsert({
          book_id: bookId, author_id: user.id, asset_type: toolType,
          content: accumulated, updated_at: new Date().toISOString(),
        }, { onConflict: "book_id,asset_type" });

        // Populate
        try {
          await fetch(POPULATE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ assetType: toolType, bookId, rawContent: accumulated }),
          });
        } catch {}

        setItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: "done", resultTitle: buildItems[i].product.title } : item
        ));
      } catch {
        setItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: "error" } : item
        ));
      }
    }

    setBuilding(false);
    setCompleted(true);
    onComplete?.();
  };

  const doneCount = items.filter(i => i.status === "done").length;
  const progressPercent = totalProducts > 0 ? Math.round((doneCount / totalProducts) * 100) : 0;

  // Completed state
  if (completed) {
    return (
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-6 text-center space-y-4">
          <PartyPopper className="h-12 w-12 text-accent mx-auto" />
          <h3 className="font-heading text-xl font-bold">Your Author Business is Ready!</h3>
          <p className="text-sm text-muted-foreground">
            {doneCount} products have been created as drafts on your book page.
          </p>
          <p className="text-sm font-semibold text-accent">
            Estimated annual revenue: {annualProjectionLow} – {annualProjectionHigh}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={onNavigateReview} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Review & Publish Products →
            </Button>
            <Button variant="outline" onClick={() => window.open("/authors/", "_blank")}>
              <Globe className="h-4 w-4 mr-1.5" /> View Your Microsite →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Building progress state
  if (building) {
    return (
      <Card className="border-secondary/30">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold">Building Your Author Business...</h3>
            <span className="text-xs text-muted-foreground">
              ~{Math.max(1, (totalProducts - doneCount) * 2)} min remaining
            </span>
          </div>
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {progressPercent}% ({doneCount} of {totalProducts})
            </p>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />}
                {item.status === "building" && <Loader2 className="h-4 w-4 text-secondary animate-spin shrink-0" />}
                {item.status === "pending" && <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                {item.status === "error" && <span className="text-destructive shrink-0">✕</span>}
                <span className={item.status === "done" ? "text-foreground" : item.status === "building" ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {item.product.title}
                  {item.status === "building" && <span className="text-xs text-muted-foreground ml-2">Building...</span>}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial CTA state
  return (
    <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-background">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center">
            <Rocket className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold">Ready to Build Your Author Business?</h3>
            <p className="text-xs text-muted-foreground">
              Abby has identified {totalProducts} revenue streams for your book.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Click below and she'll build all recommended products for you — courses, workbooks, templates, and more.
        </p>
        <Button
          onClick={startBuild}
          size="lg"
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-semibold"
        >
          <Rocket className="h-5 w-5 mr-2" /> BUILD MY AUTHOR BUSINESS →
        </Button>
        <div className="grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">~15-30 min</p>
            <p>Estimated time</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">{totalProducts} of 28</p>
            <p>Products to build</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">{annualProjectionLow}–{annualProjectionHigh}</p>
            <p>Est. annual revenue</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Or build products individually from the sidebar →
        </p>
      </CardContent>
    </Card>
  );
}
