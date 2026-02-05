import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
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
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      const root = document.documentElement;
      // Apply theme colors to primary CSS variable
      if (savedTheme === 'warm') {
        root.style.setProperty('--primary', '35 90% 55%');
      } else if (savedTheme === 'sage') {
        root.style.setProperty('--primary', '145 30% 60%');
      } else if (savedTheme === 'coral') {
        root.style.setProperty('--primary', '15 85% 65%');
      } else if (savedTheme === 'lavender') {
        root.style.setProperty('--primary', '270 50% 70%');
      } else if (savedTheme === 'sky') {
        root.style.setProperty('--primary', '200 70% 70%');
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
