import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ArrowLeft, Check, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { categoryStyles, getBuilderCategory, type BuilderCategory } from "../shared/BuilderTheme";

const STEPS = ["Introduction", "Generating", "Review", "Activate"];

export function StepHeader({ nodeId, nodeName, step, backTo = "/build-authority", category }: { nodeId: string; nodeName: string; step: number; backTo?: string; category?: BuilderCategory }) {
  const navigate = useNavigate();
  const cat = category || getBuilderCategory(nodeId);
  const s = categoryStyles[cat];
  return (
    <>
      <div className={`border-b border-border bg-gradient-to-r ${s.headerGradient} px-4 py-3`}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(backTo)}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex-1"><h1 className="text-lg font-semibold">{nodeName}</h1><p className="text-xs text-muted-foreground">{nodeId}</p></div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${i < step ? s.stepDone : i === step ? s.stepActiveRing : "bg-muted text-muted-foreground"}`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline truncate">{label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function AbbyCard({ children, category = "build" }: { children: React.ReactNode; category?: BuilderCategory }) {
  const s = categoryStyles[category];
  return (
    <Card className={`${s.border} ${s.bg} ${s.glowShadow} overflow-hidden relative`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.leftStrip}`} />
      <CardContent className="pt-6 pl-7">
        <div className="flex gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-full ${s.iconBg} flex items-center justify-center`}>
            <Sparkles className={`h-5 w-5 ${s.iconText}`} />
          </div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LoadingStep({ messages, msgIndex, category = "build" }: { messages: string[]; msgIndex: number; category?: BuilderCategory }) {
  const s = categoryStyles[category];
  return (
    <AbbyCard category={category}>
      <div className="space-y-4">
        <p className="text-muted-foreground font-medium animate-pulse">{messages[msgIndex % messages.length]}</p>
        <Progress value={undefined} className={`h-2 w-full [&>div]:animate-pulse ${s.progressBar}`} />
        <p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p>
      </div>
    </AbbyCard>
  );
}

export function PaymentLinkCard({ link }: { link: string }) {
  if (!link) return null;
  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
      <CardContent className="pt-6">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Your Payment Link</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm bg-background p-2 rounded border truncate">{link}</code>
          <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied!"); }}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCard({ items }: { items: string[] }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        {items.map((item, i) => (
          <p key={i} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-600 shrink-0" /> {item}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

export function SuccessCheckmark() {
  return (
    <div className="flex justify-center py-4">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center animate-bounce">
        <Check className="h-8 w-8 text-green-600" />
      </div>
    </div>
  );
}
