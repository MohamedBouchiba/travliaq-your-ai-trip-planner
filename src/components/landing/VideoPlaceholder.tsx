/**
 * VideoPlaceholder - YouTube video with fullscreen modal, smooth animation, loader, and close button
 */

import { motion, AnimatePresence } from "framer-motion";
import { Play, Sparkles, X, Loader2 } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import videoThumbnail from "@/assets/video-thumbnail-fr.png";

const YOUTUBE_VIDEO_ID = "QKlaAFYbljs";

interface VideoPlaceholderProps {
  className?: string;
}

export function VideoPlaceholder({ className = "" }: VideoPlaceholderProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const openVideo = useCallback(() => {
    setIsLoaded(false);
    setIsOpen(true);
  }, []);

  const closeVideo = useCallback(() => {
    setIsOpen(false);
    setIsLoaded(false);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeVideo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, closeVideo]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      <section className={`py-16 md:py-24 bg-muted/30 ${className}`}>
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>{t("landing.video.badge")}</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-montserrat font-bold text-foreground mb-4">
              {t("landing.video.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing.video.subtitle")}
            </p>
          </motion.div>

          {/* Thumbnail with play button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-secondary group cursor-pointer" onClick={openVideo}>
              <div className="aspect-video relative">
                <img
                  src={videoThumbnail}
                  alt={t("landing.video.altPreview")}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
                    <div className="relative w-20 h-20 md:w-24 md:h-24 bg-primary rounded-full flex items-center justify-center shadow-lg group-hover:bg-primary/90 transition-colors">
                      <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="white" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Decorative blur */}
            <div className="pointer-events-none absolute inset-0 -z-10 scale-110 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 blur-3xl rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={closeVideo}
          >
            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.15 }}
              onClick={closeVideo}
              className="absolute top-4 right-4 md:top-8 md:right-8 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fermer la vidéo"
            >
              <X className="w-6 h-6 text-white" />
            </motion.button>

            {/* Video container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-[95vw] max-w-6xl aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Loader */}
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-secondary">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              )}

              <iframe
                src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&showinfo=0&vq=hd1080`}
                title={t("landing.video.title")}
                className="w-full h-full rounded-2xl"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                onLoad={() => setIsLoaded(true)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default VideoPlaceholder;
