import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PinLockScreenProps {
  onUnlock: () => void;
}

const PinLockScreen = ({ onUnlock }: PinLockScreenProps) => {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState(false);
  const correctPin = "1234"; // In production, this would be stored securely

  const handleNumberPress = useCallback((num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        if (newPin === correctPin) {
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
  }, [pin, onUnlock]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  }, []);

  const handleBiometric = useCallback(() => {
    // Simulate biometric unlock
    onUnlock();
  }, [onUnlock]);

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"];

  return (
    <div className="min-h-screen gradient-warm flex flex-col items-center justify-center p-6">
      {/* Header */}
      <motion.div 
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-20 h-20 rounded-full gradient-amber flex items-center justify-center mx-auto mb-6 shadow-glow">
          <Lock className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">Enter your PIN to unlock your journal</p>
      </motion.div>

      {/* PIN Dots */}
      <motion.div 
        className="flex gap-4 mb-12"
        animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={index}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
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
      <motion.button
        className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
        onClick={handleBiometric}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Fingerprint className="w-6 h-6" />
        <span className="text-sm font-medium">Use Fingerprint or Face ID</span>
      </motion.button>

      {/* Hint */}
      <p className="text-xs text-muted-foreground/60 mt-8">
        Demo PIN: 1234
      </p>
    </div>
  );
};

export default PinLockScreen;
