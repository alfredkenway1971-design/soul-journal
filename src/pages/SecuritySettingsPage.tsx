import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Shield, Fingerprint, ScanFace } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const PIN_LENGTH = 8;

const SecuritySettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [pinEnabled, setPinEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"view" | "set" | "confirm">("view");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return;
      
      try {
        // Server-side check — the PIN hash itself is never returned to the browser.
        const { data, error } = await supabase.rpc('has_pin');
        if (error) throw error;
        setPinEnabled(!!data);

        const bioPref = localStorage.getItem(`biometric_enabled_${user.id}`);
        setBiometricEnabled(bioPref === 'true');
      } catch (error) {
        console.error('Error checking PIN status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkStatus();
  }, [user]);

  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + user?.id);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleNumberPress = (num: string) => {
    if (step === "set") {
      if (newPin.length < PIN_LENGTH) {
        const updated = newPin + num;
        setNewPin(updated);
        if (updated.length === PIN_LENGTH) {
          setStep("confirm");
        }
      }
    } else if (step === "confirm") {
      if (confirmPin.length < PIN_LENGTH) {
        const updated = confirmPin + num;
        setConfirmPin(updated);
        if (updated.length === PIN_LENGTH) {
          handleSavePin(updated);
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === "set") {
      setNewPin(prev => prev.slice(0, -1));
    } else if (step === "confirm") {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleSavePin = async (confirmedPin: string) => {
    if (newPin !== confirmedPin) {
      toast({
        title: "PINs Don't Match",
        description: "Please try again.",
        variant: "destructive",
      });
      setNewPin("");
      setConfirmPin("");
      setStep("set");
      return;
    }

    if (!user) return;
    
    setIsSettingPin(true);
    
    try {
      const pinHash = await hashPin(newPin);
      
      const { error } = await supabase
        .from('profiles')
        .update({ pin_hash: pinHash })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setPinEnabled(true);
      setStep("view");
      setNewPin("");
      setConfirmPin("");
      
      toast({
        title: "PIN Set! 🔒",
        description: "Your 8-digit PIN is now active.",
      });
    } catch (error) {
      console.error('Error saving PIN:', error);
      toast({
        title: "Error",
        description: "Failed to save PIN",
        variant: "destructive",
      });
    } finally {
      setIsSettingPin(false);
    }
  };

  const handleDisablePin = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pin_hash: null })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setPinEnabled(false);
      // Also disable biometric if PIN is off
      setBiometricEnabled(false);
      localStorage.removeItem(`biometric_enabled_${user.id}`);
      
      toast({
        title: "PIN Disabled",
        description: "PIN lock has been removed.",
      });
    } catch (error) {
      console.error('Error disabling PIN:', error);
      toast({
        title: "Error",
        description: "Failed to disable PIN",
        variant: "destructive",
      });
    }
  };

  const handleTogglePin = (enabled: boolean) => {
    if (enabled) {
      setStep("set");
    } else {
      handleDisablePin();
    }
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (!user) return;

    if (enabled) {
      // Test if biometric is available
      try {
        if (!window.PublicKeyCredential) {
          toast({
            title: "Not Supported",
            description: "Biometric authentication is not available on this device.",
            variant: "destructive",
          });
          return;
        }

        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!available) {
          toast({
            title: "Not Available",
            description: "No biometric sensor detected on this device.",
            variant: "destructive",
          });
          return;
        }

        // Register a credential for biometric
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: "Soul Journal", id: window.location.hostname },
            user: {
              id: new TextEncoder().encode(user.id),
              name: user.email || "user",
              displayName: user.user_metadata?.display_name || "User",
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
            },
            timeout: 60000,
          },
        });

        if (credential) {
          localStorage.setItem(`biometric_enabled_${user.id}`, 'true');
          setBiometricEnabled(true);
          toast({
            title: "Biometric Enabled 🔐",
            description: "You can now unlock with Face ID or Fingerprint.",
          });
        }
      } catch (err) {
        console.error("Biometric setup failed:", err);
        toast({
          title: "Setup Failed",
          description: "Could not set up biometric authentication.",
          variant: "destructive",
        });
      }
    } else {
      localStorage.removeItem(`biometric_enabled_${user.id}`);
      setBiometricEnabled(false);
      toast({
        title: "Biometric Disabled",
        description: "Biometric unlock has been turned off.",
      });
    }
  };

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"];

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
                if (step !== "view") {
                  setStep("view");
                  setNewPin("");
                  setConfirmPin("");
                } else {
                  navigate("/settings");
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Security</h1>
              <p className="text-sm text-muted-foreground">
                {step === "view" && "Protect your journal"}
                {step === "set" && "Enter new 8-digit PIN"}
                {step === "confirm" && "Confirm your 8-digit PIN"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {step === "view" && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* PIN Lock Toggle */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">PIN Lock</h3>
                  <p className="text-sm text-muted-foreground">
                    Require 8-digit PIN to open journal
                  </p>
                </div>
                <Switch
                  checked={pinEnabled}
                  onCheckedChange={handleTogglePin}
                />
              </div>
            </div>

            {/* Change PIN */}
            {pinEnabled && (
              <motion.div
                className="glass-card rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
                  onClick={() => setStep("set")}
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Shield className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-left font-medium text-foreground">
                    Change PIN
                  </span>
                </button>
              </motion.div>
            )}

            {/* Biometric Toggle */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/30 flex items-center justify-center">
                  <ScanFace className="w-6 h-6 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">Biometric Unlock</h3>
                  <p className="text-sm text-muted-foreground">
                    Use Face ID or Fingerprint
                  </p>
                </div>
                <Switch
                  checked={biometricEnabled}
                  onCheckedChange={handleToggleBiometric}
                  disabled={!pinEnabled}
                />
              </div>
              {!pinEnabled && (
                <p className="text-xs text-muted-foreground mt-3 ml-16">
                  Enable PIN lock first to use biometric unlock
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* PIN Entry */}
        {(step === "set" || step === "confirm") && (
          <motion.div
            className="flex flex-col items-center pt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* PIN Dots - 8 dots in two rows */}
            <div className="flex flex-col gap-3 mb-12">
              <div className="flex gap-3 justify-center">
                {[0, 1, 2, 3].map((index) => {
                  const currentPin = step === "set" ? newPin : confirmPin;
                  return (
                    <motion.div
                      key={index}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                        currentPin.length > index
                          ? "bg-primary scale-110"
                          : "bg-muted"
                      }`}
                      animate={currentPin.length > index ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.2 }}
                    />
                  );
                })}
              </div>
              <div className="flex gap-3 justify-center">
                {[4, 5, 6, 7].map((index) => {
                  const currentPin = step === "set" ? newPin : confirmPin;
                  return (
                    <motion.div
                      key={index}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                        currentPin.length > index
                          ? "bg-primary scale-110"
                          : "bg-muted"
                      }`}
                      animate={currentPin.length > index ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.2 }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-4 max-w-xs w-full">
              {numbers.map((num, index) => (
                <div key={index} className="aspect-square">
                  {num === "" ? (
                    <div />
                  ) : num === "delete" ? (
                    <Button
                      variant="ghost"
                      className="w-full h-full rounded-2xl text-muted-foreground hover:bg-muted/50"
                      onClick={handleDelete}
                      disabled={
                        (step === "set" && newPin.length === 0) ||
                        (step === "confirm" && confirmPin.length === 0)
                      }
                    >
                      ←
                    </Button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="w-full h-full rounded-2xl glass-card text-2xl font-medium text-foreground hover:bg-muted/50 transition-colors"
                      onClick={() => handleNumberPress(num)}
                      disabled={isSettingPin}
                    >
                      {num}
                    </motion.button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default SecuritySettingsPage;
