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
// Legacy DynamicBookMicrosite removed — book microsites handled by AuthorSubpageResolver
import AuthorSubpageResolver from "./pages/AuthorSubpageResolver";
import HomeStudyBundlePage from "./pages/HomeStudyBundlePage";
import WebinarRegistrationPage from "./pages/WebinarRegistrationPage";
import WebinarIndexPage from "./pages/WebinarIndexPage";
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
import BookBuilderRoute from "./pages/BookBuilderRoute";
import Solutions from "./pages/Solutions";
import SolutionsIndex from "./pages/SolutionsIndex";
import AuthorSite from "./pages/AuthorSite";
import AuthorProductPage from "./pages/AuthorProductPage";
import BookNodeResolver from "./pages/BookNodeResolver";
import AuthorBookPage from "./pages/AuthorBookPage";
import BookSlugRedirect from "./pages/BookSlugRedirect";
import ScrollToTop from "./components/ScrollToTop";
import AbbyHelpChatbot from "./components/AbbyHelpChatbot";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import SectionBoundary from "./components/SectionBoundary";
import PurchaseSuccess from "./pages/PurchaseSuccess";
import ReaderContentViewer from "./pages/ReaderContentViewer";
import OnlineCourseViewer from "./pages/OnlineCourseViewer";
import Methodology from "./pages/Methodology";
import TermsOfService from "./pages/TermsOfService";
import ReaderTermsOfSale from "./pages/ReaderTermsOfSale";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import HubRedirect from "./components/dashboard/HubRedirect";
import RevenueFullDashboard from "./pages/RevenueFullDashboard";
import ContentQualityLog from "./pages/admin/ContentQualityLog";
import NodeBuilder from "./pages/NodeBuilder";
import AbbyCoachPage from "./pages/AbbyCoachPage";
import Pricing from "./pages/Pricing";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import UnsubscribePage from "./pages/UnsubscribePage";
import ConnectSettings from "./pages/ConnectSettings";
import SocialAuthCallback from "./pages/SocialAuthCallback";
import CourseSalesPage from "./pages/CourseSalesPage";
import CourseLearnPage from "./pages/CourseLearnPage";
import MembershipSalesPage from "./pages/MembershipSalesPage";
import MemberPortalPage from "./pages/MemberPortalPage";
import EarningsDashboard from "./pages/EarningsDashboard";
import AdminPayouts from "./pages/AdminPayouts";
import SpecialEditionCalendarPage from "./pages/SpecialEditionCalendarPage";
import { BUILD_TIMESTAMP } from "./main";


const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="hidden lg:block space-y-3">
              <div className="h-16 rounded-xl bg-muted animate-pulse" />
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
            <div className="space-y-4">
              <div className="h-16 rounded-xl bg-muted animate-pulse" />
              <div className="h-10 w-2/3 rounded-lg bg-muted animate-pulse" />
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
              <div className="h-64 rounded-xl bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }
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
      <Route path="/get-featured" element={<Navigate to="/directory" replace />} />
      <Route path="/authors/:slug" element={<AuthorSlugRedirect />} />
      <Route path="/books/:slug" element={<BookSlugRedirect />} />
      <Route path="/create-microsite" element={<CreateMicrosite />} />
      <Route path="/join" element={<Join />} />
      <Route path="/auth" element={<Auth />} />
      {/* /onboarding removed — using dashboard widget instead */}
      <Route path="/admin-auth" element={<AdminAuth />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/dashboard" element={<AuthorDashboard />} />
      <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
      <Route path="/earnings" element={<ProtectedRoute><EarningsDashboard /></ProtectedRoute>} />
      <Route path="/admin/payouts" element={<ProtectedRoute><AdminPayouts /></ProtectedRoute>} />
      <Route path="/admin/content-quality" element={<ProtectedRoute><ContentQualityLog /></ProtectedRoute>} />
      <Route path="/dashboard/book/:bookId" element={<BookHub />} />
      <Route path="/dashboard/book/:bookId/build/:node" element={<ProtectedRoute><BookBuilderRoute /></ProtectedRoute>} />
      <Route path="/book-hub/:bookId" element={<BookHub />} />
      <Route path="/my-books" element={<AuthorDashboard initialSection="my-books" />} />
      <Route path="/my-contacts" element={<AuthorDashboard initialSection={"author-crm" as any} />} />
      <Route path="/brand-products" element={<ProtectedRoute><HubRedirect kind="brand" /></ProtectedRoute>} />
      <Route path="/build-authority" element={<ProtectedRoute><HubRedirect kind="build" /></ProtectedRoute>} />
      <Route path="/yield-revenue" element={<ProtectedRoute><HubRedirect kind="yield" /></ProtectedRoute>} />
      <Route path="/revenue-dashboard" element={<ProtectedRoute><RevenueFullDashboard /></ProtectedRoute>} />
      <Route path="/abby-coach" element={<ProtectedRoute><AbbyCoachPage /></ProtectedRoute>} />
      <Route path="/special-editions-calendar" element={<ProtectedRoute><SpecialEditionCalendarPage /></ProtectedRoute>} />
      <Route path="/node-builder/:nodeId" element={<ProtectedRoute><NodeBuilder /></ProtectedRoute>} />
      <Route path="/marketing-hub" element={<ProtectedRoute><AuthorDashboard initialSection={"marketing-hub" as any} /></ProtectedRoute>} />
      <Route path="/connect-settings" element={<ProtectedRoute><ConnectSettings /></ProtectedRoute>} />
      <Route path="/auth/social-callback" element={<SocialAuthCallback />} />
      <Route path="/pricing" element={<Navigate to="/" replace />} />
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
      <Route path="/terms-of-sale" element={<ReaderTermsOfSale />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/unsubscribe" element={<UnsubscribePage />} />
      <Route path="/:authorSlug/webinar" element={<WebinarIndexPage />} />
      <Route path="/:authorSlug/webinar/:slug" element={<WebinarRegistrationPage />} />
      {/* Sprint 40: Online Course + Membership reader pages */}
      <Route path="/:authorSlug/course/:courseSlug/learn" element={<CourseLearnPage />} />
      <Route path="/:authorSlug/course/:courseSlug" element={<CourseSalesPage />} />
      <Route path="/:authorSlug/members/welcome" element={<MemberPortalPage />} />
      <Route path="/:authorSlug/members/portal" element={<MemberPortalPage />} />
      <Route path="/:authorSlug/members" element={<MembershipSalesPage />} />
      <Route path="/:authorSlug/home-study-bundle/:purchaseId" element={<HomeStudyBundlePage />} />
      {/* Sprint 56: 3-segment route resolves to per-book microsite node OR product page */}
      <Route path="/:authorSlug/:bookSlug/:nodeSlug" element={<BookNodeResolver />} />
      <Route path="/:authorSlug/:bookSlug" element={<AuthorSubpageResolver />} />
      <Route path="/:authorSlug" element={<AuthorSite />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

const App = () => {
  console.log("Build:", BUILD_TIMESTAMP);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <ScrollToTop />
            <GlobalErrorBoundary>
              <AppRoutes />
            </GlobalErrorBoundary>
            <SectionBoundary name="AbbyHelpChatbot">
              <AbbyHelpChatbot />
            </SectionBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
