import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Paintbrush, Check, X, Sparkles, LayoutTemplate } from "lucide-react";

interface OptInPageData {
  headline?: string;
  subheadline?: string;
  bullet_points?: string[];
  cta_button_text?: string;
  privacy_note?: string;
  social_proof?: string;
  color_palette?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
}

interface Props {
  data: OptInPageData;
  authorName?: string;
  authorPhotoUrl?: string;
  bookCoverUrl?: string;
  onChange: (updated: OptInPageData) => void;
  onSaveHtml?: (html: string) => void;
}

const DESIGN_TEMPLATES = [
  {
    id: "bold-gradient",
    name: "Bold Gradient",
    description: "High-impact gradient hero with strong CTA",
    palette: { primary: "#6366f1", secondary: "#8b5cf6", accent: "#10b981", background: "#ffffff", text: "#1f2937" },
    thumbnail: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  },
  {
    id: "warm-authority",
    name: "Warm Authority",
    description: "Earthy tones that build trust & credibility",
    palette: { primary: "#b45309", secondary: "#d97706", accent: "#059669", background: "#fffbeb", text: "#1c1917" },
    thumbnail: "linear-gradient(135deg, #b45309, #d97706)",
  },
  {
    id: "dark-premium",
    name: "Dark Premium",
    description: "Dark background for a premium, exclusive feel",
    palette: { primary: "#f59e0b", secondary: "#eab308", accent: "#22d3ee", background: "#0f172a", text: "#f1f5f9" },
    thumbnail: "linear-gradient(135deg, #0f172a, #1e293b)",
  },
  {
    id: "clean-minimal",
    name: "Clean Minimal",
    description: "Simple, distraction-free with blue accents",
    palette: { primary: "#2563eb", secondary: "#3b82f6", accent: "#14b8a6", background: "#ffffff", text: "#111827" },
    thumbnail: "linear-gradient(135deg, #2563eb, #3b82f6)",
  },
  {
    id: "coral-energy",
    name: "Coral Energy",
    description: "Vibrant coral for action-oriented audiences",
    palette: { primary: "#e11d48", secondary: "#f43f5e", accent: "#8b5cf6", background: "#fff1f2", text: "#1f2937" },
    thumbnail: "linear-gradient(135deg, #e11d48, #f43f5e)",
  },
  {
    id: "sage-calm",
    name: "Sage & Calm",
    description: "Soft greens for wellness & personal growth",
    palette: { primary: "#059669", secondary: "#10b981", accent: "#6366f1", background: "#f0fdf4", text: "#1f2937" },
    thumbnail: "linear-gradient(135deg, #059669, #10b981)",
  },
];

