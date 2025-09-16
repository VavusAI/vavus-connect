import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Index from "./pages/Index";
import Translate from "./pages/Translate";
import AIChat from "./pages/AIChat";
import About from "./pages/About";
import Timeline from "./pages/Timeline";
import Business from "./pages/Business";
import Join from "./pages/Join";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import VavusAI from "./pages/VavusAI";
import VavusApps from "./pages/VavusApps";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import Kickstarter from "./pages/Kickstarter";



const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/translate" element={<Translate />} />
                <Route path="/ai" element={<AIChat />} />
                <Route path="/about" element={<About />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/business" element={<Business />} />
                <Route path="/vavus-ai" element={<VavusAI />} />
                <Route path="/vavus-apps" element={<VavusApps />} />
                <Route path="/join" element={<Join />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/kickstarter" element={<Kickstarter />} />

                {/* Auth pages */}
                <Route path="/auth" element={<AuthPage />} />
                <Route
                    path="/account"
                    element={
                      <ProtectedRoute>
                        <AccountPage />
                      </ProtectedRoute>
                    }
                />

                {/* Optional: keep old /login path but redirect to /auth */}
                <Route path="/login" element={<AuthPage />} />

                <Route path="*" element={<NotFound />} />
              </Routes>

            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
);

export default App;