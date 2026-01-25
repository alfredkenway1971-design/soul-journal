import { motion } from "framer-motion";
import { Mic, Camera, PenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QuickCapture = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Voice Note */}
      <motion.button
        className="vitality-card p-5 flex flex-col items-start min-h-[100px] text-left"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate("/record")}
      >
        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3">
          <Mic className="w-5 h-5 text-orange-500" />
        </div>
        <p className="font-medium text-foreground">Voice Note</p>
      </motion.button>

      {/* Right column - stacked */}
      <div className="flex flex-col gap-3">
        {/* Photo Dump */}
        <motion.button
          className="vitality-card p-4 flex items-center gap-3 text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Camera className="w-4 h-4 text-purple-500" />
          </div>
          <p className="font-medium text-foreground text-sm">Photo Dump</p>
        </motion.button>

        {/* New Entry */}
        <motion.button
          className="gradient-primary p-4 flex items-center gap-3 text-left rounded-[1.25rem]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/record")}
        >
          <PenLine className="w-5 h-5 text-white" />
          <p className="font-medium text-white">New Entry</p>
        </motion.button>
      </div>
    </div>
  );
};

export default QuickCapture;
