import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ManuscriptUploadProps {
  bookId: string;
  bookTitle: string;
  compact?: boolean;
}

export default function ManuscriptUpload({ bookId, bookTitle, compact = false }: ManuscriptUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hasManuscript, setHasManuscript] = useState(false);
  const [charCount, setCharCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;
    checkExisting();
  }, [user, bookId]);

  const checkExisting = async () => {
    setChecking(true);
    const { data } = await supabase
      .from("generated_assets")
      .select("id, content")
      .eq("book_id", bookId)
      .eq("author_id", user!.id)
      .eq("asset_type", "source_material")
      .maybeSingle();

    if (data) {
      setHasManuscript(true);
      setCharCount(data.content?.length || 0);
    } else {
      setHasManuscript(false);
      setCharCount(null);
    }
    setChecking(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 20MB.");
      return;
    }

    const allowedTypes = [".pdf", ".docx", ".doc", ".txt", ".epub"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      toast.error("Unsupported format. Please upload PDF, DOCX, TXT, or EPUB.");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload to storage
      const storagePath = `${user.id}/${bookId}/${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("manuscripts")
        .upload(storagePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      // 2. Call parse edge function
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-manuscript`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bookId, storagePath, fileName: file.name }),
        }
      );

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Parse failed");

      setHasManuscript(true);
      setCharCount(result.characterCount);
      toast.success(`Manuscript uploaded! ${Math.round(result.characterCount / 1000)}k characters extracted — Abby can now read your book.`);
    } catch (err) {
      console.error("Manuscript upload error:", err);
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setUploading(true);
    try {
      await supabase
        .from("generated_assets")
        .delete()
        .eq("book_id", bookId)
        .eq("author_id", user.id)
        .eq("asset_type", "source_material");

      // Also remove from storage
      const { data: files } = await supabase.storage
        .from("manuscripts")
        .list(`${user.id}/${bookId}`);

      if (files && files.length > 0) {
        await supabase.storage
          .from("manuscripts")
          .remove(files.map(f => `${user.id}/${bookId}/${f.name}`));
      }

      setHasManuscript(false);
      setCharCount(null);
      toast.success("Manuscript removed.");
    } catch (err) {
      toast.error("Failed to remove manuscript.");
    } finally {
      setUploading(false);
    }
  };

  if (checking) {
    return compact ? null : (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking manuscript...
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {hasManuscript ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Manuscript
          </span>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 gap-1 border-dashed border-amber-400/50 text-amber-600 hover:bg-amber-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Parsing...</>
              ) : (
                <><Upload className="h-3 w-3" /> Upload Manuscript</>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.epub"
              className="hidden"
              onChange={handleFileSelect}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="h-4 w-4 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold">Book Manuscript</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasManuscript
              ? `✅ Manuscript loaded — ${charCount ? `${Math.round(charCount / 1000)}k characters` : "ready"} for Abby to analyze`
              : "Upload your manuscript so Abby can read your book and generate tailored business products."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hasManuscript ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
              Replace
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:text-destructive"
              onClick={handleRemove}
              disabled={uploading}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Remove
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Parsing manuscript...</>
            ) : (
              <><Upload className="h-3 w-3 mr-1" /> Upload Manuscript</>
            )}
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">Supports PDF, DOCX, TXT, EPUB (max 20MB)</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.epub"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