function generateOptInHtml(data: OptInPageData, authorName?: string, authorPhotoUrl?: string, bookCoverUrl?: string): string {
  const p = data.color_palette || {};
  const primary = p.primary || "#6366f1";
  const secondary = p.secondary || "#8b5cf6";
  const bg = p.background || "#ffffff";
  const textColor = p.text || "#1f2937";
  const accent = p.accent || "#10b981";

  const bullets = (data.bullet_points || [])
    .map(b => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
      <span style="color:${accent};font-weight:bold;font-size:18px;">✓</span>
      <span>${b}</span>
    </li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:${bg}; color:${textColor}; }
  .hero { text-align:center; padding:48px 24px 32px; background:linear-gradient(135deg,${primary}08,${secondary}12); }
  .hero h1 { font-size:28px; font-weight:800; line-height:1.2; margin-bottom:12px; color:${textColor}; }
  .hero p { font-size:16px; color:#6b7280; max-width:500px; margin:0 auto 24px; }
  .benefits { list-style:none; text-align:left; max-width:400px; margin:0 auto 28px; font-size:15px; }
  .form-wrap { max-width:380px; margin:0 auto; }
  .form-wrap input { width:100%; padding:12px 16px; border:1px solid #d1d5db; border-radius:8px; font-size:15px; margin-bottom:10px; }
  .form-wrap button { width:100%; padding:14px; background:${primary}; color:#fff; border:none; border-radius:8px; font-size:16px; font-weight:700; cursor:pointer; }
  .form-wrap button:hover { opacity:0.9; }
  .privacy { font-size:12px; color:#9ca3af; margin-top:10px; text-align:center; }
  .author-section { display:flex; align-items:center; justify-content:center; gap:12px; padding:24px; border-top:1px solid #e5e7eb; margin-top:32px; }
  .author-photo { width:48px; height:48px; border-radius:50%; object-fit:cover; }
  .author-name { font-size:14px; font-weight:600; }
  .footer { text-align:center; padding:24px; border-top:1px solid #e5e7eb; }
  .book-cover { width:80px; height:auto; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
</style>
</head>
<body>
  <div class="hero">
    <h1 data-field="headline">${data.headline || "Your Headline Here"}</h1>
    <p data-field="subheadline">${data.subheadline || "Your subheadline here"}</p>
    <ul class="benefits">${bullets}</ul>
    <div class="form-wrap">
      <input type="text" placeholder="First Name" readonly />
      <input type="email" placeholder="Email Address" readonly />
      <button type="button" data-field="cta_button_text">${data.cta_button_text || "Discover My Stage →"}</button>
      <p class="privacy" data-field="privacy_note">${data.privacy_note || "No spam. Unsubscribe anytime."}</p>
      <p style="font-size:13px;color:#6b7280;margin-top:12px;text-align:center;" data-field="social_proof">${data.social_proof || "Be among the first to discover your stage"}</p>
    </div>
  </div>
  ${authorName || authorPhotoUrl ? `
  <div class="author-section">
    ${authorPhotoUrl ? `<img class="author-photo" src="${authorPhotoUrl}" alt="${authorName || 'Author'}" />` : ""}
    <span class="author-name">${authorName || ""}</span>
  </div>` : ""}
  ${bookCoverUrl ? `
  <div class="footer">
    <img class="book-cover" src="${bookCoverUrl}" alt="Book cover" />
  </div>` : ""}
</body>
</html>`;
}

export default function OptInPageBuilder({ data, authorName, authorPhotoUrl, bookCoverUrl, onChange, onSaveHtml }: Props) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = generateOptInHtml(data, authorName, authorPhotoUrl, bookCoverUrl);

  const applyTemplate = (template: typeof DESIGN_TEMPLATES[0]) => {
    setSelectedTemplateId(template.id);
    const updated = { ...data, color_palette: { ...template.palette } };
    onChange(updated);
    onSaveHtml?.(generateOptInHtml(updated, authorName, authorPhotoUrl, bookCoverUrl));
  };

  const startEdit = (field: string) => {
    const val = field === "bullet_points"
      ? (data.bullet_points || []).join("\n")
      : (data as any)[field] || "";
    setEditValue(val);
    setEditingField(field);
  };

  const saveEdit = () => {
    if (!editingField) return;
    const updated = { ...data };
    if (editingField === "bullet_points") {
      updated.bullet_points = editValue.split("\n").filter(l => l.trim());
    } else {
      (updated as any)[editingField] = editValue;
    }
    onChange(updated);
    setEditingField(null);
    onSaveHtml?.(generateOptInHtml(updated, authorName, authorPhotoUrl, bookCoverUrl));
  };

  const updateColor = (key: string, value: string) => {
    const updated = {
      ...data,
      color_palette: { ...data.color_palette, [key]: value },
    };
    onChange(updated);
    onSaveHtml?.(generateOptInHtml(updated, authorName, authorPhotoUrl, bookCoverUrl));
  };

  const colorEntries = [
    { key: "primary", label: "Primary" },
    { key: "secondary", label: "Secondary" },
    { key: "accent", label: "Accent" },
    { key: "background", label: "Background" },
    { key: "text", label: "Text" },
  ];

const FIELD_HINTS: Record<string, string> = {
  headline: "The big, bold title visitors see first. Make it speak to your reader's #1 pain point or desire.",
  subheadline: "A short sentence that expands on the headline and tells them exactly what they'll get.",
  bullet_points: "List the key benefits your reader gets — one per line. Focus on outcomes & transformations, not features.",
  cta_button_text: "The text on the sign-up button. Action words like 'Discover', 'Get', 'Unlock' convert 2× better than 'Submit'.",
  privacy_note: "A short reassurance shown below the button to reduce sign-up friction.",
  social_proof: "A line that builds trust and urgency — numbers, credentials, or media mentions work best.",
};

const FIELD_EXAMPLES: Record<string, string[]> = {
  headline: [
    "What Stage of Success Are You Really In?",
    "The 5-Minute Quiz That Reveals Your Next Breakthrough",
    "Stop Guessing — Discover Your Growth Stage Today",
  ],
  subheadline: [
    "A 90-second self-assessment for professionals who feel stuck and want a clear next step.",
    "Take this free quiz and get a personalised action plan based on where you are right now.",
    "Find out exactly what's holding you back — and what to do about it.",
  ],
  bullet_points: [
    "Pinpoint exactly where you are in your journey\nGet a personalised action plan in 60 seconds\nDiscover the #1 thing holding you back\nJoin thousands who've already taken the quiz",
    "Identify your unique growth stage\nReceive tailored strategies for your situation\nUnlock clarity on your next best move\nNo fluff — just actionable insights",
  ],
  cta_button_text: [
    "Discover My Stage →",
    "Take the Free Quiz →",
    "Get My Results Now →",
    "Unlock My Action Plan →",
  ],
  privacy_note: [
    "No spam. Unsubscribe anytime.",
    "We respect your privacy. Unsubscribe in one click.",
    "Your email is safe with us. Zero spam, ever.",
  ],
  social_proof: [
    "Join 2,000+ professionals who've discovered their stage",
    "Trusted by entrepreneurs, executives & coaches worldwide",
    "As featured in Forbes, Inc. & Entrepreneur Magazine",
  ],
};

  const FIELD_LABELS: Record<string, string> = {
    headline: "Headline",
    subheadline: "Subheadline",
    bullet_points: "Benefits List",
    cta_button_text: "Button Text",
    privacy_note: "Privacy Note",
    social_proof: "Social Proof",
  };

  return (
    <div className="space-y-5">
      {/* Abby's design advice */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Design Tips</p>
            <p className="text-sm text-muted-foreground">
              Pick a design template below that matches your book's energy. Then customise the headline, subheadline, 
              and benefits to speak directly to your reader's pain point. Keep the CTA action-oriented — 
              "Discover My Stage" converts 2× better than "Download Now."
            </p>
          </div>
        </div>
      </Card>

      {/* Design Templates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <LayoutTemplate className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold">Choose a Design Template</h3>
          <Badge variant="outline" className="text-[10px]">Click to apply</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {DESIGN_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              className={`group rounded-lg border-2 p-2 text-left transition-all hover:shadow-md ${
                selectedTemplateId === t.id
                  ? "border-secondary ring-2 ring-secondary/30"
                  : "border-border hover:border-secondary/50"
              }`}
            >
              <div
                className="w-full h-16 rounded-md mb-2"
                style={{ background: t.thumbnail }}
              />
              <p className="text-xs font-semibold truncate">{t.name}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-2">{t.description}</p>
              {selectedTemplateId === t.id && (
                <Badge className="bg-secondary/20 text-secondary text-[9px] mt-1">Active</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Content Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Paintbrush className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Edit Page Content</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["headline", "subheadline", "bullet_points", "cta_button_text", "privacy_note", "social_proof"].map(field => (
            <Button
              key={field}
              variant={editingField === field ? "secondary" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => startEdit(field)}
            >
              ✏️ {FIELD_LABELS[field] || field}
            </Button>
          ))}
        </div>
      </div>

      {/* Inline edit panel */}
      {editingField && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          {/* Abby's hint + examples */}
          {FIELD_HINTS[editingField] && (
            <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-3 mb-3">
              <div className="flex gap-2 items-start">
                <Sparkles className="h-3.5 w-3.5 text-secondary mt-0.5 shrink-0" />
                <div className="space-y-2 flex-1">
                  <p className="text-xs text-muted-foreground">{FIELD_HINTS[editingField]}</p>
                  {FIELD_EXAMPLES[editingField] && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-secondary">Abby's suggestions — click to use:</p>
                      <div className="flex flex-wrap gap-1">
                        {FIELD_EXAMPLES[editingField].map((ex, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setEditValue(ex)}
                            className="text-[11px] px-2 py-1 rounded-md border border-secondary/30 bg-background hover:bg-secondary/10 text-left transition-colors truncate max-w-full"
                            title={ex}
                          >
                            {ex.length > 60 ? ex.slice(0, 57) + "…" : ex}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">{FIELD_LABELS[editingField] || editingField}</h4>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" onClick={saveEdit}>
                <Check className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </div>
          </div>
          {editingField === "bullet_points" ? (
            <Textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={5} placeholder="One benefit per line" />
          ) : editingField === "cta_button_text" ? (
            <Input value={editValue} onChange={e => setEditValue(e.target.value)} />
          ) : (
            <Textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={3} />
          )}
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant={viewport === "desktop" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewport("desktop")}
          >
            <Monitor className="h-3.5 w-3.5 mr-1" /> Desktop
          </Button>
          <Button
            variant={viewport === "mobile" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewport("mobile")}
          >
            <Smartphone className="h-3.5 w-3.5 mr-1" /> Mobile
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowColorPicker(!showColorPicker)}>
          <Paintbrush className="h-3.5 w-3.5 mr-1" /> Custom Colors
        </Button>
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3">Custom Brand Colors</h4>
          <div className="grid grid-cols-5 gap-3">
            {colorEntries.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={(data.color_palette as any)?.[key] || "#6366f1"}
                    onChange={e => updateColor(key, e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Preview iframe */}
      <Card className="overflow-hidden">
        <div className={`mx-auto transition-all duration-300 ${viewport === "mobile" ? "max-w-[375px]" : "w-full"}`}>
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full border-0"
            style={{ height: "600px" }}
            title="Opt-in page preview"
            sandbox="allow-same-origin"
          />
        </div>
      </Card>
    </div>
  );
}
