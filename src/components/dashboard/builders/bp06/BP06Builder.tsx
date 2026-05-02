import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchWithTimeout, getActiveToken } from "@/lib/get-active-token";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, FileText, LayoutList, DollarSign, FileDown, Gift, Tag, Upload } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import BuilderIntroBlock, { BP_INTRO_SPECS, BackToReviewLink } from "@/components/dashboard/builders/shared/BuilderIntroBlock";
import BuilderHeader from "@/components/dashboard/builders/shared/BuilderHeader";
import UnifiedStepper from "@/components/dashboard/builders/shared/UnifiedStepper";
import NodeHowItWorks from "@/components/dashboard/builders/shared/NodeHowItWorks";
import InlineSectionCard from "@/components/dashboard/builders/shared/InlineSectionCard";
import ExportPackageCard from "@/components/dashboard/builders/shared/ExportPackageCard";
import BANodeDownloadCard from "@/components/dashboard/builders/shared/BANodeDownloadCard";
import { categoryStyles } from "@/components/dashboard/builders/shared/BuilderTheme";
import { publishNodeToSite, StripeRequiredError } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { downloadWorkbookPdf, buildWorkbookPdfBlob, estimateWorkbookPageCount, normalizeOutcome, type ToolkitItem } from "@/lib/workbook-pdf";
import { downloadWorkbookDocx, buildWorkbookDocxBlob } from "@/lib/workbook-docx";
import { parseWorkbookDocx } from "@/lib/workbook-docx-import";
import { useStripeConnect } from "@/components/dashboard/StripeConnectBanner";
import StripeRequiredModal from "@/components/dashboard/StripeRequiredModal";
import { isPaidNode } from "@/lib/is-paid-node";
import { uploadAndRegisterLibraryAsset } from "@/lib/publish-library-asset";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = [
  "Reading your book's key insights and frameworks...",
  "Designing your companion workbook structure...",
  "Creating 5 workbook sections with exercises...",
  "Writing reflection prompts and action items...",
  "Finalising your workbook blueprint...",
];
const ACT_MSGS = [
  "Setting up your workbook landing page...",
  "Configuring your lead magnet delivery...",
  "Your workbook is almost ready...",
];

interface Props { authorId: string | null; bookId?: string | null; }

