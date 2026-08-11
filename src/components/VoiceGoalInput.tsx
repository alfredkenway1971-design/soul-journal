import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Local Whisper API endpoint (self-hosted, offline)
const WHISPER_API_URL = "http://144.91.106.188:8082/inference";
const WHISPER_API_KEY = "whisper_key2026";

interface VoiceGoalInputProps {
  onGoalTranscribed: (text: string) => void;
}

const VoiceGoalInput = ({ onGoalTranscribed }: VoiceGoalInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
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
      // Send directly to our local Whisper API server
      const formData = new FormData();
      const fileName = `recording-${Date.now()}.webm`;
      formData.append("file", audioBlob, fileName);
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

      if (result.text) {
        onGoalTranscribed(result.text);
        toast({
          title: "Goal Recorded",
          description: "Your spoken goal has been transcribed.",
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
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Processing...</span>
          </motion.div>
        ) : isRecording ? (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <motion.div
              className="w-3 h-3 bg-destructive rounded-full"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm text-muted-foreground">Recording...</span>
            <Button
              size="icon"
              variant="destructive"
              className="rounded-full h-10 w-10"
              onClick={stopRecording}
            >
              <Square className="w-4 h-4" />
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
              className="rounded-full h-10 w-10"
              onClick={startRecording}
              title="Speak your goal"
            >
              <Mic className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceGoalInput;
