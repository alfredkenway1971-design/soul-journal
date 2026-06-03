import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Download, Loader2, CheckCircle, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/premium/UpgradePrompt";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";
import { escapeHtml } from "@/lib/escapeHtml";

const ExportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const [exporting, setExporting] = useState<"pdf" | "markdown" | null>(null);
  const [success, setSuccess] = useState<"pdf" | "markdown" | null>(null);

  const fetchAllEntries = async () => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  };

  const exportToMarkdown = async () => {
    setExporting("markdown");
    setSuccess(null);
    
    try {
      const entries = await fetchAllEntries();
      
      if (entries.length === 0) {
        toast({
          title: t("export.noEntries"),
          description: t("export.createFirst"),
          variant: "destructive",
        });
        setExporting(null);
        return;
      }

      let markdown = `# My Journal Entries\n\nExported on ${format(new Date(), "MMMM d, yyyy")}\n\n---\n\n`;
      
      entries.forEach((entry) => {
        const date = format(new Date(entry.created_at), "EEEE, MMMM d, yyyy 'at' h:mm a");
        const mood = entry.mood ? `Mood: ${entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}` : "";
        const content = entry.enhanced_text || entry.original_transcription || "No content";
        
        markdown += `## ${entry.title || "Untitled Entry"}\n\n`;
        markdown += `**${date}**${mood ? ` | ${mood}` : ""}\n\n`;
        markdown += `${content}\n\n`;
        markdown += `---\n\n`;
      });

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-export-${format(new Date(), "yyyy-MM-dd")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess("markdown");
      toast({
        title: t("export.successMarkdown"),
        description: `${entries.length} ${t("export.entriesExported")}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t("export.failed"),
        description: t("export.failedDesc"),
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = async () => {
    setExporting("pdf");
    setSuccess(null);
    
    try {
      const entries = await fetchAllEntries();
      
      if (entries.length === 0) {
        toast({
          title: t("export.noEntries"),
          description: t("export.createFirst"),
          variant: "destructive",
        });
        setExporting(null);
        return;
      }

      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Journal Export</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap');
            body { font-family: 'Crimson Pro', Georgia, serif; line-height: 1.8; max-width: 700px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }
            h1 { font-size: 32px; font-weight: 600; margin-bottom: 8px; color: #0a0a0a; }
            .subtitle { color: #666; font-size: 14px; margin-bottom: 40px; }
            .entry { margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid #e5e5e5; page-break-inside: avoid; }
            .entry:last-child { border-bottom: none; }
            .entry-title { font-size: 22px; font-weight: 600; margin-bottom: 8px; color: #0a0a0a; }
            .entry-meta { color: #888; font-size: 13px; margin-bottom: 16px; font-style: italic; }
            .mood-badge { display: inline-block; background: #f5f5f5; padding: 2px 10px; border-radius: 12px; font-size: 12px; margin-left: 10px; }
            .entry-content { font-size: 17px; color: #333; }
          </style>
        </head>
        <body>
          <h1>📔 My Journal</h1>
          <p class="subtitle">Exported on ${format(new Date(), "MMMM d, yyyy")}</p>
      `;
      
      entries.forEach((entry) => {
        const date = format(new Date(entry.created_at), "EEEE, MMMM d, yyyy 'at' h:mm a");
        const mood = entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : "";
        // Escape user-controlled values before injecting into HTML to prevent XSS.
        const content = escapeHtml(entry.enhanced_text || entry.original_transcription || "No content")
          .replace(/\n/g, '<br>');

        htmlContent += `
          <div class="entry">
            <div class="entry-title">${escapeHtml(entry.title || "Untitled Entry")}</div>
            <div class="entry-meta">
              ${escapeHtml(date)}${mood ? `<span class="mood-badge">${escapeHtml(mood)}</span>` : ""}
            </div>
            <div class="entry-content">${content}</div>
          </div>
        `;
      });

      htmlContent += `</body></html>`;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      setSuccess("pdf");
      toast({
        title: t("export.successPDF"),
        description: `${entries.length} ${t("export.pdfDescription")}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t("export.failed"),
        description: t("export.failedDesc"),
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  if (!isPremium) {
    return (
      <div className="min-h-screen gradient-warm pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/settings")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground">{t("export.title")}</h1>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-12">
          <UpgradePrompt 
            feature={t("export.journalExport")} 
            description={t("export.journalExportDesc")}
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/settings")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{t("export.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("export.download")}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Download className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">{t("export.exportYourEntries")}</h2>
          <p className="text-muted-foreground">{t("export.exportDescription")}</p>
        </motion.div>

        <div className="space-y-4">
          <motion.button
            className="w-full glass-premium p-5 flex items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/settings/export/book-builder")}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-foreground">{t("export.soulBook")}</h3>
              <p className="text-sm text-muted-foreground">{t("export.soulBookDesc")}</p>
            </div>
          </motion.button>

        </div>

        <motion.div
          className="bg-muted/50 rounded-2xl p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm text-muted-foreground text-center">{t("export.exportInfo")}</p>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ExportPage;
