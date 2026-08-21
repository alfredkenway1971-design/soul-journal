import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { invokeEnhance } from "@/lib/aiText";
import { blobToWav } from "@/lib/audioConvert";
import { createNativeSpeech, type NativeSpeechHandle } from "@/lib/nativeSpeech";

// Local Whisper API endpoint (self-hosted, offline) — FALLBACK only; native device
// speech-to-text (free) is tried first.
const WHISPER_API_URL = "http://144.91.106.188:8082/inference";
const WHISPER_API_KEY = "whisper_key2026";

interface VoiceInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  summarize?: boolean;
  summaryPrompt?: string;
  label?: string;
}

const VoiceInputField = ({ 
  value, 
  onChange, 
  placeholder = "Type or speak...",
  summarize = false,
  summaryPrompt = "Summarize this into a concise list of key points:",
  label
}: VoiceInputFieldProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRef = useRef<NativeSpeechHandle | null>(null);
  const dictationBaseRef = useRef("");
  const { toast } = useToast();

  // ── Native device speech-to-text (free, $0 API calls) ──────────────
  const startDictation = () => {
    dictationBaseRef.current = value;
    const handle = createNativeSpeech({
      lang: localStorage.getItem("app-language") || "en",
      onResult: (transcript, isFinal) => {
        const base = dictationBaseRef.current;
        onChange(base ? `${base}\n${transcript}` : transcript);
        if (isFinal) {
          toast({
            title: summarize ? "Recorded & Summarized" : "Recorded",
            description: "Your voice has been transcribed.",
          });
        }
      },
      onError: () => {
        // Native STT failed (mic busy, unsupported engine, network) — fall back
        // to the server transcription path.
        setIsDictating(false);
        toast({
          title: "Using server transcription",
          description: "Device speech-to-text was unavailable; switching to the backup.",
        });
        startServerRecording();
      },
      onEnd: () => setIsDictating(false),
    });

    if (handle) {
      speechRef.current = handle;
      setIsDictating(true);
    } else {
      startServerRecording();
    }
  };

  const stopDictation = () => {
    speechRef.current?.stop();
    speechRef.current = null;
    setIsDictating(false);
  };

  // ── Server transcription fallback (self-hosted Whisper) ─────────────
  const startServerRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Whisper server can't read webm — convert to WAV first
      let audioToSend = audioBlob;
      try {
        audioToSend = await blobToWav(audioBlob);
      } catch (e) {
        console.warn("webm->wav conversion failed, sending original:", e);
      }
      // Send directly to our local Whisper API server
      const formData = new FormData();
      const fileName = `recording-${Date.now()}.wav`;
      formData.append("file", audioToSend, fileName);
      formData.append("temperature", "0.0");
      formData.append("temperature_inc", "0.2");
      formData.append("response_format", "json");

      const response = await fetch(WHISPER_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": WHISPER_API_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Whisper API returned ${response.status}`);
      }

      const result = await response.json();
      if (!result.text) throw new Error("No transcription returned");

      let resultText = result.text;

      // Optionally summarize with AI
      if (summarize && resultText) {
        try {
          const enhanceData = await invokeEnhance({ 
            text: resultText, 
            tone: 'summary',
            customPrompt: summaryPrompt
          });
          if (enhanceData?.enhancedText) {
            resultText = enhanceData.enhancedText;
          }
        } catch (enhanceError) {
          console.warn("Enhance failed, using transcription:", enhanceError);
        }
      }

      if (resultText) {
        onChange(value ? `${value}\n${resultText}` : resultText);
        toast({
          title: summarize ? "Recorded & Summarized" : "Recorded",
          description: "Your voice has been transcribed.",
        });
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Transcription Failed",
        description: "Could not transcribe your audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Mic className="w-4 h-4" />
          <span>{label}</span>
        </div>
      )}
      
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px] pr-20 rounded-xl resize-none"
        />
        
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 text-muted-foreground"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
              </motion.div>
            ) : isRecording || isDictating ? (
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  className="w-2 h-2 bg-destructive rounded-full"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="rounded-full h-8 w-8"
                  onClick={isDictating ? stopDictation : stopRecording}
                >
                  <Square className="w-3 h-3" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full h-8 w-8"
                  onClick={startDictation}
                  title={t("voiceInput.record")}
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {summarize && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>{t("common.ai")}</span>
            </div>
          )}
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        {isDictating
          ? "Speaking — tap the square to stop"
          : summarize 
          ? "Speak naturally - AI will summarize your thoughts" 
          : "Type or tap the mic to speak"
        }
      </p>
    </div>
  );
};

export default VoiceInputField;
