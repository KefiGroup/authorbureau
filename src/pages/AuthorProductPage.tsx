import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Calendar, BookOpen, GraduationCap, Users, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import NotFound from "./NotFound";

type ProductType = "homestudy" | "onlinecourse" | "workbook" | "coaching" | "book";

const PRODUCT_CONFIG: Record<ProductType, { table: string; label: string; icon: any; statusField: string; statusValue: string }> = {
  homestudy: { table: "home_study_courses", label: "Home Study Course", icon: BookOpen, statusField: "status", statusValue: "published" },
  onlinecourse: { table: "courses", label: "Online Course", icon: GraduationCap, statusField: "status", statusValue: "published" },
  workbook: { table: "home_study_courses", label: "Workbook", icon: BookOpen, statusField: "status", statusValue: "published" }, // placeholder
  coaching: { table: "coaching_packages", label: "Coaching", icon: Users, statusField: "status", statusValue: "active" },
  book: { table: "books", label: "Book", icon: BookOpen, statusField: "published_at", statusValue: "not_null" },
};

export default function AuthorProductPage() {
  const { authorSlug, bookSlug, productType } = useParams<{ authorSlug: string; bookSlug: string; productType: string }>();
  const [author, setAuthor] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const pType = productType as ProductType;
  const config = PRODUCT_CONFIG[pType];

  useDocumentMeta({
    title: product?.title ? `${product.title} - ${author?.pen_name || "Author"}` : "Product",
    description: product?.description || "",
  });

  useEffect(() => {
    if (!authorSlug || !config) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    loadProduct();
  }, [authorSlug, productType]);

  async function loadProduct() {
    setLoading(true);

    // Get author
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("*")
      .eq("author_slug", authorSlug)
      .in("directory_status", ["listed", "featured"])
      .maybeSingle();

    if (!profile) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setAuthor(profile);

    // Get product
    let query = supabase.from(config.table as any).select("*").eq("author_id", profile.user_id);
    if (config.statusField === "published_at") {
      query = query.not("published_at", "is", null);
    } else {
      query = query.eq(config.statusField, config.statusValue);
    }
    const { data: products } = await query.limit(1).maybeSingle();

    if (!products) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setProduct(products);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (notFound || !product || !author || !config) return <NotFound />;

  const displayName = author.pen_name || "Author";
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-background sticky top-0 z-50">
        <div className="container max-w-5xl py-3 flex items-center justify-between">
          <Link to={`/${authorSlug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {displayName}
          </Link>
          <span className="text-xs text-muted-foreground">
            Powered by <Link to="/" className="text-secondary hover:underline">Authors Bureau</Link>
          </span>
        </div>
      </nav>

      {/* Product Hero */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/15 px-4 py-2 text-sm text-secondary mb-4">
              <Icon className="h-4 w-4" />
              {config.label}
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">{product.title}</h1>
            {product.description && (
              <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">{product.description}</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Product Details */}
      <section className="py-12">
        <div className="container max-w-3xl">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* For Home Study - show schedule */}
              {pType === "homestudy" && product.study_schedule_json && Array.isArray(product.study_schedule_json) && (
                <Card className="p-5">
                  <h3 className="font-heading font-bold text-lg mb-4">Program Schedule</h3>
                  <div className="space-y-3">
                    {(product.study_schedule_json as any[]).slice(0, 10).map((day: any, i: number) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="flex-shrink-0 w-16 text-xs font-semibold text-secondary">{day.day || `Day ${i + 1}`}</div>
                        <div>
                          <p className="font-medium">{day.title || day.topic}</p>
                          {day.description && <p className="text-xs text-muted-foreground mt-0.5">{day.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* For Courses - show modules */}
              {pType === "onlinecourse" && product.id && <CourseModules courseId={product.id} />}

              {/* Content markdown preview */}
              {product.content_markdown && (
                <Card className="p-5">
                  <h3 className="font-heading font-bold text-lg mb-3">What You'll Learn</h3>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    {product.content_markdown.slice(0, 1000)}
                    {product.content_markdown.length > 1000 && "..."}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar - Pricing */}
            <div>
              <Card className="p-5 sticky top-20 border-secondary/20">
                {product.price != null && product.price > 0 ? (
                  <>
                    <p className="text-3xl font-bold text-secondary mb-1">
                      {(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">One-time payment</p>
                  </>
                ) : (
                  <p className="text-lg font-bold text-secondary mb-4">Free</p>
                )}

                {product.duration_days && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>{product.duration_days} days</span>
                  </div>
                )}

                {product.duration_minutes && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Clock className="h-4 w-4" />
                    <span>{product.duration_minutes} min per session</span>
                  </div>
                )}

                <Button className="w-full mt-4 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  Enroll Now
                </Button>

                <p className="text-[10px] text-muted-foreground text-center mt-3">
                  Secure checkout powered by Stripe
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Author Footer */}
      <footer className="py-8 border-t border-border bg-muted/30">
        <div className="container max-w-3xl flex items-center gap-4">
          {author.photo_url && (
            <img src={author.photo_url} alt={displayName} className="w-12 h-12 rounded-full object-cover" />
          )}
          <div>
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="text-xs text-muted-foreground">{author.tagline}</p>
          </div>
          <Link to={`/${authorSlug}`} className="ml-auto">
            <Button variant="outline" size="sm" className="text-xs">View All Products</Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}

// Sub-component for course modules
function CourseModules({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("course_modules")
      .select("*, course_lessons(*)")
      .eq("course_id", courseId)
      .order("position")
      .then(({ data }) => setModules(data || []));
  }, [courseId]);

  if (modules.length === 0) return null;

  return (
    <Card className="p-5">
      <h3 className="font-heading font-bold text-lg mb-4">Course Curriculum</h3>
      <div className="space-y-4">
        {modules.map((mod, i) => (
          <div key={mod.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <h4 className="font-semibold text-sm">{mod.title}</h4>
            </div>
            {mod.description && <p className="text-xs text-muted-foreground ml-9 mb-1">{mod.description}</p>}
            {mod.course_lessons && mod.course_lessons.length > 0 && (
              <ul className="ml-9 space-y-1">
                {mod.course_lessons.sort((a: any, b: any) => a.position - b.position).map((lesson: any) => (
                  <li key={lesson.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Star className="h-2.5 w-2.5 text-secondary/50" />
                    {lesson.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
