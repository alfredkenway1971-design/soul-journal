import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Download, FileText, RefreshCcw, Crown, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import UpgradePrompt from "@/components/premium/UpgradePrompt";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLanguageName } from "@/contexts/LanguageContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { loadAIPrefs } from "@/lib/goalAccountability";
import { monthKey, monthLabel, loadMonthPortrait, saveMonthPortrait, cachedMonths, type SoulMirrorPortrait } from "@/lib/soulMirror";

const TRAJECTORY_ICON: Record<string, JSX.Element> = {
  improving: <TrendingUp className="w-4 h-4 text-emerald-600" />,
  declining: <TrendingDown className="w-4 h-4 text-amber-600" />,
  stable: <Minus className="w-4 h-4 text-muted-foreground" />,
};

/* ---------- Canvas image export (1080x1350, Instagram-friendly) ---------- */

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const exportAsImage = (portrait: SoulMirrorPortrait, ym: string, langCode: string, t: (k: string) => string) => {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const emerald = "#1E7A46";
  const soft = "#6B8F7C";
  const light = "#F4FAF7";

  // Background gradient (soft green)
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#CDEEDB");
  grad.addColorStop(1, "#F4FAF7");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(40, 40, W - 80, H - 80, 32);
  ctx.fill();
  ctx.strokeStyle = "#BFE3CF";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textBaseline = "top";
  ctx.fillStyle = emerald;
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText("✨ Soul Mirror", 80, 90);
  ctx.font = "300 34px system-ui, sans-serif";
  ctx.fillStyle = soft;
  ctx.fillText(monthLabel(ym, langCode).toUpperCase(), 80, 160);

  // Life chapter
  ctx.fillStyle = "#EAF6EF";
  ctx.beginPath();
  ctx.roundRect(80, 230, W - 160, 110, 20);
  ctx.fill();
  ctx.fillStyle = emerald;
  ctx.font = "italic bold 40px system-ui, sans-serif";
  const chapterLines = wrapText(ctx, portrait.lifeChapter || "", W - 220);
  chapterLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 110, 260 + i * 52));

  // Sections
  let y = 410;
  const section = (emoji: string, title: string, body: string[]) => {
    if (y > H - 320) return;
    ctx.fillStyle = emerald;
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.fillText(`${emoji} ${title}`, 80, y);
    y += 52;
    ctx.fillStyle = "#374151";
    ctx.font = "28px system-ui, sans-serif";
    for (const line of body) {
      if (y > H - 340) break;
      ctx.fillText(line, 80, y);
      y += 40;
    }
    y += 24;
  };

  const emo = (portrait.emotionalSummary?.dominantMoods || [])
    .map((m) => `${m.mood} (${m.days}j)`)
    .join(" · ");
  section("🎭", t("soulMirror.sectionEmotional"), [
    emo,
    portrait.emotionalSummary?.text || "",
  ]);
  section("🔍", t("soulMirror.sectionHidden"), wrapText(ctx, portrait.hiddenPatterns || "", W - 180).slice(0, 3));
  section("💜", t("soulMirror.sectionJoy"), (portrait.sourcesOfJoy || []).slice(0, 4).map((s) => `• ${s}`));
  section("🌱", t("soulMirror.sectionGrowth"), wrapText(ctx, portrait.growthArea || "", W - 180).slice(0, 2));

  // Disclaimer
  ctx.fillStyle = soft;
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText(t("soulMirror.disclaimer"), 80, H - 110);

  const a = document.createElement("a");
  a.download = `soul-mirror-${ym}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
};

/* ---------- PDF export ---------- */

const exportAsPdf = async (portrait: SoulMirrorPortrait, ym: string, langCode: string, t: (k: string) => string) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const M = 20;
  const maxW = W - M * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 122, 70);
  doc.text("✨ Soul Mirror", M, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(107, 143, 124);
  doc.text(monthLabel(ym, langCode), M, 34);

  let y = 48;
  const para = (title: string, body: string) => {
    if (y > 270) {
      doc.addPage();
      y = 24;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 122, 70);
    doc.text(title, M, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(body, maxW) as string[];
    doc.text(lines, M, y);
    y += lines.length * 5.5 + 8;
  };

  const emo = (portrait.emotionalSummary?.dominantMoods || [])
    .map((m) => `${m.mood} (${m.days}j)`)
    .join(" · ");
  para(t("soulMirror.sectionEmotional"), emo + "\n" + (portrait.emotionalSummary?.text || ""));
  para(t("soulMirror.sectionHidden"), portrait.hiddenPatterns || "");
  para(
    t("soulMirror.sectionGoals"),
    (portrait.goalProgress || [])
      .map((g) => `• ${g.goal} — ${g.note || g.status}`)
      .join("\n") || "—"
  );
  para(t("soulMirror.sectionJoy"), (portrait.sourcesOfJoy || []).map((s) => `• ${s}`).join("\n"));
  para(t("soulMirror.sectionGrowth"), portrait.growthArea || "");
  para(t("soulMirror.sectionChapter"), portrait.lifeChapter || "");

  doc.setFontSize(9);
  doc.setTextColor(107, 143, 124);
  doc.text(t("soulMirror.disclaimer"), M, 290);

  doc.save(`soul-mirror-${ym}.pdf`);
};

/* ---------- Page ---------- */

const SoulMirrorPage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const api = useJournalAPI(language);

  const current = monthKey(new Date());
  const [selected, setSelected] = useState<string>(current);
  const [portrait, setPortrait] = useState<SoulMirrorPortrait | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [months, setMonths] = useState<string[]>([current]);
  const [regenerating, setRegenerating] = useState(false);

  const loadPortrait = useCallback(
    async (ym: string, force = false) => {
      if (!user) return;
      const cached = loadMonthPortrait(ym);
      if (cached && !force) {
        setPortrait(cached);
        setEmpty(false);
        setLoading(false);
        return;
      }
      if (!force) {
        setLoading(true);
      } else {
        setRegenerating(true);
      }
      try {
        // Entries from that month
        const start = ym + "-01T00:00:00";
        const end = new Date(new Date(ym + "-01T12:00:00").getFullYear(), new Date(ym + "-01T12:00:00").getMonth() + 1, 1)
          .toISOString();
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('id, mood, created_at, enhanced_text, original_transcription')
          .eq('user_id', user.id)
          .gte('created_at', start)
          .lt('created_at', end)
          .order('created_at', { ascending: true })
          .limit(60);
        const rows = (entries || [])
          .map((r: any) => ({
            id: r.id,
            mood: r.mood || "fine",
            created_at: r.created_at,
            text: r.enhanced_text || r.original_transcription || "",
          }))
          .filter((r: any) => r.text && r.text.trim().length > 5);

        if (rows.length === 0) {
          setPortrait(null);
          setEmpty(true);
          setLoading(false);
          setRegenerating(false);
          return;
        }

        // Goals
        const { data: profile } = await supabase
          .from('profiles')
          .select('goals')
          .eq('id', user.id)
          .maybeSingle();
        const goals = ((profile as any)?.goals || []).map((g: any) => g?.title || g).filter(Boolean) as string[];

        const result = await api.generateSoulMirror(ym, rows, goals, getLanguageName(language));
        if (result) {
          saveMonthPortrait(ym, result);
          setPortrait(result);
          setEmpty(false);
        } else {
          setPortrait(null);
          setEmpty(true);
        }
      } catch (err) {
        console.warn('Soul Mirror failed:', err);
        const cached = loadMonthPortrait(ym);
        if (cached) {
          setPortrait(cached);
          setEmpty(false);
        }
      } finally {
        setLoading(false);
        setRegenerating(false);
      }
    },
    [user, language]
  );

  useEffect(() => {
    setMonths([current, ...cachedMonths().filter((m) => m !== current)]);
  }, [portrait]);

  useEffect(() => {
    setPortrait(null);
    setEmpty(false);
    setLoading(true);
    loadPortrait(selected);
  }, [selected]);

  if (!isPremium) {
    return (
      <div className="min-h-screen gradient-warm pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground">{t("soulMirror.title")}</h1>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-12">
          <UpgradePrompt
            feature={t("soulMirror.title")}
            description={t("soulMirror.premiumDesc")}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {t("soulMirror.title")}
                <Crown className="w-4 h-4 text-amber-500" />
              </h1>
              <p className="text-sm text-muted-foreground">{t("soulMirror.subtitle")}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Month navigation */}
        {months.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {months.map((m) => (
              <button
                key={m}
                onClick={() => setSelected(m)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                  selected === m
                    ? "bg-primary text-white border-primary"
                    : "bg-white/60 dark:bg-white/10 border-border/50 text-muted-foreground"
                }`}
              >
                {monthLabel(m, language)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : empty ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">{t("soulMirror.emptyTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("soulMirror.empty")}</p>
          </div>
        ) : portrait ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Portrait card */}
            <div className="glass-card rounded-3xl p-6 space-y-5 overflow-hidden">
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground tracking-wider">
                  {monthLabel(selected, language)}
                </p>
                <h2 className="font-display text-2xl font-semibold text-primary mt-1">
                  {portrait.lifeChapter || "—"}
                </h2>
              </div>

              {/* Emotional Summary */}
              <div className="p-4 rounded-2xl bg-primary/5 space-y-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  🎭 {t("soulMirror.sectionEmotional")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(portrait.emotionalSummary?.dominantMoods || []).map((m, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-white/70 dark:bg-white/10 border border-border/50 rounded-full px-2.5 py-1">
                      {m.mood} · {m.days}j
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 text-xs bg-white/70 dark:bg-white/10 border border-border/50 rounded-full px-2.5 py-1">
                    {TRAJECTORY_ICON[portrait.emotionalSummary?.trajectory || "stable"]}
                    {t("soulMirror.trajectory." + (portrait.emotionalSummary?.trajectory || "stable"))}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{portrait.emotionalSummary?.text}</p>
              </div>

              {/* Hidden Patterns */}
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-border/40 space-y-1.5">
                <p className="text-sm font-semibold text-foreground">🔍 {t("soulMirror.sectionHidden")}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{portrait.hiddenPatterns}</p>
              </div>

              {/* Goal Progress */}
              {(portrait.goalProgress || []).length > 0 && (
                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-border/40 space-y-2">
                  <p className="text-sm font-semibold text-foreground">🎯 {t("soulMirror.sectionGoals")}</p>
                  {portrait.goalProgress.map((g, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={g.status === "advanced" ? "text-emerald-600" : "text-amber-600"}>
                        {g.status === "advanced" ? "✓" : "○"}
                      </span>
                      <span className="text-foreground/85">
                        <strong className="font-medium">{g.goal}</strong>
                        {g.note ? ` — ${g.note}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sources of Joy */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 space-y-1.5">
                <p className="text-sm font-semibold text-foreground">💜 {t("soulMirror.sectionJoy")}</p>
                <ul className="space-y-1">
                  {(portrait.sourcesOfJoy || []).map((s, i) => (
                    <li key={i} className="text-sm text-foreground/80">• {s}</li>
                  ))}
                </ul>
              </div>

              {/* Growth Area */}
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-border/40 space-y-1.5">
                <p className="text-sm font-semibold text-foreground">🌱 {t("soulMirror.sectionGrowth")}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{portrait.growthArea}</p>
              </div>

              {/* Disclaimer */}
              <p className="text-[11px] text-muted-foreground text-center">
                {t("soulMirror.disclaimer")}
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12 rounded-2xl gap-2"
                onClick={() => exportAsImage(portrait, selected, language, t)}
              >
                <Download className="w-4 h-4" />
                {t("soulMirror.exportImage")}
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-2xl gap-2"
                onClick={() => exportAsPdf(portrait, selected, language, t)}
              >
                <FileText className="w-4 h-4" />
                {t("soulMirror.exportPdf")}
              </Button>
            </div>

            {selected === current && (
              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground"
                onClick={() => loadPortrait(selected, true)}
                disabled={regenerating}
              >
                {regenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("soulMirror.generating")}
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-4 h-4" />
                    {t("soulMirror.regenerate")}
                  </>
                )}
              </Button>
            )}
          </motion.div>
        ) : null}
      </main>
    </div>
  );
};

export default SoulMirrorPage;
