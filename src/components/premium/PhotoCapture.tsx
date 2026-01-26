import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Upload, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoCaptureProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
}

const PhotoCapture = ({ photos, onPhotosChange, maxPhotos = 5 }: PhotoCaptureProps) => {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = maxPhotos - photos.length;
    const newFiles = files.slice(0, remainingSlots);
    
    // Create preview URLs
    const newUrls = newFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newUrls]);
    onPhotosChange([...photos, ...newFiles]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Photo Grid */}
      <div className="grid grid-cols-3 gap-2">
        <AnimatePresence>
          {previewUrls.map((url, index) => (
            <motion.div
              key={url}
              className="relative aspect-square rounded-xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <img 
                src={url} 
                alt={`Photo ${index + 1}`} 
                className="w-full h-full object-cover"
              />
              <button
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                onClick={() => removePhoto(index)}
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Photo Button */}
        {photos.length < maxPhotos && (
          <motion.button
            className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs">Add</span>
          </motion.button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {photos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Add up to {maxPhotos} photos to your entry
        </p>
      )}
    </div>
  );
};

export default PhotoCapture;
