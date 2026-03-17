import { useState } from "react";
import { Loader2, RefreshCw, Lock, Unlock, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useNodeGating } from "@/hooks/useNodeGating";
import { ABBY_CATEGORIES, type AbbyCategory } from "@/config/abbyFrameworkConfig";

const CATEGORY_ORDER: AbbyCategory[] = ["revenue-streams", "marketing-channels", "authority-builders"];

export default function NodeGatingTab() {
  const { gating, loading, refetch, isNodeOpen, toggleNode, toggleCategory } = useNodeGating();
  const { toast } = useToast();
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggleNode = async (nodeId: string, open: boolean) => {
    setToggling(nodeId);
    const ok = await toggleNode(nodeId, open);
    if (ok) toast({ title: `${nodeId} → ${open ? "Open" : "Coming Soon"}` });
    else toast({ title: "Failed to update", variant: "destructive" });
    setToggling(null);
  };

  const handleToggleCategory = async (catId: string, open: boolean) => {
    setToggling(catId);
    const ok = await toggleCategory(catId, open);
    if (ok) toast({ title: `All ${catId} nodes → ${open ? "Open" : "Coming Soon"}` });
    else toast({ title: "Failed to update", variant: "destructive" });
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Node Gating</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Toggle nodes between <strong>Open</strong> (users can access) and <strong>Coming Soon</strong> (locked).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="space-y-8">
        {CATEGORY_ORDER.map((catId) => {
          const cat = ABBY_CATEGORIES[catId];
          const catNodes = gating.filter((r) => r.category === catId);
          const allOpen = catNodes.every((r) => r.is_open);
          const allClosed = catNodes.every((r) => !r.is_open);

          return (
            <div key={catId} className="rounded-lg border border-border bg-card">
              {/* Category header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <cat.headerIcon className={`h-5 w-5 ${cat.color}`} />
                  <div>
                    <h3 className="font-semibold">{cat.label}</h3>
                    <span className="text-xs text-muted-foreground">{catNodes.length} nodes</span>
                  </div>
                  {allOpen && <Badge variant="default" className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">All Open</Badge>}
                  {allClosed && <Badge variant="secondary" className="bg-orange-500/15 text-orange-700 border-orange-500/30">All Coming Soon</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={allOpen || toggling === catId}
                    onClick={() => handleToggleCategory(catId, true)}
                  >
                    <Unlock className="mr-1.5 h-3.5 w-3.5" /> Open All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={allClosed || toggling === catId}
                    onClick={() => handleToggleCategory(catId, false)}
                  >
                    <Lock className="mr-1.5 h-3.5 w-3.5" /> Close All
                  </Button>
                </div>
              </div>

              {/* Node rows */}
              <div className="divide-y divide-border">
                {cat.nodes.map((node) => {
                  const open = isNodeOpen(node.id);
                  const isToggling = toggling === node.id;

                  return (
                    <div key={node.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <node.icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium text-sm">{node.label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">({node.id})</span>
                        </div>
                        {node.tierRequired && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{node.tierRequired}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${open ? "text-emerald-600" : "text-orange-600"}`}>
                          {open ? "Open" : "Coming Soon"}
                        </span>
                        <Switch
                          checked={open}
                          disabled={isToggling}
                          onCheckedChange={(checked) => handleToggleNode(node.id, checked)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
