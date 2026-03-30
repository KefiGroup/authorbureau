import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AccountSettings from "./pages/AccountSettings";

import Directory from "./pages/Directory";
import AuthorProfile from "./pages/AuthorProfile";
import { AuthorSlugRedirect } from "./pages/AuthorSlugRedirect";
import DynamicBookMicrosite from "./pages/DynamicBookMicrosite";
import AuthorSubpageResolver from "./pages/AuthorSubpageResolver";
import CreateMicrosite from "./pages/CreateMicrosite";
import Join from "./pages/Join";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAuth from "./pages/AdminAuth";
import AuthorDashboard from "./pages/AuthorDashboard";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import ReadersBureau from "./pages/ReadersBureau";
import ReaderAuth from "./pages/ReaderAuth";
import HowItWorks from "./pages/HowItWorks";
import SSO from "./pages/SSO";
import NotFound from "./pages/NotFound";
import BookHub from "./pages/BookHub";
import Solutions from "./pages/Solutions";
import SolutionsIndex from "./pages/SolutionsIndex";
import AuthorSite from "./pages/AuthorSite";
import AuthorProductPage from "./pages/AuthorProductPage";
import AuthorBookPage from "./pages/AuthorBookPage";
import BookSlugRedirect from "./pages/BookSlugRedirect";
import ScrollToTop from "./components/ScrollToTop";
import AbbyHelpChatbot from "./components/AbbyHelpChatbot";
import PurchaseSuccess from "./pages/PurchaseSuccess";
import ReaderContentViewer from "./pages/ReaderContentViewer";
import OnlineCourseViewer from "./pages/OnlineCourseViewer";
import Methodology from "./pages/Methodology";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import BrandProductsHub from "./pages/BrandProductsHub";
import BuildAuthorityHub from "./pages/BuildAuthorityHub";
import YieldRevenueHub from "./pages/YieldRevenueHub";
import RevenueFullDashboard from "./pages/RevenueFullDashboard";
import NodeBuilder from "./pages/NodeBuilder";
import AbbyCoachPage from "./pages/AbbyCoachPage";
import Pricing from "./pages/Pricing";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";


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
      const normalizedHash = hash.replace(/^#\/?/, "#");
      navigate(`/auth${normalizedHash}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

// Legacy redirect for /reader-portal/:id
function ReaderPortalIdRedirect() {
  const { id } = useParams();
  return <Navigate to={`/readers-bureau/learn/${id}`} replace />;
}

const AppRoutes = () => (
  <>
    <AuthTokenRedirect />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/directory" element={<Directory />} />
      <Route path="/authors" element={<Navigate to="/directory" replace />} />
      <Route path="/get-featured" element={<GetFeatured />} />
      <Route path="/authors/:slug" element={<AuthorSlugRedirect />} />
      <Route path="/books/:slug" element={<BookSlugRedirect />} />
      <Route path="/create-microsite" element={<CreateMicrosite />} />
      <Route path="/join" element={<Join />} />
      <Route path="/auth" element={<Auth />} />
      {/* /onboarding removed — using dashboard widget instead */}
      <Route path="/admin-login" element={<AdminAuth />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/dashboard" element={<AuthorDashboard />} />
      <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
      <Route path="/dashboard/book/:bookId" element={<BookHub />} />
      <Route path="/my-books" element={<AuthorDashboard initialSection="my-books" />} />
      <Route path="/brand-products" element={<ProtectedRoute><BrandProductsHub /></ProtectedRoute>} />
      <Route path="/build-authority" element={<ProtectedRoute><BuildAuthorityHub /></ProtectedRoute>} />
      <Route path="/yield-revenue" element={<ProtectedRoute><YieldRevenueHub /></ProtectedRoute>} />
      <Route path="/revenue-dashboard" element={<ProtectedRoute><RevenueFullDashboard /></ProtectedRoute>} />
      <Route path="/abby-coach" element={<ProtectedRoute><AbbyCoachPage /></ProtectedRoute>} />
      <Route path="/node-builder/:nodeId" element={<ProtectedRoute><NodeBuilder /></ProtectedRoute>} />
      <Route path="/marketing-hub" element={<ProtectedRoute><AuthorDashboard initialSection={"marketing-hub" as any} /></ProtectedRoute>} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/subscription-success" element={<SubscriptionSuccess />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/faq" element={<FAQ />} />

      {/* Readers Bureau */}
      <Route path="/readers-bureau" element={<ReadersBureau />} />
      <Route path="/readers-bureau/auth" element={<ReaderAuth />} />
      <Route path="/readers-bureau/learn/:purchaseId" element={<ReaderContentViewer />} />
      <Route path="/readers-bureau/course/:purchaseId" element={<OnlineCourseViewer />} />

      {/* Legacy redirects */}
      <Route path="/reading-club" element={<Navigate to="/readers-bureau" replace />} />
      <Route path="/reader-portal" element={<Navigate to="/readers-bureau?tab=library" replace />} />
      <Route path="/reader-portal/:id" element={<ReaderPortalIdRedirect />} />

      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/methodology" element={<Methodology />} />
      <Route path="/solutions" element={<SolutionsIndex />} />
      <Route path="/solutions/:genre" element={<Solutions />} />
      <Route path="/sso" element={<SSO />} />
      <Route path="/purchase-success" element={<PurchaseSuccess />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/:authorSlug/:bookSlug/:productType" element={<AuthorProductPage />} />
      <Route path="/:authorSlug/:bookSlug" element={<AuthorSubpageResolver />} />
      <Route path="/:authorSlug" element={<AuthorSite />} />
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
