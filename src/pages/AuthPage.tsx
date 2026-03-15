import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLanguageSwitcher from "@/components/AppLanguageSwitcher";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";



const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, resetPassword } = useAuth();
  const { t, dir } = useLanguage();

  const emailSchema = z.string().email(t("auth.emailError"));
  const passwordSchema = z.string().min(6, t("auth.passwordError"));

  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: t("auth.loginFailed"),
              description: t("auth.invalidCredentials"),
              variant: "destructive",
            });
          } else {
            toast({
              title: t("auth.loginFailed"),
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
              title: t("auth.welcomeBack"),
              description: t("auth.loginSuccess"),
          });
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: t("auth.accountExists"),
              description: t("auth.alreadyRegistered"),
              variant: "destructive",
            });
          } else {
            toast({
              title: t("auth.signUpFailed"),
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
              title: t("auth.accountCreated"),
              description: t("auth.welcomeToJournal"),
          });
          navigate("/");
        }
      }
    } finally {
      setIsLoading(false);
     }
   };
 
   const handleResetPassword = async (e: React.FormEvent) => {
     e.preventDefault();
     const emailResult = emailSchema.safeParse(email);
     if (!emailResult.success) {
       setErrors({ email: emailResult.error.errors[0].message });
       return;
     }
     setIsLoading(true);
     try {
       const { error } = await resetPassword(email);
       if (error) {
         toast({
           title: t("auth.resetPasswordFailed"),
           description: error.message,
           variant: "destructive",
         });
       } else {
         toast({
           title: t("auth.resetPasswordSuccess"),
         });
         setShowResetPassword(false);
       }
     } finally {
       setIsLoading(false);
     }
    };

    const handleGoogleSignIn = async () => {
      setIsLoading(true);
      try {
        const redirectTo = `${window.location.origin}/auth/callback`;
        console.log("Google sign-in redirect URL:", redirectTo);
        
        // Try Lovable OAuth first (for mobile/Capacitor apps)
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: redirectTo,
        });
        
        if (result.redirected) {
          console.log("Lovable OAuth redirected successfully");
          return; // Let the redirect happen
        }
        
        if (result.error) {
          console.error("Lovable Google sign-in error:", result.error);
          // Fallback to Supabase OAuth for web
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo,
              skipBrowserRedirect: false,
            },
          });
          
          if (error) {
            let errorMessage = error.message || String(error);
            console.error("Supabase Google sign-in error:", error);
            // Provide more user-friendly messages for common OAuth errors
            if (errorMessage.includes("Unsupported provider") || errorMessage.includes("missing OAuth secret")) {
              errorMessage = t("auth.googleSignInFailed") + ": " + "Google OAuth is not properly configured in Supabase. Please ensure Google OAuth is enabled with correct Client ID and Secret in the Supabase dashboard > Authentication > Providers.";
            } else if (errorMessage.includes("OAuth") || errorMessage.includes("configuration") || errorMessage.includes("provider")) {
              errorMessage = t("auth.googleSignInFailed") + ": " + "Google OAuth might not be properly configured. Please check Supabase Authentication settings.";
            }
            toast({
              title: t("auth.googleSignInFailed"),
              description: errorMessage,
              variant: "destructive",
            });
          }
        } else {
          // Lovable OAuth succeeded without error or redirect (session was set)
          console.log("Lovable OAuth succeeded, session set");
          navigate("/");
        }
      } finally {
        setIsLoading(false);
      }
    };

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
            {t("auth.appName")}
          </h1>
          <p className="text-muted-foreground">
            {showResetPassword ? t("auth.resetPasswordInstructions") : (isLogin ? t("auth.welcomeLogin") : t("auth.welcomeSignup"))}
          </p>
        </div>

        {/* Auth Form */}
        <div className="glass-card rounded-3xl p-8">
          {showResetPassword ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold font-journal text-foreground mb-2">
                  {t("auth.resetPassword")}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {t("auth.resetPasswordInstructions")}
                </p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-5">
                {/* Email */}
                <div>
                  <div className="relative">
                    <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      className={`ps-12 h-14 rounded-2xl bg-background/50 border-border/50 ${
                        errors.email ? "border-destructive" : ""
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1 ml-1">{errors.email}</p>
                  )}
                </div>
                
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
                      {t("auth.resetPassword")}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              
              {/* Back to login */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setErrors({});
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← {t("auth.backToLogin")}
                </button>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Display Name (Sign Up Only) */}
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="relative">
                      <User className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder={t("auth.namePlaceholder")}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="ps-12 h-14 rounded-2xl bg-background/50 border-border/50"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Email */}
                <div>
                  <div className="relative">
                    <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      className={`ps-12 h-14 rounded-2xl bg-background/50 border-border/50 ${
                        errors.email ? "border-destructive" : ""
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1 ml-1">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="relative">
                    <Lock className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      className={`ps-12 pe-12 h-14 rounded-2xl bg-background/50 border-border/50 ${
                        errors.password ? "border-destructive" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-destructive text-sm mt-1 ml-1">{errors.password}</p>
                  )}
                  {/* Forgot password link */}
                  <div className="text-end mt-2">
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      {t("auth.forgotPassword")}
                    </button>
                  </div>
                </div>

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
                      {isLogin ? t("auth.signIn") : t("auth.createAccount")}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{t("auth.or")}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 rounded-2xl gap-3 text-base"
                onClick={handleGoogleSignIn}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {t("auth.continueGoogle")}
              </Button>

              {/* Toggle Auth Mode */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isLogin ? (
                    <>
                      {t("auth.noAccount")}{" "}
                      <span className="text-primary font-medium">{t("auth.signUp")}</span>
                    </>
                  ) : (
                    <>
                      {t("auth.haveAccount")}{" "}
                      <span className="text-primary font-medium">{t("auth.signInLink")}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
