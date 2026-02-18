/**
 * ScrollToBottomButton - Floating button to scroll back to bottom
 * Premium futuristic design — centered, compact, glassmorphism
 */

import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ScrollToBottomButtonProps {
  show: boolean;
  newMessageCount: number;
  onClick: () => void;
}

export function ScrollToBottomButton({ show, newMessageCount, onClick }: ScrollToBottomButtonProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="absolute bottom-24 left-0 right-0 flex justify-center z-10 pointer-events-none"
        >
          {/* Pulsing halo */}
          <motion.div
            className="absolute inset-0 flex justify-center items-center pointer-events-none"
            aria-hidden
          >
            <motion.div
              className="w-28 h-9 rounded-full bg-primary/20"
              animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            className="relative pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full overflow-hidden
              bg-primary/90 backdrop-blur-md border border-white/20
              text-primary-foreground shadow-lg shadow-primary/30
              focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {/* Shimmer sweep */}
            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12"
              animate={{ x: ["-110%", "110%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
            />

            <motion.span
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowDown className="h-3.5 w-3.5 relative z-10" />
            </motion.span>

            <span className="relative z-10 text-xs font-semibold tracking-wide whitespace-nowrap">
              {newMessageCount > 0
                ? t(newMessageCount > 1 ? "planner.chat.newMessages" : "planner.chat.newMessage", { count: newMessageCount })
                : t("planner.chat.scrollToBottom")}
            </span>

            {/* New message dot */}
            {newMessageCount > 0 && (
              <motion.span
                className="relative z-10 h-2 w-2 rounded-full bg-destructive flex-shrink-0"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              />
            )}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
