import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ManusHandoffModal from "./ManusHandoffModal";

interface Props {
  profileExists: boolean;
}

export default function ManusHandoffCard({ profileExists }: Props) {
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);

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

      // Trigger file download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "business_design_file.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Business Design File downloaded! 🚀" });
      setShowModal(true);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to generate design file", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Card className="p-5 border-2 border-secondary/30 bg-gradient-to-br from-secondary/5 to-secondary/10">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
            <Rocket className="h-5 w-5 text-secondary" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-heading font-bold text-base">Build Your Professional Website</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ready to launch your full author website? Abby will compile all your brand assets into a single
              Business Design File that you can transfer to Manus to build a professional website with your
              own custom domain.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating || !profileExists}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 mt-1"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Your Business Design File
                </>
              )}
            </Button>
            {!profileExists && (
              <p className="text-xs text-muted-foreground">
                Set up your author profile first to generate your design file.
              </p>
            )}
          </div>
        </div>
      </Card>

      <ManusHandoffModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
