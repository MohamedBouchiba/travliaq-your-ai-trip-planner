import { useLayoutEffect, useMemo, useRef, useState } from "react";
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

const MARGIN = 12;
const GAP = 18; // gap between pin and popup body
const ARROW_SIZE = 10; // px

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const DestinationPopup = ({
  cityName,
  countryName,
  isOpen,
  onClose,
  onDiscoverClick,
  position,
}: DestinationPopupProps) => {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [popupWidth, setPopupWidth] = useState<number>(280);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = popupRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width) setPopupWidth(rect.width);
  }, [isOpen, cityName, countryName]);

  const layout = useMemo(() => {
    if (!isOpen || !position) return null;

    const vw = window.innerWidth;

    // Prefer placing the popup to the right of the pin, otherwise place it to the left.
    const rightCandidate = position.x + GAP;
    const leftCandidate = position.x - GAP - popupWidth;

    const fitsRight = rightCandidate + popupWidth + MARGIN <= vw;
    const popupLeft = clamp(
      fitsRight ? rightCandidate : leftCandidate,
      MARGIN,
      vw - popupWidth - MARGIN
    );

    // Anchor Y: we always place the popup above the pin, with the arrow tip landing on the pin.
    // Arrow tip is ARROW_SIZE/2 below the card edge due to rotation.
    const popupTop = position.y - ARROW_SIZE;

    // Arrow X is aligned with the pin, clamped inside the card.
    const arrowLeft = clamp(position.x - popupLeft, 20, popupWidth - 20);

    return { popupLeft, popupTop, arrowLeft };
  }, [isOpen, position, popupWidth]);

  if (!layout || !position) return null;

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
          {/* Popup */}
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="fixed z-[60] pointer-events-auto"
            style={{
              left: layout.popupLeft,
              top: layout.popupTop,
              transform: "translateY(-100%)",
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

            {/* Pointer: rotated square positioned so it points to the pin */}
            <div
              className="absolute"
              style={{
                left: layout.arrowLeft,
                bottom: -(ARROW_SIZE / 2),
                width: ARROW_SIZE,
                height: ARROW_SIZE,
                transform: "translateX(-50%) rotate(45deg)",
                background: "hsl(var(--card))",
                borderRight: "1px solid hsl(var(--border))",
                borderBottom: "1px solid hsl(var(--border))",
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