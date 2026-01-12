import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Image, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import VoiceRecorder from "@/components/VoiceRecorder";
import MoodSelector, { Mood } from "@/components/MoodSelector";
import LanguageSelector, { Language } from "@/components/LanguageSelector";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

type RecordingStep = "mood" | "record" | "enhance" | "language" | "complete";

const RecordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<RecordingStep>("mood");
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [enhancedText, setEnhancedText] = useState("");

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    setTimeout(() => setStep("record"), 500);
  };

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    setIsProcessing(true);
    
    // Simulate AI transcription
    setTimeout(() => {
      setTranscription(
        "Today was an interesting day. I started my morning with a cup of coffee and some quiet reflection. The weather was perfect, and I took a long walk in the park. I've been thinking a lot about my goals and where I want to be in the next few months..."
      );
      setStep("enhance");
      setIsProcessing(false);
    }, 2000);
  };

  const handleEnhance = async () => {
    setIsProcessing(true);
    
    // Simulate AI enhancement
    setTimeout(() => {
      setEnhancedText(
        "The morning greeted me with the warm embrace of my favorite coffee, its aroma filling the room as I sat in contemplative silence. The day unfolded beautifully—the weather couldn't have been more perfect, prompting me to venture into the park for a leisurely walk. As my feet traced familiar paths, my mind wandered through the landscape of my aspirations. I found myself deeply reflecting on the journey ahead, mapping out the milestones I hope to reach in the coming months. There's something profoundly clarifying about movement; each step seemed to bring greater clarity to my vision of the future."
      );
      setStep("language");
      setIsProcessing(false);
    }, 2500);
  };

  const handleSave = () => {
    setStep("complete");
    toast({
      title: "Entry Saved! ✨",
      description: "Your journal entry has been saved with voice cloning.",
    });
    setTimeout(() => navigate("/"), 2000);
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

            {/* Add Photo Option */}
            <motion.div
              className="mt-8 pt-6 border-t border-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button variant="outline" className="w-full gap-2">
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

            <Button
              className="w-full gap-2 h-14 rounded-2xl gradient-amber shadow-glow"
              onClick={handleSave}
            >
              Save Entry
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
