import { Play, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  if (!isOpen || !position) return null;

  // Position popup so its arrow tip matches the clicked geographic point
  // The popup is translated up by 100%, and the arrow extends 8px below the card.
  // So we shift the anchor up by 8px so the arrow tip lands exactly on the point.
  const popupStyle = {
    left: position.x,
    top: position.y - 8,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible backdrop to close on click outside */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55]"
            onClick={onClose}
          />
          
          {/* Popup - anchored to the pin position */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="fixed z-[60] pointer-events-auto"
            style={{
              ...popupStyle,
              transform: "translate(-50%, -100%)",
            }}
          >
            {/* Card container */}
            <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[200px]">
              {/* Header with city name */}
              <div className="flex items-center justify-between gap-3 p-3 pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">📍</span>
                  <div className="min-w-0">
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
                  className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
                  aria-label="Fermer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Action button */}
              <div className="px-3 pb-3">
                <button
                  onClick={onDiscoverClick}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors"
                >
                  <Play className="h-3.5 w-3.5" fill="currentColor" />
                  <span>Découvrir</span>
                  <Sparkles className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Arrow pointing down to the clicked point */}
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-[-8px] w-0 h-0"
              style={{
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "8px solid hsl(var(--card))",
                filter: "drop-shadow(0 2px 2px hsl(var(--foreground) / 0.12))",
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DestinationPopup;