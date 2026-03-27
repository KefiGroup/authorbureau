import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Users, Crown, Package, Target } from "lucide-react";
import { StepHeader, AbbyCard, LoadingStep, SummaryCard, SuccessCheckmark } from "../ba-shared/BABuilderShared";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";

const GEN_MSGS = ["Designing your affiliate programme...", "Creating commission tiers...", "Building affiliate resources...", "Planning your recruitment strategy...", "Finalising your programme..."];
const ACT_MSGS = ["Setting up your affiliate programme...", "Creating affiliate resources...", "Almost ready..."];

interface Props { authorId: string | null; }

export default function BA16Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [authorSlug, setAuthorSlug] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
