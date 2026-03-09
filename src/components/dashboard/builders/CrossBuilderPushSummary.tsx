import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Package, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchOutgoingPushes } from "@/lib/cross-builder-push";
import { BUILDER_NODE_MAP } from "./builderNodeConfig";

interface CrossBuilderPushSummaryProps {
  /** Source builder ID */
  builderId: string;
  /** Author's user ID */
  authorId: string;
  /** Book ID */
  bookId: string;
}

interface PushRecord {
  id: string;
  destination_builder: string;
  push_type: string;
  title: string;
  status: string;
}

/**
 * Shows a summary of what was pushed to other builders after generation.
 * Displayed at the bottom of the builder after Act 3 completes.
 */
export default function CrossBuilderPushSummary({
  builderId,
  authorId,
  bookId,
}: CrossBuilderPushSummaryProps) {
  const [pushes, setPushes] = useState<PushRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorId || !builderId || !bookId) return;
    loadPushes();
  }, [authorId, builderId, bookId]);

  const loadPushes = async () => {
    setLoading(true);
    const data = await fetchOutgoingPushes(authorId, builderId, bookId);
    setPushes(data as PushRecord[]);
    setLoading(false);
  };

  if (loading || pushes.length === 0) return null;

  const getDestLabel = (destId: string) => {
    const config = Object.values(BUILDER_NODE_CONFIGS).find(c => c.id === destId);
    return config?.label || destId;
  };

  const getDestIcon = (destId: string) => {
    const config = Object.values(BUILDER_NODE_CONFIGS).find(c => c.id === destId);
    return config?.icon || "📦";
  };

  // Group by destination builder
  const grouped = pushes.reduce<Record<string, PushRecord[]>>((acc, push) => {
    if (!acc[push.destination_builder]) acc[push.destination_builder] = [];
    acc[push.destination_builder].push(push);
    return acc;
  }, {});

  const statusIcon = (status: string) => {
    if (status === "imported") return <Check className="w-3 h-3 text-green-500" />;
    if (status === "pending") return <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />;
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-6"
    >
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-accent-foreground" />
            <p className="text-sm font-semibold text-foreground">
              I've also prepared content for {Object.keys(grouped).length} other{" "}
              {Object.keys(grouped).length === 1 ? "builder" : "builders"}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(grouped).map(([destId, destPushes]) => (
              <div
                key={destId}
                className="flex items-center gap-2 p-2 rounded-md bg-background border border-border"
              >
                <span className="text-base">{getDestIcon(destId)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {getDestLabel(destId)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {destPushes.length} {destPushes.length === 1 ? "asset" : "assets"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {destPushes.every(p => p.status === "imported") ? (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                      <Check className="w-3 h-3 mr-1" /> Imported
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-3 italic">
            Open each builder to review and import the prepared content.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
