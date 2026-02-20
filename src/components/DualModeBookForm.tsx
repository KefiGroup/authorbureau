import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface BookFormData {
  title: string;
  subtitle: string;
  description: string;
  pages: number | null;
  rating: number | null;
  genre: string;
  badges: string[];
  price: string;
  currency: string;
  kindlePrice: string;
  paperbackPrice: string;
  coverImageUrl: string;
  amazonUrl: string;
  authorName: string;
  authorBio: string;
  authorPhotoUrl: string;
}

interface DualModeBookFormProps {
  authorId: string;
  onSuccess?: (bookId: string) => void;
  onCancel?: () => void;
}

export default function DualModeBookForm({
  authorId,
  onSuccess,
  onCancel,
}: DualModeBookFormProps) {
  const { toast } = useToast();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<BookFormData>({
    title: "",
    subtitle: "",
    description: "",
    pages: null,
    rating: null,
    genre: "",
    badges: [],
    price: "",
    currency: "USD",
    kindlePrice: "",
    paperbackPrice: "",
    coverImageUrl: "",
    amazonUrl: "",
    authorName: "",
    authorBio: "",
    authorPhotoUrl: "",
  });

  // Auto-fill author fields from profile (shared backend has profiles)
  useEffect(() => {
    async function loadProfile() {
      const { data } = await sharedSupabase
        .from("author_profiles")
        .select("pen_name, bio_short, bio_long, photo_url")
        .eq("user_id", authorId)
        .maybeSingle();
      if (data) {
        setForm((prev) => ({
          ...prev,
          authorName: prev.authorName || data.pen_name || "",
          authorBio: prev.authorBio || data.bio_short || data.bio_long || "",
          authorPhotoUrl: prev.authorPhotoUrl || data.photo_url || "",
        }));
      }
    }
    loadProfile();
  }, [authorId]);

  // Sync shared backend session to Cloud client for book operations
  const syncSession = async () => {
    if (!session) return false;
    try {
      await cloudSupabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      return true;
    } catch (err) {
      console.error("Session sync failed:", err);
      return false;
    }
  };

  const [badgeInput, setBadgeInput] = useState("");

  const update = (field: keyof BookFormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleAddBadge = () => {
    if (badgeInput.trim()) {
      update("badges", [...form.badges, badgeInput.trim()]);
      setBadgeInput("");
    }
  };

  const handleRemoveBadge = (index: number) => {
    update(
      "badges",
      form.badges.filter((_, i) => i !== index)
    );
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Cover image must be under 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      // Sync auth session to Cloud before upload
      const synced = await syncSession();
      if (!synced) {
        toast({ title: "Authentication error", description: "Please sign in again", variant: "destructive" });
        setIsUploading(false);
        return;
      }

      // Show preview immediately
      const previewUrl = URL.createObjectURL(file);
      setCoverPreview(previewUrl);

      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${authorId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await cloudSupabase.storage
        .from("book-covers")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = cloudSupabase.storage
        .from("book-covers")
        .getPublicUrl(filePath);

      update("coverImageUrl", urlData.publicUrl);
      toast({ title: "Cover uploaded!", description: "Your book cover has been uploaded." });
    } catch (err) {
      console.error("Upload error:", err);
      setCoverPreview(null);
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const removeCover = () => {
    update("coverImageUrl", "");
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveBook = async () => {
    if (!form.title || !form.description || !form.amazonUrl) {
      toast({
        title: "Missing required fields",
        description: "Please fill in title, description, and Amazon book URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Sync auth session to Cloud before book operations
      const synced = await syncSession();
      if (!synced) {
        toast({ title: "Authentication error", description: "Please sign in again", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const slug = form.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 50);

      const { data: existingBook } = await cloudSupabase
        .from("books")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existingBook) {
        toast({
          title: "Book already exists",
          description: "A book with this title already exists. Please use a different title.",
          variant: "destructive",
        });
        return;
      }

      const { data: newBook, error } = await cloudSupabase
        .from("books")
        .insert({
          author_id: authorId,
          title: form.title,
          subtitle: form.subtitle || null,
          description: form.description,
          slug,
          pages: form.pages,
          rating: form.rating,
          genre: form.genre || null,
          badges: form.badges,
          price: form.price || null,
          currency: form.currency,
          kindle_price: form.kindlePrice || null,
          paperback_price: form.paperbackPrice || null,
          amazon_url: form.amazonUrl,
          author_name: form.authorName,
          author_bio: form.authorBio || null,
          author_photo_url: form.authorPhotoUrl || null,
          cover_image_url: form.coverImageUrl || null,
          entry_mode: "manual",
          ai_enriched: false,
        })
        .select("id")
        .single();

      if (error) {
        console.error("DB insert error:", error.message, error.code, error.details);
        throw error;
      }

      toast({
        title: "Book saved successfully!",
        description: "Your microsite is now live.",
      });

      onSuccess?.(newBook.id);
    } catch (err) {
      console.error("Save error:", err);
      toast({
        title: "Failed to save book",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const displayCover = coverPreview || form.coverImageUrl;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-8">
        <h2 className="font-heading text-2xl font-bold mb-6">Add Your Book</h2>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Enter your book details below. Author info is pulled from your profile automatically.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Book Cover Upload */}
          <div>
            <Label>Book Cover Image</Label>
            <div className="mt-2">
              {displayCover ? (
                <div className="relative inline-block">
                  <img
                    src={displayCover}
                    alt="Book cover preview"
                    className="h-48 w-auto rounded-lg shadow-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeCover}
                    className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-1 shadow-md hover:bg-destructive/90"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex flex-col items-center justify-center w-36 h-48 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-secondary/50 transition-colors cursor-pointer bg-muted/30"
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Image className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <span className="text-xs text-muted-foreground">Upload Cover</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
              {displayCover && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Replace
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Book Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Enter book title"
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => update("subtitle", e.target.value)}
                placeholder="Optional subtitle"
              />
            </div>
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Tell readers about your book"
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Pages</Label>
              <Input
                type="number"
                value={form.pages || ""}
                onChange={(e) => update("pages", e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g. 256"
              />
            </div>
            <div>
              <Label>Genre</Label>
              <Input
                value={form.genre}
                onChange={(e) => update("genre", e.target.value)}
                placeholder="e.g. Self-Help, Finance"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Hardcover Price</Label>
              <Input
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="e.g. $24.99"
              />
            </div>
            <div>
              <Label>Kindle Price</Label>
              <Input
                value={form.kindlePrice}
                onChange={(e) => update("kindlePrice", e.target.value)}
                placeholder="e.g. $4.99"
              />
            </div>
            <div>
              <Label>Paperback Price</Label>
              <Input
                value={form.paperbackPrice}
                onChange={(e) => update("paperbackPrice", e.target.value)}
                placeholder="e.g. $12.99"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Amazon Book URL *</Label>
              <Input
                value={form.amazonUrl}
                onChange={(e) => update("amazonUrl", e.target.value)}
                placeholder="https://amazon.com/dp/..."
              />
            </div>
            <div>
              <Label>Rating (out of 5)</Label>
              <Input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating || ""}
                onChange={(e) => update("rating", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 4.7"
              />
            </div>
          </div>

          {/* Badges */}
          <div>
            <Label>Bestseller Badges</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={badgeInput}
                onChange={(e) => setBadgeInput(e.target.value)}
                placeholder="e.g., #1 Best Seller"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddBadge();
                  }
                }}
              />
              <Button onClick={handleAddBadge} type="button" variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.badges.map((badge, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary/20 px-3 py-1 text-sm"
                >
                  {badge}
                  <button
                    onClick={() => handleRemoveBadge(idx)}
                    className="text-secondary hover:text-secondary/70"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-filled Author Info (read-only display) */}
          {(form.authorName || form.authorPhotoUrl) && (
            <div className="rounded-lg bg-muted/50 border border-border p-4">
              <Label className="text-xs text-muted-foreground mb-2 block">Author Info (from your profile)</Label>
              <div className="flex items-center gap-3">
                {form.authorPhotoUrl && (
                  <img src={form.authorPhotoUrl} alt={form.authorName} className="w-10 h-10 rounded-full object-cover" />
                )}
                <div>
                  <p className="font-semibold text-sm">{form.authorName}</p>
                  {form.authorBio && <p className="text-xs text-muted-foreground line-clamp-1">{form.authorBio}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSaveBook} disabled={isLoading || isUploading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Book & Create Microsite"
              )}
            </Button>
            <Button onClick={onCancel} variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
