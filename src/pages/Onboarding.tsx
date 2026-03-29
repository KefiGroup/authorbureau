import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { Loader2, Upload, BookOpen, Search, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@/assets/logo-icon.webp";

const GENRES = [
  "Business", "Self-Help", "Leadership", "Finance", "Health",
  "Spirituality", "Parenting", "Education", "Technology", "Other",
];

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Singapore",
  "Malaysia", "India", "Philippines", "South Africa", "Nigeria",
  "Kenya", "Germany", "France", "Netherlands", "Other",
];

const GOAL_OPTIONS = [
  "Sell more books",
  "Build my audience",
  "Launch a business",
  "All of the above",
];

const REVENUE_OPTIONS = [
  "Under $1,000",
  "$1,000–$5,000",
  "$5,000–$20,000",
  "$20,000+",
];

const TIME_OPTIONS = [
  "1–3 hours",
  "3–7 hours",
  "7+ hours",
];

type BookPath = "upload" | "writing" | "published" | null;

interface ProfileData {
  full_name: string;
  pen_name: string;
  genre: string;
  target_audience: string;
  country: string;
  linkedin_url: string;
  website_url: string;
  bio_short: string;
}

interface GoalsData {
  primary_goal: string;
  revenue_target: string;
  time_investment: string;
}

