import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [mode, setMode] = useState<"amazon" | "manual">("amazon");
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

  // Amazon mode fields
  const [amazonBookUrl, setAmazonBookUrl] = useState("");
  const [amazonAuthorUrl, setAmazonAuthorUrl] = useState("");
  const [badgeInput, setBadgeInput] = useState("");

  const update = (field: keyof BookFormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleScrapeAmazon = async () => {
    if (!amazonBookUrl) {
      toast({
        title: "Amazon book URL required",
        description: "Please enter the Amazon book link",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "scrape-amazon-book",
        {
          body: {
            amazonBookUrl,
            amazonAuthorProfileUrl: amazonAuthorUrl || undefined,
            source_platform: "authorsbureau",
          },
        }
      );

      if (error || !data?.success) {
        throw new Error(data?.error || "Failed to scrape Amazon page");
      }

      // Populate form with scraped data
      const extracted = data.data;
      update("title", extracted.title || "");
      update("subtitle", extracted.subtitle || "");
      update("description", extracted.description || "");
      update("pages", extracted.pages ? parseInt(extracted.pages) : null);
      update("rating", extracted.rating ? parseFloat(extracted.rating) : null);
      
      update("genre", extracted.genre || "");
      update("price", extracted.price || "");
      update("badges", extracted.badges || []);

      if (extracted.authorInfo) {
        update("authorName", extracted.authorInfo.name || "");
        update("authorBio", extracted.authorInfo.bio || "");
      }

      update("amazonUrl", amazonBookUrl);

      toast({
        title: "Amazon data extracted successfully!",
        description: "Review and adjust the details below, then save.",
      });
    } catch (err) {
      console.error("Scrape error:", err);
      toast({
        title: "Scraping failed",
        description:
          err instanceof Error
            ? err.message
            : "Could not extract data from Amazon. Please try manual entry.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    if (!form.title || !form.authorName || !form.description) {
      toast({
        title: "Missing required fields",
        description: "Please fill in title, author name, and description",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Generate slug from title
      const slug = form.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 50);

      // Check if slug already exists
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

      // Insert book
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
          entry_mode: mode,
          ai_enriched: mode === "amazon",
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

        <Tabs value={mode} onValueChange={(v) => setMode(v as "amazon" | "manual")}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="amazon">📦 Scrape from Amazon</TabsTrigger>
            <TabsTrigger value="manual">✍️ Manual Entry</TabsTrigger>
            <TabsTrigger value="publishnow" disabled className="relative opacity-50 cursor-not-allowed">
              🚀 PublishNow.io
              <span className="absolute -top-2 -right-1 rounded-full bg-secondary px-1.5 py-0.5 text-[8px] font-bold text-secondary-foreground leading-none">
                Soon
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Amazon Scraping Mode */}
          <TabsContent value="amazon" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Paste your Amazon book and author profile links. We'll automatically extract
                title, rating, pages, and more.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label>Amazon Book URL *</Label>
                <Input
                  value={amazonBookUrl}
                  onChange={(e) => setAmazonBookUrl(e.target.value)}
                  placeholder="https://amazon.com/dp/..."
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label>Amazon Author Profile URL (optional)</Label>
                <Input
                  value={amazonAuthorUrl}
                  onChange={(e) => setAmazonAuthorUrl(e.target.value)}
                  placeholder="https://amazon.com/author/..."
                  disabled={isLoading}
                />
              </div>

              <Button
                onClick={handleScrapeAmazon}
                disabled={isLoading || !amazonBookUrl}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  "Extract Data from Amazon"
                )}
              </Button>
            </div>

            {form.title && (
              <Alert className="bg-secondary/10 border-secondary/30">
                <AlertCircle className="h-4 w-4 text-secondary" />
                <AlertDescription className="text-secondary/80">
                  Data extracted! Review and customize below before saving.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Manual Entry Mode */}
          <TabsContent value="manual" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Manually enter your book details. You can upload a cover image and set custom
                pricing.
              </AlertDescription>
            </Alert>

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
                <Label>Price</Label>
                <Input
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  placeholder="e.g. $9.99"
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
          </TabsContent>
        </Tabs>

        {/* Common Fields (visible in both modes) */}
        <div className="border-t pt-8 mt-8 space-y-6">
          <h3 className="font-heading font-bold">Author & Metadata</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Author Name *</Label>
              <Input
                value={form.authorName}
                onChange={(e) => update("authorName", e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label>Amazon Book URL</Label>
              <Input
                value={form.amazonUrl}
                onChange={(e) => update("amazonUrl", e.target.value)}
                placeholder="https://amazon.com/dp/..."
              />
            </div>
          </div>

          <div>
            <Label>Author Bio</Label>
            <Textarea
              value={form.authorBio}
              onChange={(e) => update("authorBio", e.target.value)}
              placeholder="Brief bio about yourself"
              rows={3}
            />
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

          {mode === "manual" && (
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
          )}

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
