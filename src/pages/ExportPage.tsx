import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Download, Loader2, CheckCircle, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

const ExportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
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
          title: "No entries to export",
          description: "Create some journal entries first!",
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

      // Create and download file
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
        title: "Export successful! 📝",
        description: `${entries.length} entries exported to Markdown.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Something went wrong. Please try again.",
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
          title: "No entries to export",
          description: "Create some journal entries first!",
          variant: "destructive",
        });
        setExporting(null);
        return;
      }

      // Create HTML content for PDF
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Journal Export</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap');
            body { 
              font-family: 'Crimson Pro', Georgia, serif; 
              line-height: 1.8; 
              max-width: 700px; 
              margin: 0 auto; 
              padding: 40px 20px;
              color: #1a1a1a;
            }
            h1 { 
              font-size: 32px; 
              font-weight: 600;
              margin-bottom: 8px;
              color: #0a0a0a;
            }
            .subtitle {
              color: #666;
              font-size: 14px;
              margin-bottom: 40px;
            }
            .entry { 
              margin-bottom: 40px; 
              padding-bottom: 30px;
              border-bottom: 1px solid #e5e5e5;
              page-break-inside: avoid;
            }
            .entry:last-child { border-bottom: none; }
            .entry-title { 
              font-size: 22px; 
              font-weight: 600;
              margin-bottom: 8px;
              color: #0a0a0a;
            }
            .entry-meta { 
              color: #888; 
              font-size: 13px; 
              margin-bottom: 16px;
              font-style: italic;
            }
            .mood-badge {
              display: inline-block;
              background: #f5f5f5;
              padding: 2px 10px;
              border-radius: 12px;
              font-size: 12px;
              margin-left: 10px;
            }
            .entry-content { 
              font-size: 17px;
              color: #333;
            }
          </style>
        </head>
        <body>
          <h1>📔 My Journal</h1>
          <p class="subtitle">Exported on ${format(new Date(), "MMMM d, yyyy")}</p>
      `;
      
      entries.forEach((entry) => {
        const date = format(new Date(entry.created_at), "EEEE, MMMM d, yyyy 'at' h:mm a");
        const mood = entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : "";
        const content = (entry.enhanced_text || entry.original_transcription || "No content")
          .replace(/\n/g, '<br>');
        
        htmlContent += `
          <div class="entry">
            <div class="entry-title">${entry.title || "Untitled Entry"}</div>
            <div class="entry-meta">
              ${date}${mood ? `<span class="mood-badge">${mood}</span>` : ""}
            </div>
            <div class="entry-content">${content}</div>
          </div>
        `;
      });

      htmlContent += `</body></html>`;

      // Open print dialog for PDF
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
        title: "PDF ready! 📄",
        description: `${entries.length} entries prepared. Use print dialog to save as PDF.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen gradient-warm pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/settings")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Export Journal</h1>
              <p className="text-sm text-muted-foreground">Download all your entries</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Download className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Export Your Entries</h2>
          <p className="text-muted-foreground">
            Download all your journal entries as a file to keep a backup or share with others.
          </p>
        </motion.div>

        {/* Export Options */}
        <div className="space-y-4">
          {/* Soul Book Builder */}
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
              <h3 className="font-semibold text-foreground">Soul Book Builder (PDF)</h3>
              <p className="text-sm text-muted-foreground">
                Customizable cover, fonts & layout for printing
              </p>
            </div>
          </motion.button>

          {/* Quick Markdown */}
          <motion.button
            className="w-full glass-premium p-5 flex items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportToMarkdown}
            disabled={exporting !== null}
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              {exporting === "markdown" ? (
                <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
              ) : success === "markdown" ? (
                <CheckCircle className="w-7 h-7 text-green-600" />
              ) : (
                <FileText className="w-7 h-7 text-blue-600" />
              )}
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-foreground">Quick JSON / Markdown</h3>
              <p className="text-sm text-muted-foreground">
                Plain text backup of all entries
              </p>
            </div>
          </motion.button>

          {/* Simple PDF */}
          <motion.button
            className="w-full glass-premium p-5 flex items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportToPDF}
            disabled={exporting !== null}
          >
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              {exporting === "pdf" ? (
                <Loader2 className="w-7 h-7 text-red-600 animate-spin" />
              ) : success === "pdf" ? (
                <CheckCircle className="w-7 h-7 text-green-600" />
              ) : (
                <FileText className="w-7 h-7 text-red-600" />
              )}
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-foreground">Quick PDF</h3>
              <p className="text-sm text-muted-foreground">
                Simple formatted export, no customization
              </p>
            </div>
          </motion.button>
        </div>

        {/* Info */}
        <motion.div
          className="bg-muted/50 rounded-2xl p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm text-muted-foreground text-center">
            Your exported file will include all journal entries with their dates, moods, and content.
          </p>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ExportPage;
