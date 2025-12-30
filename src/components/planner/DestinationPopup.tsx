import { Play, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

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
  const popupRef = useRef<HTMLDivElement>(null);
  const [finalPosition, setFinalPosition] = useState<{ x: number; y: number; direction: "up" | "down" } | null>(null);

  // Calculate safe position that stays in viewport
  useEffect(() => {
    if (!position || !isOpen) {
      setFinalPosition(null);
      return;
    }

    const popupWidth = 280;
    const popupHeight = 160;
    const margin = 16;
    const pinOffset = 70; // Distance from the pin

    let x = position.x;
    let y = position.y;
    let direction: "up" | "down" = "up";

    // Check if there's enough space above the pin
    const spaceAbove = position.y - 100; // Account for header
    
    if (spaceAbove >= popupHeight + pinOffset) {
      // Position above
      y = position.y - pinOffset;
      direction = "up";
    } else {
      // Position below
      y = position.y + pinOffset + 40;
      direction = "down";
    }

    // Keep popup within horizontal bounds
    const halfWidth = popupWidth / 2;
    if (x - halfWidth < margin) {
      x = halfWidth + margin;
    } else if (x + halfWidth > window.innerWidth - margin) {
      x = window.innerWidth - halfWidth - margin;
    }

    setFinalPosition({ x, y, direction });
  }, [position, isOpen]);

  if (!isOpen || !position) return null;

  return (
    <AnimatePresence>
      {isOpen && finalPosition && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[55]"
            onClick={onClose}
          />
          
          {/* Popup */}
          <motion.div
            ref={popupRef}
            initial={{ 
              opacity: 0, 
              scale: 0.8,
              y: finalPosition.direction === "up" ? 20 : -20,
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: 0,
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8,
              y: finalPosition.direction === "up" ? 20 : -20,
            }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 400,
            }}
            className="fixed z-[60] pointer-events-auto"
            style={{
              left: finalPosition.x,
              top: finalPosition.y,
              transform: `translate(-50%, ${finalPosition.direction === "up" ? "-100%" : "0%"})`,
            }}
          >
            <div className="relative">
              {/* Glass card */}
              <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden min-w-[260px] max-w-[300px]">
                {/* Top accent */}
                <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/50" />
                
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-lg">📍</span>
                      </div>
                      
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground text-base leading-tight truncate">
                          {cityName}
                        </h3>
                        {countryName && (
                          <p className="text-sm text-muted-foreground truncate">{countryName}</p>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={onClose}
                      className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
                      aria-label="Fermer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={onDiscoverClick}
                    className="w-full relative overflow-hidden group rounded-xl p-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary text-primary-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                    
                    <div className="relative flex items-center justify-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Play className="h-3.5 w-3.5 ml-0.5" fill="currentColor" />
                      </div>
                      
                      <div className="text-left">
                        <span className="text-sm font-semibold flex items-center gap-1">
                          Découvrir
                          <Sparkles className="h-3 w-3" />
                        </span>
                        <span className="text-xs opacity-80 block">
                          Choses à faire
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Arrow pointing to pin */}
              <div 
                className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-card border-border/50 ${
                  finalPosition.direction === "up" 
                    ? "bottom-[-6px] border-r border-b" 
                    : "top-[-6px] border-l border-t"
                }`}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DestinationPopup;