export default function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Profile
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    pen_name: "",
    genre: "",
    target_audience: "",
    country: "",
    linkedin_url: "",
    website_url: "",
    bio_short: "",
  });

  // Step 2 — Book
  const [bookPath, setBookPath] = useState<BookPath>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [isbn, setIsbn] = useState("");
  const [amazonUrl, setAmazonUrl] = useState("");
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [abbyMessage, setAbbyMessage] = useState("");
  const [bookProcessing, setBookProcessing] = useState(false);

  // Step 3 — Goals
  const [goals, setGoals] = useState<GoalsData>({
    primary_goal: "",
    revenue_target: "",
    time_investment: "",
  });
  const [goalStep, setGoalStep] = useState(0);

  // Step 4 — Platform Setup
  const [setupStatus, setSetupStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [setupMessage, setSetupMessage] = useState("");

  // Pre-fill profile from existing data
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("author_profiles")
        .select("pen_name, bio_short, linkedin_url, website_url, genres, location_country")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setProfile((prev) => ({
          ...prev,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
          pen_name: data.pen_name || "",
          bio_short: data.bio_short || "",
          linkedin_url: data.linkedin_url || "",
          website_url: data.website_url || "",
          genre: data.genres?.[0] || "",
          country: data.location_country || "",
        }));
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  // ── Step 1: Save Profile ──
  const saveProfile = async () => {
    if (!profile.full_name || !profile.genre || !profile.target_audience || !profile.country || !profile.bio_short) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("author_profiles")
        .update({
          pen_name: profile.pen_name || profile.full_name,
          bio_short: profile.bio_short,
          linkedin_url: profile.linkedin_url || null,
          website_url: profile.website_url || null,
          genres: [profile.genre],
          location_country: profile.country,
          tagline: profile.target_audience,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      setStep(2);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2: Handle Book ──
  const handleManuscriptUpload = async () => {
    if (!manuscriptFile) return;
    setBookProcessing(true);
    setUploadProgress(10);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      // Get author profile id
      const { data: ap } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!ap) throw new Error("Author profile not found");

      // Upload file to storage
      const filePath = `${ap.id}/${Date.now()}-${manuscriptFile.name}`;
      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from("manuscripts")
        .upload(filePath, manuscriptFile);
      if (uploadError) throw uploadError;
      setUploadProgress(60);

      // Call parse-manuscript
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-manuscript`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: "parse",
            manuscriptUrl: filePath,
            authorId: ap.id,
          }),
        }
      );
      setUploadProgress(90);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Parsing failed");

      setUploadProgress(100);
      const ctx = result.context || {};
      const frameworkCount = ctx.key_frameworks?.length || 0;
      const commercialCount = ctx.commercial_angles?.length || 0;
      setAbbyMessage(
        `I have read your manuscript. I found ${frameworkCount} key frameworks and ${commercialCount} commercial opportunities. Let us build your business.`
      );
      setTimeout(() => setStep(3), 2000);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setBookProcessing(false);
    }
  };

  const handlePublishedBook = async () => {
    if (!bookTitle) {
      toast({ title: "Missing title", description: "Please enter your book title.", variant: "destructive" });
      return;
    }
    setBookProcessing(true);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      const { data: ap } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!ap) throw new Error("Author profile not found");

      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-published-book`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            bookTitle,
            isbn: isbn || undefined,
            amazonUrl: amazonUrl || undefined,
            author_id: ap.id,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Research failed");

      setAbbyMessage(result.abby_message || `I found your book "${bookTitle}". Let us build your business.`);

      // Also create a book record
      const slug = bookTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await supabase.from("books").insert({
        title: bookTitle,
        slug,
        author_id: ap.id,
        owner_email: user.email,
        amazon_url: amazonUrl || null,
      });

      setTimeout(() => setStep(3), 2000);
    } catch (err: any) {
      toast({ title: "Research failed", description: err.message, variant: "destructive" });
    } finally {
      setBookProcessing(false);
    }
  };

  const handleWritingPath = async () => {
    try {
      const { data: ap } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!ap) throw new Error("Author profile not found");

      // Save a WIP context
      await supabase.from("author_context").insert({
        author_id: ap.id,
        book_title: "Work in Progress",
        core_thesis: "Author is currently writing their book.",
      });

      setAbbyMessage("No problem. Head to AI Writing Studio when you are ready. You can return here to complete setup once your manuscript is ready.");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // ── Step 3: Save Goals ──
  const saveGoals = async () => {
    setSaving(true);
    try {
      const { data: ap } = await supabase
        .from("author_profiles")
        .select("id, business_plan_json")
        .eq("user_id", user.id)
        .single();
      if (!ap) throw new Error("Author profile not found");

      const existingPlan = (ap.business_plan_json as Record<string, any>) || {};
      await supabase
        .from("author_profiles")
        .update({
          business_plan_json: { ...existingPlan, goals: { ...goals } } as any,
        })
        .eq("id", ap.id);

      setStep(4);
      // Auto-start platform setup
      startPlatformSetup(ap.id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Step 4: Platform Setup ──
  const startPlatformSetup = async (authorId: string) => {
    setSetupStatus("working");
    setSetupMessage("Setting up your personalised platform. This takes about 30 seconds...");

    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      // Call provision-ghl-subaccount
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-ghl-subaccount`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ author_id: authorId }),
        },
        45000
      );
      const result = await res.json();

      if (!res.ok) {
        // Non-blocking failure — continue anyway
        console.error("GHL provisioning issue:", result.error);
        setSetupMessage("Your profile is set up. We are finalising your platform in the background — it will be ready within a few minutes.");
      } else {
        setSetupMessage("Your platform is ready. I have read your book and I am ready to build your business. Let us begin your consultation.");
      }

      // Mark onboarding as complete
      await supabase
        .from("author_profiles")
        .update({ onboarding_completed: true })
        .eq("id", authorId);

      setSetupStatus("done");
    } catch (err: any) {
      console.error("Platform setup error:", err);
      setSetupMessage("Your profile is set up. We are finalising your platform in the background — it will be ready within a few minutes.");

      // Mark onboarding complete even on failure (non-blocking)
      await supabase
        .from("author_profiles")
        .update({ onboarding_completed: true })
        .eq("id", authorId);

      setSetupStatus("done");
    }
  };

  const goToDashboard = () => {
    navigate("/dashboard?section=build-business");
  };

  // ── Step Indicator ──
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s < step
                ? "bg-secondary text-secondary-foreground"
                : s === step
                ? "bg-secondary text-secondary-foreground ring-2 ring-secondary/30 ring-offset-2 ring-offset-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {s < step ? <Check className="h-4 w-4" /> : s}
          </div>
          {s < 4 && <div className={`w-8 h-0.5 ${s < step ? "bg-secondary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center gap-2">
          <img src={logoIcon} alt="Authors Bureau" className="h-8 w-8" />
          <span className="font-heading text-xl font-bold">
            Authors <span className="text-gradient-gold">Bureau</span>
          </span>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl py-12">
        <StepIndicator />

        {/* ═══ STEP 1: Author Profile ═══ */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="font-heading text-2xl font-bold mb-2">Step 1: Your Author Profile</h1>
              <p className="text-muted-foreground text-sm">Tell us about yourself so ABBY can personalise your business plan.</p>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Full Name <span className="text-destructive">*</span></label>
                <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Your full name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pen Name <span className="text-muted-foreground text-xs">(optional)</span></label>
                <Input value={profile.pen_name} onChange={(e) => setProfile({ ...profile, pen_name: e.target.value })} placeholder="Defaults to your full name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Genre / Niche <span className="text-destructive">*</span></label>
                <Select value={profile.genre} onValueChange={(v) => setProfile({ ...profile, genre: v })}>
                  <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
                  <SelectContent>{GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Target Audience <span className="text-destructive">*</span></label>
                <Input value={profile.target_audience} onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })} placeholder="e.g., Mid-career professionals aged 35–55" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Country <span className="text-destructive">*</span></label>
                <Select value={profile.country} onValueChange={(v) => setProfile({ ...profile, country: v })}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">LinkedIn URL <span className="text-muted-foreground text-xs">(optional)</span></label>
                <Input value={profile.linkedin_url} onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/yourname" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Website URL <span className="text-muted-foreground text-xs">(optional)</span></label>
                <Input value={profile.website_url} onChange={(e) => setProfile({ ...profile, website_url: e.target.value })} placeholder="https://yourwebsite.com" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Short Bio <span className="text-destructive">*</span>
                  <span className="text-muted-foreground text-xs ml-2">({profile.bio_short.split(/\s+/).filter(Boolean).length}/150 words)</span>
                </label>
                <Textarea
                  value={profile.bio_short}
                  onChange={(e) => setProfile({ ...profile, bio_short: e.target.value })}
                  placeholder="A brief bio about you and your expertise..."
                  rows={4}
                />
              </div>
            </div>

            <Button onClick={saveProfile} disabled={saving} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Continue to Step 2 <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* ═══ STEP 2: Your Book ═══ */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="font-heading text-2xl font-bold mb-2">Step 2: Your Book</h1>
              <p className="text-muted-foreground text-sm">How would you like to add your book?</p>
            </div>

            {abbyMessage && (
              <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 text-sm text-foreground">
                <p className="font-medium text-secondary mb-1">✨ ABBY says:</p>
                <p>{abbyMessage}</p>
              </div>
            )}

            {!bookPath && (
              <div className="grid gap-4">
                <button
                  onClick={() => setBookPath("upload")}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-secondary/50 hover:bg-muted/50 transition-colors text-left"
                >
                  <Upload className="h-8 w-8 text-secondary shrink-0" />
                  <div>
                    <p className="font-medium">Upload Manuscript</p>
                    <p className="text-sm text-muted-foreground">PDF or DOCX, max 50MB. ABBY will read and analyse it.</p>
                  </div>
                </button>
                <button
                  onClick={() => setBookPath("published")}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-secondary/50 hover:bg-muted/50 transition-colors text-left"
                >
                  <Search className="h-8 w-8 text-secondary shrink-0" />
                  <div>
                    <p className="font-medium">Published Book</p>
                    <p className="text-sm text-muted-foreground">Already published? ABBY will research it online.</p>
                  </div>
                </button>
                <button
                  onClick={() => { setBookPath("writing"); handleWritingPath(); }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-secondary/50 hover:bg-muted/50 transition-colors text-left"
                >
                  <BookOpen className="h-8 w-8 text-secondary shrink-0" />
                  <div>
                    <p className="font-medium">I Am Writing It Now</p>
                    <p className="text-sm text-muted-foreground">No problem. Start building when your manuscript is ready.</p>
                  </div>
                </button>
              </div>
            )}

            {/* Path A: Upload */}
            {bookPath === "upload" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Manuscript File (PDF or DOCX)</label>
                  <Input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => setManuscriptFile(e.target.files?.[0] || null)}
                  />
                </div>
                {uploadProgress > 0 && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setBookPath(null)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleManuscriptUpload}
                    disabled={!manuscriptFile || bookProcessing}
                    className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  >
                    {bookProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Upload & Analyse
                  </Button>
                </div>
              </div>
            )}

            {/* Path C: Published */}
            {bookPath === "published" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Book Title <span className="text-destructive">*</span></label>
                  <Input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="Your book title" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">ISBN <span className="text-muted-foreground text-xs">(optional)</span></label>
                  <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="978-..." />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Amazon URL <span className="text-muted-foreground text-xs">(optional)</span></label>
                  <Input value={amazonUrl} onChange={(e) => setAmazonUrl(e.target.value)} placeholder="https://amazon.com/dp/..." />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setBookPath(null)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handlePublishedBook}
                    disabled={!bookTitle || bookProcessing}
                    className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  >
                    {bookProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Research My Book
                  </Button>
                </div>
              </div>
            )}

            {/* Path B: Writing */}
            {bookPath === "writing" && abbyMessage && (
              <div className="space-y-4">
                <Button onClick={() => navigate("/ai-writing-studio")} variant="outline" className="w-full">
                  Go to AI Writing Studio <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button onClick={() => setStep(3)} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  Continue Setup <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 3: Your Goals ═══ */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="font-heading text-2xl font-bold mb-2">Step 3: Your Goals</h1>
              <p className="text-muted-foreground text-sm">ABBY needs to understand what you want to achieve.</p>
            </div>

            <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 text-sm">
              <p className="font-medium text-secondary mb-2">
                {goalStep === 0 && "What is your primary goal with this book?"}
                {goalStep === 1 && "What is your monthly revenue target?"}
                {goalStep === 2 && "How much time can you invest each week?"}
              </p>
            </div>

            <div className="grid gap-3">
              {goalStep === 0 && GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setGoals({ ...goals, primary_goal: opt }); setGoalStep(1); }}
                  className={`p-3 rounded-xl border text-left text-sm font-medium transition-colors ${
                    goals.primary_goal === opt
                      ? "border-secondary bg-secondary/10 text-secondary"
                      : "border-border hover:border-secondary/50"
                  }`}
                >
                  {opt}
                </button>
              ))}
              {goalStep === 1 && REVENUE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setGoals({ ...goals, revenue_target: opt }); setGoalStep(2); }}
                  className={`p-3 rounded-xl border text-left text-sm font-medium transition-colors ${
                    goals.revenue_target === opt
                      ? "border-secondary bg-secondary/10 text-secondary"
                      : "border-border hover:border-secondary/50"
                  }`}
                >
                  {opt}
                </button>
              ))}
              {goalStep === 2 && TIME_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setGoals({ ...goals, time_investment: opt }); }}
                  className={`p-3 rounded-xl border text-left text-sm font-medium transition-colors ${
                    goals.time_investment === opt
                      ? "border-secondary bg-secondary/10 text-secondary"
                      : "border-border hover:border-secondary/50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {goalStep === 2 && goals.time_investment && (
              <Button onClick={saveGoals} disabled={saving} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue to Final Step <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {goalStep > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setGoalStep(goalStep - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Previous question
              </Button>
            )}
          </div>
        )}

        {/* ═══ STEP 4: Platform Setup ═══ */}
        {step === 4 && (
          <div className="space-y-6 text-center">
            <div className="mb-8">
              <h1 className="font-heading text-2xl font-bold mb-2">Step 4: Setting Up Your Platform</h1>
            </div>

            <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-6">
              {setupStatus === "working" && (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-secondary" />
                  <p className="text-sm text-muted-foreground">{setupMessage}</p>
                </div>
              )}
              {setupStatus === "done" && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Check className="h-6 w-6 text-secondary" />
                  </div>
                  <p className="text-sm font-medium text-secondary">✨ ABBY says:</p>
                  <p className="text-sm text-foreground">{setupMessage}</p>
                </div>
              )}
            </div>

            {setupStatus === "done" && (
              <Button onClick={goToDashboard} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                Begin Your Consultation <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
