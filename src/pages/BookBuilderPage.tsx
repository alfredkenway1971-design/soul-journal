import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Palette, Type, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";
import CoverTemplates, { type CoverTemplate } from "@/components/book-builder/CoverTemplates";
import FontSelector, { type BookFont } from "@/components/book-builder/FontSelector";
import PageStyleSelector, { type PageBackground, type EntryLayout } from "@/components/book-builder/PageStyleSelector";
import BookPreview from "@/components/book-builder/BookPreview";
import { generateBookHTML, openBookPDF } from "@/lib/generateBookPDF";

type Step = 1 | 2 | 3 | 4;

const stepInfo = [
  { num: 1, label: "Date Range", icon: Calendar },
  { num: 2, label: "Cover & Title", icon: Palette },
  { num: 3, label: "Font & Layout", icon: Type },
  { num: 4, label: "Preview & Generate", icon: Sparkles },
];

const BookBuilderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [generating, setGenerating] = useState(false);

  // User profile
  const [userName, setUserName] = useState("Alex");
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
  useEffect(() => {
    if (!user || !startDate || !endDate) { setEntryCount(null); return; }
    (async () => {
      const { count } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", new Date(startDate).toISOString())
        .lte("created_at", new Date(endDate + "T23:59:59").toISOString());
      setEntryCount(count ?? 0);
    })();
  }, [user, startDate, endDate]);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      let query = supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (startDate) query = query.gte("created_at", new Date(startDate).toISOString());
      if (endDate) query = query.lte("created_at", new Date(endDate + "T23:59:59").toISOString());

      const { data: entries, error } = await query;
      if (error) throw error;
      if (!entries || entries.length === 0) {
        toast({ title: "No entries found", description: "Adjust your date range.", variant: "destructive" });
        setGenerating(false);
        return;
      }

      const html = generateBookHTML(
        { cover, font, background, layout, watermark, userName: displayName, yearRange, avatarUrl, showAvatar },
        entries
      );
      openBookPDF(html);

      toast({ title: "Book Generated! 📖", description: `${entries.length} entries compiled. Use print dialog to save as PDF.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Generation Failed", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const canProceed: Record<Step, boolean> = {
    1: !!startDate && !!endDate && (entryCount ?? 0) > 0,
    2: true,
    3: true,
    4: true,
  };

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
              <h1 className="text-lg font-semibold text-foreground">Soul Book Builder</h1>
              <p className="text-sm text-muted-foreground">Step {step} of 4 — {stepInfo[step - 1].label}</p>
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
        <AnimatePresence mode="wait">
          {/* Step 1 — Date Range */}
          {step === 1 && (
            <motion.div key="s1" className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="glass-premium p-6 space-y-5">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">📅</span>
                  <h2 className="text-xl font-display font-semibold text-foreground">Select Date Range</h2>
                  <p className="text-sm text-muted-foreground mt-1">Choose which entries to include in your book</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">From</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">To</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl" />
                  </div>
                </div>

                {entryCount !== null && (
                  <motion.div
                    className={`p-3 rounded-xl text-center text-sm font-medium ${entryCount > 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {entryCount > 0 ? `${entryCount} entries found` : "No entries in this range"}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2 — Cover & Title */}
          {step === 2 && (
            <motion.div key="s2" className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="glass-premium p-6 space-y-5">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">🎨</span>
                  <h2 className="text-xl font-display font-semibold text-foreground">Cover Design</h2>
                  <p className="text-sm text-muted-foreground mt-1">Choose your book's first impression</p>
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
            <motion.div key="s3" className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="glass-premium p-6 space-y-5">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">✍️</span>
                  <h2 className="text-xl font-display font-semibold text-foreground">Voice of the Book</h2>
                  <p className="text-sm text-muted-foreground mt-1">Select typography and page design</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Typography</p>
                  <FontSelector selected={font} onSelect={setFont} />
                </div>

                <PageStyleSelector
                  background={background}
                  onBackgroundChange={setBackground}
                  layout={layout}
                  onLayoutChange={setLayout}
                  watermark={watermark}
                  onWatermarkChange={setWatermark}
                />
              </div>
            </motion.div>
          )}

          {/* Step 4 — Preview & Generate */}
          {step === 4 && (
            <motion.div key="s4" className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="glass-premium p-6 space-y-5">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">📖</span>
                  <h2 className="text-xl font-display font-semibold text-foreground">Your Soul Book</h2>
                  <p className="text-sm text-muted-foreground mt-1">Preview before generating</p>
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
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Layout</span>
                    <span className="font-medium text-foreground">{layout === "one-per-page" ? "One Per Page" : "Continuous"}</span>
                  </div>
                </div>

                <Button
                  className="w-full h-14 rounded-2xl gradient-primary text-lg gap-2"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Book...
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
        </AnimatePresence>

        {/* Navigation */}
        {step < 4 && (
          <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Button
              className="w-full h-12 rounded-xl gradient-primary gap-2"
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canProceed[step]}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default BookBuilderPage;
