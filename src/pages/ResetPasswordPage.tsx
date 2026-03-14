import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import AppLanguageSwitcher from "@/components/AppLanguageSwitcher";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { t, dir } = useLanguage();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // Check if we have a valid token in the URL hash
  useEffect(() => {
    const hash = location.hash;
    if (!hash || !hash.includes("access_token")) {
      // No token, redirect to auth page
      toast({
        title: t("auth.resetPasswordFailed"),
        description: t("auth.invalidResetLink"),
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // If auth is still loading, wait
    if (authLoading) {
      return;
    }

    // Auth loading finished, check if user is authenticated
    if (user) {
      setIsTokenValid(true);
      setCheckingToken(false);
    } else {
      // Token might be invalid or expired
      toast({
        title: t("auth.resetPasswordFailed"),
        description: t("auth.invalidResetLink"),
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [location.hash, user, authLoading, navigate, toast, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("auth.passwordError"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: t("auth.passwordResetSuccess"),
        description: t("auth.passwordUpdated"),
      });

      // Redirect to home page after successful password reset
      navigate("/");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t("auth.resetPasswordFailed");
      setError(errorMessage);
      toast({
        title: t("auth.resetPasswordFailed"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If still checking token or auth loading, show loading
  if (checkingToken || authLoading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center px-4 relative" dir={dir}>
        <div className="absolute top-4 right-4">
          <AppLanguageSwitcher />
        </div>
        <div className="text-center">
          <motion.div
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-muted-foreground">{t("auth.verifyingLink")}</p>
        </div>
      </div>
    );
  }

  // If token is not valid (should have been redirected), show nothing
  if (!isTokenValid) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-warm flex items-center justify-center px-4 relative" dir={dir}>
      <div className="absolute top-4 right-4">
        <AppLanguageSwitcher />
      </div>
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            className="w-20 h-20 rounded-3xl gradient-amber flex items-center justify-center mx-auto mb-4 shadow-glow"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-3xl">✨</span>
          </motion.div>
          <h1 className="text-3xl font-bold font-journal text-foreground mb-2">
            {t("auth.resetPassword")}
          </h1>
          <p className="text-muted-foreground">
            {t("auth.setNewPasswordInstructions")}
          </p>
        </div>

        {/* Password Reset Form */}
        <div className="glass-card rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <div className="relative">
                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.newPasswordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ps-12 pe-12 h-14 rounded-2xl bg-background/50 border-border/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <div className="relative">
                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="ps-12 pe-12 h-14 rounded-2xl bg-background/50 border-border/50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl gradient-amber shadow-glow text-lg font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <motion.div
                  className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <>
                  {t("auth.updatePassword")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Back to login */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← {t("auth.backToLogin")}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;