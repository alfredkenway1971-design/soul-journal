import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QuickCapture = () => {
  const navigate = useNavigate();

  return (
    <motion.button
      className="glass-premium w-full p-5 flex items-center gap-5 text-left"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate("/record")}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center shrink-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(200,225,245,0.55) 100%)",
          border: "1px solid rgba(255,255,255,0.65)",
          boxShadow:
            "inset 0 2px 6px rgba(255,255,255,0.6), 0 4px 14px -4px hsla(215,50%,30%,0.15)",
        }}
      >
        <Mic className="w-9 h-9 text-primary" strokeWidth={2} />
      </div>
      <div className="flex flex-col">
        <p className="text-sm text-muted-foreground">Quick Capture</p>
        <p className="font-bold text-2xl text-foreground leading-tight">Voice Note</p>
        <p className="text-sm text-muted-foreground">Tap to record your thoughts</p>
      </div>
    </motion.button>
  );
};

export default QuickCapture;
