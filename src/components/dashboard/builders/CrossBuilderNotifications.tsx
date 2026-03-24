import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, X, Package, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fetchPendingPushes, markPushImported, dismissPush } from "@/lib/cross-builder-push";
import { BUILDER_NODE_MAP } from "./builderNodeConfig";

interface CrossBuilderNotificationsProps {
  /** Current builder ID (destination) */
  builderId: string;
  /** Author's user ID */
  authorId: string;
  /** Currently selected book ID */
  bookId?: string;
  /** Callback when a push is imported (to refresh content) */
  onImport?: (pushData: any) => void;
}

interface PushRecord {
  id: string;
  source_builder: string;
  destination_builder: string;
  push_type: string;
  title: string;
  description: string;
  content_json: Record<string, any>;
  status: string;
  created_at: string;
}

export default function CrossBuilderNotifications({
  builderId,
  authorId,
  bookId,
  onImport,
}: CrossBuilderNotificationsProps) {
  const [pushes, setPushes] = useState<PushRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authorId || !builderId) return;
    loadPushes();
  }, [authorId, builderId, bookId, loadPushes]);

  const loadPushes = async () => {
    setLoading(true);
    const data = await fetchPendingPushes(authorId, builderId, bookId);
    setPushes(data as PushRecord[]);
    setLoading(false);
  };

  const handleImport = async (push: PushRecord) => {
    setProcessingIds(prev => new Set(prev).add(push.id));
    const success = await markPushImported(push.id);
    if (success) {
      setPushes(prev => prev.filter(p => p.id !== push.id));
      onImport?.(push.content_json);
    }
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(push.id);
      return next;
    });
  };

  const handleDismiss = async (push: PushRecord) => {
    setProcessingIds(prev => new Set(prev).add(push.id));
    const success = await dismissPush(push.id);
    if (success) {
      setPushes(prev => prev.filter(p => p.id !== push.id));
    }
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(push.id);
      return next;
    });
  };

  if (loading || pushes.length === 0) return null;

  const getSourceLabel = (sourceId: string) => {
    return BUILDER_NODE_MAP[sourceId]?.label || sourceId;
  };

  const getSourceIcon = (sourceId: string) => {
    return BUILDER_NODE_MAP[sourceId]?.icon || "📦";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className="border-primary/30 bg-primary/5 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-primary/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                Abby prepared {pushes.length} {pushes.length === 1 ? "asset" : "assets"} for you
              </p>
              <p className="text-xs text-muted-foreground">
                From other builders — review and import
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {pushes.length} pending
            </Badge>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Push list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0 pb-3 px-3 space-y-2">
                {pushes.map((push) => (
                  <motion.div
                    key={push.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border"
                  >
                    {/* Source icon */}
                    <div className="text-lg mt-0.5">
                      {getSourceIcon(push.source_builder)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          From {getSourceLabel(push.source_builder)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">
                        {push.title}
                      </p>
                      {push.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {push.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDismiss(push)}
                        disabled={processingIds.has(push.id)}
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => handleImport(push)}
                        disabled={processingIds.has(push.id)}
                      >
                        <Check className="w-3 h-3" />
                        Import
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
