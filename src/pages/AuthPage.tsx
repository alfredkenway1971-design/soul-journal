import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { lovable } from "@/integrations/lovable/index";
import { z } from "zod";

const AUTH_LANGUAGES = ["en", "fr", "es", "ar", "zh", "ja", "sw", "de"] as const;

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();
  const { language, setLanguage, t, dir } = useLanguage();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailSchema = z.string().email(t("auth.validation.email"));
    const passwordSchema = z.string().min(6, t("auth.validation.password"));
    
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
            title: t("auth.welcomeBackToast"),
            description: t("auth.welcomeToastDescription"),
          });
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: t("auth.accountExists"),
              description: t("auth.accountExists"),
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
            title: t("auth.accountCreatedToast"),
            description: t("auth.accountCreatedDescription"),
          });
          navigate("/");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir={dir} lang={language} className="min-h-screen gradient-warm flex items-center justify-center px-4">
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
            Voice Journal
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </p>

          {/* Language Selector */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {LANGUAGES.filter((l) => AUTH_LANGUAGES.includes(l.code as any)).map((lang) => (
              <motion.button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                whileTap={{ scale: 0.9 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  language === lang.code
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background/60 text-muted-foreground border-border/50 hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                <span>{lang.native}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Auth Form */}
        <div className="glass-card rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Name (Sign Up Only) */}
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t("auth.namePlaceholder")}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-12 h-14 rounded-2xl bg-background/50 border-border/50"
                  />
                </div>
              </motion.div>
            )}

            {/* Email */}
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                    placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`pl-12 h-14 rounded-2xl bg-background/50 border-border/50 ${
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
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                    placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`pl-12 pr-12 h-14 rounded-2xl bg-background/50 border-border/50 ${
                    errors.password ? "border-destructive" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-sm mt-1 ml-1">{errors.password}</p>
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
                   {isLogin ? t("auth.signIn") : t("auth.signUp")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
             <span className="text-xs text-muted-foreground">{t("common.or")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-14 rounded-2xl gap-3 text-base"
            onClick={async () => {
              const { error } = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (error) {
                 toast({
                  title: t("auth.googleSignInFailed"),
                  description: String(error),
                  variant: "destructive",
                });
              }
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
             {t("auth.continueWithGoogle")}
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
                  <span className="text-primary font-medium">{t("auth.signUpLink")}</span>
                </>
              ) : (
                <>
                  {t("auth.haveAccount")}{" "}
                  <span className="text-primary font-medium">{t("auth.signInLink")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
