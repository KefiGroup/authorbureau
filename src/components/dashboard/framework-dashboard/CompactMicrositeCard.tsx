import { Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  profileState: "none" | "incomplete" | "live";
  authorSlug?: string;
  authorName?: string;
  onSetupProfile: () => void;
  onViewMicrosite: () => void;
}

export default function CompactMicrositeCard({ profileState, authorSlug, authorName, onSetupProfile, onViewMicrosite }: Props) {
  const micrositeUrl = authorSlug ? `authorsbureau.com/authors/${authorSlug}` : "authorsbureau.com/authors/your-name";

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      {/* Thumbnail preview */}
      <div className="w-full sm:w-40 h-24 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
        <div className="text-center">
          <Globe className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
          <p className="text-[9px] text-muted-foreground/60">Your Microsite</p>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Free for Every Author
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          <span className="font-medium text-foreground">{micrositeUrl}</span>
        </p>
        {profileState === "live" && authorSlug ? (
          <Button size="sm" variant="outline" onClick={onViewMicrosite} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            View Your Live Directory Profile
          </Button>
        ) : (
          <Button size="sm" onClick={onSetupProfile} className="bg-amber-600 hover:bg-amber-700 text-white">
            {profileState === "none" ? "Set Up Your Profile" : "Complete Your Profile"}
          </Button>
        )}
      </div>
    </div>
  );
}
