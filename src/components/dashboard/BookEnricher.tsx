import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EnrichedData {
  pages?: number;
  rating?: number;
  reviewCount?: number;
  categories?: string[];
  price?: string;
  description?: string;
  error?: string;
}

export default function BookEnricher() {
  const [amazonUrl, setAmazonUrl] = useState('');
  const [authorUrl, setAuthorUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null);
  const [copied, setCopied] = useState(false);

  const handleEnrich = async () => {
    if (!amazonUrl.trim() && !authorUrl.trim()) {
      alert('Please provide at least one URL');
      return;
    }

    setIsLoading(true);
    setEnrichedData(null);

    try {
      const { data, error } = await supabase.functions.invoke('enrich-book-data', {
        body: {
          amazonUrl: amazonUrl.trim() || null,
          authorProfileUrl: authorUrl.trim() || null,
        },
      });

      if (error) {
        setEnrichedData({ error: error.message });
      } else {
        setEnrichedData(data);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to enrich data';
      setEnrichedData({ error: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = formatDataForCopy();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDataForCopy = () => {
    if (!enrichedData) return '';
    
    const lines = [];
    if (enrichedData.pages) lines.push(`Pages: ${enrichedData.pages}`);
    if (enrichedData.rating) lines.push(`Rating: ${enrichedData.rating}/5`);
    if (enrichedData.reviewCount) lines.push(`Reviews: ${enrichedData.reviewCount}`);
    if (enrichedData.price) lines.push(`Price: ${enrichedData.price}`);
    if (enrichedData.categories?.length) lines.push(`Categories: ${enrichedData.categories.join(', ')}`);
    
    return lines.join('\n');
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Enrich Book & Author Data</CardTitle>
          <CardDescription>
            Provide your Amazon book link and author profile link, and we'll automatically extract and populate your microsite with metadata like page count, ratings, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Amazon Book URL</label>
            <Input
              placeholder="https://www.amazon.com/your-book-title/dp/XXXXXXXXXX"
              value={amazonUrl}
              onChange={(e) => setAmazonUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Author Profile URL (optional)</label>
            <Input
              placeholder="https://www.amazon.com/stores/author/XXXXXXXXXX"
              value={authorUrl}
              onChange={(e) => setAuthorUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button
            onClick={handleEnrich}
            disabled={isLoading || (!amazonUrl.trim() && !authorUrl.trim())}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enriching Data...
              </>
            ) : (
              'Enrich Data'
            )}
          </Button>
        </CardContent>
      </Card>

      {enrichedData && (
        <Card className="border-0 shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {enrichedData.error ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Enrichment Error
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-secondary">
                    <CheckCircle2 className="h-5 w-5" />
                    Enriched Data
                  </div>
                )}
              </CardTitle>
              {!enrichedData.error && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="gap-1"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Data
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {enrichedData.error ? (
              <p className="text-sm text-destructive">{enrichedData.error}</p>
            ) : (
              <div className="space-y-3">
                {enrichedData.pages && (
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Page Count</span>
                    <span className="font-semibold">{enrichedData.pages} pages</span>
                  </div>
                )}
                {enrichedData.rating && (
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Rating</span>
                    <span className="font-semibold">{enrichedData.rating}/5 ⭐</span>
                  </div>
                )}
                {enrichedData.reviewCount && (
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Review Count</span>
                    <span className="font-semibold">{enrichedData.reviewCount.toLocaleString()} reviews</span>
                  </div>
                )}
                {enrichedData.price && (
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <span className="font-semibold">{enrichedData.price}</span>
                  </div>
                )}
                {enrichedData.categories?.length ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground block mb-2">Categories</span>
                    <div className="flex flex-wrap gap-2">
                      {enrichedData.categories.map((cat, idx) => (
                        <span key={idx} className="text-xs bg-secondary/20 text-secondary px-2.5 py-1 rounded-full">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!enrichedData.pages && !enrichedData.rating && !enrichedData.reviewCount && (
                  <p className="text-sm text-muted-foreground italic">
                    No metadata was able to be extracted. This may happen if the Amazon page structure is different or blocks scraping.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>💡 Tip:</strong> Use the extracted data to update your book's information. Copy the data above and manually update your book entries with the page count, rating, and categories. This data will be displayed on your book's microsite.
        </p>
      </div>
    </div>
  );
}
