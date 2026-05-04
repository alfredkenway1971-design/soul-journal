import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QuickCapture = () => {
  const navigate = useNavigate();

  return (
    <motion.button
      className="glass-premium w-full p-5 flex items-center gap-4 text-left"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate("/record")}
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/15 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-inner">
        <Mic className="w-7 h-7 text-primary" strokeWidth={2.25} />
      </div>
      <div className="flex flex-col">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Quick Capture</p>
        <p className="font-semibold text-lg text-foreground">Voice Note</p>
        <p className="text-xs text-muted-foreground">Tap to record your thoughts</p>
      </div>
    </motion.button>
  );
};

export default QuickCapture;
