import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";

const SentryTest = lazy(() => import("./pages/SentryTest"));
const Index = lazy(() => import("./pages/Index"));
const IndexV2 = lazy(() => import("./pages/IndexV2"));
const CGV = lazy(() => import("./pages/CGV"));
const Questionnaire = lazy(() => import("./pages/Questionnaire"));
const QuestionnaireV2 = lazy(() => import("./pages/QuestionnaireV2"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TravelRecommendations = lazy(() => import("./pages/TravelRecommendations"));
const TripDetails = lazy(() => import("./pages/TripDetails"));
const Booking = lazy(() => import("./pages/Booking"));
const Discover = lazy(() => import("./pages/Discover"));
const TravelPlanner = lazy(() => import("./pages/TravelPlanner"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AppContent = () => {
  usePageTracking();
  
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/v2" element={<IndexV2 />} />
        <Route path="/cgv" element={<CGV />} />
        <Route path="/questionnaire" element={<Questionnaire />} />
        <Route path="/questionnaire-v2" element={<QuestionnaireV2 />} />
        <Route path="/sentry-test" element={<SentryTest />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/admin/blog" element={<AdminBlog />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/recommendations" element={<TravelRecommendations />} />
        <Route path="/recommendations/:code" element={<TravelRecommendations />} />
        <Route path="/trip-details/:code" element={<TripDetails />} />
        <Route path="/trip-details" element={<TripDetails />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/planner" element={<TravelPlanner />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
