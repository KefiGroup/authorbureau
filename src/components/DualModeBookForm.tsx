import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/shared-backend";

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
  const [isLoading, setIsLoading] = useState(false);
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
  });

  // Auto-fill author fields from profile
  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from("author_profiles")
        .select("pen_name, bio_short, bio_long, photo_url")
        .eq("user_id", authorId)
        .maybeSingle();
      if (data) {
        setForm((prev) => ({
          ...prev,
          authorName: prev.authorName || data.pen_name || "",
          authorBio: prev.authorBio || data.bio_short || data.bio_long || "",
          coverImageUrl: prev.coverImageUrl || data.photo_url || "",
        }));
      }
    }
    loadProfile();
  }, [authorId]);

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
      const slug = form.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 50);

      const { data: existingBook } = await supabase
        .from("books")
        .select("id")
        .eq("slug", slug)
        .single();

      if (existingBook) {
        toast({
          title: "Book already exists",
          description: "A book with this title already exists. Please use a different title.",
          variant: "destructive",
        });
        return;
      }

      const { data: newBook, error } = await supabase
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
          amazon_url: form.amazonUrl || null,
          author_name: form.authorName,
          author_bio: form.authorBio || null,
          entry_mode: "manual",
          ai_enriched: false,
        })
        .select("id")
        .single();

      if (error) throw error;

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

          <div className="grid gap-4 sm:grid-cols-2">
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
              <Label>Amazon Book URL (optional)</Label>
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSaveBook} disabled={isLoading} className="flex-1">
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
