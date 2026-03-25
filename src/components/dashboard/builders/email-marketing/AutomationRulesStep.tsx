import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, Trash2, ArrowRight, Zap, GitBranch } from "lucide-react";
import type { AutomationRule } from "./types";
import { TRIGGER_OPTIONS, ACTION_OPTIONS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  plan: Record<string, any> | null;
}

const DEFAULT_AUTOMATIONS: AutomationRule[] = [
  { id: "auto-1", trigger: "Subscribes to list", action: "Send email", delay: 0, isActive: true },
  { id: "auto-2", trigger: "Completes sequence", condition: "Welcome sequence completed", action: "Move to sequence", delay: 1, isActive: true },
  { id: "auto-3", trigger: "Clicks link", condition: "Clicked product link", action: "Add tag", delay: 0, isActive: true },
  { id: "auto-4", trigger: "Purchases product", action: "Move to sequence", delay: 0, isActive: true },
  { id: "auto-5", trigger: "Opens email", condition: "No opens in 30 days", action: "Move to sequence", delay: 30, isActive: true },
];

export default function AutomationRulesStep({ stepData, setStepData, onMarkEdited, plan }: Props) {
  const rules: AutomationRule[] = stepData.automationRules || DEFAULT_AUTOMATIONS;

  const updateRules = (newRules: AutomationRule[]) => {
    setStepData(prev => ({ ...prev, automationRules: newRules }));
    onMarkEdited("automation");
  };

  const updateRule = (id: string, updates: Partial<AutomationRule>) => {
    updateRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const addRule = () => {
    updateRules([...rules, {
      id: crypto.randomUUID(),
      trigger: TRIGGER_OPTIONS[0],
      action: ACTION_OPTIONS[0],
      delay: 0,
      isActive: true,
    }]);
  };

  const removeRule = (id: string) => {
    updateRules(rules.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Pre-built Automations</p>
            <p className="text-sm text-muted-foreground">
              I've set up 5 automation rules based on your business plan. These connect your sequences into a complete subscriber journey. Customize as needed.
            </p>
          </div>
        </div>
      </Card>

      {/* Visual flowchart header */}
      <div className="flex items-center gap-2 text-sm font-semibold">
        <GitBranch className="h-4 w-4 text-secondary" />
        <span>Automation Rules</span>
        <Badge variant="outline" className="text-[10px] ml-auto">{rules.filter(r => r.isActive).length} active</Badge>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        {rules.map((rule, i) => (
          <Card key={rule.id} className={`p-4 transition-all ${rule.isActive ? "" : "opacity-50"}`}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-secondary" />
                </div>
                {i < rules.length - 1 && <div className="w-px h-4 bg-border" />}
              </div>

              <div className="flex-1 space-y-3">
                {/* Trigger */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px]">WHEN</Badge>
                  <Select value={rule.trigger} onValueChange={v => updateRule(rule.id, { trigger: v })}>
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_OPTIONS.map(opt => <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Condition (optional) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-amber-500/10 text-amber-700 text-[10px]">IF</Badge>
                  <Input
                    value={rule.condition || ""}
                    onChange={e => updateRule(rule.id, { condition: e.target.value })}
                    placeholder="Any condition (optional)"
                    className="flex-1 h-8 text-xs max-w-[250px]"
                  />
                </div>

                {/* Action */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-blue-500/10 text-blue-700 text-[10px]">THEN</Badge>
                  <Select value={rule.action} onValueChange={v => updateRule(rule.id, { action: v })}>
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map(opt => <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(rule.action === "Wait X days" || rule.delay) && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">after</span>
                      <Input type="number" min={0} value={rule.delay || 0}
                        onChange={e => updateRule(rule.id, { delay: parseInt(e.target.value) || 0 })}
                        className="w-16 h-8 text-xs" />
                      <span className="text-[10px] text-muted-foreground">days</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <button
                  onClick={() => updateRule(rule.id, { isActive: !rule.isActive })}
                  className={`w-8 h-4 rounded-full transition-colors ${rule.isActive ? "bg-accent" : "bg-muted"}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-background shadow transition-transform ${rule.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <button onClick={() => removeRule(rule.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addRule} className="w-full border-dashed">
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Automation Rule
      </Button>
    </div>
  );
}
