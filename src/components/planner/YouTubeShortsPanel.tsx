import { useState, useEffect } from "react";
import { Play, Loader2, X, ExternalLink, RefreshCw, Youtube, Sparkles, ChevronLeft } from "lucide-react";
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
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [query, setQuery] = useState<string>("");

  const fetchShorts = async () => {
    if (!city) return;
    
    setLoading(true);
    setError(null);

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
      setQuery(data.query || "");
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="h-full flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border/50">
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                <h2 className="font-semibold text-foreground">{city}</h2>
              </div>
              {countryName && (
                <p className="text-xs text-muted-foreground">{countryName}</p>
              )}
            </div>
            <button
              onClick={fetchShorts}
              disabled={loading}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto themed-scroll p-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Recherche des vidéos...</p>
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <X className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground">{error}</p>
                <button
                  onClick={fetchShorts}
                  className="text-sm text-primary hover:underline"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!loading && !error && videos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Youtube className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Aucune vidéo trouvée pour {city}
                </p>
              </div>
            )}

            {!loading && !error && videos.length > 0 && (
              <>
                {/* Search info */}
                <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Tendances voyage pour {city}</span>
                </div>

                {/* Video Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {videos.map((video, index) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-muted cursor-pointer"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                      
                      {/* Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="h-5 w-5 text-white ml-0.5" />
                        </div>
                      </div>

                      {/* Title */}
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-white text-xs font-medium line-clamp-2 leading-tight">
                          {video.title}
                        </p>
                        <p className="text-white/60 text-[10px] mt-0.5 truncate">
                          {video.channelTitle}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Video Modal */}
          <AnimatePresence>
            {selectedVideo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
                onClick={() => setSelectedVideo(null)}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="relative w-full max-w-lg aspect-[9/16] rounded-2xl overflow-hidden bg-black"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* YouTube Embed */}
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0`}
                    title={selectedVideo.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />

                  {/* Close Button */}
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Open in YouTube */}
                  <a
                    href={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                  >
                    <Youtube className="h-3.5 w-3.5" />
                    Ouvrir sur YouTube
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default YouTubeShortsPanel;
