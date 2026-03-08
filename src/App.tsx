import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import RecordPage from "@/pages/RecordPage";
import InsightsPage from "@/pages/InsightsPage";
import SettingsPage from "@/pages/SettingsPage";
import CalendarPage from "@/pages/CalendarPage";
import EntryDetailPage from "@/pages/EntryDetailPage";
import SecuritySettingsPage from "@/pages/SecuritySettingsPage";
import ProfileSettingsPage from "@/pages/ProfileSettingsPage";
import VoiceSettingsPage from "@/pages/VoiceSettingsPage";
import GoalsSettingsPage from "@/pages/GoalsSettingsPage";
import CoachingPage from "@/pages/CoachingPage";
import ThemesSettingsPage from "@/pages/ThemesSettingsPage";
import FontsSettingsPage from "@/pages/FontsSettingsPage";
import RemindersSettingsPage from "@/pages/RemindersSettingsPage";
import ExportPage from "@/pages/ExportPage";
import BookBuilderPage from "@/pages/BookBuilderPage";
import OnboardingPage from "@/pages/OnboardingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();
      setNeedsOnboarding(!(data as any)?.onboarding_completed);
      setOnboardingChecked(true);
    };
    if (user) checkOnboarding();
  }, [user]);
  
  if (loading || (user && !onboardingChecked)) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to onboarding if not completed (but allow /onboarding and /settings/voice)
  const allowedPaths = ["/onboarding", "/settings/voice"];
  if (needsOnboarding && !allowedPaths.includes(location.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/record"
        element={
          <ProtectedRoute>
            <RecordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <InsightsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/security"
        element={
          <ProtectedRoute>
            <SecuritySettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/profile"
        element={
          <ProtectedRoute>
            <ProfileSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/voice"
        element={
          <ProtectedRoute>
            <VoiceSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/goals"
        element={
          <ProtectedRoute>
            <GoalsSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coaching"
        element={
          <ProtectedRoute>
            <CoachingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/themes"
        element={
          <ProtectedRoute>
            <ThemesSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/fonts"
        element={
          <ProtectedRoute>
            <FontsSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/reminders"
        element={
          <ProtectedRoute>
            <RemindersSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/export"
        element={
          <ProtectedRoute>
            <ExportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/export/book-builder"
        element={
          <ProtectedRoute>
            <BookBuilderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/entry/:id"
        element={
          <ProtectedRoute>
            <EntryDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  // Initialize dark mode and theme on app load
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      document.documentElement.classList.add('dark');
    }
    
    // Apply saved theme
    const savedTheme = localStorage.getItem('app-theme');
    const savedBg = localStorage.getItem('app-background');
    if (savedTheme) {
      const themeColors: Record<string, Record<string, string>> = {
        warm: { '--primary': '35 90% 55%', '--accent': '35 80% 55%', '--ring': '35 90% 55%', '--gradient-cream': 'linear-gradient(180deg, hsl(36 33% 96%) 0%, hsl(36 25% 91%) 100%)' },
        sage: { '--primary': '145 30% 50%', '--accent': '145 25% 50%', '--ring': '145 30% 50%', '--gradient-cream': 'linear-gradient(180deg, hsl(140 20% 95%) 0%, hsl(145 18% 90%) 100%)' },
        coral: { '--primary': '15 85% 60%', '--accent': '15 75% 60%', '--ring': '15 85% 60%', '--gradient-cream': 'linear-gradient(180deg, hsl(15 40% 96%) 0%, hsl(20 30% 91%) 100%)' },
        lavender: { '--primary': '270 50% 65%', '--accent': '270 45% 65%', '--ring': '270 50% 65%', '--gradient-cream': 'linear-gradient(180deg, hsl(270 30% 96%) 0%, hsl(275 25% 91%) 100%)' },
        sky: { '--primary': '200 70% 55%', '--accent': '200 60% 55%', '--ring': '200 70% 55%', '--gradient-cream': 'linear-gradient(180deg, hsl(200 30% 96%) 0%, hsl(205 25% 91%) 100%)' },
      };
      const colors = themeColors[savedTheme];
      if (colors) {
        const root = document.documentElement;
        Object.entries(colors).forEach(([prop, value]) => {
          root.style.setProperty(prop, value);
        });
      }
      if (savedBg === 'solid') {
        document.documentElement.style.setProperty('--gradient-cream', 'none');
      }
    }
    
    // Apply saved font
    const savedFont = localStorage.getItem('app-font');
    if (savedFont) {
      document.documentElement.setAttribute('data-font', savedFont);
      // Apply font family
      const fontFamilies: Record<string, string> = {
        'inter': "'Inter', sans-serif",
        'crimson': "'Crimson Pro', serif",
        'georgia': "Georgia, serif",
        'system': "system-ui, sans-serif",
      };
      if (fontFamilies[savedFont]) {
        document.body.style.fontFamily = fontFamilies[savedFont];
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
