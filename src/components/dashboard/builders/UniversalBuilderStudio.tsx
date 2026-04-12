import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Check, ChevronDown, Loader2, Save, ArrowRight,
  Sparkles, ChevronLeft, AlertCircle, Wand2, Pencil,
} from "lucide-react";
import AbbyNarrativeLoading from "./AbbyNarrativeLoading";
import BuilderFooter from "./shared/BuilderFooter";
import ActPhaseBadge from "./shared/ActPhaseBadge";
import AbbyProposal from "./AbbyProposal";
import BuilderGetStartedPage from "./shared/BuilderGetStartedPage";

import ConnectedProductsSection from "./shared/ConnectedProductsSection";
import EstimatedRevenueCard from "./shared/EstimatedRevenueCard";
import BehindTheDesignPanel from "./shared/BehindTheDesignPanel";
import CrossBuilderNotifications from "./CrossBuilderNotifications";
import CrossBuilderPushSummary from "./CrossBuilderPushSummary";
import BuilderUpgradeGate from "./BuilderUpgradeGate";
import AbbyAdvisorSidePanel from "./AbbyAdvisorSidePanel";
import {
  extractHomeStudyDaysFromContent,
  mapCoursePriceTier,
  buildCourseModulesFromStructure,
} from "./builderUtils";
import { useBuilderGeneration, splitSalesAndContent } from "@/hooks/useBuilderGeneration";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, hasTierAccess, TIERS } from "@/hooks/useAuth";
import { useAbbyPlan } from "@/hooks/useAbbyPlan";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import ROIBanner from "@/components/dashboard/ROIBanner";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import BuilderFirstVisitWelcome, { hasSeenBuilderFirstVisit, markBuilderFirstVisitSeen } from "./BuilderFirstVisitWelcome";
import CourseStepRenderer from "./course/CourseStepRenderer";
import HomeStudyStepRenderer from "./home-study/HomeStudyStepRenderer";
import WorkbookStepRenderer from "./workbook/WorkbookStepRenderer";
import AudiobookStepRenderer from "./audiobook/AudiobookStepRenderer";
import MembershipStepRenderer from "./membership/MembershipStepRenderer";
import UpsellStepRenderer from "./upsell/UpsellStepRenderer";
import SocialMediaStepRenderer from "./social-media/SocialMediaStepRenderer";
import WebinarStepRenderer from "./webinar/WebinarStepRenderer";
import PodcastScriptsStepRenderer from "./podcast-scripts/PodcastScriptsStepRenderer";
import EmailMarketingStepRenderer from "./email-marketing/EmailMarketingStepRenderer";
import WebsiteStepRenderer from "./website/WebsiteStepRenderer";
import CoachingStepRenderer from "./coaching/CoachingStepRenderer";
import GroupCoachingStepRenderer from "./group-coaching/GroupCoachingStepRenderer";
import KeynotesStepRenderer from "./keynotes/KeynotesStepRenderer";
import InHouseSpeakerStepRenderer from "./in-house-speaker/InHouseSpeakerStepRenderer";
import TrainingProgramsStepRenderer from "./training-programs/TrainingProgramsStepRenderer";
import AffiliatesStepRenderer from "./affiliates/AffiliatesStepRenderer";
import JVPartnershipsStepRenderer from "./jv-partnerships/JVPartnershipsStepRenderer";
import BigTicketStepRenderer from "./big-ticket/BigTicketStepRenderer";
import RetreatsStepRenderer from "./retreats/RetreatsStepRenderer";
import CertificationStepRenderer from "./certification/CertificationStepRenderer";
import MastermindsStepRenderer from "./masterminds/MastermindsStepRenderer";
import SpecialEditionsStepRenderer from "./special-editions/SpecialEditionsStepRenderer";
import BookSalesStepRenderer from "./book-sales/BookSalesStepRenderer";
import ConventionsStepRenderer from "./conventions/ConventionsStepRenderer";
import FundraisingStepRenderer from "./fundraising/FundraisingStepRenderer";
import ExhibitorsStepRenderer from "./exhibitors/ExhibitorsStepRenderer";
import LeadMagnetStepRenderer from "./lead-magnet/LeadMagnetStepRenderer";
import LicensingStepRenderer from "./licensing/LicensingStepRenderer";
import CommunityStepRenderer from "./community/CommunityStepRenderer";
import RevenueShareStepRenderer from "./revenue-share/RevenueShareStepRenderer";
import WhiteLabelStepRenderer from "./white-label/WhiteLabelStepRenderer";
import EventsStepRenderer from "./events/EventsStepRenderer";
import FranchiseStepRenderer from "./franchise/FranchiseStepRenderer";
import type { BuilderNodeConfig, BuilderStep } from "./builderNodeConfig";

// Map of customRenderer key → component
const RENDERER_MAP: Record<string, React.ComponentType<any>> = {
  "course": CourseStepRenderer,
  "home-study": HomeStudyStepRenderer,
  "workbook": WorkbookStepRenderer,
  "audiobook": AudiobookStepRenderer,
  "membership": MembershipStepRenderer,
  "upsell": UpsellStepRenderer,
  "social-media": SocialMediaStepRenderer,
  "webinar": WebinarStepRenderer,
  "podcast-scripts": PodcastScriptsStepRenderer,
  "email-marketing": EmailMarketingStepRenderer,
  "website": WebsiteStepRenderer,
  "coaching": CoachingStepRenderer,
  "group-coaching": GroupCoachingStepRenderer,
  "keynotes": KeynotesStepRenderer,
  "in-house-speaker": InHouseSpeakerStepRenderer,
  "training-programs": TrainingProgramsStepRenderer,
  "training-program": TrainingProgramsStepRenderer,
  "affiliates": AffiliatesStepRenderer,
  "jv-partnerships": JVPartnershipsStepRenderer,
  "big-ticket": BigTicketStepRenderer,
  "retreats": RetreatsStepRenderer,
  "certification": CertificationStepRenderer,
  "masterminds": MastermindsStepRenderer,
  "special-editions": SpecialEditionsStepRenderer,
  "book-sales": BookSalesStepRenderer,
  "conventions": ConventionsStepRenderer,
  "fundraising": FundraisingStepRenderer,
  "exhibitors": ExhibitorsStepRenderer,
  "lead-magnet": LeadMagnetStepRenderer,
  "licensing": LicensingStepRenderer,
  "community": CommunityStepRenderer,
  "revenue-share": RevenueShareStepRenderer,
  "white-label": WhiteLabelStepRenderer,
  "events": EventsStepRenderer,
  "franchise": FranchiseStepRenderer,
};

