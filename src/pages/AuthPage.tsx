import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ChevronDown, BookOpen, Feather } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { LANGUAGES, useLanguage } from "@/contexts/LanguageContext";
import { FlagIcon } from "@/components/FlagIcon";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const currentLang = LANGUAGES.find((l) => l.code === language);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    const e1 = emailSchema.safeParse(email);
    if (!e1.success) newErrors.email = e1.error.errors[0].message;
    const e2 = passwordSchema.safeParse(password);
    if (!e2.success) newErrors.password = e2.error.errors[0].message;
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
        if (error) toast({ title: t("auth.signIn"), description: error.message, variant: "destructive" });
        else navigate("/");
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) toast({ title: t("auth.signUp"), description: error.message, variant: "destructive" });
        else navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-5 py-10">
      {/* Light sky-water gradient backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(198 85% 80%) 0%, hsl(200 80% 75%) 45%, hsl(205 75% 70%) 100%)",
        }}
      />
      {/* Caustic water ripples */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.55) 0%, transparent 35%), radial-gradient(ellipse at 70% 90%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(ellipse at 50% 60%, rgba(255,255,255,0.3) 0%, transparent 45%)",
        }}
      />
      <div className="absolute top-20 -left-10 w-72 h-72 rounded-full bg-white/35 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-72 rounded-full bg-white/40 blur-3xl" />

      <motion.div
        className="relative w-full max-w-md z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Glass Auth Card */}
        <div
          className="relative rounded-[32px] p-8 pt-7 backdrop-blur-2xl border border-white/60"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.35) 100%)",
            boxShadow:
              "0 30px 80px -20px hsl(210 60% 35% / 0.35), inset 0 1px 0 rgba(255,255,255,0.75)",
          }}
        >
          {/* Language pill — top right */}
          <div className="flex justify-end mb-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1.5 rounded-full bg-white/60 border border-white/70 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white/80 transition"
                >
                  <FlagIcon code={language} className="w-4 h-4" />
                  <span>{currentLang?.native}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${
                      language === lang.code ? "bg-primary/10 font-semibold" : ""
                    }`}
                  >
                    <FlagIcon code={lang.code} className="w-5 h-5" />
                    <span className="text-sm">{lang.native}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Logo */}
          <div className="text-center mb-7 -mt-3">
            <motion.div
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center border border-white/80 relative"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(220,240,255,0.6))",
                boxShadow:
                  "0 10px 30px -10px hsl(210 60% 30% / 0.35), inset 0 1px 0 rgba(255,255,255,0.95)",
              }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <BookOpen className="w-9 h-9 text-[hsl(215_60%_30%)]" strokeWidth={2.2} />
              <Feather
                className="absolute -right-1 top-2 w-5 h-5 text-[hsl(215_60%_30%)] rotate-12"
                strokeWidth={2.2}
              />
              {/* Halo */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ boxShadow: "0 0 0 4px rgba(255,200,80,0.25)" }}
              />
            </motion.div>
            <h1 className="text-[34px] leading-none font-display font-semibold text-[hsl(215_55%_22%)] tracking-tight">
              Soul Journal
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLogin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type="text"
                    placeholder={t("auth.yourName")}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-12 h-14 rounded-full bg-white/55 border border-white/70 text-slate-800 placeholder:text-slate-500 backdrop-blur-md focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
              </motion.div>
            )}

            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="email"
                  placeholder={t("auth.email") || "Email address"}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  className={`pl-12 h-14 rounded-full bg-white/55 border border-white/70 text-slate-800 placeholder:text-slate-500 backdrop-blur-md ${
                    errors.email ? "border-destructive" : ""
                  }`}
                />
              </div>
              {errors.email && <p className="text-destructive text-xs mt-1 ml-4">{errors.email}</p>}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.password") || "Password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  className={`pl-12 pr-12 h-14 rounded-full bg-white/55 border border-white/70 text-slate-800 placeholder:text-slate-500 backdrop-blur-md ${
                    errors.password ? "border-destructive" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-xs mt-1 ml-4">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-full text-base font-medium text-white border-0 mt-1"
              style={{
                background:
                  "linear-gradient(180deg, hsl(208 80% 55%) 0%, hsl(215 75% 42%) 100%)",
                boxShadow:
                  "0 10px 28px -8px hsl(215 75% 35% / 0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <motion.div
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <>
                  {isLogin ? t("auth.signIn") || "Sign In" : t("auth.signUp") || "Sign Up"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-400/30" />
            <span className="text-xs text-slate-500">{t("auth.or") || "or"}</span>
            <div className="flex-1 h-px bg-slate-400/30" />
          </div>

          <button
            type="button"
            className="w-full h-14 rounded-full gap-3 text-base bg-white/55 border border-white/70 text-slate-800 hover:bg-white/70 backdrop-blur-md flex items-center justify-center font-medium transition"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: window.location.origin,
                },
              });
              if (error) {
                toast({
                  title: "Google Sign In Failed",
                  description: error.message,
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
            {t("auth.continueGoogle") || "Continue with Google"}
          </button>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              {isLogin ? (
                <>
                  {t("auth.noAccount") || "Don't have an account?"}{" "}
                  <span className="text-[hsl(208_80%_45%)] font-semibold">
                    {t("auth.signUpLink") || "Sign up"}
                  </span>
                </>
              ) : (
                <>
                  {t("auth.hasAccount") || "Already have an account?"}{" "}
                  <span className="text-[hsl(208_80%_45%)] font-semibold">
                    {t("auth.signInLink") || "Sign in"}
                  </span>
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
