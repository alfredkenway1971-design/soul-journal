import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, Square, Play, Pause, Upload, Check, Trash2, Plus, Languages, FileAudio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/premium/UpgradePrompt";
import {
  getVoiceProfiles,
  saveVoiceProfile,
  removeVoiceProfile,
  normalizeLang,
} from "@/lib/voiceProfiles";

const VoiceSettingsPage = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [defaultLang, setDefaultLang] = useState<string | null>(null);
  // Language the current recording session targets (null = your first/default voice)
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [dbVoiceId, setDbVoiceId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Uploaded audio file support (MP3/WAV/M4A instead of live recording)
  const [uploadedDuration, setUploadedDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE_MB = 5;
  const audioRef = useRef<HTMLAudioElement>(null);

  const MIN_RECORDING_TIME = 30;
  const MAX_RECORDING_TIME = 120;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const langName = (code: string) => {
    const entry = LANGUAGES.find((l) => l.code === code);
    return entry ? `${entry.flag} ${entry.native}` : code;
  };

  useEffect(() => {
    const fetchVoiceClone = async () => {
      if (!user) return;

      const local = getVoiceProfiles();
      setProfiles(local.voices);
      setDefaultLang(local.defaultLang);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("voice_clone_id")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        const dbId = data?.voice_clone_id || null;
        setDbVoiceId(dbId);

        // Seed the legacy DB clone as the default profile if the map is empty
        if (dbId && Object.keys(local.voices).length === 0) {
          const seedLang = normalizeLang(language) || "en";
          const seeded = saveVoiceProfile(seedLang, dbId, true);
          setProfiles(seeded.voices);
          setDefaultLang(seeded.defaultLang);
        }
      } catch (error) {
        console.error("Error fetching voice clone:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVoiceClone();
  }, [user]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
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
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_TIME) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
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
    setUploadedDuration(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** Read audio duration from a file's metadata (seconds). */
  const getAudioDuration = (file: File): Promise<number> =>
    new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const audio = new Audio();
        audio.preload = "metadata";
        audio.onloadedmetadata = () => {
          resolve(audio.duration || 0);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(0);
        };
        audio.src = url;
      } catch {
        resolve(0);
      }
    });

  /** Handle a user-picked audio file (MP3/WAV/M4A) instead of live recording. */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Size limit: 5MB (a 5MB mp3 is ~5 minutes — far more than the 30-120s ideal)
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: t("voice.uploadTooLarge"), variant: "destructive" });
      return;
    }

    const duration = await getAudioDuration(file);
    if (duration > 0 && duration < 10) {
      toast({ title: t("voice.uploadTooShort"), variant: "destructive" });
      return;
    }
    if (duration > 0 && duration < 15) {
      toast({ title: t("voice.uploadShortWarn"), variant: "default" });
    }

    setUploadedDuration(duration > 0 ? duration : null);
    setRecordingTime(0);
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!audioBlob || !user) return;

    const duration = uploadedDuration ?? recordingTime;
    const minDuration = uploadedDuration !== null ? 10 : MIN_RECORDING_TIME;
    if (duration < minDuration) {
      toast({
        title: uploadedDuration !== null ? t("voice.uploadTooShort") : "Recording Too Short",
        description: `Please provide at least ${minDuration} seconds for best voice cloning results.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      // Call Vercel function to create voice clone
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch("/api/create-voice-clone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          audio: base64Audio,
          name: `Voice Clone - ${user.email} - ${langName(selectedLang || defaultLang || language || "en")}`,
          audioType: audioBlob.type || "audio/webm",
          audioName: audioBlob instanceof File ? audioBlob.name : "voice_sample.webm",
        }),
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        data = { error: response.ok ? "Voice cloning failed" : `Voice cloning failed (${response.status})` };
      }
      if (!response.ok) throw new Error(data.error || "Voice cloning failed");
      if (data.error) throw new Error(data.error);

      // Save profile for the targeted language
      const targetLang = normalizeLang(selectedLang || defaultLang || language) || "en";
      const isDefaultTarget = !defaultLang || targetLang === defaultLang;
      const updated = saveVoiceProfile(targetLang, data.voiceId, isDefaultTarget);
      setProfiles(updated.voices);
      setDefaultLang(updated.defaultLang);

      // Keep the DB column in sync with the default profile (backward compat)
      if (isDefaultTarget) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ voice_clone_id: data.voiceId })
          .eq("id", user.id);
        if (updateError) console.error("Failed to sync default voice id:", updateError);
      }

      setAudioBlob(null);
      setAudioUrl(null);
      setSelectedLang(null);

      toast({
        title: "Voice Clone Created! 🎙️",
        description: `${langName(targetLang)} voice saved — playback will use it for ${langName(targetLang)} entries.`,
      });
    } catch (error) {
      console.error("Error creating voice clone:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create voice clone",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProfile = async (lang: string) => {
    if (!user) return;
    const updated = removeVoiceProfile(lang);
    setProfiles(updated.voices);
    setDefaultLang(updated.defaultLang);

    if (lang === defaultLang || updated.defaultLang !== lang) {
      const { error } = await supabase
        .from("profiles")
        .update({ voice_clone_id: updated.defaultLang && updated.voices[updated.defaultLang] ? updated.voices[updated.defaultLang] : null })
        .eq("id", user.id);
      if (error) console.error("Failed to clear default voice id:", error);
    }

    if (selectedLang === lang) setSelectedLang(null);

    toast({
      title: "Voice Removed",
      description: `${langName(lang)} voice removed.`,
    });
  };

  const startRecordingFor = (lang: string | null) => {
    handleDiscard();
    setSelectedLang(lang);
  };

  const profileLangs = Object.keys(profiles);
  const availableLangs = LANGUAGES.filter((l) => !profiles[l.code]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen gradient-warm pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/settings")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground">{t("voice.clone")}</h1>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-12">
          <UpgradePrompt
            feature="Voice Cloning"
            description="Clone your voice and hear your journal entries read back to you. Upgrade to Premium to unlock this feature."
          />
        </main>
      </div>
    );
  }

  const showRecording = isRecording || !!audioBlob || selectedLang !== null;

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

      {/* Hidden file input for voice uploads (MP3/WAV/M4A) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac"
        className="hidden"
        onChange={handleFileSelect}
      />

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
              <h1 className="text-lg font-semibold text-foreground">{t("voice.clone")}</h1>
              <p className="text-sm text-muted-foreground">{t("voice.createClone")}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Voice Profiles */}
        {profileLangs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-bold text-foreground mb-3">{t("voice.voiceProfiles")}</h2>
            <div className="space-y-3">
              {profileLangs.map((lang) => (
                <motion.div
                  key={lang}
                  className="glass-card rounded-2xl p-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center text-lg">
                      {LANGUAGES.find((l) => l.code === lang)?.flag || "🎙️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">
                        {LANGUAGES.find((l) => l.code === lang)?.name || lang}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {defaultLang === lang ? t("voice.default") : t("voice.ready")}
                      </p>
                    </div>
                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => startRecordingFor(lang)}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      {t("voice.reRecord")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => handleDeleteProfile(lang)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t("voice.remove")}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Add another language voice */}
        {availableLangs.length > 0 && !showRecording && (
          <motion.div
            className="glass-card rounded-2xl p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Languages className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">{t("voice.addAnother")}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {profileLangs.length === 0
                ? "Record your voice once — it becomes the default for all languages."
                : "Entries are read in their own language when a matching voice exists."}
            </p>
            <div className="flex flex-wrap gap-2">
              {availableLangs.map((l) => (
                <button
                  key={l.code}
                  onClick={() => startRecordingFor(l.code)}
                  className="flex items-center gap-1.5 rounded-full bg-white/60 border border-primary/20 px-3.5 py-2 text-sm font-medium text-foreground hover:bg-white/90 active:scale-95 transition-colors"
                >
                  <span>{l.flag}</span>
                  <span>{l.native}</span>
                  <Plus className="w-3.5 h-3.5 text-primary" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recording Instructions */}
        {profileLangs.length === 0 && !showRecording && (
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
                <li>• Record 30 seconds to 2 minutes</li>
              </ul>
            </div>

            {/* Or upload an existing audio file */}
            <Button
              variant="outline"
              className="w-full gap-2 h-12 rounded-2xl mb-3"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileAudio className="w-5 h-5" />
              {t("voice.uploadFile")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("voice.uploadHint")}</p>
          </motion.div>
        )}

        {/* Recording Interface */}
        {showRecording && (
          <motion.div
            className="glass-card rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Target language context */}
            {selectedLang && !isRecording && (
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{LANGUAGES.find((l) => l.code === selectedLang)?.flag}</span>
                  <p className="font-semibold text-foreground">
                    {t("voice.recordIn")} {LANGUAGES.find((l) => l.code === selectedLang)?.native || selectedLang}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("voice.recordHint")}
                </p>
              </div>
            )}

            {/* Recording Status */}
            {isRecording && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t("record.recording")}</span>
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
                    <p className="font-medium text-sm">{t("voice.recordingPreview")}</p>
                    <p className="text-muted-foreground text-xs">
                      {uploadedDuration !== null
                        ? `${formatTime(uploadedDuration)} ${audioBlob instanceof File ? "· " + audioBlob.name : ""}`
                        : `${formatTime(recordingTime)} recorded`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3">
              {!audioBlob ? (
                <>
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
                  {!isRecording && (
                    <Button
                      variant="outline"
                      className="h-14 rounded-2xl gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileAudio className="w-5 h-5" />
                      {t("voice.uploadFile")}
                    </Button>
                  )}
                </>
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
                    onClick={() => {
                      const duration = uploadedDuration ?? recordingTime;
                      const minDuration = uploadedDuration !== null ? 10 : MIN_RECORDING_TIME;
                      if (duration < minDuration) {
                        toast({
                          title: uploadedDuration !== null ? t("voice.uploadTooShort") : "Recording Too Short",
                          description: `Please provide at least ${minDuration} seconds. You provided ${Math.floor(duration)}s.`,
                          variant: "destructive",
                        });
                        return;
                      }
                      handleUpload();
                    }}
                    disabled={isUploading}
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
                  {recordingTime > 0 && recordingTime < MIN_RECORDING_TIME && (
                    <p className="text-xs text-destructive text-center mt-2 w-full">
                      Need {MIN_RECORDING_TIME - recordingTime}s more (minimum 30s)
                    </p>
                  )}
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
