/**
 * VideoPlaceholder - Section with video placeholder (currently shows planner screenshot)
 * No autoplay, nice animation on scroll
 */

import { motion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const YOUTUBE_VIDEO_ID = "QKlaAFYbljs";
const THUMBNAIL_URL = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`;

interface VideoPlaceholderProps {
  className?: string;
}

export function VideoPlaceholder({ className = "" }: VideoPlaceholderProps) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);

  return (
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

        {/* Video Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-secondary group">
            {/* Aspect ratio container for 16:9 video */}
            <div className="aspect-video relative">
              {!isPlaying ? (
                <>
                  <img
                    src={THUMBNAIL_URL}
                    alt={t("landing.video.altPreview")}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <motion.button
                    data-video-play
                    onClick={() => setIsPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
                      <div className="relative w-20 h-20 md:w-24 md:h-24 bg-primary rounded-full flex items-center justify-center shadow-lg group-hover:bg-primary/90 transition-colors">
                        <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="white" />
                      </div>
                    </div>
                  </motion.button>
                </>
              ) : (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
                  title={t("landing.video.title")}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  loading="lazy"
                />
              )}
            </div>
          </div>

          {/* Decorative elements (kept inside bounds to avoid horizontal scroll) */}
          <div className="pointer-events-none absolute inset-0 -z-10 scale-110 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 blur-3xl rounded-full" />
        </motion.div>
      </div>
    </section>
  );
}

export default VideoPlaceholder;
