import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ChevronDown, Sparkles } from "lucide-react";
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
import { lovable } from "@/integrations/lovable/index";
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
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;
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
          toast({ title: t("auth.signIn"), description: error.message, variant: "destructive" });
        } else navigate("/");
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          toast({ title: t("auth.signUp"), description: error.message, variant: "destructive" });
        } else navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4">
      {/* Underwater gradient backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, hsl(195 85% 75%) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, hsl(220 80% 55%) 0%, transparent 60%), linear-gradient(180deg, hsl(200 80% 80%) 0%, hsl(210 75% 60%) 50%, hsl(220 70% 40%) 100%)",
        }}
      />
      {/* Caustic light orbs */}
      <div className="absolute top-10 -left-20 w-80 h-80 rounded-full bg-white/30 blur-3xl" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="absolute top-1/3 right-10 w-40 h-40 rounded-full bg-white/20 blur-2xl" />

      <motion.div
        className="relative w-full max-w-md z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Language Dropdown */}
        <div className="flex justify-end mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full gap-2 px-4 py-2 bg-white/20 border-white/40 backdrop-blur-xl text-white hover:bg-white/30"
              >
                <span className="text-lg">{currentLang?.flag}</span>
                <span className="text-sm font-medium">{currentLang?.native}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
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
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-sm">{lang.native}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center backdrop-blur-2xl border border-white/50"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), rgba(255,255,255,0.2))",
              boxShadow: "0 20px 50px -10px hsl(220 80% 30% / 0.5), inset 0 1px 0 rgba(255,255,255,0.6)",
            }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="w-10 h-10 text-white drop-shadow-lg" />
          </motion.div>
          <h1 className="text-4xl font-display font-semibold text-white drop-shadow-md mb-2">
            Soul Journal
          </h1>
          <p className="text-white/80">
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </p>
        </div>

        {/* Glass Auth Card */}
        <div
          className="rounded-3xl p-7 backdrop-blur-2xl border border-white/40"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.18) 100%)",
            boxShadow:
              "0 25px 60px -15px hsl(220 80% 25% / 0.5), inset 0 1px 0 rgba(255,255,255,0.55)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                  <Input
                    type="text"
                    placeholder={t("auth.yourName")}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-12 h-14 rounded-2xl bg-white/20 border-white/40 text-white placeholder:text-white/60 backdrop-blur-md"
                  />
                </div>
              </motion.div>
            )}

            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                <Input
                  type="email"
                  placeholder={t("auth.email")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`pl-12 h-14 rounded-2xl bg-white/20 border-white/40 text-white placeholder:text-white/60 backdrop-blur-md ${
                    errors.email ? "border-destructive" : ""
                  }`}
                />
              </div>
              {errors.email && <p className="text-red-100 text-sm mt-1 ml-1">{errors.email}</p>}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.password")}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`pl-12 pr-12 h-14 rounded-2xl bg-white/20 border-white/40 text-white placeholder:text-white/60 backdrop-blur-md ${
                    errors.password ? "border-destructive" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-100 text-sm mt-1 ml-1">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl text-lg font-medium text-white border border-white/30"
              style={{
                background:
                  "linear-gradient(135deg, hsl(211 90% 58%) 0%, hsl(220 85% 45%) 100%)",
                boxShadow: "0 10px 30px -8px hsl(220 80% 30% / 0.6)",
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
                  {isLogin ? t("auth.signIn") : t("auth.signUp")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/30" />
            <span className="text-xs text-white/70">{t("auth.or")}</span>
            <div className="flex-1 h-px bg-white/30" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-14 rounded-2xl gap-3 text-base bg-white/30 border-white/40 text-white hover:bg-white/40 backdrop-blur-md"
            onClick={async () => {
              const { error } = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (error) {
                toast({
                  title: "Google Sign In Failed",
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
            {t("auth.continueGoogle")}
          </Button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-white/80 hover:text-white transition-colors"
            >
              {isLogin ? (
                <>
                  {t("auth.noAccount")}{" "}
                  <span className="text-white font-semibold underline">{t("auth.signUpLink")}</span>
                </>
              ) : (
                <>
                  {t("auth.hasAccount")}{" "}
                  <span className="text-white font-semibold underline">{t("auth.signInLink")}</span>
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
