import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  isProcessing?: boolean;
}

const VoiceRecorder = ({ onRecordingComplete, isProcessing = false }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveformHeights, setWaveformHeights] = useState<number[]>(Array(7).fill(0.3));
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isRecording && !isPaused) {
      // Animate waveform
      animationRef.current = setInterval(() => {
        setWaveformHeights(prev => 
          prev.map(() => 0.3 + Math.random() * 0.7)
        );
      }, 150);
      
      // Timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (animationRef.current) clearInterval(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setWaveformHeights(Array(7).fill(0.3));
    }

    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

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

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setAudioBlob(null);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
      } else {
        mediaRecorderRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const handleComplete = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, duration);
    }
  };

  const handleDiscard = () => {
    setAudioBlob(null);
    setDuration(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Waveform Visualization */}
      <div className="flex items-center justify-center gap-1 h-20">
        {waveformHeights.map((height, index) => (
          <motion.div
            key={index}
            className="w-2 bg-primary rounded-full"
            animate={{ 
              height: isRecording && !isPaused ? height * 60 : 12,
              opacity: isRecording ? 1 : 0.5
            }}
            transition={{ duration: 0.15 }}
          />
        ))}
      </div>

      {/* Timer */}
      <motion.div 
        className="text-3xl font-light text-foreground tabular-nums"
        animate={{ opacity: isRecording || audioBlob ? 1 : 0.5 }}
      >
        {formatTime(duration)}
      </motion.div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <AnimatePresence mode="wait">
          {!isRecording && !audioBlob && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Button
                size="lg"
                className="w-20 h-20 rounded-full gradient-amber shadow-glow hover:scale-105 transition-transform"
                onClick={startRecording}
              >
                <Mic className="w-8 h-8" />
              </Button>
            </motion.div>
          )}

          {isRecording && (
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                size="lg"
                variant="outline"
                className="w-14 h-14 rounded-full"
                onClick={togglePause}
              >
                {isPaused ? (
                  <Play className="w-5 h-5" />
                ) : (
                  <Pause className="w-5 h-5" />
                )}
              </Button>
              <Button
                size="lg"
                className="w-20 h-20 rounded-full bg-destructive hover:bg-destructive/90"
                onClick={stopRecording}
              >
                <Square className="w-6 h-6" />
              </Button>
            </motion.div>
          )}

          {audioBlob && !isRecording && (
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                size="lg"
                variant="outline"
                className="w-14 h-14 rounded-full"
                onClick={handleDiscard}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
              <Button
                size="lg"
                className="px-8 h-14 rounded-full gradient-amber shadow-glow"
                onClick={handleComplete}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Processing...
                  </span>
                ) : (
                  "Save Entry"
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <motion.div 
          className="flex items-center gap-2 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-destructive"
            animate={{ opacity: isPaused ? 0.5 : [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: isPaused ? 0 : Infinity }}
          />
          {isPaused ? "Paused" : "Recording..."}
        </motion.div>
      )}
    </div>
  );
};

export default VoiceRecorder;
