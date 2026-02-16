/**
 * SmartSuggestions - Ultra-contextual message recommendations
 * 
 * Displays smart suggestion chips above the chat input based on:
 * - Dynamic suggestions from AI responses (prioritized when present)
 * - Current workflow step (inspiration, destination, dates, travelers, search)
 * - Active tab and visible content on the map
 * - User preferences and trip data
 */

import { useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Sun, 
  Building2, 
  Calendar, 
  Zap, 
  User, 
  Users, 
  Plane, 
  Scale, 
  Sunrise, 
  Star, 
  MapPin, 
  Camera, 
  Compass, 
  Utensils,
  Search,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getSuggestions, type SuggestionContext, type Suggestion } from "./services/suggestionEngine";

// Dynamic suggestion interface (from AI response)
export interface DynamicSuggestion {
  id: string;
  label: string;
  emoji: string;
  message: string;
}

// Icon mapping for static suggestions
const iconMap: Record<Suggestion['iconName'], React.ReactNode> = {
  sparkles: <Sparkles className="h-3.5 w-3.5" />,
  sun: <Sun className="h-3.5 w-3.5" />,
  building: <Building2 className="h-3.5 w-3.5" />,
  calendar: <Calendar className="h-3.5 w-3.5" />,
  zap: <Zap className="h-3.5 w-3.5" />,
  user: <User className="h-3.5 w-3.5" />,
  users: <Users className="h-3.5 w-3.5" />,
  plane: <Plane className="h-3.5 w-3.5" />,
  scale: <Scale className="h-3.5 w-3.5" />,
  sunrise: <Sunrise className="h-3.5 w-3.5" />,
  star: <Star className="h-3.5 w-3.5" />,
  'map-pin': <MapPin className="h-3.5 w-3.5" />,
  camera: <Camera className="h-3.5 w-3.5" />,
  compass: <Compass className="h-3.5 w-3.5" />,
  utensils: <Utensils className="h-3.5 w-3.5" />,
  search: <Search className="h-3.5 w-3.5" />,
  clock: <Clock className="h-3.5 w-3.5" />,
};

interface SmartSuggestionsProps {
  context: SuggestionContext;
  dynamicSuggestions?: DynamicSuggestion[];
  onSuggestionClick: (message: string) => void;
  isLoading?: boolean;
}

export function SmartSuggestions({
  context,
  dynamicSuggestions = [],
  onSuggestionClick,
  isLoading = false
}: SmartSuggestionsProps) {
  const { t } = useTranslation();
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Prioritize dynamic suggestions from AI, fallback to static ones
  const displayItems = useMemo(() => {
    if (dynamicSuggestions.length > 0) {
      return dynamicSuggestions.map((s, i) => ({
        id: s.id || `dynamic-${i}`,
        label: s.label,
        emoji: s.emoji || "✈️",
        message: s.message,
        isDynamic: true,
      }));
    }

    // Fallback to static context-based suggestions
    const staticSuggestions = getSuggestions(context);
    return staticSuggestions.map(s => ({
      id: s.id,
      label: s.label,
      emoji: null,
      iconName: s.iconName,
      message: s.message,
      isDynamic: false,
    }));
  }, [context, dynamicSuggestions]);

  // AC6: Arrow-key navigation between suggestion chips
  const handleToolbarKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const buttons = toolbarRef.current?.querySelectorAll<HTMLButtonElement>("button");
    if (!buttons?.length) return;
    const idx = Array.from(buttons).indexOf(e.target as HTMLButtonElement);
    if (idx < 0) return;
    e.preventDefault();
    const next = e.key === "ArrowRight"
      ? buttons[(idx + 1) % buttons.length]
      : buttons[(idx - 1 + buttons.length) % buttons.length];
    next.focus();
  }, []);

  if (displayItems.length === 0 || isLoading) {
    return null;
  }

  // Handle horizontal scroll with mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  return (
    <div className="px-4 py-2">
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label={t("planner.chat.suggestions")}
        onKeyDown={handleToolbarKeyDown}
        onWheel={handleWheel}
        className="flex gap-2 overflow-x-auto pb-1 themed-scroll"
        style={{ scrollbarWidth: 'thin' }}
      >
        <AnimatePresence mode="popLayout">
          {displayItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.04, duration: 0.15 }}
              onClick={() => onSuggestionClick(item.message)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0",
                "text-xs font-medium whitespace-nowrap",
                "bg-primary/10 text-primary hover:bg-primary/20",
                "border border-primary/20 hover:border-primary/40",
                "transition-all duration-150 hover:scale-[1.02]",
                "focus:outline-none focus:ring-2 focus:ring-primary/30"
              )}
            >
              {/* Emoji for dynamic/anticipated suggestions, icon for static */}
              {item.isDynamic ? (
                <span className="text-sm">{item.emoji}</span>
              ) : item.emoji ? (
                <span className="text-sm">{item.emoji}</span>
              ) : (
                item.iconName && iconMap[item.iconName as keyof typeof iconMap]
              )}
              <span>{item.label}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Re-export types for convenience
export type { SuggestionContext } from "./services/suggestionEngine";
