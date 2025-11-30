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
      
      // Mobilité (si pas uniquement vols ET pas uniquement hébergement)
      const onlyFlights = helpWith.length === 1 && needsFlights;
      const onlyAccommodation = helpWith.length === 1 && needsAccommodation;
      if (!onlyFlights && !onlyAccommodation) {
        currentStepCount += 1; // Mobilité
      }
      
      currentStepCount += 2; // Sécurité + Rythme
      
      milestones.push({
        key: "activities",
        icon: Compass,
        label: t("questionnaire.progress.activities"),
        stepRange: [activitiesStart, currentStepCount - 1]
      });
    } else {
      // Mobilité peut exister sans activités (si pas uniquement vols ET pas uniquement hébergement)
      const onlyFlights = helpWith.length === 1 && needsFlights;
      const onlyAccommodation = helpWith.length === 1 && needsAccommodation;
      if (!onlyFlights && !onlyAccommodation) {
        const mobilityStart = currentStepCount;
        currentStepCount += 1; // Mobilité seule
        milestones.push({
          key: "mobility",
          icon: Compass,
          label: t("questionnaire.progress.preferences"),
          stepRange: [mobilityStart, currentStepCount - 1]
        });
      }
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
    <div className="w-full bg-gradient-to-br from-travliaq-deep-blue/5 via-white to-travliaq-turquoise/5 backdrop-blur-md border-b border-travliaq-turquoise/20 shadow-lg">
      {/* Main Progress Bar - Futuristic Style */}
      <div className="relative h-2 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 overflow-hidden">
        {/* Background animated shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-travliaq-turquoise/10 to-transparent animate-shimmer" />
        
        {/* Progress fill */}
        <div 
          className="h-full bg-gradient-to-r from-travliaq-turquoise via-travliaq-deep-blue to-travliaq-golden-sand transition-all duration-700 ease-out relative overflow-hidden shadow-[0_0_20px_rgba(0,180,216,0.6)]"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40 animate-pulse" />
        </div>
      </div>

      {/* Milestones Container */}
      <div className="max-w-7xl mx-auto px-3 py-3">
        {/* Mobile: Show only current milestone */}
        <div className="md:hidden flex items-center justify-center gap-3">
          {milestones.map((milestone, index) => {
            if (index !== currentMilestoneIndex) return null;
            
            const Icon = milestone.icon;
            const isCompleted = index < currentMilestoneIndex;
            const isCurrent = index === currentMilestoneIndex;
            const milestoneProgress = getMilestoneProgress(index);

            return (
              <div
                key={milestone.key}
                className="flex items-center gap-3 animate-fade-in"
              >
                {/* Icon with futuristic glow */}
                <div className="relative">
                  <div className={`
                    relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-500
                    ${isCompleted 
                      ? 'bg-gradient-to-br from-travliaq-turquoise to-travliaq-deep-blue text-white shadow-[0_0_20px_rgba(0,180,216,0.8)]' 
                      : isCurrent 
                        ? 'bg-gradient-to-br from-white to-gray-50 text-travliaq-deep-blue shadow-[0_0_25px_rgba(0,180,216,0.5)]' 
                        : 'bg-gray-100 text-gray-400'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                    
                    {/* Circular progress ring */}
                    {isCurrent && (
                      <svg className="absolute -inset-1.5 w-15 h-15 -rotate-90">
                        <circle
                          cx="30"
                          cy="30"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="30"
                          cy="30"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - milestoneProgress / 100)}`}
                          className="text-travliaq-turquoise transition-all duration-500 drop-shadow-[0_0_8px_rgba(0,180,216,0.8)]"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* Label */}
                <div className="flex flex-col">
                  <span className={`text-sm font-bold ${
                    isCurrent ? 'text-travliaq-deep-blue' : 'text-gray-700'
                  }`}>
                    {milestone.label}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {currentStep}/{totalSteps} • {Math.round(progress)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Show all milestones with futuristic design */}
        <div className="hidden md:flex items-center justify-between w-full">
          {milestones.map((milestone, index) => {
            const Icon = milestone.icon;
            const isCompleted = index < currentMilestoneIndex;
            const isCurrent = index === currentMilestoneIndex;
            const milestoneProgress = getMilestoneProgress(index);
            const isLast = index === milestones.length - 1;

            return (
              <div key={milestone.key} className="flex items-center flex-1">
                {/* Milestone node */}
                <div className="flex flex-col items-center gap-2 group relative">
                  {/* Icon container with glow effect */}
                  <div className="relative">
                    <div className={`
                      relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-500
                      ${isCompleted 
                        ? 'bg-gradient-to-br from-travliaq-turquoise to-travliaq-deep-blue text-white shadow-[0_0_20px_rgba(0,180,216,0.8)] scale-110' 
                        : isCurrent 
                          ? 'bg-gradient-to-br from-white to-gray-50 text-travliaq-deep-blue shadow-[0_0_25px_rgba(0,180,216,0.5)] scale-110' 
                          : 'bg-gray-100 text-gray-400 scale-100'
                      }
                    `}>
                      <Icon className="w-4 h-4" />
                      
                      {/* Animated progress ring for current */}
                      {isCurrent && (
                        <svg className="absolute -inset-1.5 w-13 h-13 -rotate-90">
                          <circle
                            cx="26"
                            cy="26"
                            r="24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            fill="none"
                            className="text-gray-200"
                          />
                          <circle
                            cx="26"
                            cy="26"
                            r="24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 24}`}
                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - milestoneProgress / 100)}`}
                            className="text-travliaq-turquoise transition-all duration-500 drop-shadow-[0_0_8px_rgba(0,180,216,0.8)]"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </div>
                    
                    {/* Pulsing dot for current */}
                    {isCurrent && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-travliaq-golden-sand rounded-full animate-ping" />
                    )}
                  </div>
                  
                  {/* Label below icon */}
                  <span className={`text-[11px] font-bold text-center transition-all duration-300 max-w-[80px] leading-tight ${
                    isCompleted 
                      ? 'text-travliaq-turquoise' 
                      : isCurrent 
                        ? 'text-travliaq-deep-blue' 
                        : 'text-gray-500'
                  }`}>
                    {milestone.label}
                  </span>
                </div>

                {/* Connector line between milestones */}
                {!isLast && (
                  <div className="flex-1 h-1 mx-2 bg-gradient-to-r from-gray-200 to-gray-100 relative overflow-hidden rounded-full">
                    <div 
                      className={`h-full transition-all duration-700 rounded-full ${
                        isCompleted 
                          ? 'bg-gradient-to-r from-travliaq-turquoise to-travliaq-deep-blue w-full shadow-[0_0_10px_rgba(0,180,216,0.6)]' 
                          : isCurrent && milestoneProgress > 80
                            ? 'bg-gradient-to-r from-travliaq-turquoise to-transparent shadow-[0_0_10px_rgba(0,180,216,0.4)]'
                            : 'w-0'
                      }`}
                      style={isCurrent && milestoneProgress > 80 ? { width: `${(milestoneProgress - 80) * 5}%` } : {}}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
