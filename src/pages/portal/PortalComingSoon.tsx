import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Construction } from "lucide-react";

export default function PortalComingSoon({ title }: { title: string }) {
  useDocumentMeta({ title: `${title} | Authors Bureau`, description: `${title} coming soon.` });

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <h1 className="font-heading text-2xl font-bold text-foreground mb-8">{title}</h1>
      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <Construction className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          This section is under construction. Check back soon!
        </p>
      </div>
    </div>
  );
}
