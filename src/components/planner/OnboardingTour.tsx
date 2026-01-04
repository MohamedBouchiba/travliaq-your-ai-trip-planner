import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties } from "react";
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
  0: { panelOpen: false }, // Welcome - no panel
  1: { panelOpen: false }, // Chat panel - no widget panel
  2: { panelOpen: false }, // Tabs bar explanation
  3: { panelOpen: false }, // Map
  4: { tab: "flights", panelOpen: true }, // Flights widget
  5: { tab: "stays", panelOpen: true }, // Stays widget
  6: { tab: "activities", panelOpen: true }, // Activities widget
  7: { tab: "preferences", panelOpen: true }, // Preferences widget
  8: { panelOpen: false }, // Final step - close panel
};

// Step icons for visual enhancement
const STEP_ICONS = ["✨", "💬", "🛠️", "🗺️", "✈️", "🏨", "🎭", "⚙️", "🚀"];

function getHorizonTopForTarget(target: Step["target"]): string {
  // Keep the tooltip around the "horizon" (mid-screen) and away from the highlighted element.
  if (!target || target === "body") return "50%";

  try {
    const el = document.querySelector(String(target));
    if (!el) return "52%";

    const rect = el.getBoundingClientRect();
    const targetMid = rect.top + rect.height / 2;
    const screenMid = window.innerHeight / 2;

    // If target is above mid-screen, place tooltip slightly below the horizon, and vice-versa.
    return targetMid < screenMid ? "60%" : "40%";
  } catch {
    return "52%";
  }
}

/**
 * Custom tooltip component with animations.
 * We override Joyride's positioning to avoid top/bottom placements and reduce overlap glitches.
 */
