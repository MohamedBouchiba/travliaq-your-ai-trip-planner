import { useState, useEffect, useCallback } from "react";
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from "react-joyride";
import { eventBus } from "@/lib/eventBus";
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

    // Handle step transitions
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Navigate to next/previous step
      const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;
      setStepIndex(nextIndex);
      configureStep(nextIndex);
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
      title: "Bienvenue sur Travliaq ! ✈️",
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
      title: "Assistant Intelligent 💬",
      content: (
        <div className="space-y-2">
          <p>Parlez à notre assistant comme à un ami.</p>
          <p className="text-muted-foreground text-sm">
            Dites-lui simplement "Je veux partir à Barcelone en mars" et il s'occupe du reste !
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="tabs-bar"]',
      placement: "bottom",
      title: "Vos Outils de Planification 🛠️",
      content: (
        <div className="space-y-2">
          <p>Utilisez ces onglets pour configurer chaque aspect de votre voyage.</p>
          <p className="text-muted-foreground text-sm">
            Vols → Hébergements → Activités → Préférences. Tout est synchronisé automatiquement !
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="flights-panel"]',
      placement: "right",
      title: "1. Recherche de Vols ✈️",
      content: (
        <div className="space-y-2">
          <p>Configurez vos vols ici.</p>
          <p className="text-muted-foreground text-sm">
            Multi-destinations, classes de voyage, bagages... Les dates et destinations se synchronisent avec vos hébergements.
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="flights-panel"]',
      placement: "right",
      title: "2. Hébergements 🏨",
      content: (
        <div className="space-y-2">
          <p>Trouvez l'hébergement parfait pour chaque destination.</p>
          <p className="text-muted-foreground text-sm">
            Les dates et villes sont automatiquement reprises de vos vols. Filtrez par confort, équipements et budget.
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="flights-panel"]',
      placement: "right",
      title: "3. Activités 🎭",
      content: (
        <div className="space-y-2">
          <p>Planifiez vos activités par destination.</p>
          <p className="text-muted-foreground text-sm">
            Culture, gastronomie, nature... Laissez l'IA vous suggérer les incontournables ou ajoutez les vôtres.
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="flights-panel"]',
      placement: "right",
      title: "4. Préférences Globales ⚙️",
      content: (
        <div className="space-y-2">
          <p>Définissez votre style de voyage.</p>
          <p className="text-muted-foreground text-sm">
            Rythme, confort, centres d'intérêt, restrictions alimentaires... Toutes ces préférences affectent les suggestions de l'IA.
          </p>
        </div>
      ),
    },
    {
      target: "body",
      placement: "center",
      title: "C'est parti ! 🚀",
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
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        back: "Précédent",
        close: "Fermer",
        last: "Terminer",
        next: "Suivant",
        skip: "Passer",
      }}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          zIndex: 10000,
          arrowColor: "hsl(var(--card))",
          backgroundColor: "hsl(var(--card))",
          textColor: "hsl(var(--foreground))",
        },
        tooltip: {
          borderRadius: 16,
          padding: 20,
        },
        buttonNext: {
          borderRadius: 12,
          padding: "10px 20px",
          fontWeight: 600,
        },
        buttonBack: {
          borderRadius: 12,
          marginRight: 8,
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
    />
  );
}
