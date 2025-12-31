import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

interface OnboardingTourProps {
  /** Force-show the tour even if already seen */
  forceShow?: boolean;
  /** Callback when tour ends */
  onComplete?: () => void;
}

const STORAGE_KEY = "travliaq_onboarding_completed";

/**
 * Onboarding tour for the Planner page.
 * Shows only once for new users (tracked in localStorage).
 */
export default function OnboardingTour({ forceShow = false, onComplete }: OnboardingTourProps) {
  const [runTour, setRunTour] = useState(false);

  // Check if user has already seen the tour
  useEffect(() => {
    if (forceShow) {
      setRunTour(true);
      return;
    }

    const hasSeenTour = localStorage.getItem(STORAGE_KEY) === "true";
    if (!hasSeenTour) {
      // Wait a bit for the page to fully load
      const timer = setTimeout(() => setRunTour(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      localStorage.setItem(STORAGE_KEY, "true");
      onComplete?.();
    }
  };

  const steps: Step[] = [
    {
      target: "body", // Centered welcome step
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
      target: '[data-tour="map-area"]',
      placement: "left",
      title: "Carte Interactive 🗺️",
      content: (
        <div className="space-y-2">
          <p>Visualisez vos destinations en un coup d'œil.</p>
          <p className="text-muted-foreground text-sm">
            Cliquez sur les pays pour explorer les villes et voir les trajets de vol.
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
          <p>Passez d'un onglet à l'autre pour configurer chaque aspect de votre voyage.</p>
          <p className="text-muted-foreground text-sm">
            Vols, activités, hébergements - tout est synchronisé automatiquement !
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="flights-panel"]',
      placement: "auto",
      title: "Recherche de Vols ✈️",
      content: (
        <div className="space-y-2">
          <p>Configurez vos recherches de vols avec tous les détails.</p>
          <p className="text-muted-foreground text-sm">
            Multi-destinations, classes de voyage, bagages... tout est personnalisable.
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
            Commencez par dire bonjour à l'assistant ou explorez la carte !
          </p>
        </div>
      ),
    },
  ];

  return (
    <Joyride
      steps={steps}
      run={runTour}
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
