import { useState, useEffect, useCallback } from "react";
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS, TooltipRenderProps } from "react-joyride";
import { eventBus } from "@/lib/eventBus";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TabType } from "@/pages/TravelPlanner";

interface OnboardingTourProps {
  /** Force-show the tour even if already seen */
  forceShow?: boolean;
  /** Callback when tour ends */
  onComplete?: () => void;
  /** Callback to control panel visibility */
  onPanelVisibilityChange?: (visible: boolean) => void;
  /** Callback to trigger animation after onboarding */
  onRequestAnimation?: () => void;
}

const STORAGE_KEY = "travliaq_onboarding_completed";

// Step configuration with tab and panel requirements
interface StepConfig {
  tab?: TabType;
  panelOpen?: boolean;
}

const STEP_CONFIG: Record<number, StepConfig> = {
  0: { panelOpen: false },  // Welcome - no panel
  1: { panelOpen: false },  // Chat panel - no widget panel
  2: { panelOpen: false },  // Tabs bar explanation - no widget yet
  3: { tab: "flights", panelOpen: true },     // Flights panel
  4: { tab: "stays", panelOpen: true },       // Stays panel  
  5: { tab: "activities", panelOpen: true },  // Activities panel
  6: { tab: "preferences", panelOpen: true }, // Preferences panel
  7: { panelOpen: false },  // Final step - close panel
};

// Step icons for visual enhancement
const STEP_ICONS = ["✈️", "💬", "🛠️", "✈️", "🏨", "🎭", "⚙️", "🚀"];

/**
 * Custom tooltip component with animations
 */
function CustomTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
}: TooltipRenderProps) {
  const isFirst = index === 0;
  const isLast = index === size - 1;
  const icon = STEP_ICONS[index] || "✨";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        {...tooltipProps}
        className="relative max-w-sm bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 animate-pulse pointer-events-none" />
        
        {/* Content container */}
        <div className="relative bg-card/95 backdrop-blur-sm rounded-2xl p-5">
          {/* Header with icon and close button */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-3xl"
              >
                {icon}
              </motion.div>
              {step.title && (
                <motion.h3
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-lg font-bold text-foreground"
                >
                  {step.title}
                </motion.h3>
              )}
            </div>
            <button
              {...closeProps}
              className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-foreground/90 mb-4"
          >
            {step.content}
          </motion.div>

          {/* Progress indicator */}
          <div className="flex items-center gap-1 mb-4">
            {Array.from({ length: size }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-6 bg-primary"
                    : i < index
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">
              {index + 1}/{size}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <button
              {...skipProps}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Passer
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button
                  {...backProps}
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                >
                  <ChevronLeft size={16} />
                  Précédent
                </Button>
              )}
              
              <Button
                {...primaryProps}
                size="sm"
                className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
              >
                {isLast ? (
                  <>
                    <Sparkles size={16} />
                    C'est parti !
                  </>
                ) : (
                  <>
                    Suivant
                    <ChevronRight size={16} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Onboarding tour for the Planner page.
 * Shows only once for new users (tracked in localStorage).
 * Automatically opens the correct tab and panel when focusing on a widget.
 * Blocks initial animations until onboarding is complete.
 */
export default function OnboardingTour({ 
  forceShow = false, 
  onComplete,
  onPanelVisibilityChange,
  onRequestAnimation,
}: OnboardingTourProps) {
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Check if user has already seen the tour
  useEffect(() => {
    if (forceShow) {
      setRunTour(true);
      // Close panel at start
      onPanelVisibilityChange?.(false);
      return;
    }

    const hasSeenTour = localStorage.getItem(STORAGE_KEY) === "true";
    if (!hasSeenTour) {
      // Wait a bit for the page to fully load
      const timer = setTimeout(() => {
        setRunTour(true);
        // Close panel at start of onboarding
        onPanelVisibilityChange?.(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [forceShow, onPanelVisibilityChange]);

  // Configure step: open tab and panel as needed
  const configureStep = useCallback((index: number) => {
    const config = STEP_CONFIG[index];
    if (!config) return;

    // Handle panel visibility
    if (config.panelOpen !== undefined) {
      onPanelVisibilityChange?.(config.panelOpen);
    }

    // Handle tab change (after panel is ready)
    if (config.tab) {
      setTimeout(() => {
        eventBus.emit("tab:change", { tab: config.tab! });
      }, 100);
    }
  }, [onPanelVisibilityChange]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    const goToStep = (nextIndex: number) => {
      configureStep(nextIndex);
      // Give the UI a moment to render the right tab/panel (lazy panels)
      setTimeout(() => setStepIndex(nextIndex), 180);
    };

    // If the target is missing (usually because the panel/tab hasn't rendered yet), retry instead of skipping.
    if (type === EVENTS.TARGET_NOT_FOUND) {
      goToStep(index);
      return;
    }

    // Handle step transitions
    if (type === EVENTS.STEP_AFTER) {
      const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;
      goToStep(nextIndex);
    }

    // Handle tour completion
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      setStepIndex(0);
      localStorage.setItem(STORAGE_KEY, "true");
      
      // Close panel first
      onPanelVisibilityChange?.(false);
      
      // Return to flights tab
      eventBus.emit("tab:change", { tab: "flights" });
      
      // Trigger animation and geolocation after a short delay
      setTimeout(() => {
        onRequestAnimation?.();
      }, 300);
      
      onComplete?.();
    }
  };

  const steps: Step[] = [
    {
      target: "body",
      placement: "center",
      title: "Bienvenue sur Travliaq !",
      content: (
        <div className="space-y-2">
          <p>Planifiez votre voyage de façon simple et fluide.</p>
          <p className="text-muted-foreground text-sm">
            Ce guide vous montre les fonctionnalités principales. Vous pouvez le passer à tout moment.
          </p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '[data-tour="chat-panel"]',
      placement: "right",
      title: "Assistant Intelligent",
      content: (
        <div className="space-y-2">
          <p>Parlez à notre assistant comme à un ami.</p>
          <p className="text-muted-foreground text-sm">
            Dites-lui simplement "Je veux partir à Barcelone en mars" et il s'occupe du reste !
          </p>
        </div>
      ),
      spotlightPadding: 8,
    },
    {
      target: '[data-tour="tabs-bar"]',
      placement: "bottom",
      title: "Vos Outils de Planification",
      content: (
        <div className="space-y-2">
          <p>Utilisez ces onglets pour configurer chaque aspect de votre voyage.</p>
          <p className="text-muted-foreground text-sm">
            Vols → Hébergements → Activités → Préférences. Tout est synchronisé automatiquement !
          </p>
        </div>
      ),
      spotlightPadding: 4,
    },
    {
      target: '[data-tour="flights-widget"]',
      placement: "right",
      title: "Recherche de Vols",
      content: (
        <div className="space-y-2">
          <p>Configurez vos vols ici.</p>
          <p className="text-muted-foreground text-sm">
            Multi-destinations, classes de voyage, bagages... Les dates et destinations se synchronisent avec vos hébergements.
          </p>
        </div>
      ),
      spotlightPadding: 10,
    },
    {
      target: '[data-tour="stays-widget"]',
      placement: "right",
      title: "Hébergements",
      content: (
        <div className="space-y-2">
          <p>Trouvez l'hébergement parfait pour chaque destination.</p>
          <p className="text-muted-foreground text-sm">
            Les dates et villes sont automatiquement reprises de vos vols. Filtrez par confort, équipements et budget.
          </p>
        </div>
      ),
      spotlightPadding: 10,
    },
    {
      target: '[data-tour="activities-widget"]',
      placement: "right",
      title: "Activités",
      content: (
        <div className="space-y-2">
          <p>Planifiez vos activités par destination.</p>
          <p className="text-muted-foreground text-sm">
            Culture, gastronomie, nature... Laissez l'IA vous suggérer les incontournables ou ajoutez les vôtres.
          </p>
        </div>
      ),
      spotlightPadding: 10,
    },
    {
      target: '[data-tour="preferences-widget"]',
      placement: "right",
      title: "Préférences Globales",
      content: (
        <div className="space-y-2">
          <p>Définissez votre style de voyage.</p>
          <p className="text-muted-foreground text-sm">
            Rythme, confort, centres d'intérêt, restrictions alimentaires... Toutes ces préférences affectent les suggestions de l'IA.
          </p>
        </div>
      ),
      spotlightPadding: 10,
    },
    {
      target: "body",
      placement: "center",
      title: "C'est parti !",
      content: (
        <div className="space-y-2">
          <p>Vous êtes prêt à planifier votre prochain voyage.</p>
          <p className="text-muted-foreground text-sm">
            Commencez par dire bonjour à l'assistant ou configurez vos vols directement !
          </p>
        </div>
      ),
    },
  ];

  return (
    <Joyride
      steps={steps}
      run={runTour}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      showSkipButton
      disableOverlayClose
      spotlightClicks={false}
      callback={handleJoyrideCallback}
      tooltipComponent={CustomTooltip}
      floaterProps={{
        styles: {
          floater: {
            filter: "drop-shadow(0 20px 40px rgba(0, 0, 0, 0.3))",
          },
        },
      }}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          zIndex: 10000,
          overlayColor: "rgba(0, 0, 0, 0.75)",
        },
        spotlight: {
          borderRadius: 16,
          boxShadow: "0 0 0 4px hsl(var(--primary) / 0.4), 0 0 30px 10px hsl(var(--primary) / 0.2)",
        },
        overlay: {
          mixBlendMode: "normal" as const,
        },
      }}
    />
  );
}
