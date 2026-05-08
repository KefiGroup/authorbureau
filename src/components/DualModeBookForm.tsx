import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, Image, Link as LinkIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import SiteThemePicker from "@/components/dashboard/SiteThemePicker";
import GenreRecommendationPreview from "@/components/dashboard/GenreRecommendationPreview";

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
  amazonKindleUrl: string;
  authorName: string;
  authorBio: string;
  authorPhotoUrl: string;
  bestsellerProofUrl: string;
}

interface DualModeBookFormProps {
  authorId: string;
  editBookId?: string;
  initialData?: Partial<BookFormData>;
  onSuccess?: (bookId: string) => void;
  onCancel?: () => void;
}

export default function DualModeBookForm({
  authorId,
  editBookId,
  initialData,
  onSuccess,
  onCancel,
}: DualModeBookFormProps) {
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<BookFormData>({
    title: initialData?.title || "",
    subtitle: initialData?.subtitle || "",
    description: initialData?.description || "",
    pages: initialData?.pages || null,
    rating: initialData?.rating || null,
    genre: initialData?.genre || "",
    badges: initialData?.badges || [],
    price: initialData?.price || "",
    currency: initialData?.currency || "USD",
    kindlePrice: initialData?.kindlePrice || "",
    paperbackPrice: initialData?.paperbackPrice || "",
    coverImageUrl: initialData?.coverImageUrl || "",
    amazonUrl: initialData?.amazonUrl || "",
    amazonKindleUrl: initialData?.amazonKindleUrl || "",
    authorName: initialData?.authorName || "",
    authorBio: initialData?.authorBio || "",
    authorPhotoUrl: initialData?.authorPhotoUrl || "",
    bestsellerProofUrl: initialData?.bestsellerProofUrl || "",
  });

  // Auto-fill author fields from Cloud's local author_profiles (synced from PublishNow)
  useEffect(() => {
    async function loadProfile() {
      const { supabase: cloudSupabase } = await import("@/integrations/supabase/client");
      const { data } = await cloudSupabase
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

  

  const [badgeInput, setBadgeInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Try Cloud session first, then shared backend
      const { supabase: cloudClient } = await import("@/integrations/supabase/client");
      let session: any = null;
      const { data: cloudSession } = await cloudClient.auth.getSession();
      if (cloudSession?.session) {
        session = cloudSession.session;
      } else {
        const { data: sharedSession } = await sharedSupabase.auth.getSession();
        session = sharedSession?.session;
      }
      if (!session) {
        toast({ title: "Not signed in", description: "Please sign in first", variant: "destructive" });
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-book-cover`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      update("coverImageUrl", result.url);
      toast({ title: "Cover uploaded!", description: "Image uploaded successfully." });
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleSaveBook = async () => {
    if (!form.title || !form.description) {
      toast({
        title: "Missing required fields",
        description: "Please fill in title and description",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Try Cloud session first, then shared backend
      const { supabase: cloudClient } = await import("@/integrations/supabase/client");
      let session: any = null;
      const { data: cloudSession } = await cloudClient.auth.getSession();
      if (cloudSession?.session) {
        session = cloudSession.session;
      } else {
        const { data: sharedSession } = await sharedSupabase.auth.getSession();
        session = sharedSession?.session;
      }
      if (!session) {
        toast({ title: "Not signed in", description: "Please sign in first", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const bookPayload = {
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        pages: form.pages,
        rating: form.rating,
        genre: form.genre,
        badges: form.badges,
        price: form.price,
        currency: form.currency,
        kindlePrice: form.kindlePrice,
        paperbackPrice: form.paperbackPrice,
        amazonUrl: form.amazonUrl,
        amazonKindleUrl: form.amazonKindleUrl,
        authorName: form.authorName,
        authorBio: form.authorBio,
        authorPhotoUrl: form.authorPhotoUrl,
        coverImageUrl: form.coverImageUrl,
        bestsellerProofUrl: form.bestsellerProofUrl,
      };

      let response: Response;

      if (editBookId) {
        // Update existing book
        response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ action: "update", bookId: editBookId, ...bookPayload }),
          }
        );
      } else {
        // Create new book
        response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-book`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(bookPayload),
          }
        );
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to save book");
      }

      toast({
        title: editBookId ? "Book updated!" : "Book saved successfully!",
        description: editBookId ? "Your changes have been saved." : "Your book is pending admin review.",
      });

      onSuccess?.(result.id);
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-8">
        <h2 className="font-heading text-2xl font-bold mb-6">{editBookId ? "Edit Book" : "Add Your Book"}</h2>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Enter your book details below. Author info is pulled from your profile automatically.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Book Cover Image */}
          <div>
            <Label>Book Cover Image</Label>
            <div className="flex gap-3 items-start mt-1">
              <div className="flex-1 space-y-2">
                {/* File Upload */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => document.getElementById("cover-file-input")?.click()}
                  >
                    {isUploading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" />Upload Image</>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">or paste URL below</span>
                  <input
                    id="cover-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>
                {/* URL Input */}
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={form.coverImageUrl}
                    onChange={(e) => update("coverImageUrl", e.target.value)}
                    placeholder="Paste image URL (e.g. from Amazon or your website)"
                    className="pl-9"
                  />
                </div>
              </div>
              {form.coverImageUrl && (
                <img
                  src={form.coverImageUrl}
                  alt="Cover preview"
                  className="h-20 w-auto rounded-md shadow-sm object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
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
              <Label>Amazon Paperback URL <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <Input
                value={form.amazonUrl}
                onChange={(e) => update("amazonUrl", e.target.value)}
                placeholder="https://amazon.com/dp/..."
              />
            </div>
            <div>
              <Label>Amazon Kindle URL <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <Input
                value={form.amazonKindleUrl}
                onChange={(e) => update("amazonKindleUrl", e.target.value)}
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

          {/* Bestseller Proof Image */}
          <div>
            <Label>Bestseller Proof Screenshot</Label>
            <p className="text-xs text-muted-foreground mb-2">Upload a screenshot showing your Amazon bestseller rank or badge</p>
            <div className="flex gap-3 items-start">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingProof}
                    onClick={() => document.getElementById("proof-file-input")?.click()}
                  >
                    {isUploadingProof ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" />Upload Image</>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">or paste URL below</span>
                  <input
                    id="proof-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingProof(true);
                      try {
                        const { supabase: cloudClient } = await import("@/integrations/supabase/client");
                        let session: any = null;
                        const { data: cloudSession } = await cloudClient.auth.getSession();
                        if (cloudSession?.session) session = cloudSession.session;
                        else {
                          const { data: sharedSession } = await sharedSupabase.auth.getSession();
                          session = sharedSession?.session;
                        }
                        if (!session) { toast({ title: "Not signed in", variant: "destructive" }); return; }

                        const formData = new FormData();
                        formData.append("file", file);

                        const response = await fetch(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-book-cover`,
                          { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: formData }
                        );
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.error || "Upload failed");
                        update("bestsellerProofUrl", result.url);
                        toast({ title: "Proof image uploaded!" });
                      } catch (err) {
                        toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
                      } finally {
                        setIsUploadingProof(false);
                      }
                    }}
                  />
                </div>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={form.bestsellerProofUrl}
                    onChange={(e) => update("bestsellerProofUrl", e.target.value)}
                    placeholder="Paste bestseller proof image URL"
                    className="pl-9"
                  />
                </div>
              </div>
              {form.bestsellerProofUrl && (
                <img
                  src={form.bestsellerProofUrl}
                  alt="Bestseller proof"
                  className="h-20 w-auto rounded-md shadow-sm object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
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

          {/* Genre-based Recommendations */}
          <GenreRecommendationPreview genre={form.genre} />

          {/* Website Look & Feel */}
          <SiteThemePicker compact />

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSaveBook} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                editBookId ? "Update Book" : "Save Book"
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
