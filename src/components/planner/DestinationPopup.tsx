import { Play, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useMemo } from "react";

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
  const [popupSize, setPopupSize] = useState({ width: 280, height: 120 });
  
  // Calculate the center of the visible map area (accounting for panels)
  const mapCenter = useMemo(() => {
    // Assume left panel is ~35% and there might be an overlay panel on right (~400px)
    const leftOffset = window.innerWidth * 0.35;
    const rightMargin = 420; // Overlay panel width + some margin
    const availableWidth = window.innerWidth - leftOffset - rightMargin;
    const centerX = leftOffset + (availableWidth / 2);
    const centerY = window.innerHeight / 2;
    return { x: centerX, y: centerY };
  }, [isOpen]);

  // Get popup dimensions after render
  useEffect(() => {
    if (popupRef.current && isOpen) {
      const rect = popupRef.current.getBoundingClientRect();
      setPopupSize({ width: rect.width, height: rect.height });
    }
  }, [isOpen, cityName]);

  // Calculate the line path from pin to popup
  const lineData = useMemo(() => {
    if (!position || !isOpen) return null;
    
    const startX = position.x;
    const startY = position.y;
    const endX = mapCenter.x;
    const endY = mapCenter.y;
    
    // Calculate control points for a smooth curve
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 40; // Arc upward
    
    return {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      control: { x: midX, y: midY },
      path: `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`,
    };
  }, [position, mapCenter, isOpen]);

  if (!isOpen || !position) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - subtle darkening */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55] bg-black/10"
            onClick={onClose}
          />
          
          {/* Animated connection line */}
          {lineData && (
            <motion.svg
              className="fixed inset-0 z-[56] pointer-events-none overflow-visible"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Glow effect */}
              <motion.path
                d={lineData.path}
                fill="none"
                stroke="hsl(var(--primary) / 0.3)"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
              {/* Main line */}
              <motion.path
                d={lineData.path}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="6 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
              {/* Start dot on the pin */}
              <motion.circle
                cx={lineData.start.x}
                cy={lineData.start.y}
                r="6"
                fill="hsl(var(--primary))"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ delay: 0.1, duration: 0.2 }}
              />
              {/* Pulse ring on start */}
              <motion.circle
                cx={lineData.start.x}
                cy={lineData.start.y}
                r="6"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ 
                  scale: [1, 2.5], 
                  opacity: [0.8, 0],
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            </motion.svg>
          )}
          
          {/* Popup Card - positioned at map center */}
          <motion.div
            ref={popupRef}
            initial={{ 
              opacity: 0, 
              scale: 0.5,
              x: position?.x ?? mapCenter.x,
              y: position?.y ?? mapCenter.y,
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: mapCenter.x,
              y: mapCenter.y,
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.5,
              x: position?.x ?? mapCenter.x,
              y: position?.y ?? mapCenter.y,
            }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 350,
              mass: 0.8
            }}
            className="fixed z-[60] pointer-events-auto"
            style={{
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="relative">
              {/* Glass card */}
              <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden min-w-[260px] max-w-[320px]">
                {/* Top accent gradient */}
                <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
                
                <div className="p-4">
                  {/* Header with city info */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {/* Animated pin icon */}
                      <motion.div 
                        className="relative h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25"
                        initial={{ rotate: -10 }}
                        animate={{ rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <span className="text-xl">📍</span>
                        {/* Sparkle effect */}
                        <motion.div
                          className="absolute -top-1 -right-1"
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.3, type: "spring" }}
                        >
                          <Sparkles className="h-4 w-4 text-amber-400" />
                        </motion.div>
                      </motion.div>
                      
                      <div className="min-w-0">
                        <motion.h3 
                          className="font-bold text-foreground text-lg leading-tight truncate"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 }}
                        >
                          {cityName}
                        </motion.h3>
                        {countryName && (
                          <motion.p 
                            className="text-sm text-muted-foreground truncate"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            {countryName}
                          </motion.p>
                        )}
                      </div>
                    </div>
                    
                    {/* Close button */}
                    <motion.button
                      onClick={onClose}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
                      aria-label="Fermer"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </div>

                  {/* Discover Button - Main CTA */}
                  <motion.button
                    onClick={onDiscoverClick}
                    className="w-full relative overflow-hidden group rounded-xl p-3.5 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary text-primary-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    
                    <div className="relative flex items-center justify-center gap-3">
                      {/* Play icon with pulse */}
                      <div className="relative">
                        <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                          <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                        </div>
                        {/* Pulse ring */}
                        <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: "2s" }} />
                      </div>
                      
                      <div className="text-left">
                        <span className="text-sm font-semibold block">
                          Découvrir {cityName}
                        </span>
                        <span className="text-xs opacity-80">
                          Vidéos & choses à faire
                        </span>
                      </div>
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DestinationPopup;