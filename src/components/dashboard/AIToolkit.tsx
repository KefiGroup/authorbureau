import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen, GraduationCap, Share2, Mail, Mic, Lightbulb,
  Crown, Loader2, ArrowLeft, Copy, Download, Sparkles, Lock,
} from "lucide-react";

const AI_TOOLS = [
  {
    id: "workbook",
    label: "Workbook Generator",
    icon: BookOpen,
    description: "Transform your book chapters into a structured workbook with exercises, reflection questions, and action plans — ready for Amazon KDP.",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "course",
    label: "Course Outline Builder",
    icon: GraduationCap,
    description: "Convert your book content into a full course curriculum with modules, lessons, and learning objectives.",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "social",
    label: "Social Media Content Pack",
    icon: Share2,
    description: "Generate 30 days of social media posts, quotes, and captions from your book themes — ready to schedule.",
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
  {
    id: "email",
    label: "Email Sequence Writer",
    icon: Mail,
    description: "Create a 7-email nurture sequence with lead magnet ideas and calls-to-action based on your book topics.",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "speaker",
    label: "Speaker Kit Generator",
    icon: Mic,
    description: "Build a professional speaker one-sheet with talk titles, audience takeaways, and booking-ready descriptions.",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    id: "products",
    label: "Digital Product Ideator",
    icon: Lightbulb,
    description: "Brainstorm monetisable digital products — checklists, templates, mini-guides — all derived from your book.",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
];

import { SHARED_BACKEND_URL, SHARED_ANON_KEY } from "@/lib/shared-backend";

const CHAT_URL = `${SHARED_BACKEND_URL}/functions/v1/ai-author-tools`;

export default function AIToolkit() {
  const { isPremium } = useAuth();
  const { toast } = useToast();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [bookDescription, setBookDescription] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!bookTitle || !bookDescription || !selectedTool) {
      toast({ title: "Please fill in book title and description", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setResult("");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SHARED_ANON_KEY}`,
        },
        body: JSON.stringify({
          toolType: selectedTool,
          bookTitle,
          bookDescription,
          authorName,
          additionalContext,
          source_platform: "authorsbureau",
        }),
      });

      if (resp.status === 429) {
        toast({ title: "Rate limit reached", description: "Please wait a moment and try again.", variant: "destructive" });
        setIsGenerating(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: "AI credits exhausted", description: "Please add credits in your workspace settings.", variant: "destructive" });
        setIsGenerating(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Failed to start generation");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulated += content;
              setResult(accumulated);
            }
          } catch (error) {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }

    setIsGenerating(false);
  }, [selectedTool, bookTitle, bookDescription, authorName, additionalContext, toast]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast({ title: "Copied to clipboard!" });
  };

  const handleDownload = () => {
    const toolName = AI_TOOLS.find((t) => t.id === selectedTool)?.label || "output";
    const blob = new Blob([result], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${toolName.toLowerCase().replace(/\s+/g, "-")}-${bookTitle.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isPremium) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-secondary" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-2">AI Author Toolkit</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Unlock 6 powerful AI tools to transform your book into workbooks, courses, social content, email sequences, speaker kits, and digital products.
          </p>
          <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Crown className="h-4 w-4 mr-2" /> Upgrade to Premium — $29/mo
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AI_TOOLS.map((tool) => (
            <Card key={tool.id} className="border-border opacity-60">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tool.bgColor}`}>
                    <tool.icon className={`h-5 w-5 ${tool.color}`} />
                  </div>
                  <h3 className="font-heading font-semibold text-sm">{tool.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Tool selection view
  if (!selectedTool) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">AI Author Toolkit</h2>
          <p className="text-muted-foreground mt-1">
            Choose a tool to transform your book into powerful digital assets.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AI_TOOLS.map((tool) => (
            <Card
              key={tool.id}
              className="border-border bg-card cursor-pointer hover:shadow-[var(--shadow-card-hover)] hover:border-secondary/30 transition-all duration-200"
              onClick={() => setSelectedTool(tool.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tool.bgColor}`}>
                    <tool.icon className={`h-5 w-5 ${tool.color}`} />
                  </div>
                  <h3 className="font-heading font-semibold">{tool.label}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeTool = AI_TOOLS.find((t) => t.id === selectedTool)!;

  // Active tool view
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedTool(null); setResult(""); }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${activeTool.bgColor}`}>
          <activeTool.icon className={`h-5 w-5 ${activeTool.color}`} />
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold">{activeTool.label}</h2>
          <p className="text-xs text-muted-foreground">{activeTool.description}</p>
        </div>
      </div>

      {/* Input Form */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Book Title *</label>
            <Input
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="e.g. Be SUCKcessful"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Author Name</label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. Pauline Teo"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Book Description *</label>
          <Textarea
            value={bookDescription}
            onChange={(e) => setBookDescription(e.target.value)}
            placeholder="Describe your book's main themes, topics, and target audience..."
            rows={4}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Additional Context (optional)</label>
          <Textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Any specific requirements, target market, or focus areas..."
            rows={2}
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !bookTitle || !bookDescription}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Generate {activeTool.label}</>
          )}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold">Generated Content</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" /> Download .md
              </Button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm text-foreground leading-relaxed border-t border-border pt-4">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
