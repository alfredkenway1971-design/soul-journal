import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Image, Sparkles, X, Play, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import VoiceRecorder from "@/components/VoiceRecorder";
import MoodSelector, { Mood } from "@/components/MoodSelector";
import LanguageSelector, { Language } from "@/components/LanguageSelector";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";

type RecordingStep = "mood" | "record" | "enhance" | "language" | "complete";

const RecordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const api = useJournalAPI();
  
  const [step, setStep] = useState<RecordingStep>("mood");
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    setTimeout(() => setStep("record"), 500);
  };

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    setIsProcessing(true);
    setAudioBlob(blob);
    
    try {
      const text = await api.transcribeAudio(blob);
      setTranscription(text);
      setStep("enhance");
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription Failed",
        description: error instanceof Error ? error.message : "Failed to transcribe audio",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnhance = async () => {
    setIsProcessing(true);
    
    try {
      const enhanced = await api.enhanceText(transcription);
      setEnhancedText(enhanced);
      setStep("language");
    } catch (error) {
      console.error('Enhancement error:', error);
      toast({
        title: "Enhancement Failed",
        description: error instanceof Error ? error.message : "Failed to enhance text",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddPhotos = () => {
    fileInputRef.current?.click();
  };

  const handlePhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPhotos((prev) => [...prev, ...files]);
      
      // Create previews
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotosPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotosPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateVoice = async () => {
    if (!enhancedText) return;
    
    setIsProcessing(true);
    
    try {
      // Translate if not English
      let textForVoice = enhancedText;
      if (selectedLanguage !== 'en') {
        textForVoice = await api.translateText(enhancedText, selectedLanguage);
      }
      
      const audioUrl = await api.generateVoice(textForVoice);
      setGeneratedAudioUrl(audioUrl);
      
      toast({
        title: "Voice Generated! 🎙️",
        description: "Your entry is ready to play.",
      });
    } catch (error) {
      console.error('Voice generation error:', error);
      toast({
        title: "Voice Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate voice",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayAudio = () => {
    if (audioRef.current && generatedAudioUrl) {
      if (isPlayingAudio) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlayingAudio(!isPlayingAudio);
    }
  };

  const handleSave = async () => {
    if (!user || !selectedMood) return;
    
    setIsProcessing(true);
    
    try {
      // Upload audio if available
      let audioPath: string | undefined;
      if (audioBlob) {
        audioPath = await api.uploadAudio(audioBlob, user.id);
      }
      
      // Save entry
      const entry = await api.saveEntry({
        userId: user.id,
        originalTranscription: transcription,
        enhancedText: enhancedText,
        mood: selectedMood,
        playbackLanguage: selectedLanguage,
        audioUrl: audioPath,
      });
      
      // Upload photos and save media entries
      for (const photo of photos) {
        const photoPath = await api.uploadPhoto(photo, user.id);
        await api.saveEntryMedia(entry.id, 'photo', photoPath);
      }
      
      // Save audio as media if uploaded
      if (audioPath) {
        await api.saveEntryMedia(entry.id, 'audio', audioPath);
      }
      
      setStep("complete");
      toast({
        title: "Entry Saved! ✨",
        description: "Your journal entry has been saved with voice cloning.",
      });
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save entry",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen gradient-warm pb-24">
      {/* Hidden file input for photos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotosSelected}
        accept="image/*"
        multiple
        className="hidden"
      />
      
      {/* Hidden audio element */}
      {generatedAudioUrl && (
        <audio
          ref={audioRef}
          src={generatedAudioUrl}
          onEnded={() => setIsPlayingAudio(false)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => {
                if (step === "mood") {
                  navigate("/");
                } else if (step === "record") {
                  setStep("mood");
                } else if (step === "enhance") {
                  setStep("record");
                } else if (step === "language") {
                  setStep("enhance");
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">New Entry</h1>
              <p className="text-sm text-muted-foreground">
                {step === "mood" && "How are you feeling?"}
                {step === "record" && "Record your thoughts"}
                {step === "enhance" && "Enhance with AI"}
                {step === "language" && "Choose playback language"}
                {step === "complete" && "Entry saved!"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Step: Mood Selection */}
        {step === "mood" && (
          <motion.div
            className="glass-card rounded-3xl p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MoodSelector selected={selectedMood} onSelect={handleMoodSelect} />
          </motion.div>
        )}

        {/* Step: Recording */}
        {step === "record" && (
          <motion.div
            className="glass-card rounded-3xl p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-8">
              <span className="text-4xl mb-4 block">🎙️</span>
              <h2 className="text-xl font-semibold font-journal mb-2">
                Share Your Thoughts
              </h2>
              <p className="text-muted-foreground text-sm">
                Speak freely. Your voice will be cloned for playback.
              </p>
            </div>

            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              isProcessing={isProcessing}
            />

            {/* Photo Previews */}
            {photosPreviews.length > 0 && (
              <motion.div
                className="mt-6 flex flex-wrap gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {photosPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Photo ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Add Photo Option */}
            <motion.div
              className="mt-8 pt-6 border-t border-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleAddPhotos}
              >
                <Image className="w-4 h-4" />
                Add Photos
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Step: Enhancement */}
        {step === "enhance" && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Original Transcription */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Original Transcription
              </h3>
              <p className="font-journal text-foreground leading-relaxed">
                {transcription}
              </p>
            </div>

            {/* Enhance Button */}
            {!enhancedText && (
              <Button
                className="w-full gap-2 h-14 rounded-2xl gradient-amber shadow-glow"
                onClick={handleEnhance}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <motion.div
                      className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Enhance with AI
                  </>
                )}
              </Button>
            )}

            {/* Enhanced Version */}
            {enhancedText && (
              <motion.div
                className="glass-card-strong rounded-2xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-medium text-primary">
                    AI Enhanced
                  </h3>
                </div>
                <Textarea
                  value={enhancedText}
                  onChange={(e) => setEnhancedText(e.target.value)}
                  className="min-h-[200px] font-journal text-lg border-0 bg-transparent resize-none focus-visible:ring-0"
                />
                <Button
                  className="w-full mt-4 gap-2 h-12 rounded-xl gradient-amber"
                  onClick={() => setStep("language")}
                >
                  Continue
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Step: Language Selection */}
        {step === "language" && (
          <motion.div
            className="glass-card rounded-3xl p-6 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <span className="text-4xl mb-4 block">🌍</span>
              <h2 className="text-xl font-semibold font-journal mb-2">
                Voice Playback Language
              </h2>
              <p className="text-muted-foreground text-sm">
                Choose which language to hear your story in your cloned voice
              </p>
            </div>

            <LanguageSelector
              selected={selectedLanguage}
              onSelect={setSelectedLanguage}
            />

            {/* Generate Voice Preview */}
            {!generatedAudioUrl && (
              <Button
                variant="outline"
                className="w-full gap-2 h-12 rounded-xl"
                onClick={handleGenerateVoice}
                disabled={isProcessing}
              >
                {isProcessing ? (
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
                    Preview Voice
                  </>
                )}
              </Button>
            )}

            {/* Audio Player */}
            <AnimatePresence>
              {generatedAudioUrl && (
                <motion.div
                  className="glass-card rounded-2xl p-4 flex items-center gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Button
                    size="icon"
                    className="w-12 h-12 rounded-full gradient-amber"
                    onClick={handlePlayAudio}
                  >
                    <Play className={`w-5 h-5 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
                  </Button>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Voice Preview</p>
                    <p className="text-muted-foreground text-xs">
                      {isPlayingAudio ? 'Playing...' : 'Tap to play'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              className="w-full gap-2 h-14 rounded-2xl gradient-amber shadow-glow"
              onClick={handleSave}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Saving...
                </>
              ) : (
                "Save Entry"
              )}
            </Button>
          </motion.div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="w-24 h-24 rounded-full gradient-amber flex items-center justify-center mx-auto mb-6 shadow-glow"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <span className="text-4xl">✨</span>
            </motion.div>
            <h2 className="text-2xl font-semibold font-journal mb-2">
              Entry Saved!
            </h2>
            <p className="text-muted-foreground">
              Your voice-cloned journal entry is ready
            </p>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default RecordPage;
