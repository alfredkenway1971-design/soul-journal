import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Pause, Trash2, Volume2, ChevronDown, ChevronUp, Pencil, Check, X, Sparkles, Heart, Flame, Blend } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import type { Mood } from "@/components/MoodSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const moodEmojis: Record<Mood, string> = {
  happy: "😄",
  good: "😊",
  fine: "😐",
  sad: "😢",
  unhappy: "😔",
};

interface EntryData {
  id: string;
  title?: string | null;
  enhanced_text: string | null;
  original_transcription: string | null;
  mood: string | null;
  playback_language: string | null;
  created_at: string;
  audio_url?: string | null;
  soul_reflection?: string | null;
}

interface MediaData {
  id: string;
  media_type: string;
  storage_path: string;
}

const EntryDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();
  const api = useJournalAPI(language);
  
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [media, setMedia] = useState<MediaData[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const fetchEntry = async () => {
      if (!id || !user) return;
      
      try {
        const entryData = await api.getEntryById(id);
        setEntry(entryData);
        
        const mediaData = await api.getEntryMedia(id);
        setMedia(mediaData);
        
        // Get signed URLs for photos
        const photos = mediaData.filter(m => m.media_type === 'photo');
        const urls = await Promise.all(
          photos.map(p => api.getSignedUrl('journal-photos', p.storage_path))
        );
        setPhotoUrls(urls.filter(Boolean) as string[]);
      } catch (error) {
        console.error('Error fetching entry:', error);
        toast({
          title: "Error",
          description: "Failed to load entry",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchEntry();
  }, [id, user]);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await api.deleteEntry(id);
      toast({
        title: "Entry Deleted",
        description: "Your journal entry has been deleted.",
      });
      navigate("/");
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  const handleEditTitle = () => {
    setEditedTitle(entry?.title || "");
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!id || !editedTitle.trim()) return;
    
    setIsSavingTitle(true);
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({ title: editedTitle.trim() })
        .eq('id', id);
      
      if (error) throw error;
      
      setEntry(prev => prev ? { ...prev, title: editedTitle.trim() } : null);
      setIsEditingTitle(false);
      toast({
        title: "Title Updated",
        description: "Your entry title has been saved.",
      });
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: "Error",
        description: "Failed to update title",
        variant: "destructive",
      });
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle("");
  };

  const handleGenerateVoice = async () => {
    if (!entry || !entry.enhanced_text) return;
    
    setIsGeneratingVoice(true);
    
    try {
      let textForVoice = entry.enhanced_text;
      // Only translate if a non-English language is explicitly selected
      if (entry.playback_language && entry.playback_language !== 'en') {
        textForVoice = await api.translateText(entry.enhanced_text, entry.playback_language);
      }
      
      const audioUrl = await api.generateVoice(textForVoice);
      setGeneratedAudioUrl(audioUrl);
    } catch (error) {
      console.error('Error generating voice:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate voice";
      
      // Provide more helpful error message for ElevenLabs issues
      let userMessage = errorMessage;
      if (errorMessage.includes('unusual_activity') || errorMessage.includes('Free Tier')) {
        userMessage = "ElevenLabs free tier limit reached. Please upgrade your ElevenLabs API key to a paid plan in Settings → Voice to continue using voice playback.";
      }
      
      toast({
        title: "Voice Generation Failed",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleGenerateVoiceForText = async (text: string) => {
    setIsGeneratingVoice(true);
    try {
      const audioUrl = await api.generateVoice(text);
      setGeneratedAudioUrl(audioUrl);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100);
    } catch (error) {
      console.error('Error generating voice:', error);
      toast({
        title: "Voice Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate voice",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const languageNames: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen gradient-warm flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">Entry not found</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm pb-24">
      {/* Hidden audio element */}
      {generatedAudioUrl && (
        <audio
          ref={audioRef}
          src={generatedAudioUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="h-8 text-base font-semibold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') handleCancelEditTitle();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-500"
                      onClick={handleSaveTitle}
                      disabled={isSavingTitle}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCancelEditTitle}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-foreground truncate">
                      {entry.title || "Journal Entry"}
                    </h1>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={handleEditTitle}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {formatDate(entry.created_at)}
                </p>
              </div>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full text-destructive">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your journal entry.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Mood & Date Card */}
        <motion.div
          className="glass-card rounded-2xl p-6 flex items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <span className="text-3xl">{moodEmojis[entry.mood as Mood]}</span>
          </div>
          <div>
            <p className="font-medium capitalize text-foreground">{entry.mood}</p>
            <p className="text-sm text-muted-foreground">
              Playback: {languageNames[entry.playback_language] || entry.playback_language}
            </p>
          </div>
        </motion.div>

        {/* Enhanced Text */}
        <motion.div
          className="glass-card rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Your Story
          </h3>
          <p className="font-journal text-foreground leading-relaxed whitespace-pre-wrap">
            {entry.enhanced_text}
          </p>
        </motion.div>

        {/* Voice Playback */}
        <motion.div
          className="glass-card rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Listen to Your Story
          </h3>
          
          {!generatedAudioUrl ? (
            <Button
              variant="outline"
              className="w-full gap-2 h-12 rounded-xl"
              onClick={handleGenerateVoice}
              disabled={isGeneratingVoice}
            >
              {isGeneratingVoice ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Generating Voice...
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5" />
                  Generate Voice Playback
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                className="w-14 h-14 rounded-full gradient-amber shadow-glow"
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-1" />
                )}
              </Button>
              <div className="flex-1">
                <p className="font-medium text-sm">Voice Playback</p>
                <p className="text-muted-foreground text-xs">
                  {isPlaying ? "Playing..." : "Tap to play your story"}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Soul Mirror Reflection */}
        {entry.soul_reflection && (() => {
          // Parse mode prefix: [NURTURE], [CHALLENGE], or [BLEND]
          const modeMatch = entry.soul_reflection.match(/^\[(NURTURE|CHALLENGE|BLEND)\]/i);
          const mode = modeMatch ? modeMatch[1].toLowerCase() : 'blend';
          const reflectionText = modeMatch 
            ? entry.soul_reflection.slice(modeMatch[0].length) 
            : entry.soul_reflection;

          const modeConfig = {
            nurture: {
              label: 'Nurture',
              icon: Heart,
              bg: 'bg-emerald-500/15',
              text: 'text-emerald-600 dark:text-emerald-400',
              border: 'border-emerald-500/30',
              gradient: 'linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(160 60% 50% / 0.10))',
              borderColor: 'hsl(160 60% 50% / 0.25)',
            },
            challenge: {
              label: 'Challenge',
              icon: Flame,
              bg: 'bg-amber-500/15',
              text: 'text-amber-600 dark:text-amber-400',
              border: 'border-amber-500/30',
              gradient: 'linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(35 90% 55% / 0.10))',
              borderColor: 'hsl(35 90% 55% / 0.25)',
            },
            blend: {
              label: 'Blend',
              icon: Sparkles,
              bg: 'bg-primary/10',
              text: 'text-primary',
              border: 'border-primary/30',
              gradient: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.12))',
              borderColor: 'hsl(var(--primary) / 0.2)',
            },
          };

          const config = modeConfig[mode as keyof typeof modeConfig] || modeConfig.blend;
          const ModeIcon = config.icon;

          return (
            <motion.div
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: config.gradient,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${config.borderColor}`,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-primary tracking-wide uppercase">
                    Message from your Soul
                  </h3>
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.text} ${config.border} border`}>
                  <ModeIcon className="w-3 h-3" />
                  {config.label}
                </div>
              </div>
              <p className="font-journal text-foreground leading-relaxed italic text-base">
                "{reflectionText}"
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 gap-1 text-xs text-primary"
                onClick={() => {
                  if (reflectionText) {
                    handleGenerateVoiceForText(reflectionText);
                  }
                }}
                disabled={isGeneratingVoice}
              >
                <Volume2 className="w-3 h-3" />
                Listen to reflection
              </Button>
            </motion.div>
          );
        })()}

        <motion.div
          className="glass-card rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            className="w-full p-4 flex items-center justify-between"
            onClick={() => setShowOriginal(!showOriginal)}
          >
            <h3 className="text-sm font-medium text-muted-foreground">
              Original Transcription
            </h3>
            {showOriginal ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          
          {showOriginal && (
            <motion.div
              className="px-4 pb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                {entry.original_transcription}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Photo Gallery */}
        {photoUrls.length > 0 && (
          <motion.div
            className="glass-card rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Photos
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {photoUrls.map((url, index) => (
                <motion.img
                  key={index}
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-xl"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default EntryDetailPage;
