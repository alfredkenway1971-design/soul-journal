import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Palette, Type, Sparkles, Loader2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import UpgradePrompt from "@/components/premium/UpgradePrompt";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";
import CoverTemplates, { type CoverTemplate } from "@/components/book-builder/CoverTemplates";
import FontSelector, { type BookFont } from "@/components/book-builder/FontSelector";
import PageStyleSelector, { type PageBackground, type EntryLayout } from "@/components/book-builder/PageStyleSelector";
import BookPreview from "@/components/book-builder/BookPreview";
import { generateAndDownloadPDF, generatePreviewDataURL, type PhotoSize, type FontSize } from "@/lib/generateBookPDF";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Step = 1 | 2 | 3 | 4;

const stepInfo = [
  { num: 1, label: "bookBuilder.step1", icon: Calendar },
  { num: 2, label: "bookBuilder.step2", icon: Palette },
  { num: 3, label: "bookBuilder.step3", icon: Type },
  { num: 4, label: "bookBuilder.step4", icon: Sparkles },
];

const fontSizeLabels: Record<FontSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

const BookBuilderPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = useSubscription();

  const [step, setStep] = useState<Step>(1);
  const [generating, setGenerating] = useState(false);

  // User profile
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Step 1 — Date Range
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [entryCount, setEntryCount] = useState<number | null>(null);

  // Step 2 — Cover
  const [cover, setCover] = useState<CoverTemplate>("nebula");
  const [customTitle, setCustomTitle] = useState("");
  const [showAvatar, setShowAvatar] = useState(true);

  // Step 3 — Font & Page
  const [font, setFont] = useState<BookFont>("classic");
  const [background, setBackground] = useState<PageBackground>("blank");
  const [layout, setLayout] = useState<EntryLayout>("one-per-page");
  const [watermark, setWatermark] = useState(true);
  const [photoSize, setPhotoSize] = useState<PhotoSize>("medium");
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("book-font-size")) as FontSize | null;
    return saved && ["small", "medium", "large"].includes(saved) ? saved : "medium";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("book-font-size", fontSize);
  }, [fontSize]);

  // Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const yearRange = (() => {
    if (startDate && endDate) {
      const sy = new Date(startDate).getFullYear();
      const ey = new Date(endDate).getFullYear();
      return sy === ey ? `${sy}` : `${sy} — ${ey}`;
    }
    return `${new Date().getFullYear()}`;
  })();

  const displayName = customTitle || userName;

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single();
      if (data?.display_name) setUserName(data.display_name);
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    })();
  }, [user]);

  // Count entries when dates change
  const [countingEntries, setCountingEntries] = useState(false);
  useEffect(() => {
    if (!user || !startDate || !endDate) { setEntryCount(null); setCountingEntries(false); return; }
    setCountingEntries(true);
    (async () => {
      try {
        const { count, error } = await supabase
          .from("journal_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", new Date(startDate + "T00:00:00").toISOString())
          .lte("created_at", new Date(endDate + "T23:59:59").toISOString());
        if (error) throw error;
        setEntryCount(count ?? 0);
      } catch (err) {
        console.error("Entry count failed:", err);
        setEntryCount(null);
      } finally {
        setCountingEntries(false);
      }
    })();
  }, [user, startDate, endDate]);

  const [progressMsg, setProgressMsg] = useState("");

  const handlePreview = async () => {
    if (!user) return;
    setPreviewLoading(true);
    try {
      // Fetch one sample entry
      let query = supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (startDate) query = query.gte("created_at", new Date(startDate + "T00:00:00").toISOString());
      if (endDate) query = query.lte("created_at", new Date(endDate + "T23:59:59").toISOString());

      const { data } = await query;
      const sample = data?.[0];
      if (!sample) {
        toast({ title: "No entries", description: "No entries found to preview.", variant: "destructive" });
        setPreviewLoading(false);
        return;
      }

      // Fetch photos for this entry
      const { data: mediaData } = await supabase
        .from("entry_media")
        .select("storage_path")
        .eq("entry_id", sample.id)
        .eq("media_type", "photo");

      let photoUrls: string[] = [];
      if (mediaData && mediaData.length > 0) {
        for (const m of mediaData) {
          const { data: urlData } = await supabase.storage
            .from("journal-photos")
            .createSignedUrl(m.storage_path, 3600);
          if (urlData?.signedUrl) photoUrls.push(urlData.signedUrl);
        }
      }

      const url = await generatePreviewDataURL(
        { cover, font, background, layout, watermark, userName: displayName, yearRange, avatarUrl, showAvatar, photoSize, fontSize },
        { ...sample, photoUrls }
      );
      setPreviewUrl(url);
      setShowPreviewDialog(true);
    } catch (err) {
      console.error(err);
      toast({ title: "Preview failed", description: "Could not generate preview.", variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setProgressMsg("Fetching entries...");
    try {
      let query = supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (startDate) query = query.gte("created_at", new Date(startDate + "T00:00:00").toISOString());
      if (endDate) query = query.lte("created_at", new Date(endDate + "T23:59:59").toISOString());

      const { data: entries, error } = await query;
      if (error) throw error;
      if (!entries || entries.length === 0) {
        toast({ title: "No entries found", description: "Adjust your date range.", variant: "destructive" });
        setGenerating(false);
        return;
      }

      // Fetch photos for each entry
      setProgressMsg("Loading photos...");
      const entryIds = entries.map(e => e.id);
      const { data: mediaData } = await supabase
        .from("entry_media")
        .select("entry_id, storage_path")
        .in("entry_id", entryIds)
        .eq("media_type", "photo");

      const photoMap: Record<string, string[]> = {};
      if (mediaData && mediaData.length > 0) {
        for (const m of mediaData) {
          const { data: urlData } = await supabase.storage
            .from("journal-photos")
            .createSignedUrl(m.storage_path, 3600);
          if (urlData?.signedUrl) {
            if (!photoMap[m.entry_id]) photoMap[m.entry_id] = [];
            photoMap[m.entry_id].push(urlData.signedUrl);
          }
        }
      }

      const entriesWithPhotos = entries.map(e => ({
        ...e,
        photoUrls: photoMap[e.id] || [],
      }));

      await generateAndDownloadPDF(
        { cover, font, background, layout, watermark, userName: displayName, yearRange, avatarUrl, showAvatar, photoSize, fontSize },
        entriesWithPhotos,
        setProgressMsg
      );

      toast({ title: "Book Downloaded! 📖", description: `${entries.length} entries compiled into your Soul Book PDF.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Generation Failed", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setGenerating(false);
      setProgressMsg("");
    }
  };

  const canProceed: Record<Step, boolean> = {
    1: !!startDate && !!endDate,
    2: true,
    3: true,
    4: true,
  };

  const handleContinue = () => {
    if (step === 1) {
      if (!user) {
        toast({ title: "Session expired", description: "Please log in again to continue.", variant: "destructive" });
        navigate("/auth");
        return;
      }
      if (!startDate || !endDate) {
        toast({ title: "Select your date range", description: "Choose both a From and To date.", variant: "destructive" });
        return;
      }
      // Entry count is informational only — it never blocks the flow.
    }
    setStep((step + 1) as Step);
  };

  const fontSizeSliderValue = fontSize === "small" ? 0 : fontSize === "medium" ? 1 : 2;
  const handleFontSizeSlider = (val: number[]) => {
    const map: FontSize[] = ["small", "medium", "large"];
    setFontSize(map[val[0]]);
  };

  if (!isPremium) {
    return (
      <div className="min-h-screen gradient-warm pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground">{t("bookBuilder.title")}</h1>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-12">
          <UpgradePrompt 
            feature="Soul Book Builder" 
            description="Export your journal entries as a beautifully designed PDF book. Upgrade to Premium to unlock this feature."
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => step > 1 ? setStep((step - 1) as Step) : navigate("/settings/export")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">{t("bookBuilder.title")}</h1>
              <p className="text-sm text-muted-foreground">Step {step} of 4 — {t(stepInfo[step - 1].label)}</p>
            </div>
          </div>
          {/* Progress */}
          <div className="flex gap-1.5 mt-3">
            {stepInfo.map((s) => (
              <div
                key={s.num}
                className={`h-1 flex-1 rounded-full transition-colors ${s.num <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <ErrorBoundary>
          {/* Step 1 — Date Range */}
          {step === 1 && (
            <motion.div key="s1" className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="glass-premium p-6 space-y-5">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">📅</span>
                  <h2 className="text-xl font-display font-semibold text-foreground">{t("bookBuilder.selectRange")}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{t("bookBuilder.chooseEntries")}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">{t("bookBuilder.from")}</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">To</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl" />
                  </div>
                </div>

                {countingEntries && (
                  <motion.div
                    className="p-3 rounded-xl text-center text-sm font-medium bg-muted/50 text-muted-foreground"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    Checking entries…
                  </motion.div>
                )}
                {!countingEntries && entryCount !== null && (
                  <motion.div
                    className={`p-3 rounded-xl text-center text-sm font-medium ${entryCount > 0 ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {entryCount > 0 ? `${entryCount} entries found` : "No entries in this range — you can still continue"}
                  </motion.div>
                )}
                {!countingEntries && entryCount === null && user && (
                  <motion.div
                    className="p-3 rounded-xl text-center text-sm font-medium bg-muted/50 text-muted-foreground"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    Couldn't verify entry count — Continue anyway
                  </motion.div>
                )}
                {!countingEntries && entryCount === null && !user && (
                  <motion.div
                    className="p-3 rounded-xl text-center text-sm font-medium bg-destructive/10 text-destructive space-y-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p>Your session expired — please log in again.</p>
                    <Button size="sm" className="rounded-full" onClick={() => navigate("/auth")}>
                      Log in
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2 — Cover & Title */}
          {step === 2 && (
            <motion.div key="s2" className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="glass-premium p-6 space-y-5">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">🎨</span>
                  <h2 className="text-xl font-display font-semibold text-foreground">{t("bookBuilder.coverDesign")}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{t("bookBuilder.coverDesc")}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Custom Title (optional)</label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={userName}
                    className="rounded-xl"
                  />
                </div>

                <CoverTemplates
                  selected={cover}
                  onSelect={setCover}
                  userName={displayName}
                  yearRange={yearRange}
                  avatarUrl={avatarUrl}
                  showAvatar={showAvatar}
                  onToggleAvatar={setShowAvatar}
                />
              </div>
            </motion.div>
          )}

          {/* Step 3 — Font & Layout */}
          {step === 3 && (
            <motion.div key="s3" className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="glass-premium p-6 space-y-5">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">✍️</span>
                  <h2 className="text-xl font-display font-semibold text-foreground">{t("bookBuilder.voiceOfBook")}</h2>
                  <p className="text-sm text-muted-foreground mt-1">Select typography and page design</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Typography</p>
                  <FontSelector selected={font} onSelect={setFont} />
                </div>

                {/* Font Size Slider */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Font Size: <span className="text-primary">{t("fonts." + fontSize)}</span>
                  </p>
                  <Slider
                    value={[fontSizeSliderValue]}
                    onValueChange={handleFontSizeSlider}
                    min={0}
                    max={2}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Small</span>
                    <span>Medium</span>
                    <span>Large</span>
                  </div>
                </div>

                <PageStyleSelector
                  background={background}
                  onBackgroundChange={setBackground}
                  layout={layout}
                  onLayoutChange={setLayout}
                  watermark={watermark}
                  onWatermarkChange={setWatermark}
                />

                {/* Photo Size */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Photo Size in PDF
                  </p>
                  <Select value={photoSize} onValueChange={(v) => setPhotoSize(v as PhotoSize)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (thumbnail)</SelectItem>
                      <SelectItem value="medium">Medium (default)</SelectItem>
                      <SelectItem value="large">Large (prominent)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4 — Preview & Generate */}
          {step === 4 && (
            <motion.div key="s4" className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="glass-premium p-6 space-y-5">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">📖</span>
                  <h2 className="text-xl font-display font-semibold text-foreground">{t("bookBuilder.yourBook")}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{t("bookBuilder.previewBefore")}</p>
                </div>

                <BookPreview
                  cover={cover}
                  font={font}
                  background={background}
                  layout={layout}
                  watermark={watermark}
                  userName={displayName}
                  yearRange={yearRange}
                  avatarUrl={avatarUrl}
                  showAvatar={showAvatar}
                />

                {/* Summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Entries</span>
                    <span className="font-medium text-foreground">{entryCount ?? "—"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Cover</span>
                    <span className="font-medium text-foreground capitalize">{cover}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Font</span>
                    <span className="font-medium text-foreground capitalize">{font}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Font Size</span>
                    <span className="font-medium text-foreground capitalize">{fontSize}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Layout</span>
                    <span className="font-medium text-foreground">{layout === "one-per-page" ? "One Per Page" : "Continuous"}</span>
                  </div>
                </div>

                {/* Preview Button */}
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl gap-2"
                  onClick={handlePreview}
                  disabled={previewLoading || generating}
                >
                  {previewLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Preview...
                    </>
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      Preview Entry Page
                    </>
                  )}
                </Button>

                <Button
                  className="w-full h-14 rounded-2xl gradient-primary text-lg gap-2"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {progressMsg || "Generating Book..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Soul Book
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </ErrorBoundary>

        {/* Navigation */}
        {step < 4 && (
          <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Button
              className="w-full h-12 rounded-xl gradient-primary gap-2"
              onClick={handleContinue}
              disabled={!canProceed[step]}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </main>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader>
            <DialogTitle>Entry Page Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-border shadow-lg">
              <img src={previewUrl} alt="Page preview" className="w-full h-auto" />
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">
            This shows how a single entry page will look in the final PDF.
          </p>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default BookBuilderPage;
