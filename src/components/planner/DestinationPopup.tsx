import { Play, X, MapPin, Sparkles, ExternalLink } from "lucide-react";
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
  const [adjustedPosition, setAdjustedPosition] = useState<{
    x: number;
    y: number;
    arrowPosition: "bottom" | "top" | "left" | "right";
    arrowOffset: number;
  } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Adjust position to stay within viewport and connect to pin
  useEffect(() => {
    if (!position || !isOpen) return;

    // Wait for popup to render to get its actual dimensions
    requestAnimationFrame(() => {
      const popupWidth = 300;
      const popupHeight = 200;
      const margin = 16;
      const arrowSize = 12;

      let x = position.x;
      let y = position.y;
      let arrowPosition: "bottom" | "top" | "left" | "right" = "bottom";
      let arrowOffset = 50; // percentage from left/top

      // Calculate available space in each direction
      const spaceAbove = position.y - 80; // Account for header
      const spaceBelow = window.innerHeight - position.y - 50;
      const spaceLeft = position.x - margin;
      const spaceRight = window.innerWidth - position.x - margin;

      // Determine best position for popup
      if (spaceAbove >= popupHeight + arrowSize) {
        // Position above the pin (preferred)
        y = position.y - arrowSize - 8;
        arrowPosition = "bottom";
      } else if (spaceBelow >= popupHeight + arrowSize) {
        // Position below the pin
        y = position.y + 60 + arrowSize;
        arrowPosition = "top";
      } else if (spaceRight >= popupWidth + arrowSize) {
        // Position to the right
        x = position.x + 40 + arrowSize;
        y = position.y;
        arrowPosition = "left";
      } else if (spaceLeft >= popupWidth + arrowSize) {
        // Position to the left
        x = position.x - 40 - arrowSize;
        y = position.y;
        arrowPosition = "right";
      } else {
        // Fallback: center on screen
        x = window.innerWidth / 2;
        y = window.innerHeight / 2;
        arrowPosition = "bottom";
      }

      // Horizontal adjustment to keep popup in viewport
      const halfWidth = popupWidth / 2;
      if (arrowPosition === "bottom" || arrowPosition === "top") {
        if (x - halfWidth < margin) {
          const originalX = x;
          x = halfWidth + margin;
          // Calculate arrow offset to still point at pin
          arrowOffset = Math.max(15, Math.min(85, ((originalX - margin) / popupWidth) * 100));
        } else if (x + halfWidth > window.innerWidth - margin) {
          const originalX = x;
          x = window.innerWidth - halfWidth - margin;
          // Calculate arrow offset
          const diff = originalX - x;
          arrowOffset = Math.max(15, Math.min(85, 50 + (diff / popupWidth) * 100));
        }
      }

      // Vertical adjustment for left/right positioned popups
      const halfHeight = popupHeight / 2;
      if (arrowPosition === "left" || arrowPosition === "right") {
        if (y - halfHeight < margin + 80) {
          y = halfHeight + margin + 80;
        } else if (y + halfHeight > window.innerHeight - margin) {
          y = window.innerHeight - halfHeight - margin;
        }
      }

      setAdjustedPosition({ x, y, arrowPosition, arrowOffset });
    });
  }, [position, isOpen]);

  if (!isOpen) return null;

  const getTransformStyle = () => {
    if (!adjustedPosition) return "translate(-50%, -100%)";
    switch (adjustedPosition.arrowPosition) {
      case "bottom":
        return "translate(-50%, -100%)";
      case "top":
        return "translate(-50%, 0%)";
      case "left":
        return "translate(0%, -50%)";
      case "right":
        return "translate(-100%, -50%)";
      default:
        return "translate(-50%, -100%)";
    }
  };

  const getArrowStyles = () => {
    if (!adjustedPosition) return {};
    const base = "absolute w-4 h-4 rotate-45 bg-card border-border/60";
    
    switch (adjustedPosition.arrowPosition) {
      case "bottom":
        return {
          className: `${base} border-r border-b`,
          style: {
            left: `${adjustedPosition.arrowOffset}%`,
            bottom: "-6px",
            transform: "translateX(-50%) rotate(45deg)",
          },
        };
      case "top":
        return {
          className: `${base} border-l border-t`,
          style: {
            left: `${adjustedPosition.arrowOffset}%`,
            top: "-6px",
            transform: "translateX(-50%) rotate(45deg)",
          },
        };
      case "left":
        return {
          className: `${base} border-l border-b`,
          style: {
            left: "-6px",
            top: "50%",
            transform: "translateY(-50%) rotate(45deg)",
          },
        };
      case "right":
        return {
          className: `${base} border-r border-t`,
          style: {
            right: "-6px",
            top: "50%",
            transform: "translateY(-50%) rotate(45deg)",
          },
        };
      default:
        return { className: base, style: {} };
    }
  };

  const arrowProps = getArrowStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for closing on outside click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55]"
            onClick={onClose}
          />
          
          {/* Popup */}
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="fixed z-[60] pointer-events-auto"
            style={{
              left: adjustedPosition?.x ?? position?.x ?? "50%",
              top: adjustedPosition?.y ?? position?.y ?? "50%",
              transform: getTransformStyle(),
            }}
          >
            <div className="bg-card border border-border/60 rounded-2xl shadow-2xl p-4 min-w-[280px] max-w-[320px] relative">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-base leading-tight truncate">
                      {cityName}
                    </h3>
                    {countryName && (
                      <p className="text-sm text-muted-foreground truncate">{countryName}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-border -mx-4 mb-3" />

              {/* Discover Button */}
              <button
                onClick={onDiscoverClick}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border border-primary/20 hover:border-primary/40 transition-all group focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-card"
              >
                <div className="h-11 w-11 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-md">
                  <Play className="h-5 w-5 text-primary-foreground ml-0.5" fill="currentColor" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    Voir ce qu'il se passe
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    Vidéos & tendances locales
                  </span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>

              {/* Arrow pointing to pin */}
              <div
                className={arrowProps.className}
                style={arrowProps.style}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DestinationPopup;
