import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

interface ImageModalProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function ImageModal({ images, currentIndex, onClose, onNext, onPrev }: ImageModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNext, onPrev]);

  if (!images.length) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
      >
        <X size={32} />
      </button>

      {/* Navigation */}
      <button 
        onClick={onPrev}
        className="absolute left-4 p-2 text-white/50 hover:text-white transition-colors"
      >
        <ChevronLeft size={48} />
      </button>

      <div className="max-w-5xl max-h-[85vh] flex flex-col items-center">
        <img 
          src={images[currentIndex]} 
          className="w-full h-full object-contain rounded-lg shadow-2xl"
          alt={`Gallery item ${currentIndex + 1}`}
        />
        <p className="mt-4 text-white/60 font-medium">
          {currentIndex + 1} / {images.length}
        </p>
      </div>

      <button 
        onClick={onNext}
        className="absolute right-4 p-2 text-white/50 hover:text-white transition-colors"
      >
        <ChevronRight size={48} />
      </button>
    </div>
  );
}