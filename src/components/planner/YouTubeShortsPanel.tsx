import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, X, RefreshCw, Youtube, ChevronLeft, ChevronUp, ChevronDown, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  category?: string;
}

interface YouTubeShortsPanelProps {
  city: string;
  countryName?: string;
  isOpen: boolean;
  onClose: () => void;
}

const YouTubeShortsPanel = ({ city, countryName, isOpen, onClose }: YouTubeShortsPanelProps) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);

  const fetchShorts = async () => {
    if (!city) return;
    
    setLoading(true);
    setError(null);
    setCurrentVideoIndex(0);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("youtube-shorts", {
        body: { city },
      });

      if (fnError) {
        console.error("[YouTubeShortsPanel] Error:", fnError);
        setError("Impossible de charger les vidéos");
        return;
      }

      setVideos(data.videos || []);
    } catch (err) {
      console.error("[YouTubeShortsPanel] Fetch error:", err);
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && city) {
      fetchShorts();
    }
  }, [isOpen, city]);

  // Navigate to next/previous video
  const goToNext = useCallback(() => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex((prev) => prev + 1);
    } else {
      setCurrentVideoIndex(0);
    }
  }, [currentVideoIndex, videos.length]);

  const goToPrev = useCallback(() => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex((prev) => prev - 1);
    }
  }, [currentVideoIndex]);

  // Handle scroll/swipe with debounce
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    if (now - lastScrollTime.current < 400) return; // Debounce
    lastScrollTime.current = now;

    if (e.deltaY > 30) {
      goToNext();
    } else if (e.deltaY < -30) {
      goToPrev();
    }
  }, [goToNext, goToPrev]);

  useEffect(() => {
    const container = containerRef.current;
    if (container && videos.length > 0) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel, videos.length]);

  // Touch swipe support
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (deltaY > 50) {
      goToNext();
    } else if (deltaY < -50) {
      goToPrev();
    }
  }, [goToNext, goToPrev]);

  useEffect(() => {
    const container = containerRef.current;
    if (container && videos.length > 0) {
      container.addEventListener("touchstart", handleTouchStart, { passive: true });
      container.addEventListener("touchend", handleTouchEnd, { passive: true });
      return () => {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [handleTouchStart, handleTouchEnd, videos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen && videos.length > 0) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, goToNext, goToPrev, videos.length, onClose]);

  const currentVideo = videos[currentVideoIndex];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="h-full flex flex-col overflow-hidden bg-black rounded-2xl"
          ref={containerRef}
        >
          {/* Compact Header - overlaid on video */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 p-3 bg-gradient-to-b from-black/70 to-transparent">
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <Youtube className="h-4 w-4 text-red-500" />
            <span className="font-medium text-white text-sm flex-1 truncate">{city}</span>
            <button
              onClick={fetchShorts}
              disabled={loading}
              className="h-8 w-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Progress dots - positioned below header */}
          {videos.length > 0 && (
            <div className="absolute top-14 left-3 right-3 z-20 flex gap-1">
              {videos.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    idx === currentVideoIndex
                      ? "bg-white"
                      : idx < currentVideoIndex
                      ? "bg-white/50"
                      : "bg-white/25"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Full screen content area */}
          <div className="flex-1 relative">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
                <p className="text-sm text-white/60">Chargement...</p>
              </div>
            )}

            {error && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-6">
                <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <X className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-white/60 text-center">{error}</p>
                <button
                  onClick={fetchShorts}
                  className="px-4 py-2 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!loading && !error && videos.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-6">
                <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
                  <Youtube className="h-8 w-8 text-white/40" />
                </div>
                <p className="text-white/60 text-center">
                  Aucune vidéo trouvée
                </p>
              </div>
            )}

            {!loading && !error && currentVideo && (
              <>
                {/* Fullscreen Video */}
                <iframe
                  key={currentVideo.id}
                  src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=0&controls=0&modestbranding=1&rel=0&showinfo=0&playsinline=1`}
                  title={currentVideo.title}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />

                {/* Side controls */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
                  <button
                    onClick={goToPrev}
                    disabled={currentVideoIndex === 0}
                    className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors disabled:opacity-30"
                  >
                    <ChevronUp className="h-6 w-6" />
                  </button>
                  <button
                    onClick={goToNext}
                    className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronDown className="h-6 w-6" />
                  </button>
                </div>

                {/* Bottom overlay with info */}
                <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm line-clamp-2 mb-1">
                        {currentVideo.title}
                      </p>
                      <p className="text-white/60 text-xs truncate">
                        @{currentVideo.channelTitle}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors flex-shrink-0"
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  </div>
                  
                  {/* Scroll hint */}
                  <p className="text-white/40 text-xs text-center mt-3">
                    ↕ Scroll pour changer de vidéo
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default YouTubeShortsPanel;
