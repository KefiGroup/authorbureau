import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Sparkles, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mb-3 font-heading text-2xl font-bold text-foreground">
          Hmm, I can't find that page
        </h1>
        <p className="mb-8 text-muted-foreground">
          Let me take you somewhere useful. The page you're looking for might have been moved or doesn't exist yet.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button asChild>
            <Link to="/dashboard" className="gap-2">
              <Home className="h-4 w-4" /> Go to My Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/" className="gap-2">
              Home Page
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
