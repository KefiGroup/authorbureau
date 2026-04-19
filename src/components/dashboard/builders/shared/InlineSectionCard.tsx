import { useEffect, useRef, useState } from "react";
import { Pencil, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { categoryStyles } from "./BuilderTheme";
import { cn } from "@/lib/utils";

/**
 * Reusable inline-editable card for any BP-0x Review tab.
 *
 * Renders a labelled section that flips into edit mode. On save, the matching
 * field inside `content_json` for the given (authorId, nodeId) is updated.
 *
 * Use `path` to point at a deep field inside content (dot-notation, supports
 * numeric indices for arrays, e.g. `editions.0.name`). The `setLocal` callback
 * lets the parent update its in-memory copy so the UI re-renders without a
 * full re-fetch.
 */
export interface InlineSectionCardProps {
  nodeId: string;
  authorId: string | null;
  /** Current full content_json object (used as base for save). */
  content: any;
  /** Callback to update the parent's in-memory content after save. */
  setContent: (next: any) => void;
  /** Dot-path to the field inside content_json. */
  path: string;
  label: string;
  /** Optional helper text under the label. */
  helper?: string;
  /** "input" for short text, "textarea" for long-form, "list" for string[]. */
  type?: "input" | "textarea" | "list";
  /** Display-only render override. If omitted, the raw value is shown. */
  renderDisplay?: (value: any) => React.ReactNode;
  /** Optional placeholder for the editor. */
  placeholder?: string;
  /** Disable the edit affordance entirely. */
  readOnly?: boolean;
}

function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    const idx = Number(key);
    return Number.isInteger(idx) && Array.isArray(acc) ? acc[idx] : acc[key];
  }, obj);
}

function setByPath(obj: any, path: string, value: any): any {
  const keys = path.split(".");
  const next = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  let cursor: any = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const idx = Number(k);
    const isArrIdx = Number.isInteger(idx) && Array.isArray(cursor);
    const childKey = isArrIdx ? idx : k;
    const child = cursor[childKey];
    cursor[childKey] = Array.isArray(child) ? [...child] : { ...(child || {}) };
    cursor = cursor[childKey];
  }
  const lastKey = keys[keys.length - 1];
  const lastIdx = Number(lastKey);
  if (Number.isInteger(lastIdx) && Array.isArray(cursor)) {
    cursor[lastIdx] = value;
  } else {
    cursor[lastKey] = value;
  }
  return next;
}

export default function InlineSectionCard({
  nodeId,
  authorId,
  content,
  setContent,
  path,
  label,
  helper,
  type = "input",
  renderDisplay,
  placeholder,
  readOnly = false,
}: InlineSectionCardProps) {
  const value = getByPath(content, path);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(toDraft(value, type));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(toDraft(value, type));
  }, [editing]);

  const s = categoryStyles.brand;

  const handleSave = async () => {
    if (!authorId) {
      toast.error("Please wait for your profile to load.");
      return;
    }
    setSaving(true);
    const nextValue = fromDraft(draft, type);
    const nextContent = setByPath(content, path, nextValue);
    setContent(nextContent);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from("author_nodes")
        .update({ content_json: nextContent })
        .eq("author_id", authorId)
        .eq("node_id", nodeId);
      setSaving(false);
      if (error) {
        toast.error("Couldn't save your edit. " + error.message);
      } else {
        setSavedAt(Date.now());
        setEditing(false);
        toast.success("Saved");
      }
    }, 200);
  };

  return (
    <Card className={cn("border-border/60", editing && s.border, editing && "ring-1", editing && s.ring)}>
      <CardContent className="pt-4 pb-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
            {helper && <p className="text-[11px] text-muted-foreground mt-0.5">{helper}</p>}
          </div>
          {!readOnly && !editing && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
          )}
          {savedAt && !editing && (
            <span className="text-[10px] text-emerald-600 inline-flex items-center gap-0.5 shrink-0">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </div>

        {!editing ? (
          <div className="text-sm">
            {renderDisplay ? (
              renderDisplay(value)
            ) : type === "list" ? (
              <ul className="space-y-1">
                {(Array.isArray(value) ? value : []).map((it: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">• {it}</li>
                ))}
                {(!Array.isArray(value) || value.length === 0) && (
                  <p className="text-sm text-muted-foreground italic">No items yet</p>
                )}
              </ul>
            ) : (
              <p className="text-sm whitespace-pre-wrap text-foreground">
                {value || <span className="text-muted-foreground italic">Empty</span>}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {type === "input" && (
              <Input
                value={draft}
                placeholder={placeholder}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
            )}
            {type === "textarea" && (
              <Textarea
                value={draft}
                placeholder={placeholder}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                autoFocus
              />
            )}
            {type === "list" && (
              <Textarea
                value={draft}
                placeholder={placeholder || "One item per line"}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                autoFocus
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving</>
                ) : (
                  <><Check className="h-3 w-3 mr-1" /> Save</>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function toDraft(value: any, type: "input" | "textarea" | "list"): string {
  if (type === "list") return Array.isArray(value) ? value.join("\n") : "";
  return value == null ? "" : String(value);
}

function fromDraft(draft: string, type: "input" | "textarea" | "list"): any {
  if (type === "list") {
    return draft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return draft;
}
