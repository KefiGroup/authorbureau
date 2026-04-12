import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Monitor, Smartphone, Paintbrush, RotateCw, Check, X } from "lucide-react";

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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = generateOptInHtml(data, authorName, authorPhotoUrl, bookCoverUrl);

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

  return (
    <div className="space-y-4">
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
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setShowColorPicker(!showColorPicker)}>
            <Paintbrush className="h-3.5 w-3.5 mr-1" /> Colors
          </Button>
        </div>
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3">Brand Colors</h4>
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

      {/* Inline edit panel */}
      {editingField && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold capitalize">{editingField.replace(/_/g, " ")}</h4>
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
          ) : (
            <Input value={editValue} onChange={e => setEditValue(e.target.value)} />
          )}
        </Card>
      )}

      {/* Editable fields quick buttons */}
      <div className="flex flex-wrap gap-1">
        {["headline", "subheadline", "bullet_points", "cta_button_text", "privacy_note", "social_proof"].map(field => (
          <Button
            key={field}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => startEdit(field)}
          >
            ✏️ {field.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

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
