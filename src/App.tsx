import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import IndexEN from "./pages/IndexEN";
import CGV from "./pages/CGV";
import CGVEN from "./pages/CGVEN";
import Questionnaire from "./pages/Questionnaire";
import QuestionnaireEN from "./pages/QuestionnaireEN";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import AdminBlog from "./pages/AdminBlog";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TravelRecommendations from "./pages/TravelRecommendations";
import Booking from "./pages/Booking";
import Discover from "./pages/Discover";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cgv" element={<CGV />} />
            <Route path="/en" element={<IndexEN />} />
            <Route path="/en/terms" element={<CGVEN />} />
            <Route path="/questionnaire" element={<Questionnaire />} />
            <Route path="/en/questionnaire" element={<QuestionnaireEN />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/admin/blog" element={<AdminBlog />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/recommendations" element={<TravelRecommendations />} />
            <Route path="/recommendations/:code" element={<TravelRecommendations />} />
            <Route path="/booking" element={<Booking />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
