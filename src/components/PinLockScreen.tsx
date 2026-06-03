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
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      try {
        // Server-side check: does this user have a PIN set? Hash is never exposed to the client.
        const { data, error } = await supabase.rpc("has_pin");
        if (error) throw error;
        const pinSet = !!data;
        setHasPin(pinSet);

        const bioPref = localStorage.getItem(`biometric_enabled_${user.id}`);
        setBiometricEnabled(bioPref === "true");

        if (!pinSet) onUnlock();
      } catch (err) {
        console.error("Error checking PIN status:", err);
        onUnlock();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, onUnlock]);

  useEffect(() => {
    if (!loading && hasPin && biometricEnabled) {
      handleBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasPin, biometricEnabled]);

  const verifyPin = async (candidate: string): Promise<boolean> => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-pin", {
        body: { pin: candidate },
      });
      if (error) return false;
      return !!data?.ok;
    } catch (err) {
      console.error("PIN verify failed:", err);
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const handleNumberPress = useCallback(
    async (num: string) => {
      if (verifying || pin.length >= PIN_LENGTH) return;
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      if (newPin.length === PIN_LENGTH) {
        const ok = await verifyPin(newPin);
        if (ok) {
          setTimeout(() => onUnlock(), 200);
        } else {
          setError(true);
          setTimeout(() => {
            setPin("");
            setError(false);
          }, 500);
        }
      }
    },
    [pin, onUnlock, verifying]
  );

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  }, []);

  const handleBiometric = useCallback(async () => {
    try {
      // Require real WebAuthn support — no insecure fallback.
      if (!window.PublicKeyCredential) return;

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          userVerification: "required",
          rpId: window.location.hostname,
          allowCredentials: [],
        },
      } as CredentialRequestOptions);

      if (credential) onUnlock();
    } catch (err) {
      console.log("Biometric auth cancelled or failed:", err);
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
                  ? error
                    ? "bg-destructive scale-110"
                    : "bg-primary scale-110"
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
                  ? error
                    ? "bg-destructive scale-110"
                    : "bg-primary scale-110"
                  : "bg-muted"
              }`}
              animate={pin.length > index ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      </motion.div>

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
                disabled={pin.length === 0 || verifying}
              >
                <X className="w-6 h-6" />
              </Button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full h-full rounded-2xl glass-card text-2xl font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
                onClick={() => handleNumberPress(num)}
                disabled={verifying}
              >
                {num}
              </motion.button>
            )}
          </div>
        ))}
      </div>

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
