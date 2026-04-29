import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/shared-backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, GraduationCap, Sparkles, Trash2, Edit, ArrowRight, ArrowLeft } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: string;
  created_at: string;
}

export default function CourseBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", description: "", price: "0" });

  // Check if we should show the AI wizard
  const showAIWizard = searchParams.get("wizard") === "ai";
  const bookId = searchParams.get("bookId") || "";
  const bookTitle = searchParams.get("bookTitle") || "";

  const fetchCourses = useCallback(async () => {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("author_id", user!.id)
      .order("created_at", { ascending: false });
    setCourses((data as Course[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchCourses();
  }, [user, fetchCourses]);

  const handleCreate = async () => {
    if (!newCourse.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("courses").insert({
      author_id: user!.id,
      title: newCourse.title,
      description: newCourse.description || null,
      price: parseFloat(newCourse.price) || 0,
    });
    if (error) {
      toast({ title: "Error creating course", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Course created!" });
      setNewCourse({ title: "", description: "", price: "0" });
      setShowManualForm(false);
      fetchCourses();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting course", description: error.message, variant: "destructive" });
    } else {
      setCourses((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Course deleted" });
    }
  };

  const launchAIWizard = () => {
    const params = new URLSearchParams(searchParams);
    params.set("wizard", "ai");
    setSearchParams(params);
  };

  // ─── AI WIZARD MODE — redirect to dedicated BA-10 builder ───────
  if (showAIWizard) {
    return <Navigate to="/node-builder/BA-10" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {bookId && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate(`/book-hub/${bookId}?tab=marketing-channels`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Book Hub · Build
        </Button>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Course Builder</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage online courses derived from your book content.
          </p>
        </div>
        {courses.length > 0 && (
          <div className="flex flex-col items-end gap-1">
            <Button onClick={launchAIWizard} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Sparkles className="mr-2 h-4 w-4" /> AI Generate Course
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              onClick={() => setShowManualForm(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              or create manually
            </button>
          </div>
        )}
      </div>

      {/* Manual Create Form */}
      {showManualForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Create New Course (Manual)</h3>
          <div className="space-y-2">
            <Label>Course Title</Label>
            <Input
              value={newCourse.title}
              onChange={(e) => setNewCourse((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Mindful Parenting in 30 Days"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={newCourse.description}
              onChange={(e) => setNewCourse((p) => ({ ...p, description: e.target.value }))}
              placeholder="What will students learn?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Price (USD)</Label>
            <Input
              type="number"
              value={newCourse.price}
              onChange={(e) => setNewCourse((p) => ({ ...p, price: e.target.value }))}
              placeholder="197"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Course
            </Button>
            <Button variant="ghost" onClick={() => setShowManualForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Course List */}
      {courses.length === 0 && !showManualForm ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">No courses yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Transform your book chapters into structured online courses with AI, or build one from scratch.
          </p>
          <div className="flex flex-col items-center gap-2">
            <Button onClick={launchAIWizard} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Sparkles className="mr-2 h-4 w-4" /> AI Generate Course
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              onClick={() => setShowManualForm(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              or create manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.id} className="rounded-xl border border-border bg-card p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-heading font-semibold">{course.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    course.status === "published"
                      ? "bg-accent/15 text-accent"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {course.status}
                  </span>
                </div>
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                )}
                <p className="text-sm font-medium mt-2">${Number(course.price).toFixed(2)}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(course.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
