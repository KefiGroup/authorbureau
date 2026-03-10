import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import GetFeatured from "./pages/GetFeatured";
import Directory from "./pages/Directory";
import AuthorProfile from "./pages/AuthorProfile";
import DynamicBookMicrosite from "./pages/DynamicBookMicrosite";
import CreateMicrosite from "./pages/CreateMicrosite";
import Join from "./pages/Join";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAuth from "./pages/AdminAuth";
import AuthorDashboard from "./pages/AuthorDashboard";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import ReadingClub from "./pages/ReadingClub";
import SSO from "./pages/SSO";
import NotFound from "./pages/NotFound";
import BookHub from "./pages/BookHub";
import Solutions from "./pages/Solutions";
import SolutionsIndex from "./pages/SolutionsIndex";
import ScrollToTop from "./components/ScrollToTop";
import AbbyHelpChatbot from "./components/AbbyHelpChatbot";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// Redirect auth_token from any page to /auth
function AuthTokenRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = location.hash || "";
    if (location.pathname !== "/auth" && hash.includes("auth_token")) {
      // Normalize hash: #/?auth_token=... → #?auth_token=...
      const normalizedHash = hash.replace(/^#\/?/, "#");
      navigate(`/auth${normalizedHash}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

const AppRoutes = () => (
  <>
    <AuthTokenRedirect />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/directory" element={<Directory />} />
      <Route path="/authors/:slug" element={<AuthorProfile />} />
      <Route path="/books/:slug" element={<DynamicBookMicrosite />} />
      <Route path="/create-microsite" element={<CreateMicrosite />} />
      <Route path="/join" element={<Join />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin-login" element={<AdminAuth />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/dashboard" element={<AuthorDashboard />} />
      <Route path="/dashboard/book/:bookId" element={<BookHub />} />
      <Route path="/my-books" element={<AuthorDashboard initialSection="my-books" />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/reading-club" element={<ReadingClub />} />
      <Route path="/solutions" element={<SolutionsIndex />} />
      <Route path="/solutions/:genre" element={<Solutions />} />
      <Route path="/sso" element={<SSO />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <AppRoutes />
          <AbbyHelpChatbot />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
