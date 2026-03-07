import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/shared-backend";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-manuscript`;

const UPLOAD_STAGES = [
  { label: "Uploading file…", threshold: 0 },
  { label: "Abby is reading your manuscript — this may take 2–3 minutes for longer books…", threshold: 5 },
  { label: "Extracting chapters and key frameworks…", threshold: 45 },
  { label: "Almost there — processing final pages…", threshold: 120 },
];

interface ManuscriptUploadProps {
  bookId: string;
  bookTitle: string;
  compact?: boolean;
  onUploadComplete?: () => void;
  onContinue?: () => void;
}

export default function ManuscriptUpload({ bookId, bookTitle, compact = false, onUploadComplete, onContinue }: ManuscriptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasManuscript, setHasManuscript] = useState(false);
  const [charCount, setCharCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (uploading) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [uploading]);

  const currentStage = UPLOAD_STAGES.filter(s => elapsedSeconds >= s.threshold).pop() || UPLOAD_STAGES[0];
  const fakeProgress = uploading ? Math.min(95, (elapsedSeconds / (elapsedSeconds + 30)) * 100) : 0;

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("Please sign in again.");
    return token;
  };

  useEffect(() => { checkExisting(); }, [bookId]);

  const checkExisting = async () => {
    setChecking(true);
    try {
      const token = await getToken();
      const resp = await fetch(EDGE_FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "check", bookId }),
      });
      const result = await resp.json();
      if (resp.ok && result.exists) {
        setHasManuscript(true);
        setCharCount(result.characterCount || 0);
      } else {
        setHasManuscript(false);
        setCharCount(null);
      }
    } catch {
      setHasManuscript(false);
      setCharCount(null);
    } finally {
      setChecking(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) { toast.error("File too large. Maximum size is 20MB."); return; }

    const allowedTypes = [".pdf", ".docx", ".doc", ".txt", ".epub"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) { toast.error("Unsupported format. Please upload PDF, DOCX, TXT, or EPUB."); return; }

    setUploading(true);
    try {
      const token = await getToken();
      const safeName = file.name.replace(/[[\]{}()|\\^$*+?#]/g, "_");

      const formData = new FormData();
      formData.append("file", file, safeName);
      formData.append("bookId", bookId);
      formData.append("fileName", safeName);

      const resp = await fetch(EDGE_FN_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Parse failed");

      setHasManuscript(true);
      setCharCount(result.characterCount);
      toast.success(`Manuscript uploaded! ${Math.round(result.characterCount / 1000)}k characters extracted — Abby can now read your book.`);
      onUploadComplete?.();
    } catch (err) {
      console.error("Manuscript upload error:", err);
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      const token = await getToken();
      const resp = await fetch(EDGE_FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "remove", bookId }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Remove failed");

      setHasManuscript(false);
      setCharCount(null);
      toast.success("Manuscript removed.");
    } catch {
      toast.error("Failed to remove manuscript.");
    } finally {
      setUploading(false);
    }
  };

  const UploadProgressIndicator = () => (
    <div className="space-y-2 w-full">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-secondary flex-shrink-0" />
        <p className="text-xs text-foreground font-medium">{currentStage.label}</p>
      </div>
      <Progress value={fakeProgress} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground">
        {elapsedSeconds < 60 ? `${elapsedSeconds}s elapsed` : `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s elapsed`}
        {" · "}Please don't close this page
      </p>
    </div>
  );

  if (checking) {
    return compact ? null : (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking manuscript...
      </div>
    );
  }

  if (compact) {
    if (uploading) {
      return (
        <div className="w-full px-1 py-2" onClick={(e) => e.stopPropagation()}>
          <UploadProgressIndicator />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {hasManuscript ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Manuscript
          </span>
        ) : (
          <>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 border-dashed border-amber-400/50 text-amber-600 hover:bg-amber-50" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-3 w-3" /> Upload Manuscript
            </Button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.epub" className="hidden" onChange={handleFileSelect} />
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

      {uploading ? (
        <UploadProgressIndicator />
      ) : (
        <div className="space-y-2">
          {hasManuscript ? (
            <>
              {onContinue && (
                <Button size="sm" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 text-sm font-semibold" onClick={onContinue}>
                  Continue — Let Abby read &amp; advise →
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-3 w-3 mr-1" /> Replace
                </Button>
                <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive" onClick={handleRemove} disabled={uploading}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
            </>
          ) : (
            <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-3 w-3 mr-1" /> Upload Manuscript
            </Button>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">Supports PDF, DOCX, TXT, EPUB (max 20MB)</p>
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.epub" className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
