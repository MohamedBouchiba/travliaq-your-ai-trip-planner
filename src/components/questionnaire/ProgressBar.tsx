import { useTranslation } from "react-i18next";
import { Users, MapPin, Calendar, Wallet, Plane, Heart, Bed, CheckCircle2, Compass } from "lucide-react";

interface Milestone {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  stepRange: [number, number];
}

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
  answers?: any;
}

export const ProgressBar = ({ currentStep, totalSteps, progress, answers = {} }: ProgressBarProps) => {
  const { t } = useTranslation();

  // Calculer dynamiquement les phases (milestones) basées sur les réponses
  const calculateMilestones = (): Milestone[] => {
    const milestones: Milestone[] = [];
    let currentStepCount = 1;

    // PHASE 1: PROFIL (toujours présente)
    const profileStart = currentStepCount;
    currentStepCount += 1; // Qui voyage
    if (answers.travelGroup === 'family' || answers.travelGroup === 'group35') {
      currentStepCount += 1; // Nombre de voyageurs
    }
    if (answers.travelGroup === 'family') {
      currentStepCount += 1; // Détails enfants
    }
    milestones.push({
      key: "profile",
      icon: Users,
      label: t("questionnaire.progress.profile"),
      stepRange: [profileStart, currentStepCount - 1]
    });

    // PHASE 2: DESTINATION (toujours présente)
    const destinationStart = currentStepCount;
    currentStepCount += 1; // Services (aide avec quoi)
    currentStepCount += 1; // Destination en tête
    if (answers.hasDestination === 'yes' || answers.hasDestination?.toLowerCase?.().includes('oui')) {
      currentStepCount += 1; // Trajet (départ + destination)
    } else if (answers.hasDestination === 'no' || answers.hasDestination?.toLowerCase?.().includes('non')) {
      currentStepCount += 3; // Climat, affinités, ambiance
      currentStepCount += 1; // Ville de départ
    }
    milestones.push({
      key: "destination",
      icon: MapPin,
      label: t("questionnaire.progress.destination"),
      stepRange: [destinationStart, currentStepCount - 1]
    });

    // PHASE 3: DATES (toujours présente)
    const datesStart = currentStepCount;
    currentStepCount += 1; // Type de dates
    if (answers.datesType?.toLowerCase?.().includes('fixed') || answers.datesType?.toLowerCase?.().includes('précises')) {
      currentStepCount += 1; // Dates précises
    } else if (answers.datesType?.toLowerCase?.().includes('flexible')) {
      currentStepCount += 1; // Flexibilité
      currentStepCount += 1; // Période approximative
      if (answers.hasApproximateDepartureDate === 'yes' || answers.hasApproximateDepartureDate?.toLowerCase?.().includes('oui')) {
        currentStepCount += 1; // Date approximative
      }
      currentStepCount += 1; // Durée
      if (answers.duration?.includes('>14') || answers.duration?.toLowerCase?.().includes('more')) {
        currentStepCount += 1; // Nombre exact de nuits (>14)
      }
    }
    milestones.push({
      key: "dates",
      icon: Calendar,
      label: t("questionnaire.progress.dates"),
      stepRange: [datesStart, currentStepCount - 1]
    });

    // PHASE 4: BUDGET (toujours présente)
    const budgetStart = currentStepCount;
    currentStepCount += 1; // Budget
    if (answers.budgetType?.toLowerCase?.().includes('précis') || 
        answers.budgetType?.toLowerCase?.().includes('precise') ||
        answers.budgetType?.includes('1800')) {
      currentStepCount += 1; // Montant exact
    }
    milestones.push({
      key: "budget",
      icon: Wallet,
      label: t("questionnaire.progress.budget"),
      stepRange: [budgetStart, currentStepCount - 1]
    });

    const helpWith = answers.helpWith || [];
    const needsFlights = helpWith.includes('flights') || helpWith.includes('vols');
    const needsAccommodation = helpWith.includes('accommodation') || helpWith.includes('hébergement');
    const needsActivities = helpWith.includes('activities') || helpWith.includes('activités');

    // PHASE 5: VOLS (conditionnelle - seulement si vols sélectionnés)
    if (needsFlights) {
      const flightsStart = currentStepCount;
      currentStepCount += 2; // Préférence vol + Bagages
      milestones.push({
        key: "flights",
        icon: Plane,
        label: t("questionnaire.progress.flights"),
        stepRange: [flightsStart, currentStepCount - 1]
      });
    }

    // PHASE 6: ACTIVITÉS (conditionnelle - seulement si activités sélectionnées)
    if (needsActivities) {
      const activitiesStart = currentStepCount;
      
      // Style (si destination précise ET activités)
      if (answers.hasDestination === 'yes' || answers.hasDestination?.toLowerCase?.().includes('oui')) {
        currentStepCount += 1; // Style
      }
      
      // Mobilité (si activités)
      currentStepCount += 1; // Mobilité
      
      // Sécurité + Rythme
      currentStepCount += 2; // Sécurité + Rythme
      
      milestones.push({
        key: "activities",
        icon: Compass,
        label: t("questionnaire.progress.activities"),
        stepRange: [activitiesStart, currentStepCount - 1]
      });
    }

    // PHASE 7: HÉBERGEMENT (conditionnelle - seulement si hébergement sélectionné)
    if (needsAccommodation) {
      const accommodationStart = currentStepCount;
      currentStepCount += 1; // Type hébergement
      
      // Préférences hôtel (si hôtel sélectionné)
      if (answers.accommodationType?.some((type: string) => 
        type.toLowerCase().includes('hôtel') || type.toLowerCase().includes('hotel')
      )) {
        currentStepCount += 1;
      }
      
      currentStepCount += 3; // Confort + Quartier + Équipements
      
      // Contraintes alimentaires (si hôtel avec repas)
      const hasHotelWithMeals = answers.accommodationType?.some((type: string) => 
        type.toLowerCase().includes('hôtel') || type.toLowerCase().includes('hotel')
      ) && answers.hotelPreferences?.some((pref: string) => 
        ['all_inclusive', 'half_board', 'full_board', 'breakfast'].some(meal => pref.includes(meal))
      );
      if (hasHotelWithMeals) {
        currentStepCount += 1;
      }
      
      milestones.push({
        key: "accommodation",
        icon: Bed,
        label: t("questionnaire.progress.accommodation"),
        stepRange: [accommodationStart, currentStepCount - 1]
      });
    }

    // PHASE 8: FINALISATION (toujours présente)
    const finalizationStart = currentStepCount;
    milestones.push({
      key: "finalization",
      icon: CheckCircle2,
      label: t("questionnaire.progress.finalization"),
      stepRange: [finalizationStart, 100]
    });

    return milestones;
  };

  const milestones = calculateMilestones();

  // Determine current milestone based on step
  const getCurrentMilestoneIndex = () => {
    for (let i = 0; i < milestones.length; i++) {
      const [min, max] = milestones[i].stepRange;
      if (currentStep >= min && currentStep <= max) {
        return i;
      }
    }
    return milestones.length - 1;
  };

  const currentMilestoneIndex = getCurrentMilestoneIndex();

  // Calculate milestone completion percentage
  const getMilestoneProgress = (index: number) => {
    if (index < currentMilestoneIndex) return 100;
    if (index > currentMilestoneIndex) return 0;
    
    const milestone = milestones[index];
    const [min, max] = milestone.stepRange;
    const range = max - min + 1;
    const stepsInMilestone = currentStep - min + 1;
    return Math.min(100, Math.max(0, (stepsInMilestone / range) * 100));
  };

  return (
    <div className="w-full">
      {/* Main Progress Bar - ultra fine et minimaliste */}
      <div className="relative h-0.5 bg-gradient-to-r from-gray-200 via-gray-200 to-gray-200 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-travliaq-turquoise via-travliaq-deep-blue to-travliaq-golden-sand transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Compact milestone indicator */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-2">
        {milestones.map((milestone, index) => {
          const Icon = milestone.icon;
          const isCompleted = index < currentMilestoneIndex;
          const isCurrent = index === currentMilestoneIndex;

          return (
            <div
              key={milestone.key}
              className={`flex items-center gap-1 transition-all duration-300 ${
                isCurrent ? "scale-110" : "scale-100 opacity-40"
              }`}
            >
              {isCurrent && (
                <>
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded-full text-xs transition-all duration-300
                      ${isCompleted
                        ? "bg-travliaq-turquoise text-white"
                        : "bg-white text-travliaq-deep-blue border border-travliaq-turquoise"}
                    `}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-medium text-travliaq-deep-blue whitespace-nowrap">
                    {milestone.label} • {currentStep}/{totalSteps}
                  </span>
                </>
              )}
              {!isCurrent && (
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    isCompleted ? "bg-travliaq-turquoise" : "bg-gray-300"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
