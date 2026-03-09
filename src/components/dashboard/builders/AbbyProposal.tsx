/**
 * AbbyProposal — Act 2: Abby Presents
 * 
 * Renders the AI-generated product proposal with editable fields.
 * Author reviews, edits if needed, and clicks "Generate Everything."
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Check, Edit3, ChevronDown, ChevronUp,
  DollarSign, Users, Layers, ArrowRight, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BuilderProposal } from "@/hooks/useBuilderGeneration";

interface Props {
  proposal: BuilderProposal;
  builderLabel: string;
  bookTitle: string;
  onApprove: (proposal: BuilderProposal) => void;
  onEdit: (updates: Partial<BuilderProposal>) => void;
}

const VALUE_LADDER_LABELS: Record<string, { label: string; color: string }> = {
  bait: { label: "Free Lead Magnet", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  tripwire: { label: "Tripwire ($7-$47)", color: "bg-sky-100 text-sky-700 border-sky-200" },
  core: { label: "Core Offer ($97-$297)", color: "bg-violet-100 text-violet-700 border-violet-200" },
  premium: { label: "Premium ($297-$997)", color: "bg-amber-100 text-amber-700 border-amber-200" },
  high_ticket: { label: "High Ticket ($997+)", color: "bg-rose-100 text-rose-700 border-rose-200" },
};

export default function AbbyProposal({ proposal, builderLabel, bookTitle, onApprove, onEdit }: Props) {
  const [selectedTitle, setSelectedTitle] = useState(
    proposal.recommended_title || proposal.title_options?.[0] || ""
  );
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [editingDescription, setEditingDescription] = useState(false);
  const [localDescription, setLocalDescription] = useState(proposal.description);

  const vl = VALUE_LADDER_LABELS[proposal.value_ladder_position || "core"] || VALUE_LADDER_LABELS.core;

  const handleApprove = () => {
    onApprove({
      ...proposal,
      recommended_title: selectedTitle,
      description: localDescription,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Abby's commentary */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">
              Abby's Analysis Complete
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {proposal.abby_commentary || `I've analyzed "${bookTitle}" and designed your complete ${builderLabel.toLowerCase()}. Review my proposal below — edit anything you'd like, then click "Generate Everything" to create all the content.`}
            </p>
          </div>
        </div>
      </Card>

      {/* Title selection */}
      <Card className="p-5">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-secondary" />
          Choose Your Title
        </h3>
        <div className="grid gap-2">
          {(proposal.title_options || []).map((title, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedTitle(title);
                onEdit({ recommended_title: title });
              }}
              className={`text-left px-4 py-3 rounded-lg border-2 transition-all ${
                selectedTitle === title
                  ? "border-secondary bg-secondary/5 ring-1 ring-secondary/20"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{title}</span>
                {selectedTitle === title && (
                  <Check className="h-4 w-4 text-secondary" />
                )}
              </div>
              {idx === 0 && proposal.recommended_title === title && (
                <Badge variant="secondary" className="mt-1 text-[9px]">
                  <Sparkles className="h-2 w-2 mr-0.5" /> Recommended
                </Badge>
              )}
            </button>
          ))}
        </div>
        {proposal.subtitle && (
          <p className="text-xs text-muted-foreground mt-3 italic">
            Subtitle: {proposal.subtitle}
          </p>
        )}
      </Card>

      {/* Value Ladder + Price + Audience row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <DollarSign className="h-5 w-5 text-accent mx-auto mb-1" />
          <p className="text-xl font-bold">${proposal.recommended_price}</p>
          <p className="text-[10px] text-muted-foreground">
            {proposal.price_justification || "Recommended price"}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <Users className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xs font-medium leading-relaxed">
            {proposal.target_audience}
          </p>
        </Card>
        <Card className={`p-4 text-center border ${vl.color}`}>
          <Zap className="h-5 w-5 mx-auto mb-1" />
          <p className="text-xs font-bold">{vl.label}</p>
          <p className="text-[10px] opacity-70">Value Ladder Position</p>
        </Card>
      </div>

      {/* Revenue projection */}
      {proposal.revenue_projection && (
        <Card className="p-3 bg-accent/5 border-accent/20">
          <p className="text-xs font-semibold text-accent mb-0.5">📈 Revenue Projection</p>
          <p className="text-sm text-muted-foreground">{proposal.revenue_projection}</p>
        </Card>
      )}

      {/* Transformation promises */}
      {proposal.transformation_promises && proposal.transformation_promises.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-bold mb-2">✨ Transformation Promises</h3>
          <ul className="space-y-1.5">
            {proposal.transformation_promises.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Description */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold">Product Description</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingDescription(!editingDescription)}
            className="text-xs"
          >
            <Edit3 className="h-3 w-3 mr-1" />
            {editingDescription ? "Done" : "Edit"}
          </Button>
        </div>
        {editingDescription ? (
          <Textarea
            value={localDescription}
            onChange={(e) => {
              setLocalDescription(e.target.value);
              onEdit({ description: e.target.value });
            }}
            rows={6}
            className="text-sm"
          />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {localDescription}
          </p>
        )}
      </Card>

      {/* Structure (collapsible sections) */}
      <Card className="p-4">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-secondary" />
          {builderLabel} Structure
        </h3>
        <div className="space-y-1">
          {(proposal.structure || []).map((section, idx) => (
            <div key={idx} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-bold text-secondary">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium">{section.title}</span>
                </div>
                {expandedSection === idx ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {expandedSection === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="px-3 pb-3 border-t"
                >
                  {section.description && (
                    <p className="text-xs text-muted-foreground mt-2 mb-2">{section.description}</p>
                  )}
                  {section.source_chapters && (
                    <p className="text-[10px] text-secondary/70 mb-2">
                      📖 Source: {section.source_chapters}
                    </p>
                  )}
                  {section.items && section.items.length > 0 && (
                    <ul className="space-y-1 ml-7">
                      {section.items.map((item, j) => (
                        <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-muted-foreground/40">•</span>
                          <span>
                            <strong>{item.title}</strong>
                            {item.description && ` — ${item.description}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Cross-builder preview */}
      {proposal.cross_builder_outputs && proposal.cross_builder_outputs.length > 0 && (
        <Card className="p-4 border-secondary/15 bg-secondary/3">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-secondary" />
            When you approve, I'll also prepare:
          </h3>
          <div className="grid gap-1.5">
            {proposal.cross_builder_outputs.map((output, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowRight className="h-3 w-3 text-secondary shrink-0" />
                <span>
                  <strong>{output.label}</strong>
                  {output.description && ` — ${output.description}`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleApprove}
          className="flex-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold h-12 text-sm"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Looks Great — Generate Everything
        </Button>
      </div>
      <p className="text-[10px] text-center text-muted-foreground/50">
        You can edit any field above before generating. Abby will use your changes.
      </p>
    </motion.div>
  );
}