function CustomTooltip({
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

  const top = useMemo(() => getHorizonTopForTarget(step.target), [step.target]);

  // Important: keep it fixed so it never "pushes" layout (Mapbox is sensitive to layout shifts).
  const fixedStyle: CSSProperties = {
    position: "fixed",
    top,
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(420px, calc(100vw - 32px))",
    maxWidth: "420px",
    zIndex: 10000,
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        {...tooltipProps}
        style={fixedStyle}
        className="relative bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
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
                transition={{ delay: 0.12, type: "spring", stiffness: 220 }}
                className="text-3xl"
              >
                {icon}
              </motion.div>
              {step.title && (
                <motion.h3
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 }}
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
            transition={{ delay: 0.1 }}
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
                transition={{ delay: 0.18 + i * 0.04 }}
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
                <Button {...backProps} variant="ghost" size="sm" className="gap-1">
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
  const targetRetryRef = useRef(0);

  // Add spotlight animation style
  useEffect(() => {
    if (!document.getElementById("spotlight-animation-style")) {
      const style = document.createElement("style");
      style.id = "spotlight-animation-style";
      style.textContent = `
        @keyframes spotlight-pulse {
          0%, 100% {
            box-shadow: 
              0 0 0 4px hsl(var(--primary)),
              0 0 0 8px hsl(var(--primary) / 0.5),
              0 0 60px 20px hsl(var(--primary) / 0.3),
              inset 0 0 30px 10px hsl(var(--primary) / 0.1);
          }
          50% {
            box-shadow: 
              0 0 0 4px hsl(var(--primary)),
              0 0 0 12px hsl(var(--primary) / 0.4),
              0 0 80px 30px hsl(var(--primary) / 0.4),
              inset 0 0 40px 15px hsl(var(--primary) / 0.15);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

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
  const configureStep = useCallback(
    (index: number) => {
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
    },
    [onPanelVisibilityChange]
  );

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    const goToStep = (nextIndex: number) => {
      targetRetryRef.current = 0;
      configureStep(nextIndex);
      // Give the UI a moment to render the right tab/panel (lazy panels)
      setTimeout(() => setStepIndex(nextIndex), 320);
    };

    // If the target is missing, retry a few times (render/lazy-load), then only as a last resort move on.
    if (type === EVENTS.TARGET_NOT_FOUND) {
      targetRetryRef.current += 1;
      if (targetRetryRef.current <= 8) {
        configureStep(index);
        setTimeout(() => setStepIndex(index), 380);
        return;
      }
      // last resort: continue instead of freezing
      const fallbackNext = action === ACTIONS.PREV ? index - 1 : index + 1;
      goToStep(fallbackNext);
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
      title: "💬 Votre Assistant IA",
      content: (
        <div className="space-y-3">
          <p className="font-medium text-foreground">
            <span className="text-primary">Zone surlignée</span> : le chat intelligent
          </p>
          <p>
            Parlez naturellement à l'assistant : <em>"Je veux partir à Barcelone en mars"</em>
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Demandez des recommandations de destinations</li>
            <li>Configurez votre voyage par la conversation</li>
            <li>L'IA synchronise tout automatiquement</li>
          </ul>
        </div>
      ),
      spotlightPadding: 8,
    },
    {
      target: '[data-tour="tabs-bar"]',
      placement: "bottom",
      title: "🛠️ Barre d'Outils",
      content: (
        <div className="space-y-3">
          <p className="font-medium text-foreground">
            <span className="text-primary">Zone surlignée</span> : les onglets de navigation
          </p>
          <p>Accédez rapidement à chaque aspect de votre voyage :</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
              <span>✈️</span> <span>Vols</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
              <span>🏨</span> <span>Hébergements</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
              <span>🎭</span> <span>Activités</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
              <span>⚙️</span> <span>Préférences</span>
            </div>
          </div>
        </div>
      ),
      spotlightPadding: 12,
    },
    {
      target: '[data-tour="map-area"]',
      placement: "left",
      title: "🗺️ Carte Interactive",
      content: (
        <div className="space-y-3">
          <p className="font-medium text-foreground">
            <span className="text-primary">Zone surlignée</span> : la carte du monde
          </p>
          <p>Visualisez votre voyage en temps réel :</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Cliquez sur une ville pour voir les prix</li>
            <li>Les itinéraires s'affichent automatiquement</li>
            <li>Zoomez pour découvrir plus d'options</li>
          </ul>
        </div>
      ),
      spotlightPadding: 0,
    },
    {
      target: '[data-tour="flights-widget"]',
      placement: "right",
      title: "✈️ Widget Vols",
      content: (
        <div className="space-y-3">
          <p className="font-medium text-foreground">
            <span className="text-primary">Zone surlignée</span> : le panneau de recherche de vols
          </p>
          <p>Configurez tous les détails de vos vols :</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Type de trajet</strong> : aller-simple, aller-retour, multi-destinations</li>
            <li><strong>Villes</strong> : départ et destination</li>
            <li><strong>Dates</strong> : calendrier interactif</li>
            <li><strong>Voyageurs</strong> : adultes, enfants, bagages</li>
          </ul>
          <p className="text-xs text-primary/80 mt-2">
            💡 Les données se synchronisent avec l'assistant et les autres widgets
          </p>
        </div>
      ),
      spotlightPadding: 12,
    },
    {
      target: '[data-tour="stays-widget"]',
      placement: "right",
      title: "🏨 Widget Hébergements",
      content: (
        <div className="space-y-3">
          <p className="font-medium text-foreground">
            <span className="text-primary">Zone surlignée</span> : le panneau de recherche d'hébergements
          </p>
          <p>Trouvez le logement idéal :</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Destination</strong> : synchronisée avec vos vols</li>
            <li><strong>Budget</strong> : définissez votre fourchette de prix</li>
            <li><strong>Type</strong> : hôtel, appartement, villa...</li>
            <li><strong>Équipements</strong> : wifi, piscine, parking...</li>
          </ul>
          <p className="text-xs text-primary/80 mt-2">
            💡 Les dates et voyageurs sont pré-remplis depuis vos vols
          </p>
        </div>
      ),
      spotlightPadding: 12,
    },
    {
      target: '[data-tour="activities-widget"]',
      placement: "right",
      title: "🎭 Widget Activités",
      content: (
        <div className="space-y-3">
          <p className="font-medium text-foreground">
            <span className="text-primary">Zone surlignée</span> : le panneau de recherche d'activités
          </p>
          <p>Découvrez que faire sur place :</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Catégories</strong> : culture, nature, gastronomie...</li>
            <li><strong>Filtres</strong> : prix, durée, accessibilité</li>
            <li><strong>Recherche</strong> : par ville ou directement sur la carte</li>
          </ul>
          <p className="text-xs text-primary/80 mt-2">
            💡 Les activités s'affichent comme pins sur la carte
          </p>
        </div>
      ),
      spotlightPadding: 12,
    },
    {
      target: '[data-tour="preferences-widget"]',
      placement: "right",
      title: "⚙️ Widget Préférences",
      content: (
        <div className="space-y-3">
          <p className="font-medium text-foreground">
            <span className="text-primary">Zone surlignée</span> : vos préférences de voyage
          </p>
          <p>Personnalisez votre expérience :</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Rythme</strong> : intensif, équilibré, détendu</li>
            <li><strong>Confort</strong> : budget, standard, luxe</li>
            <li><strong>Centres d'intérêt</strong> : ce qui vous passionne</li>
            <li><strong>Restrictions</strong> : alimentaires, accessibilité</li>
          </ul>
          <p className="text-xs text-primary/80 mt-2">
            💡 Ces préférences influencent les suggestions de l'IA
          </p>
        </div>
      ),
      spotlightPadding: 12,
    },
    {
      target: "body",
      placement: "center",
      title: "🚀 C'est parti !",
      content: (
        <div className="space-y-3">
          <p className="font-medium">Vous êtes prêt à planifier votre prochain voyage.</p>
          <div className="bg-primary/10 rounded-lg p-3 text-sm">
            <p className="font-medium text-primary mb-1">Commencez par :</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>Dire bonjour à l'assistant 💬</li>
              <li>Ou configurer vos vols directement ✈️</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            Vous pouvez relancer ce guide à tout moment depuis les paramètres.
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
      scrollToFirstStep={false}
      disableScrolling
      disableScrollParentFix
      showSkipButton
      disableOverlayClose
      spotlightClicks={false}
      callback={handleJoyrideCallback}
      tooltipComponent={CustomTooltip}
      floaterProps={{
        disableAnimation: false,
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
          overlayColor: "rgba(0, 0, 0, 0.85)",
        },
        spotlight: {
          borderRadius: 16,
          backgroundColor: "transparent",
          // Enhanced glow effect with animated border
          boxShadow: `
            0 0 0 4px hsl(var(--primary)),
            0 0 0 8px hsl(var(--primary) / 0.5),
            0 0 60px 20px hsl(var(--primary) / 0.3),
            inset 0 0 30px 10px hsl(var(--primary) / 0.1)
          `,
          animation: "spotlight-pulse 2s ease-in-out infinite",
        },
        overlay: {
          mixBlendMode: "normal" as const,
          position: "fixed" as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
      }}
    />
  );
}
