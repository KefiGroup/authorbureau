import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Rocket, Loader2, Copy, ExternalLink, Link2, CheckCircle2,
  FileText, Code2, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface Props {
  profileExists: boolean;
}

export default function ManusHandoffCard({ profileExists }: Props) {
  const [generating, setGenerating] = useState(false);
  const [designData, setDesignData] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manusLink, setManusLink] = useState("");
  const [linkSaved, setLinkSaved] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Please sign in first", variant: "destructive" });
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-business-design-file`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!resp.ok) throw new Error("Failed to generate file");
      const data = await resp.json();
      const specText = JSON.stringify(data, null, 2);
      setDesignData(specText);
      toast({ title: "Design specs generated! 🚀" });
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to generate design file", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!designData) return;
    await navigator.clipboard.writeText(designData);
    setCopied(true);
    toast({ title: "Specs copied to clipboard! 📋" });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSaveLink = async () => {
    if (!manusLink.trim()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from("author_profiles")
        .update({ website_url: manusLink.trim() })
        .eq("user_id", session.user.id);

      setLinkSaved(true);
      toast({ title: "Manus project link saved! ✅" });
    } catch {
      toast({ title: "Failed to save link", variant: "destructive" });
    }
  };

  return (
    <Card className="p-6 border-2 border-secondary/30 bg-gradient-to-br from-secondary/5 to-secondary/10">
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-11 h-11 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
          <Rocket className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-base">Website Development</h3>
          <p className="text-sm text-muted-foreground">Build your professional author website</p>
        </div>
      </div>

      {/* How It Works panel */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <p className="text-sm text-foreground mb-3">
          Use{" "}
          <a
            href="https://manus.im/invitation/XT9XTFJVZ8SASD"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary font-medium hover:underline"
          >
            Manus.im
          </a>{" "}
          to develop your author website instantly, an AI agent that can build and deploy full websites from your specifications.
        </p>

        <p className="text-sm font-semibold flex items-center gap-1.5 mb-2">
          <Sparkles className="h-4 w-4 text-secondary" />
          How It Works
        </p>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>
            <span className="font-medium text-foreground">Generate Your Specs</span> — Abby compiles your profile, books, products & brand into a design specification
          </li>
          <li>
            <span className="font-medium text-foreground">Build with Manus AI</span> — Copy your specs, go to{" "}
            <a
              href="https://manus.im/invitation/XT9XTFJVZ8SASD"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              manus.im
            </a>
            , create a free account if needed, and paste to build your website
          </li>
          <li>
            <span className="font-medium text-foreground">Link Your Website</span> — Paste your Manus project link back here to track your progress
          </li>
        </ol>
      </div>

      {/* 3-Step Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Step 1: Generate */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-secondary" />
          </div>
          <h4 className="font-heading font-semibold text-sm">Step 1: Generate Specs</h4>
          <p className="text-xs text-muted-foreground flex-1">
            {designData
              ? "Your specs are ready! Copy them below."
              : "Compile your brand assets into a design specification."}
          </p>
          {!designData ? (
            <Button
              onClick={handleGenerate}
              disabled={generating || !profileExists}
              variant="outline"
              className="w-full text-xs"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Generate Design Specs
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleCopy}
              className={`w-full text-xs ${
                copied
                  ? "bg-accent text-accent-foreground hover:bg-accent/90"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Specs to Clipboard
                </>
              )}
            </Button>
          )}
          {!profileExists && (
            <p className="text-[10px] text-muted-foreground">Set up your profile first.</p>
          )}
        </div>

        {/* Step 2: Build */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
            <Code2 className="h-5 w-5 text-secondary" />
          </div>
          <h4 className="font-heading font-semibold text-sm">Step 2: Build with Manus</h4>
          <p className="text-xs text-muted-foreground flex-1">
            Copy your specs and build with Manus AI.
          </p>
          <Button
            className="w-full text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90"
            asChild
          >
            <a
              href="https://manus.im/invitation/XT9XTFJVZ8SASD"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open Manus AI
            </a>
          </Button>
        </div>

        {/* Step 3: Link */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <Link2 className="h-5 w-5 text-accent" />
          </div>
          <h4 className="font-heading font-semibold text-sm">Step 3: Link Your Website</h4>
          <p className="text-xs text-muted-foreground flex-1">
            Paste your Manus project link to track your website.
          </p>
          {linkSaved ? (
            <Button
              variant="outline"
              className="w-full text-xs text-accent border-accent/30"
              disabled
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Link Saved
            </Button>
          ) : (
            <div className="w-full space-y-2">
              <Input
                placeholder="https://manus.im/share/..."
                value={manusLink}
                onChange={(e) => setManusLink(e.target.value)}
                className="text-xs h-8"
              />
              <Button
                variant="outline"
                className="w-full text-xs text-secondary border-secondary/30 hover:bg-secondary/5"
                onClick={handleSaveLink}
                disabled={!manusLink.trim()}
              >
                <Link2 className="h-3.5 w-3.5 mr-1.5" />
                Add Website Link
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
