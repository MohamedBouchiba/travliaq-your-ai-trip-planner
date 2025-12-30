import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, Loader2, RefreshCw, Volume2, VolumeX, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  category?: string;
  categoryEmoji?: string;
}

interface YouTubeShortsPanelProps {
  city: string;
  countryName?: string;
  isOpen: boolean;
  onClose: () => void;
}

type PanelMode = "list" | "player";

const WHEEL_DEBOUNCE_MS = 450;

const YouTubeShortsPanel = ({ city, countryName, isOpen, onClose }: YouTubeShortsPanelProps) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<PanelMode>("list");
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);
  const touchStartY = useRef(0);

  const subtitle = useMemo(() => {
    const parts = [city, countryName].filter(Boolean);
    return parts.join(", ");
  }, [city, countryName]);

  const fetchShorts = useCallback(async () => {
    if (!city) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("youtube-shorts", {
        body: { city },
      });

      if (fnError) {
        console.error("[YouTubeShortsPanel] Error:", fnError);
        setError("Impossible de charger les vidéos");
        return;
      }

      setVideos(data?.videos || []);
      setCurrentVideoIndex(0);
      setMode("list");
    } catch (err) {
      console.error("[YouTubeShortsPanel] Fetch error:", err);
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    if (isOpen && city) fetchShorts();
  }, [isOpen, city, fetchShorts]);

  const goToNext = useCallback(() => {
    setCurrentVideoIndex((prev) => {
      if (videos.length === 0) return 0;
      return prev < videos.length - 1 ? prev + 1 : 0;
    });
    setIsPaused(false); // Resume on video change
  }, [videos.length]);

  const goToPrev = useCallback(() => {
    setCurrentVideoIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setIsPaused(false); // Resume on video change
  }, []);

  const openPlayerAt = useCallback((idx: number) => {
    setCurrentVideoIndex(idx);
    setMode("player");
    setIsPaused(false);
  }, []);

  // Toggle play/pause via YouTube postMessage API
  const togglePlayPause = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    
    if (isPaused) {
      iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    } else {
      iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }
    setIsPaused((p) => !p);
  }, [isPaused]);

  // Wheel/Touch only when in player mode.
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (mode !== "player") return;
      // Prevent page scroll.
      e.preventDefault();

      const now = Date.now();
      if (now - lastScrollTime.current < WHEEL_DEBOUNCE_MS) return;
      lastScrollTime.current = now;

      if (e.deltaY > 30) goToNext();
      if (e.deltaY < -30) goToPrev();
    },
    [mode, goToNext, goToPrev]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (mode !== "player") return;
      touchStartY.current = e.touches[0].clientY;
    },
    [mode]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (mode !== "player") return;
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (deltaY > 60) goToNext();
      if (deltaY < -60) goToPrev();
    },
    [mode, goToNext, goToPrev]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchEnd]);

  // Keyboard navigation (player only)
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mode === "player") setMode("list");
        else onClose();
      }

      if (mode !== "player") return;

      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goToNext();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        goToPrev();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, mode, goToNext, goToPrev, onClose]);

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
          className="relative h-full w-full overflow-hidden rounded-2xl bg-background"
          ref={containerRef}
        >
          {/* Header */}
          <header className="absolute top-0 left-0 right-0 z-30 flex items-center gap-2 p-3 bg-gradient-to-b from-background/95 to-transparent">
            <button
              onClick={() => {
                if (mode === "player") setMode("list");
                else onClose();
              }}
              className="h-8 w-8 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label={mode === "player" ? "Retour à la liste" : "Fermer"}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-foreground truncate">
                {videos.length > 0 ? `${videos.length} choses à faire à ${city}` : `Découvrir ${city}`}
              </p>
              {countryName && (
                <p className="text-xs text-muted-foreground truncate">{countryName}</p>
              )}
            </div>

            <button
              onClick={fetchShorts}
              disabled={loading}
              className="h-8 w-8 rounded-full flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
              aria-label="Rafraîchir les vidéos"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </header>

          {/* Player progress (moved higher) */}
          {mode === "player" && videos.length > 0 && (
            <div className="absolute top-11 left-3 right-3 z-30 flex gap-1">
              {videos.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    idx === currentVideoIndex
                      ? "bg-foreground"
                      : idx < currentVideoIndex
                      ? "bg-foreground/50"
                      : "bg-foreground/25"
                  )}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <main className="h-full">
            {/* States */}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
                <Loader2 className="h-10 w-10 text-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Chargement…</p>
              </div>
            )}

            {error && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background px-6">
                <div className="h-16 w-16 rounded-full bg-destructive/15 flex items-center justify-center">
                  <X className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-muted-foreground text-center">{error}</p>
                <button
                  onClick={fetchShorts}
                  className="px-4 py-2 rounded-full bg-muted text-foreground text-sm hover:bg-muted/70 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!loading && !error && videos.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background px-6">
                <p className="text-muted-foreground text-center">Aucune vidéo trouvée pour {subtitle}.</p>
              </div>
            )}

            {/* LIST MODE: see all videos */}
            {!loading && !error && videos.length > 0 && mode === "list" && (
              <section className="h-full pt-14">
                <div className="h-full overflow-y-auto themed-scroll px-3 pb-3">
                  <div className="grid grid-cols-1 gap-2">
                    {videos.map((v, idx) => (
                      <button
                        key={v.id}
                        onClick={() => openPlayerAt(idx)}
                        className="group w-full text-left rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/30 transition-all overflow-hidden"
                      >
                        <div className="flex gap-3 p-3">
                          {/* Thumbnail with number overlay */}
                          <div className="relative h-20 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            <img
                              src={v.thumbnail}
                              alt={`Aperçu vidéo ${city}`}
                              loading="lazy"
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Number badge */}
                            <div className="absolute top-1 left-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                              {idx + 1}
                            </div>
                            {/* Play overlay on hover */}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center">
                                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-primary border-b-[6px] border-b-transparent ml-0.5" />
                              </div>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">{v.title}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-sm">{v.categoryEmoji || "🎯"}</span>
                              <span className="text-xs text-muted-foreground">{v.category || "À découvrir"}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* PLAYER MODE: fullscreen video + scroll */}
            {!loading && !error && currentVideo && mode === "player" && (
              <section className="relative h-full">
                {/* Close button - top right */}
                <button
                  onClick={() => setMode("list")}
                  className="absolute top-3 right-3 z-40 h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 flex items-center justify-center text-foreground hover:bg-background transition-colors"
                  aria-label="Fermer la vidéo"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Video area */}
                <div className="absolute inset-0 bg-background">
                  <iframe
                    ref={iframeRef}
                    key={currentVideo.id}
                    src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=0&controls=0&modestbranding=1&rel=0&showinfo=0&playsinline=1&enablejsapi=1`}
                    title={currentVideo.title}
                    className="absolute inset-0 h-full w-full pointer-events-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Clickable overlay for pause/play - click anywhere on video */}
                <div 
                  className="absolute inset-0 z-10 cursor-pointer" 
                  onClick={togglePlayPause}
                  aria-label={isPaused ? "Lecture" : "Pause"}
                />

                {/* Side controls: prev/next only */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
                  <button
                    onClick={goToPrev}
                    disabled={currentVideoIndex === 0}
                    className="h-11 w-11 rounded-full bg-background/70 backdrop-blur-sm border border-border/40 flex items-center justify-center text-foreground hover:bg-background/90 transition-colors disabled:opacity-30"
                    aria-label="Vidéo précédente"
                  >
                    <ChevronUp className="h-6 w-6" />
                  </button>
                  
                  <button
                    onClick={goToNext}
                    className="h-11 w-11 rounded-full bg-background/70 backdrop-blur-sm border border-border/40 flex items-center justify-center text-foreground hover:bg-background/90 transition-colors"
                    aria-label="Vidéo suivante"
                  >
                    <ChevronDown className="h-6 w-6" />
                  </button>
                </div>

                {/* Bottom gradient - minimal info + mute */}
                <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-background/95 via-background/70 to-transparent">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium text-sm line-clamp-2">{currentVideo.title}</p>
                      <p className="text-muted-foreground text-xs truncate mt-1">{subtitle}</p>
                    </div>

                    <button
                      onClick={() => setIsMuted((v) => !v)}
                      className="h-11 w-11 rounded-full bg-background/70 backdrop-blur-sm border border-border/40 flex items-center justify-center text-foreground hover:bg-background/90 transition-colors flex-shrink-0"
                      aria-label={isMuted ? "Activer le son" : "Couper le son"}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  </div>

                  <p className="text-muted-foreground text-xs text-center mt-3">Scroll pour la vidéo suivante</p>
                </div>
              </section>
            )}
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default YouTubeShortsPanel;
