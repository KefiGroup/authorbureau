import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Directory from "./pages/Directory";
import AuthorProfile from "./pages/AuthorProfile";
import BookMicrosite from "./pages/BookMicrosite";
import CreateMicrosite from "./pages/CreateMicrosite";
import Join from "./pages/Join";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import AuthorDashboard from "./pages/AuthorDashboard";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/directory" element={<Directory />} />
    <Route path="/authors/:slug" element={<AuthorProfile />} />
    <Route path="/books/:slug" element={<BookMicrosite />} />
    <Route path="/create-microsite" element={<ProtectedRoute><CreateMicrosite /></ProtectedRoute>} />
    <Route path="/join" element={<Join />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/admin" element={<AdminDashboard />} />
    <Route path="/dashboard" element={<AuthorDashboard />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