interface Props {
  nodeConfig: BuilderNodeConfig;
  onNavigate?: (section: string) => void;
}

// Utility functions moved to ./builderUtils.ts

export default function UniversalBuilderStudio({ nodeConfig, onNavigate }: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, tier, isPremium, isAdmin } = useAuth();

  // Book context from URL params
  const bookId = searchParams.get("bookId") || "";
  const bookTitle = searchParams.get("bookTitle") ? decodeURIComponent(searchParams.get("bookTitle")!) : "";
  const rawBookCoverUrl = searchParams.get("bookCoverUrl");
  const bookCoverUrl = rawBookCoverUrl
    ? (() => {
        try {
          return decodeURIComponent(rawBookCoverUrl);
        } catch (error) {
          return rawBookCoverUrl;
        }
      })()
    : null;

  // Builder state
  const [currentStep, setCurrentStep] = useState(0);
  const firstStepId = nodeConfig.steps[0]?.id;
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftLoadAttempt, setDraftLoadAttempt] = useState(0);
  
  // 3-Act generation engine (replaces old mock generationState)
  const builderGen = useBuilderGeneration(nodeConfig.id, nodeConfig.label);
  const [legacyGenerationState, setLegacyGenerationState] = useState<"idle" | "queued" | "analyzing" | "generating" | "complete" | "error">("idle");

  // Legacy state is used by custom step renderers (e.g. schedule generation)
  const generationState = legacyGenerationState !== "idle"
    ? legacyGenerationState
    : (() => {
        switch (builderGen.act) {
          case "idle": return "idle" as const;
          case "act1_loading": return "analyzing" as const;
          case "act2_proposal": return "idle" as const;
          case "act3_generating": return "generating" as const;
          case "act3_complete": return "complete" as const;
          case "error": return "error" as const;
          default: return "idle" as const;
        }
      })();

  const setGenerationState = (nextState: string) => {
    setLegacyGenerationState(nextState as "idle" | "queued" | "analyzing" | "generating" | "complete" | "error");
  };

  const splitPreview = splitSalesAndContent(builderGen.generatedContent || "");
  const previewSalesText = builderGen.generatedSalesPage || splitPreview.salesPageText;
  const previewContentText = splitPreview.contentText || builderGen.generatedContent;
  const [editedSteps, setEditedSteps] = useState<Set<string>>(new Set());
  const [editingContentDraft, setEditingContentDraft] = useState(false);
  const [contentDraftText, setContentDraftText] = useState("");
  const [resolvedBookCoverUrl, setResolvedBookCoverUrl] = useState<string | null>(bookCoverUrl);

  useEffect(() => {
    setLegacyGenerationState("idle");
  }, [currentStep]);

  // Auto-populate home-study setup fields AND parse daily content when Act 3 completes
  useEffect(() => {
    if (builderGen.act !== "act3_complete" || nodeConfig.customRenderer !== "home-study") return;
    const salesText = previewSalesText;
    const contentText = previewContentText;

    setStepData(prev => {
      const setup = prev.setup || {};
      const updates: Record<string, any> = {};

      // Parse daily content JSON from Act 3 output
      if (contentText) {
        const generatedDays = extractHomeStudyDaysFromContent(contentText);

        if (generatedDays.length > 0) {
          const existingDays = Array.isArray(prev.schedule?.days) ? prev.schedule.days : [];
          const existingByDayNumber = new Map<number, any>(
            existingDays.map((day: any) => [Number(day?.dayNumber), day]),
          );

          const hydratedDays = generatedDays.map((generatedDay, idx) => {
            const dayNumber = Number(generatedDay?.dayNumber ?? idx + 1);
            const existingDay = existingByDayNumber.get(dayNumber);

            return {
              ...generatedDay,
              ...existingDay,
              id: existingDay?.id || generatedDay?.id || crypto.randomUUID(),
              dayNumber,
              weekNumber: Number(generatedDay?.weekNumber ?? existingDay?.weekNumber ?? Math.floor((dayNumber - 1) / 7) + 1),
              theme: generatedDay?.theme || existingDay?.theme || "",
              chapterRef: generatedDay?.chapterRef || existingDay?.chapterRef || "",
              reading: generatedDay?.reading || existingDay?.reading || generatedDay?.concept || existingDay?.concept || "",
              concept: generatedDay?.concept || existingDay?.concept || generatedDay?.reading || existingDay?.reading || "",
              exercise: generatedDay?.exercise || existingDay?.exercise || "",
              reflection: generatedDay?.reflection || existingDay?.reflection || "",
              actionPlan: generatedDay?.actionPlan || existingDay?.actionPlan || "",
              fieldAssignment: generatedDay?.fieldAssignment || existingDay?.fieldAssignment || "",
              accountabilityCheck: generatedDay?.accountabilityCheck || existingDay?.accountabilityCheck || "",
              microHabit: generatedDay?.microHabit || existingDay?.microHabit || "",
              isCatchUp: Boolean(generatedDay?.isCatchUp ?? existingDay?.isCatchUp ?? (dayNumber % 7 === 0)),
            };
          });

          const generatedDayNumbers = new Set(hydratedDays.map((day) => Number(day.dayNumber)));
          const preservedExistingDays = existingDays.filter((day: any) => !generatedDayNumbers.has(Number(day?.dayNumber)));

          updates.schedule = {
            ...prev.schedule,
            days: [...hydratedDays, ...preservedExistingDays].sort((a: any, b: any) => Number(a.dayNumber) - Number(b.dayNumber)),
            _generatedFromSetup: { ...prev.setup },
          };
        }
      }

      // Sales copy extraction
      if (salesText) {
        if (!setup.subtitle) {
          const lines = salesText.split("\n").map((l: string) => l.replace(/^#+\s*/, "").trim()).filter(Boolean);
          const subtitle = lines.find((l: string, i: number) => i > 0 && l.length > 10 && l.length < 120 && !l.startsWith("-") && !l.startsWith("*"));
          if (subtitle) updates.subtitle = subtitle;
        }
        if (!setup.salesCopy) updates.salesCopy = salesText;
        if (!setup.whatsIncluded) {
          const bulletLines = salesText.split("\n")
            .filter((l: string) => /^\s*[-*•]\s/.test(l))
            .map((l: string) => l.trim())
            .join("\n");
          if (bulletLines) updates.whatsIncluded = bulletLines;
        }
      }

      if (!setup.comparePrice && setup.price) {
        const price = parseInt(setup.price);
        if (price > 0) updates.comparePrice = String(Math.ceil(price * 2));
      }

      if (Object.keys(updates).length === 0 && !updates.schedule) return prev;
      const result: Record<string, any> = { ...prev, setup: { ...setup, ...updates } };
      if (updates.schedule) result.schedule = updates.schedule;
      return result;
    });
  }, [builderGen.act, nodeConfig.customRenderer, previewSalesText, previewContentText]);

  // Abby advisor panel
  const [abbyOpen, setAbbyOpen] = useState(false);

  // Plan context
  const { plan, loading: planLoading } = useAbbyPlan(bookId);

  // Manuscript & frameworks context
  const [manuscriptSummary, setManuscriptSummary] = useState<string>("");
  const [frameworks, setFrameworks] = useState<string>("");

  useEffect(() => {
    if (!user || !bookId) return;
    setResolvedBookCoverUrl(bookCoverUrl);

    let isMounted = true;
    (async () => {
      const coverPromise = bookCoverUrl
        ? Promise.resolve({ data: null as { cover_image_url: string | null } | null })
        : supabase
            .from("books")
            .select("cover_image_url")
            .eq("id", bookId)
            .maybeSingle();

      const [msRes, fwRes, coverRes] = await Promise.all([
        supabase
          .from("generated_assets")
          .select("content")
          .eq("book_id", bookId)
          .eq("asset_type", "source_material")
          .maybeSingle(),
        supabase
          .from("generated_assets")
          .select("content")
          .eq("book_id", bookId)
          .eq("asset_type", "frameworks")
          .maybeSingle(),
        coverPromise,
      ]);

      if (!isMounted) return;

      if (msRes.data?.content) setManuscriptSummary(msRes.data.content.slice(0, 3000));
      if (fwRes.data?.content) setFrameworks(fwRes.data.content.slice(0, 2000));
      if (!bookCoverUrl && coverRes.data?.cover_image_url) {
        setResolvedBookCoverUrl(coverRes.data.cover_image_url);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user, bookId, bookCoverUrl]);

  // Check tier access
  const hasAccess = isPremium || isAdmin || hasTierAccess(tier, nodeConfig.requiredTier);

  // Auto-save timer
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const stepDataRef = useRef(stepData);
  const currentStepRef = useRef(currentStep);
  const editedStepsRef = useRef(editedSteps);
  stepDataRef.current = stepData;
  currentStepRef.current = currentStep;
  editedStepsRef.current = editedSteps;

  const clampStepIndex = useCallback((step: number) => {
    return Math.max(0, Math.min(step, nodeConfig.steps.length - 1));
  }, [nodeConfig.steps.length]);

  const handleSaveDraft = useCallback(async (silent = false): Promise<boolean> => {
    if (!user || !bookId) return false;
    setSaving(true);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "save",
            bookId,
            nodeId: nodeConfig.id,
            payload: {
              currentStep: currentStepRef.current,
              stepData: stepDataRef.current,
              editedSteps: Array.from(editedStepsRef.current),
            },
          }),
        },
        15000,
      );

      const result = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(result?.error || "Failed to save draft");
      }

      const savedAt = result?.savedAt ? new Date(result.savedAt) : new Date();
      setLastSaved(savedAt);
      if (!silent) toast({ title: "Draft saved" });
      return true;
    } catch (err) {
      if (!silent) toast({ title: "Save failed", description: err?.message || "Please try again.", variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, bookId, nodeConfig.id, toast]);

  // Debounced auto-save on data change
  const debounceSaveRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (Object.keys(stepData).length === 0) return;
    if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current);
    debounceSaveRef.current = setTimeout(() => {
      void handleSaveDraft(true);
    }, 5000);
    return () => { if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current); };
  }, [stepData, currentStep, handleSaveDraft]);

  // Periodic auto-save every 30s
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (Object.keys(stepDataRef.current).length > 0) {
        void handleSaveDraft(true);
      }
    }, 30000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [handleSaveDraft]);

  // (Abby chat scroll moved to AbbyAdvisorSidePanel)

  // Load saved draft on mount
  const draftLoadedRef = useRef(false);
  const inferStepFromDraftData = useCallback((data: Record<string, any> | undefined) => {
    if (!data || typeof data !== "object") return 0;
    let inferredStep = 0;

    nodeConfig.steps.forEach((step, idx) => {
      const value = data[step.id];
      const hasValue = value !== undefined && value !== null && (
        typeof value === "object" ? Object.keys(value).length > 0 : String(value).trim().length > 0
      );
      if (hasValue) inferredStep = idx;
    });

    // Home Study has most content nested under schedule.days, so infer deeper progress safely.
    if (nodeConfig.id === "home-study-course") {
      const days = Array.isArray(data.schedule?.days) ? data.schedule.days : [];
      if (days.length > 0) inferredStep = Math.max(inferredStep, 1);

      const hasDailyContent = days.some((day: any) =>
        Boolean(day?.concept || day?.exercise || day?.reflection || day?.actionPlan || day?.reading || day?.audioScript)
      );
      if (hasDailyContent) inferredStep = Math.max(inferredStep, 2);

      if (data.materials && typeof data.materials === "object" && Object.keys(data.materials).length > 0) {
        inferredStep = Math.max(inferredStep, 3);
      }
      if (data.preview && typeof data.preview === "object" && Object.keys(data.preview).length > 0) {
        inferredStep = Math.max(inferredStep, 4);
      }
    }

    return inferredStep;
  }, [nodeConfig.steps, nodeConfig.id]);

  useEffect(() => {
    if (!user || !bookId || draftLoadedRef.current) return;
    draftLoadedRef.current = true;

    let isMounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const token = await getActiveToken();
        if (!token) {
          draftLoadedRef.current = false;
          retryTimer = setTimeout(() => {
            if (isMounted) setDraftLoadAttempt((prev) => prev + 1);
          }, 700);
          return;
        }

        const resp = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: "load",
              bookId,
              nodeId: nodeConfig.id,
            }),
          },
          15000,
        );

        const result = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(result?.error || "Failed to load draft");
        }

        if (!isMounted || !result?.draft) return;
        const parsed = result.draft;

        if (parsed.stepData) {
          let hydratedStepData = parsed.stepData as Record<string, any>;

          if (nodeConfig.id === "home-study-course") {
            const existingDays = Array.isArray(hydratedStepData?.schedule?.days) ? hydratedStepData.schedule.days : [];
            if (existingDays.length === 0) {
              try {
                let recoveredDays = extractHomeStudyDaysFromContent(String(result?.generatedContent || ""));

                if (recoveredDays.length === 0) {
                  const { data: generatedContentAsset } = await supabase
                    .from("generated_assets")
                    .select("content")
                    .eq("book_id", bookId)
                    .eq("asset_type", "builder_content_home-study-course")
                    .maybeSingle();
                  recoveredDays = extractHomeStudyDaysFromContent(String(generatedContentAsset?.content || ""));
                }

                if (recoveredDays.length > 0) {
                  hydratedStepData = {
                    ...hydratedStepData,
                    schedule: {
                      ...(hydratedStepData.schedule || {}),
                      days: recoveredDays,
                    },
                  };
                }
              } catch (recoveryError) {
                console.warn("Failed to recover home study days from generated content:", recoveryError);
              }
            }
          }

          // ── Recover foundation + curriculum for course/training builders ──
          if (
            (nodeConfig.id === "online-course" || nodeConfig.id === "training-programs") &&
            (!hydratedStepData.foundation || !hydratedStepData.curriculum?.modules?.length)
          ) {
            try {
              const { data: proposalAsset } = await supabase
                .from("generated_assets")
                .select("content")
                .eq("book_id", bookId)
                .eq("asset_type", `builder_proposal_${nodeConfig.id}`)
                .maybeSingle();

              if (proposalAsset?.content) {
                const proposal = JSON.parse(proposalAsset.content);

                // Recover foundation if missing
                if (!hydratedStepData.foundation && proposal.recommended_title) {
                  const recommendedPrice = Number(proposal.recommended_price || 0);
                  const recommendedTransformation = Array.isArray(proposal.transformation_promises)
                    ? proposal.transformation_promises.find((item: any) => typeof item === "string" && item.trim().length > 0)
                    : "";

                  hydratedStepData = {
                    ...hydratedStepData,
                    foundation: {
                      title: proposal.recommended_title || "",
                      subtitle: proposal.subtitle || "",
                      targetAudience: proposal.target_audience || "",
                      transformation: String(recommendedTransformation || ""),
                      priceTier: mapCoursePriceTier(recommendedPrice),
                      exactPrice: recommendedPrice > 0 ? String(Math.round(recommendedPrice)) : "",
                    },
                  };
                }

                // Recover curriculum modules if missing
                if (!hydratedStepData.curriculum?.modules?.length && Array.isArray(proposal.structure)) {
                  const recoveredModules = buildCourseModulesFromStructure(proposal.structure);
                  if (recoveredModules.length > 0) {
                    hydratedStepData = {
                      ...hydratedStepData,
                      curriculum: {
                        ...(hydratedStepData.curriculum || {}),
                        modules: recoveredModules,
                      },
                    };
                  }
                }
              }
            } catch (recoveryError) {
              console.warn("Failed to recover course foundation/curriculum from proposal:", recoveryError);
            }
          }

          setStepData(hydratedStepData);
          const inferredStep = inferStepFromDraftData(hydratedStepData);
          const savedStep = typeof parsed.currentStep === "number" ? parsed.currentStep : 0;
          setCurrentStep(clampStepIndex(Math.max(savedStep, inferredStep)));
        } else if (typeof parsed.currentStep === "number") {
          setCurrentStep(clampStepIndex(parsed.currentStep));
        }

        if (Array.isArray(parsed.editedSteps)) setEditedSteps(new Set(parsed.editedSteps));
        if (parsed.savedAt) setLastSaved(new Date(parsed.savedAt));
      } catch (err) {
        console.error("Failed to load builder draft:", err);
        draftLoadedRef.current = false;
      }
    })();

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [user, bookId, nodeConfig.id, inferStepFromDraftData, draftLoadAttempt, clampStepIndex]);

  // Abby chat is now handled by AbbyAdvisorSidePanel

  const goToStep = useCallback(async (targetStep: number) => {
    const boundedStep = clampStepIndex(targetStep);
    currentStepRef.current = boundedStep;
    setCurrentStep(boundedStep);
    await handleSaveDraft(true);
  }, [clampStepIndex, handleSaveDraft]);

  const goNext = async () => {
    if (currentStep < nodeConfig.steps.length - 1) await goToStep(currentStep + 1);
  };

  const goPrev = () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  };

  const handlePublish = async () => {
    // Builders with a customRenderer handle their own publish via SharedPublishStep.
    // The footer button should only save the draft — the real publish is inside the step.
    if (nodeConfig.customRenderer) {
      setSaving(true);
      try {
        await handleSaveDraft(true);
        toast({ title: "Draft saved", description: "Use the Publish button inside the step to go live." });
      } catch (err) {
        console.error("Save draft failed:", err);
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    let publishSuccess = false;
    try {
      await handleSaveDraft(true);
      if (user && bookId && nodeConfig.dbTable) {
        if (nodeConfig.dbTable === "home_study_courses") {
          const token = await getActiveToken();
          if (!token) throw new Error("Not authenticated");
          const resp = await fetchWithTimeout(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                action: "publish_home_study",
                bookId,
                nodeId: nodeConfig.id,
                payload: {
                  title: stepData.setup?.title || `${bookTitle} — ${nodeConfig.label}`,
                  description: stepData.setup?.description || "",
                  content_markdown: stepData.schedule?.days ? JSON.stringify(stepData.schedule.days) : "",
                  duration_days: stepData.setup?.duration || 30,
                  price: stepData.setup?.price ? parseFloat(stepData.setup.price) : null,
                  sales_copy_json: stepData.setup?.salesCopyData || null,
                },
              }),
            },
            15000,
          );
          const result = await resp.json().catch(() => ({}));
          if (!resp.ok || result?.error) {
            const message = result?.error || "Failed to publish home study course";
            console.error("Failed to publish home study record:", message);
            toast({ title: "Publish failed", description: message, variant: "destructive" });
          } else {
            publishSuccess = true;
          }
        } else {
          const { data: existing, error: fetchErr } = await (supabase as any)
            .from(nodeConfig.dbTable)
            .select("id")
            .eq("author_id", user.id)
            .eq("book_id", bookId)
            .maybeSingle();
          if (fetchErr) console.error("Fetch existing product error:", fetchErr);
          const productRecord: any = {
            author_id: user.id,
            book_id: bookId,
            title: stepData.setup?.title || `${bookTitle} — ${nodeConfig.label}`,
            description: stepData.setup?.description || "",
            status: "published",
          };
          if (nodeConfig.dbTable === "courses") {
            productRecord.price = stepData.foundation?.exactPrice ? parseFloat(stepData.foundation.exactPrice) : null;
            productRecord.title = stepData.foundation?.title || productRecord.title;
            productRecord.description = stepData.foundation?.subtitle || productRecord.description;
            productRecord.target_student = stepData.foundation?.targetAudience || null;
            productRecord.course_format = stepData.foundation?.format || "self_paced";
          }
          let saveError;
          let courseId: string | null = null;
          if (existing) {
            courseId = existing.id;
            const { error } = await supabase.from(nodeConfig.dbTable as any).update(productRecord).eq("id", existing.id);
            saveError = error;
          } else {
            const { data: inserted, error } = await (supabase as any).from(nodeConfig.dbTable).insert(productRecord).select("id").single();
            saveError = error;
            courseId = inserted?.id || null;
          }
          if (saveError) {
            console.error("Failed to save product record:", saveError);
            toast({ title: "Publish failed", description: saveError.message, variant: "destructive" });
          } else {
            publishSuccess = true;

            // Sync modules & lessons to DB for course builders
            if (nodeConfig.dbTable === "courses" && courseId && stepData.curriculum?.modules?.length) {
              try {
                // Clear existing modules (cascade deletes lessons/quizzes)
                await supabase.from("course_modules").delete().eq("course_id", courseId);

                const modules = stepData.curriculum.modules as any[];
                for (let mi = 0; mi < modules.length; mi++) {
                  const mod = modules[mi];
                  const { data: modRow } = await supabase.from("course_modules").insert({
                    course_id: courseId,
                    title: mod.title || `Module ${mi + 1}`,
                    description: mod.description || mod.contentSummary || "",
                    position: mi,
                    blooms_level: mod.bloomsLevel || null,
                    kolbs_stage: mod.kolbsStage || null,
                    learning_objectives: mod.learningObjectives || [],
                    duration_minutes: mod.durationMinutes || 60,
                    source_chapters: mod.sourceChapters || [],
                    debrief_points: mod.debriefPoints || [],
                    workbook_page_description: mod.workbookPageDescription || null,
                    facilitator_activity: mod.facilitatorActivity || null,
                    module_number: mi + 1,
                  }).select("id").single();

                  if (!modRow) continue;

                  const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];
                  for (let li = 0; li < lessons.length; li++) {
                    const lesson = lessons[li];
                    // Store rich content as JSON
                    const contentJson = JSON.stringify({
                      script: lesson.script || "",
                      summary: lesson.summary || [],
                      exercise: lesson.exercise || "",
                    });

                    const { data: lessonRow } = await supabase.from("course_lessons").insert({
                      module_id: modRow.id,
                      title: lesson.title || `Lesson ${li + 1}`,
                      content: contentJson,
                      position: li,
                      video_url: lesson.videoUrl || null,
                    }).select("id").single();

                    // Insert quizzes
                    if (lessonRow && Array.isArray(lesson.quiz)) {
                      for (let qi = 0; qi < lesson.quiz.length; qi++) {
                        const q = lesson.quiz[qi];
                        if (!q.question) continue;
                        await supabase.from("course_quizzes").insert({
                          lesson_id: lessonRow.id,
                          question: q.question,
                          options: q.options || [],
                          correct_answer: q.correctAnswer ?? 0,
                          explanation: q.explanation || "",
                          position: qi,
                        });
                      }
                    }
                  }
                }
              } catch (syncErr) {
                console.error("Failed to sync curriculum to DB:", syncErr);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Save draft failed during publish:", err);
      toast({ title: "Publish failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
    if (publishSuccess) {
      toast({ title: "Published! 🎉", description: "Redirecting to Review & Publish…" });
      setTimeout(() => onNavigate?.("review-products"), 800);
    }
  };

  const currentStepIndex = clampStepIndex(currentStep);
  const currentStepConfig = nodeConfig.steps[currentStepIndex] ?? nodeConfig.steps[0];
  const isLastStep = currentStepIndex === nodeConfig.steps.length - 1;

  useEffect(() => {
    if (currentStep !== currentStepIndex) {
      currentStepRef.current = currentStepIndex;
      setCurrentStep(currentStepIndex);
    }
  }, [currentStep, currentStepIndex]);

  // ─── NO BOOK SELECTED → redirect straight to My Books Hub ─────────
  useEffect(() => {
    if (!bookId) onNavigate?.("my-books");
  }, [bookId, onNavigate]);

  // ─── SUBSCRIPTION GATE ─────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <BuilderUpgradeGate
        nodeConfig={nodeConfig}
        currentTier={tier}
        planData={plan ? {
          revenueProjection: plan.packages?.[nodeConfig.requiredTier as keyof typeof plan.packages]?.timeline
            ? `This product can generate revenue within ${plan.packages[nodeConfig.requiredTier as keyof typeof plan.packages]?.timeline || "3-6 months"}.`
            : undefined,
        } : null}
        onNavigate={onNavigate}
      />
    );
  }

  if (!bookId) {
    return null;
  }

  // ─── MAIN BUILDER UI ──────────────────────────────────────────────
  return (
    <div className="flex gap-0 h-full min-h-0">
      {/* Main builder area */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 transition-all ${abbyOpen ? "mr-80" : ""}`}>
        {/* Breadcrumb */}
        <div className="px-6 pt-3 pb-1 text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <button onClick={() => onNavigate?.("overview")} className="hover:text-foreground transition-colors">Build Your Business</button>
          <span className="text-muted-foreground/40">→</span>
          <button
            onClick={() => {
              const categorySection = nodeConfig.category === "build" ? "build" : nodeConfig.category === "bridge" ? "bridge" : "yield";
              onNavigate?.(categorySection);
            }}
            className="hover:text-foreground transition-colors"
          >
            {nodeConfig.category === "build" ? "B · Brand Products" : nodeConfig.category === "bridge" ? "B · Build Authority" : "Y · Yield Revenue"}
          </button>
          <span className="text-muted-foreground/40">→</span>
          <span className="text-foreground font-medium">{nodeConfig.label}</span>
        </div>
        {/* Header bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleSaveDraft(true);
              const categorySection = nodeConfig.category === "build" ? "build" : nodeConfig.category === "bridge" ? "bridge" : "yield";
              onNavigate?.(categorySection);
            }}
            className="text-muted-foreground hover:text-foreground shrink-0 -ml-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="w-px h-6 bg-border" />
          <h1 className="font-heading font-bold text-lg truncate">{nodeConfig.label}</h1>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-[10px] text-muted-foreground/60">
                Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => handleSaveDraft(false)} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save Draft
            </Button>
          </div>
        </div>


        {/* Progress stepper */}
        <div className="px-6 py-3 border-b border-border bg-card/50">
          <div className="flex items-center gap-1">
            {nodeConfig.steps.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => goToStep(idx)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-secondary text-secondary-foreground"
                        : isCompleted
                        ? "bg-accent/15 text-accent"
                        : "text-muted-foreground/50 hover:text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] ${
                        isCurrent ? "border-secondary-foreground" : "border-muted-foreground/30"
                      }`}>
                        {idx + 1}
                      </span>
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  {idx < nodeConfig.steps.length - 1 && (
                    <div className={`w-6 h-px mx-0.5 ${isCompleted ? "bg-accent" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Book context bar */}
        <div className="flex items-center gap-3 px-6 py-2.5 border-b border-border bg-muted/30">
          <div className="h-8 w-6 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border">
            {resolvedBookCoverUrl ? (
              <img src={resolvedBookCoverUrl} alt={`${bookTitle || "Book"} cover`} className="h-full w-full object-cover" />
            ) : (
              <BookOpen className="h-3 w-3 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{bookTitle || "Untitled Book"}</p>
            <p className="text-[10px] text-muted-foreground">Manuscript loaded</p>
          </div>
        </div>

        {/* Step content area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 lg:px-8 pt-6 lg:pt-8 pb-6 relative flex flex-col">
          {/* Cross-builder incoming notifications */}
          {user && bookId && (
            <CrossBuilderNotifications
              builderId={nodeConfig.id}
              authorId={user.id}
              bookId={bookId}
              onImport={(pushData) => {
                toast({ title: "Content imported!", description: "Pre-filled content is ready for editing." });
              }}
            />
          )}
          {/* Estimated Revenue Card */}
          <div className="mb-4">
            <EstimatedRevenueCard builderId={nodeConfig.id} />
          </div>
          {/* Behind the Design Panel */}
          <div className="mb-4">
            <BehindTheDesignPanel builderId={nodeConfig.id} productLabel={nodeConfig.label} />
          </div>
          {/* Compact ROI Banner */}
          {user && bookId && (
            <ROIBanner
              bookId={bookId}
              authorId={user.id}
              tier={tier}
              compact
            />
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepConfig.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    {/* 3-Act Phase Badge */}
                    <ActPhaseBadge act={
                      currentStepConfig.act || (currentStepIndex === 0 ? 1 : currentStepIndex === nodeConfig.steps.length - 1 ? 3 : 2)
                    } />
                    <h2 className="font-heading text-xl font-bold mb-1">
                      Step {currentStepIndex + 1}: {currentStepConfig.label}
                    </h2>
                    <p className="text-sm text-muted-foreground">{currentStepConfig.description}</p>
                  </div>
                  {editedSteps.has(currentStepConfig.id) ? (
                    <Badge variant="secondary" className="text-[10px]">Edited by you</Badge>
                  ) : stepData[currentStepConfig.id] ? (
                    <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                      <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
                    </Badge>
                  ) : null}
                </div>

                {/* \u2550\u2550\u2550 3-ACT GENERATION ENGINE \u2550\u2550\u2550 */}

                {/* Act 1: Abby Analyzing */}
                {builderGen.act === "act1_loading" && (
                  <Card className="p-6 mb-6">
                    <AbbyNarrativeLoading
                      messages={nodeConfig.loadingMessages}
                      builderLabel={nodeConfig.label.toLowerCase()}
                      bookTitle={bookTitle || "your book"}
                    />
                  </Card>
                )}

                {/* Act 2: Proposal Review */}
                {builderGen.act === "act2_proposal" && builderGen.proposal && currentStepConfig.id === firstStepId && (
                  <div className="mb-6">
                    <AbbyProposal
                      proposal={builderGen.proposal}
                      builderLabel={nodeConfig.label}
                      bookTitle={bookTitle || "your book"}
                      onApprove={(approved) => {
                        // Auto-populate stepData from approved proposal for builders with custom renderers
                        if (nodeConfig.customRenderer === "home-study") {
                          const durationMatch = approved.recommended_title?.match(/(\d+)[- ]?day/i);
                          setStepData(prev => ({
                            ...prev,
                            setup: {
                              ...prev.setup,
                              title: approved.recommended_title || prev.setup?.title,
                              description: approved.description || prev.setup?.description,
                              price: approved.recommended_price || prev.setup?.price,
                              duration: durationMatch ? parseInt(durationMatch[1]) : (prev.setup?.duration || 21),
                            },
                          }));
                        }

                        if (nodeConfig.customRenderer === "course") {
                          const generatedModules = buildCourseModulesFromStructure(approved.structure);
                          const recommendedPrice = Number(approved.recommended_price || 0);
                          const recommendedTransformation = Array.isArray(approved.transformation_promises)
                            ? approved.transformation_promises.find((item) => typeof item === "string" && item.trim().length > 0)
                            : "";

                          setStepData(prev => {
                            const existingFoundation = prev.foundation || {};

                            return {
                              ...prev,
                              foundation: {
                                ...existingFoundation,
                                title: existingFoundation.title || approved.recommended_title || "",
                                subtitle: existingFoundation.subtitle || approved.subtitle || "",
                                targetAudience: existingFoundation.targetAudience || approved.target_audience || "",
                                transformation: existingFoundation.transformation || String(recommendedTransformation || ""),
                                priceTier: existingFoundation.priceTier || mapCoursePriceTier(recommendedPrice),
                                exactPrice: existingFoundation.exactPrice || (recommendedPrice > 0 ? String(Math.round(recommendedPrice)) : ""),
                              },
                              curriculum: {
                                ...(prev.curriculum || {}),
                                modules: generatedModules.length > 0
                                  ? generatedModules
                                  : (Array.isArray(prev.curriculum?.modules) ? prev.curriculum.modules : []),
                              },
                            };
                          });
                        }

                        if (nodeConfig.customRenderer === "training-program") {
                          const generatedModules = buildCourseModulesFromStructure(approved.structure);
                          const recommendedPrice = Number(approved.recommended_price || 0);

                          setStepData(prev => {
                            const existingFoundation = prev.foundation || {};

                            return {
                              ...prev,
                              foundation: {
                                ...existingFoundation,
                                titleOptions: approved.title_options?.length
                                  ? (existingFoundation.titleOptions?.length ? existingFoundation.titleOptions : approved.title_options)
                                  : existingFoundation.titleOptions || [],
                                selectedTitleIdx: existingFoundation.selectedTitleIdx ?? 0,
                                title: existingFoundation.title || approved.recommended_title || "",
                                subtitle: existingFoundation.subtitle || approved.subtitle || "",
                                targetStudent: existingFoundation.targetStudent || approved.target_audience || "",
                                description: existingFoundation.description || approved.description || "",
                                transformationPromises: existingFoundation.transformationPromises?.length
                                  ? existingFoundation.transformationPromises
                                  : (approved.transformation_promises || []),
                                price: existingFoundation.price || (recommendedPrice > 0 ? Math.round(recommendedPrice) : 0),
                                format: existingFoundation.format || "3_day",
                              },
                              curriculum: {
                                ...(prev.curriculum || {}),
                                modules: generatedModules.length > 0
                                  ? generatedModules
                                  : (Array.isArray(prev.curriculum?.modules) ? prev.curriculum.modules : []),
                              },
                            };
                          });
                        }

                        void builderGen.startAct3(bookId, approved);
                      }}
                      onEdit={(updates) => builderGen.updateProposal(updates)}
                    />
                  </div>
                )}

                {/* Act 3: Streaming Generation — progress timeline only */}
                {builderGen.act === "act3_generating" && currentStepConfig.id === firstStepId && (
                  <Card className="p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                      <motion.div
                        className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Sparkles className="h-5 w-5 text-secondary" />
                      </motion.div>
                      <div>
                        <p className="text-sm font-bold">Abby is generating your {nodeConfig.label.toLowerCase()}...</p>
                        <p className="text-xs text-muted-foreground">This may take 30–60 seconds. Don't navigate away.</p>
                      </div>
                    </div>
                    {/* Progress timeline */}
                    <div className="space-y-4 pl-2">
                      {[
                        { label: "Reading your manuscript & frameworks", delay: 0 },
                        { label: "Structuring curriculum outline", delay: 8 },
                        { label: "Writing daily lessons & exercises", delay: 20 },
                        { label: "Finalizing content & quality check", delay: 45 },
                      ].map((step, i, arr) => {
                        const elapsed = builderGen.generatedContent ? builderGen.generatedContent.length : 0;
                        const isActive = i === 0 || elapsed > step.delay * 40;
                        const isComplete = i < arr.length - 1 && elapsed > arr[i + 1].delay * 40;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
                              isComplete ? "bg-accent text-accent-foreground" : isActive ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"
                            }`}>
                              {isComplete ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : isActive ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                                  <Loader2 className="h-3.5 w-3.5" />
                                </motion.div>
                              ) : (
                                <span className="text-[10px] font-bold">{i + 1}</span>
                              )}
                            </div>
                            <p className={`text-sm transition-colors duration-500 ${
                              isComplete ? "text-accent font-medium" : isActive ? "text-foreground font-medium" : "text-muted-foreground"
                            }`}>{step.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Act 3 Complete: Show generated content */}
                {builderGen.act === "act3_complete" && builderGen.generatedContent && currentStepConfig.id === firstStepId && (
                  <Card className="p-6 mb-6 border-accent/30 bg-accent/5">
                    <div className="flex items-center gap-2 mb-4">
                      <Check className="h-5 w-5 text-accent" />
                      <p className="text-sm font-bold text-accent">Content generated successfully! 🎉</p>
                    </div>
                    <div className="max-h-[520px] overflow-y-auto border rounded-lg p-4 bg-background space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">Product Content</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              if (editingContentDraft) {
                                // Save: update the generated content
                                builderGen.setGeneratedContent(contentDraftText);
                                setEditingContentDraft(false);
                              } else {
                                setContentDraftText(previewContentText || builderGen.generatedContent || "");
                                setEditingContentDraft(true);
                              }
                            }}
                          >
                            {editingContentDraft ? (
                              <><Check className="h-3 w-3 mr-1" /> Done</>
                            ) : (
                              <><Pencil className="h-3 w-3 mr-1" /> Edit</>
                            )}
                          </Button>
                        </div>
                        {editingContentDraft ? (
                          <Textarea
                            value={contentDraftText}
                            onChange={e => setContentDraftText(e.target.value)}
                            rows={20}
                            className="font-mono text-xs"
                          />
                        ) : (
                          <div className="space-y-3">
                            {(() => {
                              try {
                                const raw = previewContentText || builderGen.generatedContent || "";
                                const jsonMatch = raw.match(/\[[\s\S]*\]/);
                                const days = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
                                if (Array.isArray(days) && days.length > 0) {
                                  return days.map((day: any, i: number) => (
                                    <details key={i} className="group border border-border rounded-lg overflow-hidden">
                                      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <span className="w-6 h-6 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-xs font-bold shrink-0">{day.dayNumber || i + 1}</span>
                                        <span className="font-medium text-sm">Day {day.dayNumber || i + 1}: {day.theme || "Untitled"}</span>
                                        <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground transition-transform group-open:rotate-180" />
                                      </summary>
                                      <div className="px-4 py-3 space-y-2 text-sm">
                                        {day.chapterRef && <p className="text-xs text-muted-foreground">📖 {day.chapterRef}</p>}
                                        {day.concept && <div><p className="font-semibold text-xs uppercase text-secondary mb-0.5">Core Concept</p><p className="text-muted-foreground">{day.concept}</p></div>}
                                        {day.exercise && <div><p className="font-semibold text-xs uppercase text-secondary mb-0.5">Exercise</p><p className="text-muted-foreground">{day.exercise}</p></div>}
                                        {day.fieldAssignment && <div><p className="font-semibold text-xs uppercase text-secondary mb-0.5">Field Assignment</p><p className="text-muted-foreground">{day.fieldAssignment}</p></div>}
                                        {day.accountabilityCheck && <div><p className="font-semibold text-xs uppercase text-secondary mb-0.5">Accountability Check</p><p className="text-muted-foreground">{day.accountabilityCheck}</p></div>}
                                        {day.microHabit && <div><p className="font-semibold text-xs uppercase text-secondary mb-0.5">Micro Habit</p><p className="text-muted-foreground">{day.microHabit}</p></div>}
                                        {day.actionPlan && <div><p className="font-semibold text-xs uppercase text-secondary mb-0.5">Action Plan</p><p className="text-muted-foreground">{day.actionPlan}</p></div>}
                                        {day.reflection && <div><p className="font-semibold text-xs uppercase text-secondary mb-0.5">Reflection</p><p className="text-muted-foreground">{day.reflection}</p></div>}
                                      </div>
                                    </details>
                                  ));
                                }
                              } catch (error) {
      console.error(error);
    }
                              // Fallback: plain text
                              return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{previewContentText || builderGen.generatedContent}</p>;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => builderGen.reset()}>
                        Start Over
                      </Button>
                      <Button size="sm" className="bg-secondary text-secondary-foreground" onClick={goNext}>
                        Continue to Next Step <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                    {/* Cross-builder push summary */}
                    {user && bookId && (
                      <CrossBuilderPushSummary
                        builderId={nodeConfig.id}
                        authorId={user.id}
                        bookId={bookId}
                      />
                    )}
                  </Card>
                )}

                {/* Error state */}
                {builderGen.act === "error" && (
                  <Card className="p-4 mb-6 border-destructive/30 bg-destructive/5">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <p className="text-sm font-medium text-destructive">
                        {builderGen.error || "Something went wrong."}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => builderGen.retry(bookId)}>Retry</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAbbyOpen(true)}>Ask Abby for help</Button>
                    </div>
                  </Card>
                )}

                {/* Step content \u2014 custom renderer or generic placeholder */}
                {(() => {
                  const RendererComponent = nodeConfig.customRenderer ? RENDERER_MAP[nodeConfig.customRenderer] : null;
                  if (RendererComponent) {
                    return (
                      <RendererComponent
                        stepId={currentStepConfig.id}
                        stepData={stepData}
                        setStepData={setStepData}
                        onMarkEdited={(id: string) => setEditedSteps(prev => new Set([...prev, id]))}
                        bookId={bookId}
                        bookTitle={bookTitle}
                        plan={plan}
                        generationState={generationState}
                        setGenerationState={setGenerationState}
                        userId={user?.id || ""}
                        manuscriptSummary={manuscriptSummary}
                        frameworks={frameworks}
                        onStartGeneration={() => builderGen.startAct1(bookId)}
                        builderAct={builderGen.act}
                        onNavigate={onNavigate}
                        goToStep={goToStep}
                      />
                    );
                  }
                  // Generic fallback — product-specific Get Started page
                  if (builderGen.act === "idle" && currentStepIndex === 0) {
                    return (
                      <BuilderGetStartedPage
                        builderId={nodeConfig.id}
                        builderLabel={nodeConfig.label}
                        bookTitle={bookTitle || "your book"}
                        onStart={() => builderGen.startAct1(bookId)}
                      />
                    );
                  }
                  if (builderGen.act === "idle") {
                    return (
                      <Card className="p-6 min-h-[300px] border-dashed border-2">
                        <div className="text-center py-12">
                          <Wand2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                          <h3 className="font-heading text-lg font-semibold mb-2">{currentStepConfig.label}</h3>
                          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                            {currentStepConfig.description}
                          </p>
                          <p className="text-xs text-muted-foreground/50">
                            Complete Step 1 with Abby to populate this content
                          </p>
                        </div>
                      </Card>
                    );
                  }
                  if (builderGen.act === "act3_complete") {
                    return (
                      <Card className="p-6 min-h-[300px] border-dashed border-2">
                        <div className="text-center py-12">
                          <Wand2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                          <h3 className="font-heading text-lg font-semibold mb-2">{currentStepConfig.label}</h3>
                          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                            {currentStepConfig.description}
                          </p>
                        </div>
                      </Card>
                    );
                  }
                  return null;
                })()}
              </div>
            </motion.div>
          </AnimatePresence>


          {/* Connected Products */}
          <ConnectedProductsSection builderId={nodeConfig.id} />
        </div>

        {/* Fixed footer — outside scrollable area */}
        <BuilderFooter
          onPrevious={goPrev}
          onNext={isLastStep ? handlePublish : goNext}
          onAskAbby={() => setAbbyOpen(true)}
          isPreviousDisabled={currentStepIndex === 0}
          isLastStep={isLastStep}
          isSaving={saving}
          showAskAbby={!abbyOpen}
          hideNextOnLastStep={!!nodeConfig.customRenderer}
        />
      </div>

      {/* Abby Advisor Panel */}
      <AbbyAdvisorSidePanel
        open={abbyOpen}
        onClose={() => setAbbyOpen(false)}
        nodeConfig={nodeConfig}
        bookId={bookId}
        bookTitle={bookTitle}
        currentStepLabel={currentStepConfig.label}
        currentStepDescription={currentStepConfig.description}
        currentStepTip={currentStepConfig.abbyTip}
        plan={plan}
        manuscriptSummary={manuscriptSummary}
        frameworks={frameworks}
      />
    </div>
  );
}
