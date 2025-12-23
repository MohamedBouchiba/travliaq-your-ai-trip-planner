import { Play, X, MapPin, Sparkles, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface DestinationPopupProps {
  cityName: string;
  countryName?: string;
  isOpen: boolean;
  onClose: () => void;
  onDiscoverClick: () => void;
  position?: { x: number; y: number };
}

const DestinationPopup = ({
  cityName,
  countryName,
  isOpen,
  onClose,
  onDiscoverClick,
  position,
}: DestinationPopupProps) => {
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (position) {
      const popup = {
        width: 280,
        height: 180,
      };
      
      let x = position.x;
      let y = position.y - 20; // Offset above the marker
      
      // Keep within viewport bounds
      if (x - popup.width / 2 < 10) {
        x = popup.width / 2 + 10;
      }
      if (x + popup.width / 2 > window.innerWidth - 10) {
        x = window.innerWidth - popup.width / 2 - 10;
      }
      if (y - popup.height < 80) {
        y = position.y + 50; // Show below marker instead
      }
      
      setAdjustedPosition({ x, y });
    }
  }, [position]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          className="fixed z-[60] pointer-events-auto"
          style={{
            left: adjustedPosition?.x ?? "50%",
            top: adjustedPosition?.y ?? "50%",
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-4 min-w-[260px] max-w-[300px]">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm leading-tight">
                    {cityName}
                  </h3>
                  {countryName && (
                    <p className="text-xs text-muted-foreground">{countryName}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/50 -mx-4 mb-3" />

            {/* Discover Button */}
            <button
              onClick={onDiscoverClick}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border border-primary/20 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
              </div>
              <div className="text-left flex-1">
                <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  Voir ce qu'il se passe
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </span>
                <span className="text-xs text-muted-foreground">
                  Vidéos & tendances locales
                </span>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            {/* Tail/Arrow pointing down */}
            <div
              className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 rotate-45 bg-card/95 border-r border-b border-border/50"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DestinationPopup;
