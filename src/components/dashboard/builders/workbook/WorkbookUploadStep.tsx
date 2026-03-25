import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, CheckCircle2, Loader2, X, DollarSign, Sparkles } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import type { WorkbookStepProps } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function WorkbookUploadStep({ stepData, setStepData, onMarkEdited, bookTitle, userId }: WorkbookStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const upload = stepData.upload || {};

  const update = (key: string, value: any) => {
    setStepData(prev => ({
      ...prev,
      upload: { ...prev.upload, [key]: value },
    }));
    onMarkEdited("upload");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be under 50MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/workbooks/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("generated-assets")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("generated-assets")
        .getPublicUrl(path);

      update("fileUrl", urlData.publicUrl);
      update("fileName", file.name);
      update("fileSize", (file.size / (1024 * 1024)).toFixed(1) + " MB");
      toast.success("Workbook PDF uploaded successfully!");
    } catch (err) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/workbook-covers/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("generated-assets")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("generated-assets")
        .getPublicUrl(path);

      update("coverImageUrl", urlData.publicUrl);
      toast.success("Cover image uploaded!");
    } catch (err) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploadingCover(false);
    }
  };

  const hasFile = !!upload.fileUrl;

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <div className="space-y-2">
          <p className="text-sm text-foreground leading-relaxed">
            Upload the workbook you created on <strong>PublishNow.io</strong> for <strong>{bookTitle}</strong>. 
            Once uploaded, you can set your pricing and distribute it as a lead magnet, companion product, or standalone offering.
          </p>
        </div>
      </AbbyRecommendationCard>

      {/* ─── WORKBOOK TITLE ──────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Workbook Title</Label>
        <Input
          value={upload.title || `${bookTitle} — Companion Workbook`}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Be SUCKcessful Companion Workbook"
        />
      </div>

      {/* ─── DESCRIPTION ─────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Description</Label>
        <Textarea
          value={upload.description || ""}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Describe what readers will get from this workbook..."
          rows={3}
        />
      </div>

      {/* ─── FILE UPLOAD ─────────────────────────────────── */}
      <Card className="p-5 border-border bg-card">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-secondary" />
          Workbook PDF
        </h3>

        {hasFile ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{upload.fileName}</p>
              <p className="text-xs text-muted-foreground">{upload.fileSize}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                update("fileUrl", null);
                update("fileName", null);
                update("fileSize", null);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-secondary/50 hover:bg-secondary/5 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 text-secondary mx-auto mb-3 animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            )}
            <p className="text-sm font-medium text-foreground mb-1">
              {uploading ? "Uploading..." : "Click to upload your Workbook PDF"}
            </p>
            <p className="text-xs text-muted-foreground">PDF format, up to 50MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileUpload}
        />
      </Card>

      {/* ─── COVER IMAGE ─────────────────────────────────── */}
      <Card className="p-5 border-border bg-card">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Upload className="h-4 w-4 text-secondary" />
          Cover Image
        </h3>

        {upload.coverImageUrl ? (
          <div className="flex items-start gap-4">
            <img
              src={upload.coverImageUrl}
              alt="Workbook cover"
              className="w-24 h-32 object-cover rounded-lg border border-border"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Cover uploaded</p>
              <p className="text-xs text-muted-foreground mb-2">This will be displayed on your product page</p>
              <Button variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Replace
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => coverInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-secondary/50 hover:bg-secondary/5 transition-colors"
          >
            {uploadingCover ? (
              <Loader2 className="h-6 w-6 text-secondary mx-auto mb-2 animate-spin" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            )}
            <p className="text-sm font-medium text-foreground mb-1">Upload cover image</p>
            <p className="text-xs text-muted-foreground">JPG or PNG, recommended 1600×2400px</p>
          </div>
        )}

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverUpload}
        />
      </Card>

      {/* ─── PRICING ─────────────────────────────────────── */}
      <Card className="p-5 border-border bg-card">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-secondary" />
          Pricing & Distribution
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "free", label: "Free Lead Magnet", desc: "Grow your email list" },
              { value: "paid", label: "Paid Product", desc: "Sell as standalone" },
            ].map(opt => {
              const isSelected = (upload.pricingType || "free") === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => update("pricingType", opt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? "border-secondary bg-secondary/10 ring-1 ring-secondary/20"
                      : "border-border hover:border-secondary/30"
                  }`}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          {upload.pricingType === "paid" && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Price (USD)</Label>
              <Input
                type="number"
                value={upload.price || ""}
                onChange={(e) => update("price", e.target.value)}
                placeholder="e.g. 19.99"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">Recommended: $9.99 – $29.99 for companion workbooks</p>
            </div>
          )}
        </div>
      </Card>

      {/* ─── READINESS CHECK ─────────────────────────────── */}
      <Card className="p-5 border-secondary/20 bg-secondary/5">
        <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-secondary" />
          Upload Checklist
        </h4>
        <div className="space-y-2">
          {[
            { label: "Workbook title set", done: !!(upload.title || bookTitle) },
            { label: "PDF uploaded", done: hasFile },
            { label: "Cover image added", done: !!upload.coverImageUrl },
            { label: "Pricing configured", done: !!(upload.pricingType) },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${item.done ? "text-accent" : "text-muted-foreground/30"}`} />
              <p className={`text-xs ${item.done ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
