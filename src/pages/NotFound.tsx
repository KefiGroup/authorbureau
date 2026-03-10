import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { BookOpen, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <div className="w-20 h-20 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-6">
          <BookOpen className="h-10 w-10 text-secondary" />
        </div>
        <h1 className="mb-2 font-heading text-5xl font-bold text-foreground">404</h1>
        <p className="mb-2 text-xl font-medium text-foreground">Page not found</p>
        <p className="mb-8 text-muted-foreground">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/" className="gap-2"><Home className="h-4 w-4" /> Home</Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard" className="gap-2"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
