import { Link } from "react-router-dom";
import { BookOpen, Library, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function PortalLibrary() {
  useDocumentMeta({ title: "My Library | Authors Bureau", description: "Access your purchased content." });

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">My Library</h1>
      <p className="text-muted-foreground mb-8">Access your purchased courses and learning materials.</p>

      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <Library className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Your library is empty</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Browse the Reading Club to discover great books, or explore author pages to find courses and coaching.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild className="bg-[hsl(var(--accent))] hover:bg-[hsl(174,84%,24%)] text-white">
            <Link to="/portal/reading-club"><BookOpen className="h-4 w-4 mr-2" /> Reading Club</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/directory">Browse Authors</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
