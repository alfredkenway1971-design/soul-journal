import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const PIN_LENGTH = 8;

interface PinLockScreenProps {
  onUnlock: () => void;
}

const PinLockScreen = ({ onUnlock }: PinLockScreenProps) => {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState(false);
  const [storedPinHash, setStoredPinHash] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPinHash = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('pin_hash')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        setStoredPinHash(data?.pin_hash || null);
        
        // Check biometric preference
        const bioPref = localStorage.getItem(`biometric_enabled_${user.id}`);
        setBiometricEnabled(bioPref === 'true');
        
        if (!data?.pin_hash) {
          onUnlock();
        }
      } catch (error) {
        console.error('Error fetching PIN:', error);
        onUnlock();
      } finally {
        setLoading(false);
      }
    };
    
    fetchPinHash();
  }, [user, onUnlock]);

  // Auto-trigger biometric on mount if enabled
  useEffect(() => {
    if (!loading && storedPinHash && biometricEnabled) {
      handleBiometric();
    }
  }, [loading, storedPinHash, biometricEnabled]);

  const hashPin = async (inputPin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(inputPin + user?.id);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleNumberPress = useCallback(async (num: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === PIN_LENGTH) {
        const inputHash = await hashPin(newPin);
        
        if (inputHash === storedPinHash) {
          setTimeout(() => onUnlock(), 300);
        } else {
          setError(true);
          setTimeout(() => {
            setPin("");
            setError(false);
          }, 500);
        }
      }
    }
  }, [pin, storedPinHash, onUnlock, user]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  }, []);

  const handleBiometric = useCallback(async () => {
    try {
      if (!window.PublicKeyCredential) {
        // Fallback: use simple confirmation for browsers without WebAuthn
        const confirmed = window.confirm("Biometric authentication is not supported in this browser. Unlock anyway?");
        if (confirmed) onUnlock();
        return;
      }

      // Use WebAuthn for biometric
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          userVerification: "required",
          rpId: window.location.hostname,
          allowCredentials: [],
        },
      } as CredentialRequestOptions);

      if (credential) {
        onUnlock();
      }
    } catch (err) {
      console.log("Biometric auth cancelled or failed:", err);
      // Silently fail — user can use PIN instead
    }
  }, [onUnlock]);

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"];

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm flex flex-col items-center justify-center p-6">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-20 h-20 rounded-full gradient-amber flex items-center justify-center mx-auto mb-6 shadow-glow">
          <Lock className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">Enter your 8-digit PIN to unlock</p>
      </motion.div>

      {/* PIN Dots - 8 dots in two rows of 4 */}
      <motion.div 
        className="flex flex-col gap-3 mb-10"
        animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <div className="flex gap-3 justify-center">
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={index}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                pin.length > index 
                  ? error ? "bg-destructive scale-110" : "bg-primary scale-110"
                  : "bg-muted"
              }`}
              animate={pin.length > index ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
        <div className="flex gap-3 justify-center">
          {[4, 5, 6, 7].map((index) => (
            <motion.div
              key={index}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                pin.length > index 
                  ? error ? "bg-destructive scale-110" : "bg-primary scale-110"
                  : "bg-muted"
              }`}
              animate={pin.length > index ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      </motion.div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-4 max-w-xs w-full mb-8">
        {numbers.map((num, index) => (
          <div key={index} className="aspect-square">
            {num === "" ? (
              <div />
            ) : num === "delete" ? (
              <Button
                variant="ghost"
                className="w-full h-full rounded-2xl text-muted-foreground hover:bg-muted/50"
                onClick={handleDelete}
                disabled={pin.length === 0}
              >
                <X className="w-6 h-6" />
              </Button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full h-full rounded-2xl glass-card text-2xl font-medium text-foreground hover:bg-muted/50 transition-colors"
                onClick={() => handleNumberPress(num)}
              >
                {num}
              </motion.button>
            )}
          </div>
        ))}
      </div>

      {/* Biometric Option */}
      {biometricEnabled && (
        <motion.button
          className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
          onClick={handleBiometric}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Fingerprint className="w-6 h-6" />
          <span className="text-sm font-medium">Use Face ID or Fingerprint</span>
        </motion.button>
      )}
    </div>
  );
};

export default PinLockScreen;
