import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Video, Upload, Trash2, Loader2, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LessonVideoUploadProps {
  videoUrl: string;
  onVideoChange: (url: string) => void;
  bookId: string;
  lessonId: string;
}

const MAX_SIZE_MB = 500;
const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

export default function LessonVideoUpload({ videoUrl, onVideoChange, bookId, lessonId }: LessonVideoUploadProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<"upload" | "url">(videoUrl && !videoUrl.includes("course-videos") ? "url" : "upload");

  const isExternalUrl = videoUrl && (
    videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ||
    videoUrl.includes("vimeo.com") || videoUrl.includes("loom.com")
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: "Unsupported format", description: "Please upload MP4, WebM, MOV, or AVI files.", variant: "destructive" });
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({ title: "File too large", description: `Maximum size is ${MAX_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${bookId}/${lessonId}.${ext}`;

      // Remove old file if exists
      if (videoUrl?.includes("course-videos")) {
        const oldPath = videoUrl.split("/course-videos/")[1];
        if (oldPath) await supabase.storage.from("course-videos").remove([oldPath]);
      }

      setProgress(30);

      const { error } = await supabase.storage
        .from("course-videos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      setProgress(90);

      const { data: urlData } = supabase.storage
        .from("course-videos")
        .getPublicUrl(path);

      onVideoChange(urlData.publicUrl);
      setProgress(100);
      toast({ title: "Video uploaded!", description: file.name });
    } catch (err) {
      console.error("Video upload failed:", err);
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (videoUrl?.includes("course-videos")) {
      const path = videoUrl.split("/course-videos/")[1];
      if (path) await supabase.storage.from("course-videos").remove([path]);
    }
    onVideoChange("");
    toast({ title: "Video removed" });
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Video className="h-3.5 w-3.5" /> Lesson Video
        </p>
        <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setMode("upload")}
            className={`px-2 py-1 text-[10px] font-medium transition-colors ${mode === "upload" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Upload className="h-3 w-3 inline mr-1" />Upload
          </button>
          <button
            onClick={() => setMode("url")}
            className={`px-2 py-1 text-[10px] font-medium transition-colors ${mode === "url" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LinkIcon className="h-3 w-3 inline mr-1" />URL
          </button>
        </div>
      </div>

      {videoUrl ? (
        <div className="space-y-2">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden border border-border bg-black aspect-video">
            {isExternalUrl ? (
              <iframe src={videoUrl} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
                preload="metadata"
              />
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
              <span className="truncate max-w-[200px]">
                {isExternalUrl ? "External video linked" : "Video uploaded"}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRemove} className="text-xs text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : mode === "upload" ? (
        <div className="space-y-2">
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-secondary/50 hover:bg-secondary/5 transition-colors"
          >
            {uploading ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-secondary mx-auto" />
                <p className="text-xs text-muted-foreground">Uploading... {progress}%</p>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
                  <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Click to upload video</p>
                <p className="text-[10px] text-muted-foreground mt-1">MP4, WebM, MOV, or AVI · Max {MAX_SIZE_MB}MB</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={videoUrl}
            onChange={(e) => onVideoChange(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">Paste a YouTube, Vimeo, Loom, or any video URL</p>
        </div>
      )}
    </Card>
  );
}