import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, Square, Play, Pause, Upload, Check, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const VoiceSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [hasVoiceClone, setHasVoiceClone] = useState(false);
  const [voiceCloneId, setVoiceCloneId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const MIN_RECORDING_TIME = 30; // ElevenLabs needs ~30 seconds minimum
  const MAX_RECORDING_TIME = 120; // 2 minutes maximum

  useEffect(() => {
    const fetchVoiceClone = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('voice_clone_id')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        setHasVoiceClone(!!data?.voice_clone_id);
        setVoiceCloneId(data?.voice_clone_id || null);
      } catch (error) {
        console.error('Error fetching voice clone:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVoiceClone();
  }, [user]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      
      // Pick a supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(1000); // collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_TIME) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Error",
        description: "Please allow microphone access.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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

  const handleDiscard = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const handleUpload = async () => {
    if (!audioBlob || !user) return;
    
    if (recordingTime < MIN_RECORDING_TIME) {
      toast({
        title: "Recording Too Short",
        description: `Please record at least ${MIN_RECORDING_TIME} seconds for best voice cloning results.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Upload to storage
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('voice-clones')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
        });
      
      if (uploadError) throw uploadError;
      
      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('voice-clones')
        .createSignedUrl(fileName, 3600);
      
      if (!urlData?.signedUrl) throw new Error('Failed to get signed URL');
      
      // Convert blob to base64 for edge function
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;
      
      // Call edge function to create voice clone
      const { data, error } = await supabase.functions.invoke('create-voice-clone', {
        body: { 
          audio: base64Audio,
          name: `Voice Clone - ${user.email}`,
        },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      // Save voice clone ID to profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ voice_clone_id: data.voiceId })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setHasVoiceClone(true);
      setVoiceCloneId(data.voiceId);
      setAudioBlob(null);
      setAudioUrl(null);
      
      toast({
        title: "Voice Clone Created! 🎙️",
        description: "Your voice will now be used for playback.",
      });
    } catch (error) {
      console.error('Error creating voice clone:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create voice clone",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteVoiceClone = async () => {
    if (!user || !voiceCloneId) return;
    
    try {
      // Note: Full deletion from ElevenLabs would require an edge function
      const { error } = await supabase
        .from('profiles')
        .update({ voice_clone_id: null })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setHasVoiceClone(false);
      setVoiceCloneId(null);
      
      toast({
        title: "Voice Clone Removed",
        description: "Default voice will be used for playback.",
      });
    } catch (error) {
      console.error('Error deleting voice clone:', error);
      toast({
        title: "Error",
        description: "Failed to remove voice clone",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm pb-24">
      {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
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
              onClick={() => navigate("/settings")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Voice Clone</h1>
              <p className="text-sm text-muted-foreground">Create your voice clone</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Current Status */}
        {hasVoiceClone && (
          <motion.div
            className="glass-card rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Voice Clone Active</h3>
                <p className="text-sm text-muted-foreground">
                  Your cloned voice is being used for playback
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setHasVoiceClone(false)}
              >
                <Mic className="w-4 h-4" />
                Record New
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-destructive border-destructive hover:bg-destructive/10"
                onClick={handleDeleteVoiceClone}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Recording Instructions */}
        {!hasVoiceClone && !audioBlob && (
          <motion.div
            className="glass-card rounded-2xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 rounded-full gradient-amber flex items-center justify-center mx-auto mb-6 shadow-glow">
              <Mic className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold font-journal mb-2">
              Create Your Voice Clone
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Record at least 30 seconds of clear speech. Read a passage or speak naturally about your day.
            </p>
            
            <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
              <h4 className="font-medium text-sm mb-2">Tips for best results:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Find a quiet environment</li>
                <li>• Speak clearly and naturally</li>
                <li>• Hold device at consistent distance</li>
                <li>• Record 5 seconds to 2 minutes</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* Recording Interface */}
        {!hasVoiceClone && (
          <motion.div
            className="glass-card rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Recording Status */}
            {isRecording && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Recording...</span>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_TIME)}
                  </span>
                </div>
                <Progress 
                  value={(recordingTime / MAX_RECORDING_TIME) * 100} 
                  className="h-2"
                />
                {recordingTime < MIN_RECORDING_TIME && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Minimum {MIN_RECORDING_TIME - recordingTime}s more needed
                  </p>
                )}
              </div>
            )}

            {/* Preview */}
            {audioBlob && !isRecording && (
              <div className="mb-6">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                  <Button
                    size="icon"
                    className="w-12 h-12 rounded-full gradient-amber"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-1" />
                    )}
                  </Button>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Recording Preview</p>
                    <p className="text-muted-foreground text-xs">
                      {formatTime(recordingTime)} recorded
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3">
              {!audioBlob ? (
                <Button
                  className={`flex-1 h-14 rounded-2xl gap-2 ${
                    isRecording ? "bg-destructive hover:bg-destructive/90" : "gradient-amber"
                  }`}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-5 h-5" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Start Recording
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 h-14 rounded-2xl gap-2"
                    onClick={handleDiscard}
                  >
                    <Trash2 className="w-5 h-5" />
                    Discard
                  </Button>
                  <Button
                    className="flex-1 h-14 rounded-2xl gap-2 gradient-amber"
                    onClick={handleUpload}
                    disabled={isUploading || recordingTime < MIN_RECORDING_TIME}
                  >
                    {isUploading ? (
                      <>
                        <motion.div
                          className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Create Clone
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default VoiceSettingsPage;
