import { useState, useEffect, useCallback, useRef } from "react";
import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";
import { eventBus } from "@/lib/eventBus";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TabType } from "@/pages/TravelPlanner";
import { createRoot } from "react-dom/client";

interface OnboardingTourProps {
  forceShow?: boolean;
  onComplete?: () => void;
  onPanelVisibilityChange?: (visible: boolean) => void;
  onRequestAnimation?: () => void;
}

const STORAGE_KEY = "travliaq_onboarding_completed";

interface StepConfig {
  tab?: TabType;
  panelOpen?: boolean;
}

const STEP_CONFIG: Record<number, StepConfig> = {
  0: { panelOpen: false },
  1: { panelOpen: false },
  2: { panelOpen: false },
  3: { panelOpen: false },
  4: { tab: "flights", panelOpen: true },
  5: { tab: "stays", panelOpen: true },
  6: { tab: "activities", panelOpen: true },
  7: { tab: "preferences", panelOpen: true },
  8: { panelOpen: false },
};

const STEP_ICONS = ["✨", "💬", "🛠️", "🗺️", "✈️", "🏨", "🎭", "⚙️", "🚀"];

interface TooltipProps {
  step: DriveStep;
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

function CustomTooltip({ step, currentStep, totalSteps, onPrev, onNext, onClose }: TooltipProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const icon = STEP_ICONS[currentStep] || "✨";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden w-[min(420px,calc(100vw-32px))]"
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
              {step.popover?.title && (
                <motion.h3
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 }}
                  className="text-lg font-bold text-foreground"
                >
                  {step.popover.title}
                </motion.h3>
              )}
            </div>
            <button
              onClick={onClose}
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
            dangerouslySetInnerHTML={{ __html: step.popover?.description || "" }}
          />

          {/* Progress indicator */}
          <div className="flex items-center gap-1 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.18 + i * 0.04 }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-6 bg-primary"
                    : i < currentStep
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-muted"
                }`}
              />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">
              {currentStep + 1}/{totalSteps}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Passer
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button onClick={onPrev} variant="ghost" size="sm" className="gap-1">
                  <ChevronLeft size={16} />
                  Précédent
                </Button>
              )}

              <Button
                onClick={onNext}
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

// Inject custom CSS for Driver.js
function injectDriverStyles() {
  if (document.getElementById("driver-custom-styles")) return;
  
  const style = document.createElement("style");
  style.id = "driver-custom-styles";
  style.textContent = `
    /* Override Driver.js default styles */
    .driver-overlay {
      background: rgba(0, 0, 0, 0.85) !important;
    }
    
    /* Custom spotlight with pulsing border */
    .driver-active-element {
      position: relative !important;
      z-index: 10001 !important;
    }
    
    /* Pulsing highlight ring */
    .driver-active-element::before {
      content: '' !important;
      position: absolute !important;
      inset: -8px !important;
      border-radius: 16px !important;
      pointer-events: none !important;
      z-index: 10000 !important;
      animation: travliaq-pulse 2s ease-in-out infinite !important;
      box-shadow: 
        0 0 0 4px hsl(174, 72%, 51%),
        0 0 30px 10px hsla(174, 72%, 51%, 0.4),
        0 0 60px 20px hsla(174, 72%, 51%, 0.2) !important;
    }
    
    /* Inner glow effect */
    .driver-active-element::after {
      content: '' !important;
      position: absolute !important;
      inset: 0 !important;
      border-radius: 12px !important;
      pointer-events: none !important;
      z-index: 10000 !important;
      box-shadow: inset 0 0 40px 10px hsla(174, 72%, 51%, 0.15) !important;
    }
    
    @keyframes travliaq-pulse {
      0%, 100% {
        box-shadow: 
          0 0 0 4px hsl(174, 72%, 51%),
          0 0 30px 10px hsla(174, 72%, 51%, 0.4),
          0 0 60px 20px hsla(174, 72%, 51%, 0.2);
        transform: scale(1);
      }
      50% {
        box-shadow: 
          0 0 0 6px hsl(174, 72%, 51%),
          0 0 50px 20px hsla(174, 72%, 51%, 0.5),
          0 0 80px 30px hsla(174, 72%, 51%, 0.3);
        transform: scale(1.02);
      }
    }
    
    /* Hide default popover - we render our own */
    .driver-popover {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      max-width: none !important;
    }
    
    .driver-popover-arrow {
      display: none !important;
    }
    
    .driver-popover-title,
    .driver-popover-description,
    .driver-popover-footer {
      display: none !important;
    }
    
    /* Custom popover container */
    .driver-popover-custom {
      position: relative;
      z-index: 10002;
    }
  `;
  document.head.appendChild(style);
}

export default function OnboardingTour({
  forceShow = false,
  onComplete,
  onPanelVisibilityChange,
  onRequestAnimation,
}: OnboardingTourProps) {
  const [isRunning, setIsRunning] = useState(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const currentStepRef = useRef(0);
  const tooltipRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const tooltipContainerRef = useRef<HTMLDivElement | null>(null);

  // Configure step: open tab and panel as needed
  const configureStep = useCallback(
    (index: number) => {
      const config = STEP_CONFIG[index];
      if (!config) return;

      if (config.panelOpen !== undefined) {
        onPanelVisibilityChange?.(config.panelOpen);
      }

      if (config.tab) {
        setTimeout(() => {
          eventBus.emit("tab:change", { tab: config.tab! });
        }, 100);
      }
    },
    [onPanelVisibilityChange]
  );

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    localStorage.setItem(STORAGE_KEY, "true");
    onPanelVisibilityChange?.(false);
    eventBus.emit("tab:change", { tab: "flights" });
    
    setTimeout(() => {
      onRequestAnimation?.();
    }, 300);
    
    onComplete?.();
    
    // Cleanup tooltip
    if (tooltipRootRef.current) {
      tooltipRootRef.current.unmount();
      tooltipRootRef.current = null;
    }
    if (tooltipContainerRef.current) {
      tooltipContainerRef.current.remove();
      tooltipContainerRef.current = null;
    }
  }, [onComplete, onPanelVisibilityChange, onRequestAnimation]);

  const steps: DriveStep[] = [
    {
      element: "body",
      popover: {
        title: "Bienvenue sur Travliaq !",
        description: `
          <div class="space-y-2">
            <p>Planifiez votre voyage de façon simple et fluide.</p>
            <p class="text-muted-foreground text-sm">
              Ce guide vous montre les fonctionnalités principales. Vous pouvez le passer à tout moment.
            </p>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="chat-panel"]',
      popover: {
        title: "💬 Votre Assistant IA",
        description: `
          <div class="space-y-3">
            <p class="font-medium text-foreground">
              <span class="text-primary">Zone surlignée</span> : le chat intelligent
            </p>
            <p>
              Parlez naturellement à l'assistant : <em>"Je veux partir à Barcelone en mars"</em>
            </p>
            <ul class="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Demandez des recommandations de destinations</li>
              <li>Configurez votre voyage par la conversation</li>
              <li>L'IA synchronise tout automatiquement</li>
            </ul>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="tabs-bar"]',
      popover: {
        title: "🛠️ Barre d'Outils",
        description: `
          <div class="space-y-3">
            <p class="font-medium text-foreground">
              <span class="text-primary">Zone surlignée</span> : les onglets de navigation
            </p>
            <p>Accédez rapidement à chaque aspect de votre voyage :</p>
            <div class="grid grid-cols-2 gap-2 text-sm mt-2">
              <div class="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
                <span>✈️</span> <span>Vols</span>
              </div>
              <div class="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
                <span>🏨</span> <span>Hébergements</span>
              </div>
              <div class="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
                <span>🎭</span> <span>Activités</span>
              </div>
              <div class="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
                <span>⚙️</span> <span>Préférences</span>
              </div>
            </div>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="map-area"]',
      popover: {
        title: "🗺️ Carte Interactive",
        description: `
          <div class="space-y-3">
            <p class="font-medium text-foreground">
              <span class="text-primary">Zone surlignée</span> : la carte du monde
            </p>
            <p>Visualisez votre voyage en temps réel :</p>
            <ul class="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Cliquez sur une ville pour voir les prix</li>
              <li>Les itinéraires s'affichent automatiquement</li>
              <li>Zoomez pour découvrir plus d'options</li>
            </ul>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="flights-widget"]',
      popover: {
        title: "✈️ Widget Vols",
        description: `
          <div class="space-y-3">
            <p class="font-medium text-foreground">
              <span class="text-primary">Zone surlignée</span> : le panneau de recherche de vols
            </p>
            <p>Configurez tous les détails de vos vols :</p>
            <ul class="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Type de trajet</strong> : aller-simple, aller-retour, multi-destinations</li>
              <li><strong>Villes</strong> : départ et destination</li>
              <li><strong>Dates</strong> : calendrier interactif</li>
              <li><strong>Voyageurs</strong> : adultes, enfants, bagages</li>
            </ul>
            <p class="text-xs text-primary/80 mt-2">
              💡 Les données se synchronisent avec l'assistant et les autres widgets
            </p>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="stays-widget"]',
      popover: {
        title: "🏨 Widget Hébergements",
        description: `
          <div class="space-y-3">
            <p class="font-medium text-foreground">
              <span class="text-primary">Zone surlignée</span> : le panneau de recherche d'hébergements
            </p>
            <p>Trouvez le logement idéal :</p>
            <ul class="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Destination</strong> : synchronisée avec vos vols</li>
              <li><strong>Budget</strong> : définissez votre fourchette de prix</li>
              <li><strong>Type</strong> : hôtel, appartement, villa...</li>
              <li><strong>Équipements</strong> : wifi, piscine, parking...</li>
            </ul>
            <p class="text-xs text-primary/80 mt-2">
              💡 Les dates et voyageurs sont pré-remplis depuis vos vols
            </p>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="activities-widget"]',
      popover: {
        title: "🎭 Widget Activités",
        description: `
          <div class="space-y-3">
            <p class="font-medium text-foreground">
              <span class="text-primary">Zone surlignée</span> : le panneau de recherche d'activités
            </p>
            <p>Découvrez que faire sur place :</p>
            <ul class="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Catégories</strong> : culture, nature, gastronomie...</li>
              <li><strong>Filtres</strong> : prix, durée, accessibilité</li>
              <li><strong>Recherche</strong> : par ville ou directement sur la carte</li>
            </ul>
            <p class="text-xs text-primary/80 mt-2">
              💡 Les activités s'affichent comme pins sur la carte
            </p>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="preferences-widget"]',
      popover: {
        title: "⚙️ Widget Préférences",
        description: `
          <div class="space-y-3">
            <p class="font-medium text-foreground">
              <span class="text-primary">Zone surlignée</span> : vos préférences de voyage
            </p>
            <p>Personnalisez votre expérience :</p>
            <ul class="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Rythme</strong> : intensif, équilibré, détendu</li>
              <li><strong>Confort</strong> : budget, standard, luxe</li>
              <li><strong>Centres d'intérêt</strong> : ce qui vous passionne</li>
              <li><strong>Restrictions</strong> : alimentaires, accessibilité</li>
            </ul>
            <p class="text-xs text-primary/80 mt-2">
              💡 Ces préférences influencent les suggestions de l'IA
            </p>
          </div>
        `,
      },
    },
    {
      element: "body",
      popover: {
        title: "🚀 C'est parti !",
        description: `
          <div class="space-y-3">
            <p class="font-medium">Vous êtes prêt à planifier votre prochain voyage.</p>
            <div class="bg-primary/10 rounded-lg p-3 text-sm">
              <p class="font-medium text-primary mb-1">Commencez par :</p>
              <ul class="text-muted-foreground space-y-1 list-disc list-inside">
                <li>Dire bonjour à l'assistant 💬</li>
                <li>Ou configurer vos vols directement ✈️</li>
              </ul>
            </div>
            <p class="text-xs text-muted-foreground">
              Vous pouvez relancer ce guide à tout moment depuis les paramètres.
            </p>
          </div>
        `,
      },
    },
  ];

  // Render custom tooltip
  const renderTooltip = useCallback((step: DriveStep, currentStep: number) => {
    // Create container if it doesn't exist
    if (!tooltipContainerRef.current) {
      tooltipContainerRef.current = document.createElement("div");
      tooltipContainerRef.current.className = "driver-popover-custom";
      document.body.appendChild(tooltipContainerRef.current);
    }

    // Create root if it doesn't exist
    if (!tooltipRootRef.current) {
      tooltipRootRef.current = createRoot(tooltipContainerRef.current);
    }

    // Position the tooltip in the center of the screen
    tooltipContainerRef.current.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 100000;
    `;

    tooltipRootRef.current.render(
      <CustomTooltip
        step={step}
        currentStep={currentStep}
        totalSteps={steps.length}
        onPrev={() => {
          if (driverRef.current && currentStep > 0) {
            currentStepRef.current = currentStep - 1;
            configureStep(currentStepRef.current);
            setTimeout(() => {
              driverRef.current?.movePrevious();
            }, 300);
          }
        }}
        onNext={() => {
          if (driverRef.current) {
            if (currentStep === steps.length - 1) {
              driverRef.current.destroy();
              handleComplete();
            } else {
              currentStepRef.current = currentStep + 1;
              configureStep(currentStepRef.current);
              setTimeout(() => {
                driverRef.current?.moveNext();
              }, 300);
            }
          }
        }}
        onClose={() => {
          driverRef.current?.destroy();
          handleComplete();
        }}
      />
    );
  }, [steps.length, configureStep, handleComplete]);

  // Initialize driver
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(STORAGE_KEY) === "true";
    
    if (forceShow || !hasSeenTour) {
      const timer = setTimeout(() => {
        injectDriverStyles();
        setIsRunning(true);
        onPanelVisibilityChange?.(false);
        
        const driverConfig: Config = {
          showButtons: [],
          showProgress: false,
          allowClose: false,
          overlayOpacity: 0.85,
          stagePadding: 12,
          stageRadius: 16,
          animate: true,
          smoothScroll: false,
          disableActiveInteraction: true,
          steps: steps.map((step, index) => ({
            ...step,
            onHighlightStarted: () => {
              currentStepRef.current = index;
              renderTooltip(step, index);
            },
            onHighlighted: () => {
              // Re-render tooltip when highlight animation completes
              renderTooltip(step, index);
            },
          })),
          onDestroyed: () => {
            handleComplete();
          },
        };

        driverRef.current = driver(driverConfig);
        configureStep(0);
        
        setTimeout(() => {
          driverRef.current?.drive();
        }, 100);
      }, forceShow ? 0 : 800);

      return () => clearTimeout(timer);
    }
  }, [forceShow, onPanelVisibilityChange, renderTooltip, configureStep, handleComplete, steps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
      if (tooltipRootRef.current) {
        tooltipRootRef.current.unmount();
      }
      if (tooltipContainerRef.current) {
        tooltipContainerRef.current.remove();
      }
    };
  }, []);

  return null;
}
