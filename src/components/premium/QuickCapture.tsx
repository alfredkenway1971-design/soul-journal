import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QuickCapture = () => {
  const navigate = useNavigate();

  return (
    <motion.button
      className="vitality-card w-full p-5 flex items-center gap-4 text-left"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate("/record")}
    >
      <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
        <Mic className="w-6 h-6 text-orange-500" />
      </div>
      <div className="flex flex-col">
        <p className="font-medium text-foreground">Voice Note</p>
        <p className="text-xs text-muted-foreground">Tap to record your thoughts</p>
      </div>
    </motion.button>
  );
};

export default QuickCapture;
