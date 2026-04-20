import { useEffect, useState } from "react";
import { useParams, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * Gate page for /:authorSlug/course/:courseSlug/learn
 * - Unauthenticated → redirect to /readers-bureau/auth?redirect=<this URL>
 * - Authenticated but not enrolled → "You don't have access" with link back to sales page
 * - Enrolled → mount OnlineCourseViewer (via lazy purchase lookup or direct course pass)
 *
 * For Sprint 40 we delegate playback to OnlineCourseViewer by finding/creating
 * an enrollment then redirecting to the existing /readers-bureau/course/:purchaseId
 * viewer once a matching purchase row exists. If purchase row exists we route
 * straight there; otherwise we render an inline "no access" state.
 */
export default function CourseLearnPage() {
  const { authorSlug, courseSlug } = useParams<{ authorSlug: string; courseSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [resolved, setResolved] = useState<
    | { kind: "loading" }
    | { kind: "noaccess"; salesUrl: string }
    | { kind: "redirect"; to: string }
  >({ kind: "loading" });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    (async () => {
      if (!authorSlug || !courseSlug) {
        setResolved({ kind: "noaccess", salesUrl: `/${authorSlug}` });
        return;
      }
      const { data: author } = await supabase
        .from("author_profiles").select("id").eq("author_slug", authorSlug).maybeSingle();
      if (!author) { setResolved({ kind: "noaccess", salesUrl: `/${authorSlug}` }); return; }
      const { data: course } = await supabase
        .from("courses").select("id").eq("author_id", author.id).eq("course_slug", courseSlug).maybeSingle();
      if (!course) { setResolved({ kind: "noaccess", salesUrl: `/${authorSlug}` }); return; }

      // Find matching enrollment
      const { data: enrollment } = await supabase
        .from("course_enrollments").select("id").eq("course_id", course.id).eq("user_id", user.id).maybeSingle();
      if (!enrollment) {
        // Check if a purchase by this user's email exists; if so back-fill
        const email = user.email?.toLowerCase();
        if (email) {
          const { data: purchase } = await supabase
            .from("purchases").select("id, customer_email")
            .eq("product_id", course.id).eq("product_type", "online_course")
            .ilike("customer_email", email).maybeSingle();
          if (purchase) {
            await supabase.from("course_enrollments").insert({
              course_id: course.id, user_id: user.id, status: "active", progress_percent: 0,
            });
            setResolved({ kind: "redirect", to: `/readers-bureau/course/${purchase.id}` });
            return;
          }
        }
        setResolved({ kind: "noaccess", salesUrl: `/${authorSlug}/course/${courseSlug}` });
        return;
      }

      // Find a purchase to hand off to the existing viewer
      const { data: purchase } = await supabase
        .from("purchases").select("id")
        .eq("product_id", course.id).eq("product_type", "online_course")
        .ilike("customer_email", user.email ?? "")
        .maybeSingle();
      if (purchase) {
        setResolved({ kind: "redirect", to: `/readers-bureau/course/${purchase.id}` });
      } else {
        setResolved({ kind: "noaccess", salesUrl: `/${authorSlug}/course/${courseSlug}` });
      }
    })();
  }, [authLoading, user, authorSlug, courseSlug]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!user) {
    const returnTo = encodeURIComponent(location.pathname);
    return <Navigate to={`/readers-bureau/auth?redirect=${returnTo}`} replace />;
  }
  if (resolved.kind === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (resolved.kind === "redirect") return <Navigate to={resolved.to} replace />;
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-bold">You don't have access to this course yet</h1>
        <p className="text-sm text-muted-foreground">If you've just purchased, please sign in with the same email used at checkout.</p>
        <a href={resolved.salesUrl} className="text-primary hover:underline text-sm">View course details →</a>
      </div>
    </div>
  );
}