export default function BP06Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading, bookId: hookBookId } = useAuthorBook();
  // Prefer the explicit bookId from the route (Book Hub → BP-06), and only
  // fall back to whatever the author hook resolved. This is the pattern used
  // by BP-01 / BP-02 / BP-05; BP-06 was the outlier and was therefore
  // resolving to the "latest" book for authors with multiple books.
  const activeBookId = bookId ?? hookBookId ?? null;
  const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");
  const { onboarding_complete: stripeReady, loading: stripeLoading } = useStripeConnect();
  const hasResolvedBook = hasBook || Boolean(resolvedBookTitle) || Boolean(detectedBookTitle && detectedBookTitle !== "your book");
  const effectiveBookTitle = (resolvedBookTitle || (detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : "")) || "Authors-Bureau";

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));

      // Per-book resolution. If we have an explicit bookId in scope, prefer:
      //   1. author_context for that exact book
      //   2. that book's title from `books`
      // Only fall back to "latest book" when no bookId is in scope at all.
      if (activeBookId) {
        const { data: ctx } = await supabase
          .from("author_context")
          .select("book_title")
          .eq("author_id", authorId)
          .eq("book_id", activeBookId)
          .maybeSingle();
        if (ctx?.book_title) {
          setResolvedBookTitle(ctx.book_title);
        } else {
          const { data: book } = await supabase
            .from("books")
            .select("title")
            .eq("id", activeBookId)
            .maybeSingle();
          if (book?.title) setResolvedBookTitle(book.title);
        }
      } else {
        const { data: ctx } = await supabase
          .from("author_context")
          .select("book_title")
          .eq("author_id", authorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (ctx?.book_title) {
          setResolvedBookTitle(ctx.book_title);
        } else {
          const { data: book } = await supabase
            .from("books")
            .select("title")
            .eq("author_id", profile?.user_id || authorId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (book?.title) setResolvedBookTitle(book.title);
        }
      }
      // Hydrate from author_nodes first; fall back to draft store so half-edited drafts survive a refresh.
      let nodeQuery = supabase
        .from("author_nodes")
        .select("content_json, status")
        .eq("author_id", authorId)
        .eq("node_id", "BP-06");
      if (activeBookId) nodeQuery = nodeQuery.eq("book_id", activeBookId);
      const { data: node } = await nodeQuery.maybeSingle();
      if (node?.content_json && (node.status === "content_ready" || node.status === "live")) {
        const baseContent = node.content_json as Record<string, unknown>;
        setContent(node.status === "live" ? { ...baseContent, activated: true } : baseContent);
        setStep(node.status === "live" ? 3 : 2);
        return;
      }
      const draft = await loadBuilderDraft(authorId, "BP-06", activeBookId);
      if (draft.content) {
        setContent(draft.content);
        setStep(draft.isLive ? 3 : Math.max(draft.currentStep, 2));
      }
    })();
  }, [authorId, activeBookId]);

  useEffect(() => {
    if (step === 1 || (step === 3 && !content?.activated)) {
      const msgs = step === 1 ? GEN_MSGS : ACT_MSGS;
      setMsgIndex(0);
      intervalRef.current = setInterval(() => setMsgIndex((i) => (i + 1) % msgs.length), 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step, content?.activated]);

  const handleGenerate = async () => {
    console.info("[BP-06] generate clicked", { authorId, activeBookId });
    setStep(1); setError(null);
    try {
      let token = await getActiveToken();
      if (!token) {
        await supabase.auth.refreshSession().catch(() => null);
        token = await getActiveToken();
      }
      if (!token) throw new Error("We couldn't verify your sign-in. Please refresh the page and try again.");
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-bp06-workbook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ author_id: authorId, book_id: activeBookId }),
        },
        180_000,
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Request failed (${res.status})`);
      setContent(data.content);
      setStep(2);
      // Autosave so refresh restores the review step (matches BA-10 behaviour).
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "BP-06", nodeName: "Workbook", content: data.content, currentStep: 2, bookId: activeBookId });
    } catch (e: unknown) {
      const msg = toAbbyError((e as Error)?.message || "Generation failed");
      console.error("[BP-06] generate failed", e);
      setError(msg);
      setStep(0);
      toast.error(msg, { duration: 12000 });
    }
  };

  /**
   * Sprint 55 — Build the workbook DOCX + PDF, upload them to library-assets
   * storage, and stamp the canonical library_asset record on publish.
   *
   * Sprint 55c — Fail loudly. Previously this swallowed upload errors with a
   * console.warn, which silently dropped the workbook from the Library and
   * left authors confused. We now surface the real error so the user (and
   * support) can see why a Library save failed.
   */
  const buildAndUploadDeliverable = async (opts?: { silent?: boolean }) => {
    if (!authorId || !content) return null;
    const [docxBlob, pdfBuilt] = await Promise.all([
      buildWorkbookDocxBlob({ content, bookTitle: effectiveBookTitle, authorName }),
      Promise.resolve(buildWorkbookPdfBlob({ content, bookTitle: effectiveBookTitle, authorName })),
    ]);
    const safeBook = effectiveBookTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
    const docxName = `${safeBook}-workbook.docx`;
    const pdfName = pdfBuilt.filename;
    const asset = await uploadAndRegisterLibraryAsset({
      authorId,
      nodeId: "BP-06",
      title: content.workbook_title || "Workbook",
      primary: { blob: docxBlob, filename: docxName, kind: "docx" },
      pdf: { blob: pdfBuilt.blob, filename: pdfName },
      isPaid: isPaidNode(content),
    });
    if (!opts?.silent) {
      toast.success("Workbook saved to your Library", {
        description: "PDF and Word version are now available in My Library.",
      });
    }
    return asset;
  };

  /**
   * Save-only: uploads the deliverable to the Library without flipping the
   * node to live. Lets authors stash a copy before deciding to publish.
   */
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState<boolean>(Boolean(content?.library_asset));
  const handleSaveToLibrary = async () => {
    if (!authorId || !content) return;
    setSavingToLibrary(true);
    try {
      const asset = await buildAndUploadDeliverable();
      if (asset) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setContent((prev: any) => ({ ...prev, library_asset: asset }));
        setSavedToLibrary(true);
      }
    } catch (e: unknown) {
      const msg = (e as Error)?.message || "Save failed";
      console.error("[BP-06] save-to-library failed", e);
      toast.error("Couldn't save to your Library", {
        description: msg,
        duration: 12000,
      });
    } finally {
      setSavingToLibrary(false);
    }
  };

  const handlePublish = async () => {
    // Pre-flight: paid workbook requires Stripe Connect.
    if (isPaidNode(content) && !stripeReady) {
      setStripeModalOpen(true);
      return;
    }
    setStep(3);
    setError(null);
    try {
      // Sprint 55c — surface upload failures instead of silently publishing
      // without a library_asset (which leaves the workbook missing from the Library).
      let libraryAsset: Awaited<ReturnType<typeof buildAndUploadDeliverable>> = null;
      try {
        libraryAsset = await buildAndUploadDeliverable({ silent: true });
      } catch (uploadErr) {
        const msg = (uploadErr as Error)?.message || "Upload failed";
        console.error("[BP-06] publish: library upload failed", uploadErr);
        toast.error("Couldn't save workbook to your Library", {
          description: `${msg}. Publish was cancelled — try again or contact support.`,
          duration: 14000,
        });
        setError(msg);
        setStep(2);
        return;
      }
      await publishNodeToSite(authorId!, "BP-06", authorSlug, activeBookId, libraryAsset);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setContent((prev: any) => ({ ...prev, activated: true, ...(libraryAsset ? { library_asset: libraryAsset } : {}) }));
      toast.success("Workbook published to your site", {
        description: "Saved to My Library and live on your author page.",
      });
    } catch (e: unknown) {
      if (e instanceof StripeRequiredError) {
        setStripeModalOpen(true);
        setStep(2);
        return;
      }
      setError((e as Error).message);
      setStep(2);
    }
  };

  const handleMakeFree = async () => {
    if (!authorId) return;
    const next = { ...content, suggested_price_usd: 0, pricing_recommendation: "free" };
    setContent(next);
    await autosaveBuilderDraft({ authorId, nodeId: "BP-06", nodeName: "Workbook", content: next, currentStep: 2, bookId: activeBookId });
    // Continue with publish now that it's free.
    setStep(3);
    setError(null);
    try {
      let libraryAsset: Awaited<ReturnType<typeof buildAndUploadDeliverable>> = null;
      try {
        libraryAsset = await buildAndUploadDeliverable({ silent: true });
      } catch (uploadErr) {
        const msg = (uploadErr as Error)?.message || "Upload failed";
        console.error("[BP-06] publish (free): library upload failed", uploadErr);
        toast.error("Couldn't save workbook to your Library", {
          description: `${msg}. Publish was cancelled — try again or contact support.`,
          duration: 14000,
        });
        setError(msg);
        setStep(2);
        return;
      }
      await publishNodeToSite(authorId, "BP-06", authorSlug, activeBookId, libraryAsset);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setContent((prev: any) => ({ ...prev, activated: true, ...(libraryAsset ? { library_asset: libraryAsset } : {}) }));
      toast.success("Workbook published to your site", {
        description: "Saved to My Library and live on your author page.",
      });
    } catch (e: unknown) {
      setError((e as Error).message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <BuilderHeader nodeId="BP-06" title="Workbook" subtitle="A printable companion workbook with chapter exercises" icon={FileText} onBack={() => navigate(bookId ? `/book-hub/${bookId}?tab=revenue-streams` : "/dashboard?section=my-books")} />
        <UnifiedStepper nodeId="BP-06" steps={STEPS} current={step} onStepClick={(i) => { if (i <= step) setStep(i); }} />
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <NodeHowItWorks nodeId="BP-06" />
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Workbook</h2>
            {!isBookLoading && !hasResolvedBook ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I can build your workbook, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate(`/my-books?returnTo=${encodeURIComponent(`/node-builder/BP-06${activeBookId ? `?bookId=${activeBookId}` : ""}`)}`)}>Complete Book Profile</Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! A companion workbook is the perfect free lead magnet — or a paid product in its own right. I'm going to design a complete workbook based on '{effectiveBookTitle}' — with sections, exercises, reflection prompts, and action items. You'll choose whether to give it away or sell it. Ready?</p>
                <div className="mb-4"><BuilderIntroBlock spec={BP_INTRO_SPECS["BP-06"]} /></div>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate} disabled={isBookLoading && !hasResolvedBook}><Sparkles className="h-4 w-4 mr-2" /> Build My Workbook</Button>
              </>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">I hit a snag generating your content. {toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 2 && content && (
          <ReviewStep
            content={content}
            setContent={setContent}
            authorId={authorId}
            bookId={activeBookId}
            authorName={authorName}
            bookTitle={effectiveBookTitle}
            onActivate={handlePublish}
            onPrevious={() => setStep(0)}
            stripeReady={stripeReady}
            stripeLoading={stripeLoading}
            onConnectStripe={() => setStripeModalOpen(true)}
            onSaveToLibrary={handleSaveToLibrary}
            savingToLibrary={savingToLibrary}
            savedToLibrary={savedToLibrary || Boolean(content?.library_asset)}
          />
        )}
        {step === 3 && !content?.activated && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 3 && content?.activated && (
          <>
            <PublishSuccessScreen nodeId="BP-06" authorName={authorName} penNameSlug={authorSlug} />
            <Button variant="default" size="lg" className="w-full" onClick={() => downloadWorkbookPdf({ content, bookTitle: effectiveBookTitle, authorName })}>
              <FileDown className="h-4 w-4 mr-2" /> Download Workbook PDF
            </Button>
            <BANodeDownloadCard
              content={content}
              nodeName="Workbook"
              bookTitle={effectiveBookTitle}
              authorName={authorName}
              guidance="Your workbook package is ready. Download the branded PDF and upload it to PublishNow, or use the TXT/DOCX exports for editing in Word, Google Docs, or your platform of choice."
            />
            <BackToReviewLink onClick={() => setStep(2)} />
          </>
        )}
      </div>
      <StripeRequiredModal
        open={stripeModalOpen}
        onOpenChange={setStripeModalOpen}
        productLabel={isPaidNode(content) ? `$${Number(content?.suggested_price_usd ?? 0)} workbook` : "paid workbook"}
        onMakeFree={handleMakeFree}
      />
    </div>
  );
}

function AbbyCard({ children }: { children: React.ReactNode }) {
  const s = categoryStyles.brand;
  return <Card className={`${s.border} ${s.bg} ${s.glowShadow} overflow-hidden relative`}><div className={`absolute left-0 top-0 bottom-0 w-1 ${s.leftStrip}`} /><CardContent className="pt-6 pl-7"><div className="flex gap-3"><div className={`shrink-0 w-10 h-10 rounded-full ${s.iconBg} flex items-center justify-center`}><Sparkles className={`h-5 w-5 ${s.iconText}`} /></div><div className="flex-1 min-w-0">{children}</div></div></CardContent></Card>;
}

function normalizeWorkbookToolkit(items: unknown): ToolkitItem[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (typeof item === "string") {
      const name = item.trim();
      return name ? [{ name }] : [];
    }
    if (item && typeof item === "object" && "name" in item && typeof item.name === "string") {
      const name = item.name.trim();
      if (!name) return [];
      const type = "type" in item && typeof item.type === "string" ? item.type : undefined;
      const purpose = "purpose" in item && typeof item.purpose === "string" ? item.purpose : undefined;
      const linked_section = "linked_section" in item && typeof item.linked_section === "number" ? item.linked_section : undefined;
      return [{ name, type, purpose, linked_section }];
    }
    return [];
  });
}

interface ReviewStepProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setContent: (c: any) => void;
  authorId: string | null;
  bookId?: string | null;
  authorName: string;
  bookTitle: string;
  onActivate: () => void;
  onPrevious: () => void;
  stripeReady: boolean;
  stripeLoading: boolean;
  onConnectStripe: () => void;
  onSaveToLibrary: () => void;
  savingToLibrary: boolean;
  savedToLibrary: boolean;
}

function ReviewStep({ content, setContent, authorId, bookId, authorName, bookTitle, onActivate, onPrevious, stripeReady, stripeLoading, onConnectStripe, onSaveToLibrary, savingToLibrary, savedToLibrary }: ReviewStepProps) {
  // Locked snapshot of Abby's original recommendation — never mutated by user edits.
  // Falls back to legacy fields for drafts created before the snapshot was added.
  const abbyRec: "free" | "paid" =
    content.abby_recommendation === "paid" || content.abby_recommendation === "free"
      ? content.abby_recommendation
      : (content.pricing_recommendation === "paid" ? "paid" : "free");
  const abbyPrice: number =
    Number(content.abby_recommended_price_usd ?? content.suggested_price_usd ?? 0) || 17;

  // Local pricing state derived from content; persisted via autosave on change.
  const [pricingChoice, setPricingChoice] = useState<"free" | "paid">(
    Number(content.suggested_price_usd ?? 0) > 0 ? "paid" : abbyRec,
  );
  const [paidPrice, setPaidPrice] = useState<number>(
    Number(content.suggested_price_usd ?? 0) > 0 ? Number(content.suggested_price_usd) : abbyPrice,
  );

  const effectivePrice = pricingChoice === "paid" ? paidPrice : 0;
  const isPaid = effectivePrice > 0;
  // Format prices: whole dollars stay short ($10), fractional always show 2 decimals ($9.90)
  const fmtPrice = (n: number): string => {
    const num = Number(n) || 0;
    return Number.isInteger(num) ? `${num}` : num.toFixed(2);
  };
  const pageCount = estimateWorkbookPageCount(content);
  const toolkitItems = normalizeWorkbookToolkit(content.what_youll_get);

  // Rewrite stale page-count claims Abby may have baked into rationales
  // (e.g. "56-page count" / "45 pages") so they match the real PDF.
  const reconcilePageCount = (text?: string): string => {
    if (!text) return "";
    return text
      .replace(/\b\d{1,3}\s*[-–]\s*page\b/gi, `${pageCount}-page`)
      .replace(/\b\d{1,3}\s+pages?\b/gi, `${pageCount} pages`);
  };
  const freeRationale = reconcilePageCount(content.free_rationale);
  const paidRationale = reconcilePageCount(content.paid_rationale);

  // Sync pricing choice into content + persist. Never touches the abby_* snapshot fields.
  const persistPricing = (choice: "free" | "paid", price: number) => {
    const next = { ...content, suggested_price_usd: choice === "paid" ? price : 0, pricing_recommendation: choice };
    setContent(next);
    if (authorId) {
      void autosaveBuilderDraft({ authorId, nodeId: "BP-06", nodeName: "Workbook", content: next, currentStep: 2, bookId: bookId ?? null });
    }
  };

  // Dynamic CTA: replace "Free" wording when priced
  const rawCta = content.sales_page?.cta_button_text || "Download Free Workbook";
  const displayCta = isPaid && /free/i.test(rawCta)
    ? `Get the Workbook — $${paidPrice}`
    : rawCta;

  const recommendationLine = abbyRec === "free"
    ? `Abby recommends FREE — ${content.free_rationale ? "see why below." : "great for list-building."}`
    : `Abby recommends $${abbyPrice} — ${content.paid_rationale ? "see why below." : "the depth justifies a paid product."}`;

  return (
    <div className="space-y-4">
      <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
          <TabsTrigger value="sections" className="text-xs py-2"><LayoutList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sections</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pricing</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs py-2"><Tag className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sales Page</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card><CardContent className="pt-6 space-y-3">
            <h3 className="text-xl font-bold">{content.workbook_title}</h3>
            {content.workbook_subtitle && <p className="text-muted-foreground">{content.workbook_subtitle}</p>}
            {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{pageCount} pages</span>
              <span className="text-xs bg-muted px-2.5 py-1 rounded-full">8.5 × 11" PDF + Word</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium">✓ Amazon KDP-ready</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isPaid ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"}`}>
                {isPaid ? `$${paidPrice}` : "FREE Lead Magnet"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Print format:</span> 8.5 × 11" — the standard Amazon KDP "Large Workbook" trim. Upload the PDF directly to PublishNow.io to list on Amazon as a paperback.
            </p>
            <div><p className="text-xs font-semibold text-muted-foreground mb-1">Transformation Promise</p><p className="text-sm">{content.transformation_promise}</p></div>
            <div><p className="text-xs font-semibold text-muted-foreground mb-1">Who It's For</p><p className="text-sm">{content.who_its_for}</p></div>
            <div><p className="text-xs font-semibold text-muted-foreground mb-2">What You'll Get</p>
              <ul className="space-y-2">
                {toolkitItems.map((item, i: number) => (
                  <li key={`${item.name}-${i}`} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">{item.name}</span>
                      {item.purpose && <p className="text-muted-foreground">{item.purpose}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-4 mt-4">
          {content.sections?.map((s: { number?: number; title?: string; description?: string; exercises?: string[]; outcome?: string }, i: number) => (
            <Card key={i}><CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{s.number}</span><h4 className="font-bold">{s.title}</h4></div>
              <p className="text-sm text-muted-foreground">{s.description}</p>
              <div><p className="text-xs font-semibold text-muted-foreground mb-1">Exercises</p><ul className="space-y-1">{s.exercises?.map((e: string, j: number) => <li key={j} className="text-sm flex items-start gap-2"><span className="text-muted-foreground">{j + 1}.</span>{e}</li>)}</ul></div>
              <Card className="bg-muted/30"><CardContent className="pt-3 pb-3"><p className="text-xs font-semibold text-muted-foreground mb-1">After this section, you can:</p><p className="text-sm">{normalizeOutcome(s.outcome)}</p></CardContent></Card>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4 mt-4">
          <Card><CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm"><span className="font-semibold">Abby's recommendation:</span> {recommendationLine}</p>
            </div>

            <RadioGroup
              value={pricingChoice}
              onValueChange={(v) => {
                const choice = v as "free" | "paid";
                setPricingChoice(choice);
                persistPricing(choice, paidPrice);
              }}
              className="grid sm:grid-cols-2 gap-3"
            >
              <Label htmlFor="price-free" className={`cursor-pointer rounded-lg border-2 p-4 transition ${pricingChoice === "free" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="free" id="price-free" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2"><Gift className="h-4 w-4 text-emerald-600" /><span className="font-bold">FREE Lead Magnet</span></div>
                    <p className="text-xs text-muted-foreground">Capture emails. Build your list. Sell other products later.</p>
                  </div>
                </div>
              </Label>
              <Label htmlFor="price-paid" className={`cursor-pointer rounded-lg border-2 p-4 transition ${pricingChoice === "paid" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="paid" id="price-paid" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /><span className="font-bold">Paid Workbook</span></div>
                    <p className="text-xs text-muted-foreground">Earn revenue per download. Typical band: $7–$47.</p>
                  </div>
                </div>
              </Label>
            </RadioGroup>

            {pricingChoice === "paid" && (
              <div className="space-y-2">
                <Label htmlFor="paid-price" className="text-xs font-semibold text-muted-foreground">Your price (USD)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">$</span>
                  <Input
                    id="paid-price"
                    type="number"
                    min={1}
                    className="w-32 text-2xl font-bold"
                    value={paidPrice}
                    onChange={(e) => {
                      const next = Math.max(1, Number(e.target.value) || 1);
                      setPaidPrice(next);
                      persistPricing("paid", next);
                    }}
                  />
                </div>
              </div>
            )}

            {pricingChoice === "free" && freeRationale && (
              <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Why FREE works</p>
                <p className="text-sm">{freeRationale}</p>
              </div>
            )}
            {pricingChoice === "paid" && paidRationale && (
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs font-semibold text-primary mb-1">Why PAID works</p>
                <p className="text-sm">{paidRationale}</p>
              </div>
            )}
          </CardContent></Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h3 className="font-bold text-sm">Sell on Amazon too (optional)</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Publish your workbook on Amazon KDP first (kdp.amazon.com), then paste the
                  product URLs here. Amazon handles printing and worldwide shipping at no
                  upfront cost. You earn the Amazon royalty directly — Authors Bureau takes nothing.
                </p>
              </div>
              <div>
                <Label htmlFor="amz-paperback" className="text-xs font-semibold text-muted-foreground">Amazon Paperback URL</Label>
                <Input
                  id="amz-paperback"
                  type="url"
                  placeholder="https://www.amazon.com/dp/..."
                  value={content.amazon_paperback_url || ""}
                  onChange={(e) => {
                    const next = { ...content, amazon_paperback_url: e.target.value };
                    setContent(next);
                    if (authorId) void autosaveBuilderDraft({ authorId, nodeId: "BP-06", nodeName: "Workbook", content: next, currentStep: 2, bookId: bookId ?? null });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="amz-kindle" className="text-xs font-semibold text-muted-foreground">Amazon Kindle URL</Label>
                <Input
                  id="amz-kindle"
                  type="url"
                  placeholder="https://www.amazon.com/dp/..."
                  value={content.amazon_kindle_url || ""}
                  onChange={(e) => {
                    const next = { ...content, amazon_kindle_url: e.target.value };
                    setContent(next);
                    if (authorId) void autosaveBuilderDraft({ authorId, nodeId: "BP-06", nodeName: "Workbook", content: next, currentStep: 2, bookId: bookId ?? null });
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Leave blank to show only the "Buy Direct" option on your reader page.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4 mt-4">
          <Card><CardContent className="pt-6 space-y-4">
            <div className="rounded-lg bg-muted/50 p-6 text-center space-y-3">
              <h2 className="text-2xl font-bold">{content.sales_page?.headline}</h2>
              <p className="text-muted-foreground">{content.sales_page?.subheadline}</p>
              <p className="text-sm">{content.sales_page?.pain_point}</p>
              <p className="text-sm">{content.sales_page?.solution_statement}</p>
              <span className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium mt-3">{displayCta}</span>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-start gap-3">
            <FileDown className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold">Download your branded Workbook</h3>
              <p className="text-sm text-muted-foreground">Print-ready US Letter — cover, table of contents, ruled response lines, action plan, and back cover. Download as PDF for upload, or as Word to edit in Microsoft Word and re-import below.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <Button size="lg" onClick={() => downloadWorkbookPdf({ content, bookTitle, authorName })}>
              <FileDown className="h-4 w-4 mr-2" /> Download PDF
            </Button>
            <Button size="lg" variant="secondary" onClick={() => downloadWorkbookDocx({ content, bookTitle, authorName })}>
              <FileDown className="h-4 w-4 mr-2" /> Download Word (.docx)
            </Button>
          </div>
          {/* Sprint 55c — Save to Library without going live. Lets authors stash
              the same branded PDF + DOCX in My Library before deciding to publish. */}
          <div className="rounded-md border border-border bg-background/60 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold flex items-center gap-2">
                {savedToLibrary ? <Check className="h-4 w-4 text-emerald-600" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                {savedToLibrary ? "Saved to your Library" : "Save a copy to your Library"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {savedToLibrary
                  ? "Your branded PDF + Word version are in My Library. Re-save anytime after edits."
                  : "Stash the branded PDF and Word version in My Library without publishing yet."}
              </p>
              {savedToLibrary && (
                <a
                  href="/dashboard?section=my-library"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  View in My Library →
                </a>
              )}
            </div>
            <Button
              variant={savedToLibrary ? "outline" : "secondary"}
              size="sm"
              onClick={onSaveToLibrary}
              disabled={savingToLibrary}
              className="shrink-0"
            >
              {savingToLibrary ? "Saving…" : savedToLibrary ? "Re-save to Library" : "Save to Library"}
            </Button>
          </div>
          <WorkbookDocxImporter
            authorId={authorId}
            bookId={bookId ?? null}
            content={content}
            setContent={setContent}
          />
        </CardContent>
      </Card>

      <ExportPackageCard
        content={content}
        nodeName="Workbook"
        bookTitle={bookTitle}
        authorName={authorName}
        guidance="Need raw text instead? Export the full package as TXT or DOCX for editing in Word, Google Docs, or any platform."
      />

      <div className="space-y-3 pt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick edits</p>
        <InlineSectionCard nodeId="BP-06" authorId={authorId} content={content} setContent={setContent} path="workbook_title" label="Workbook title" type="input" />
        <InlineSectionCard nodeId="BP-06" authorId={authorId} content={content} setContent={setContent} path="transformation_promise" label="Transformation promise" type="textarea" />
        <InlineSectionCard nodeId="BP-06" authorId={authorId} content={content} setContent={setContent} path="sales_page.headline" label="Sales page headline" type="input" />
      </div>
      {isPaid && (
        <Card className={`border ${stripeReady ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${stripeReady ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>
                {stripeReady ? <Check className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {stripeReady ? "Stripe payments connected" : "Stripe payments required"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stripeReady
                    ? "Readers can buy this workbook as soon as it's live."
                    : `Connect Stripe before publishing this paid workbook ($${paidPrice}). Free workbooks can publish anytime.`}
                </p>
                {!stripeReady && !stripeLoading && (
                  <Button size="sm" variant="outline" className="mt-2" onClick={onConnectStripe}>
                    Connect Stripe →
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="ghost" className="sm:w-auto" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button
          className="flex-1"
          size="lg"
          onClick={onActivate}
          disabled={isPaid && !stripeReady && !stripeLoading}
        >
          Publish to My Site<ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Your workbook will be published as {isPaid ? `a paid product at $${paidPrice}` : "a free lead magnet"} on your author site.
      </p>
    </div>
  );
}

interface ImporterProps {
  authorId: string | null;
  bookId?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setContent: (c: any) => void;
}

function WorkbookDocxImporter({ authorId, bookId, content, setContent }: ImporterProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const patch = await parseWorkbookDocx(file);
      if (!patch || Object.keys(patch).length === 0) {
        toast.error("Couldn't read this Word file. Make sure it's the workbook you downloaded from here.");
        return;
      }
      const merged = { ...content, ...patch };
      setContent(merged);
      if (authorId) {
        await autosaveBuilderDraft({ authorId, nodeId: "BP-06", nodeName: "Workbook", content: merged, currentStep: 2, bookId: bookId ?? null });
        let q = supabase
          .from("author_nodes")
          .update({ content_json: merged, personalised_name: merged.workbook_title })
          .eq("author_id", authorId)
          .eq("node_id", "BP-06");
        q = bookId ? q.eq("book_id", bookId) : q.is("book_id", null);
        await q;
      }
      toast.success("Workbook updated from your Word edits.");
    } catch (e) {
      console.error("[BP-06] docx import failed", e);
      toast.error("That Word file couldn't be parsed. Try downloading a fresh copy and editing again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-md border border-dashed border-primary/30 bg-background/60 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Upload className="h-4 w-4 text-primary mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Edited in Word? Re-upload here.</p>
          <p className="text-xs text-muted-foreground">We'll detect your changes (titles, sections, exercises, outcomes) and save them back into your workbook. Then re-download the PDF to publish.</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        {busy ? "Reading your Word file…" : "Upload edited .docx"}
      </Button>
    </div>
  );
}

