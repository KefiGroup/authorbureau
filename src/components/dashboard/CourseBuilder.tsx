import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, GraduationCap, Sparkles, Trash2, Edit } from "lucide-react";

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
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", description: "", price: "0" });

  useEffect(() => {
    if (user) fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("author_id", user!.id)
      .order("created_at", { ascending: false });
    setCourses((data as Course[]) || []);
    setLoading(false);
  };

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
      setShowForm(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Course Builder</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage online courses derived from your book content.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Sparkles className="mr-2 h-4 w-4" /> AI Generate (Coming Soon)
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Course
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Create New Course</h3>
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
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Course List */}
      {courses.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">No courses yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Transform your book chapters into structured online courses.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Course
          </Button>
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
