import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Loader2, X, RefreshCw, Youtube, Sparkles, ChevronLeft, ChevronUp, ChevronDown, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
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
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchShorts = async () => {
    if (!city) return;
    
    setLoading(true);
    setError(null);
    setCurrentVideoIndex(0);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("youtube-shorts", {
        body: { city, language: "fr" },
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
      // Loop back to first
      setCurrentVideoIndex(0);
    }
  }, [currentVideoIndex, videos.length]);

  const goToPrev = useCallback(() => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex((prev) => prev - 1);
    }
  }, [currentVideoIndex]);

  // Handle scroll/swipe
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 50) {
      goToNext();
    } else if (e.deltaY < -50) {
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goToPrev();
      }
    };

    if (isOpen && videos.length > 0) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, goToNext, goToPrev, videos.length]);

  // Auto-advance to next video after it ends (approximate timing)
  useEffect(() => {
    if (!isPlaying || videos.length === 0) return;
    
    // YouTube Shorts are typically 15-60 seconds, we'll use 45s as average
    const timer = setTimeout(() => {
      goToNext();
    }, 45000);

    return () => clearTimeout(timer);
  }, [currentVideoIndex, isPlaying, goToNext, videos.length]);

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
          className="h-full flex flex-col overflow-hidden bg-black"
          ref={containerRef}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-3 border-b border-white/10 bg-black/80 backdrop-blur-sm z-10">
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                <h2 className="font-semibold text-white text-sm">{city}</h2>
              </div>
              {countryName && (
                <p className="text-xs text-white/50">{countryName}</p>
              )}
            </div>
            <button
              onClick={fetchShorts}
              disabled={loading}
              className="h-8 w-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 relative">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-white/60">Recherche des vidéos...</p>
              </div>
            )}

            {error && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <X className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-sm text-white/60">{error}</p>
                <button
                  onClick={fetchShorts}
                  className="text-sm text-primary hover:underline"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!loading && !error && videos.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Youtube className="h-6 w-6 text-white/40" />
                </div>
                <p className="text-sm text-white/60 text-center px-4">
                  Aucune vidéo trouvée pour {city}
                </p>
              </div>
            )}

            {!loading && !error && currentVideo && (
              <div className="absolute inset-0 flex flex-col">
                {/* Video Player - Full Height */}
                <div className="flex-1 relative bg-black">
                  <iframe
                    ref={iframeRef}
                    src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=0&controls=0&modestbranding=1&rel=0&showinfo=0&playsinline=1`}
                    title={currentVideo.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Navigation hints */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto">
                      <button
                        onClick={goToPrev}
                        disabled={currentVideoIndex === 0}
                        className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors disabled:opacity-30"
                      >
                        <ChevronUp className="h-5 w-5" />
                      </button>
                      <button
                        onClick={goToNext}
                        className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Mute button */}
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="absolute bottom-4 right-3 h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors pointer-events-auto"
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Video Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-14 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
                    <p className="text-white font-medium text-sm line-clamp-2 mb-1">
                      {currentVideo.title}
                    </p>
                    <p className="text-white/60 text-xs">
                      @{currentVideo.channelTitle}
                    </p>
                  </div>

                  {/* Progress indicator */}
                  <div className="absolute top-14 left-3 right-3 flex gap-1">
                    {videos.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          idx === currentVideoIndex
                            ? "bg-white"
                            : idx < currentVideoIndex
                            ? "bg-white/60"
                            : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Bottom thumbnails preview */}
                <div className="h-20 bg-black/90 border-t border-white/10 flex gap-1 p-2 overflow-x-auto themed-scroll">
                  {videos.map((video, idx) => (
                    <button
                      key={video.id}
                      onClick={() => setCurrentVideoIndex(idx)}
                      className={`flex-shrink-0 w-14 h-full rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentVideoIndex
                          ? "border-primary scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default YouTubeShortsPanel;
