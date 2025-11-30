import { useTranslation } from "react-i18next";
import { Users, MapPin, Calendar, Wallet, Plane, Heart, Bed, CheckCircle2 } from "lucide-react";

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
  answers?: any; // Pour calculer dynamiquement les jalons
}

export const ProgressBar = ({ currentStep, totalSteps, progress, answers = {} }: ProgressBarProps) => {
  const { t } = useTranslation();

  // Calculer dynamiquement les jalons basés sur les réponses
  const calculateMilestones = (): Milestone[] => {
    const milestones: Milestone[] = [];
    let currentStepCount = 1;

    // 1. PROFIL (Qui voyage, nombre de voyageurs, enfants)
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

    // 2. SERVICES + DESTINATION
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

    // 3. DATES (Type de dates, dates précises/flexibles, durée)
    const datesStart = currentStepCount;
    currentStepCount += 1; // Type de dates
    if (answers.datesType?.toLowerCase?.().includes('fixed') || answers.datesType?.toLowerCase?.().includes('précises')) {
      currentStepCount += 1; // Dates précises
    } else if (answers.datesType?.toLowerCase?.().includes('flexible')) {
      currentStepCount += 2; // Flexibilité + période approximative
      if (answers.hasApproximateDepartureDate === 'yes' || answers.hasApproximateDepartureDate?.toLowerCase?.().includes('oui')) {
        currentStepCount += 1; // Date approximative
      }
      currentStepCount += 1; // Durée
      if (answers.duration?.includes('>14') || answers.duration?.toLowerCase?.().includes('more')) {
        currentStepCount += 1; // Nombre exact de nuits
      }
    }
    milestones.push({
      key: "dates",
      icon: Calendar,
      label: t("questionnaire.progress.dates"),
      stepRange: [datesStart, currentStepCount - 1]
    });

    // 4. BUDGET
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

    // 5. VOLS (si sélectionné)
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

    // 6. PRÉFÉRENCES (Style, Mobilité, Sécurité, Rythme)
    const preferencesStart = currentStepCount;
    let hasPreferences = false;
    
    // Style (si destination précise ET activités)
    if ((answers.hasDestination === 'yes' || answers.hasDestination?.toLowerCase?.().includes('oui')) && needsActivities) {
      currentStepCount += 1;
      hasPreferences = true;
    }
    
    // Mobilité (si pas uniquement vols ET pas uniquement hébergement)
    const onlyFlights = helpWith.length === 1 && needsFlights;
    const onlyAccommodation = helpWith.length === 1 && needsAccommodation;
    if (!onlyFlights && !onlyAccommodation) {
      currentStepCount += 1;
      hasPreferences = true;
    }
    
    // Sécurité & Rythme (si activités sélectionnées)
    if (needsActivities) {
      currentStepCount += 2; // Sécurité + Rythme
      hasPreferences = true;
    }

    if (hasPreferences) {
      milestones.push({
        key: "preferences",
        icon: Heart,
        label: t("questionnaire.progress.preferences"),
        stepRange: [preferencesStart, currentStepCount - 1]
      });
    }

    // 7. HÉBERGEMENT (si sélectionné)
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

    // 8. FINALISATION (Zone ouverte + Review)
    const finalizationStart = currentStepCount;
    milestones.push({
      key: "finalization",
      icon: CheckCircle2,
      label: t("questionnaire.progress.finalization"),
      stepRange: [finalizationStart, 100] // Jusqu'à la fin
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
    <div className="w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      {/* Main Progress Bar */}
      <div className="relative h-1.5 bg-gradient-to-r from-gray-100 to-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-travliaq-deep-blue via-travliaq-turquoise to-travliaq-golden-sand transition-all duration-500 ease-out relative overflow-hidden shadow-lg"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
        </div>
      </div>

      {/* Milestones */}
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between relative">
          {/* Mobile: Show only current milestone */}
          <div className="md:hidden flex items-center gap-3 w-full justify-center">
            {milestones.map((milestone, index) => {
              if (index !== currentMilestoneIndex) return null;
              
              const Icon = milestone.icon;
              const isCompleted = index < currentMilestoneIndex;
              const isCurrent = index === currentMilestoneIndex;
              const milestoneProgress = getMilestoneProgress(index);

              return (
                <div
                  key={milestone.key}
                  className="flex items-center gap-2 animate-fade-in"
                >
                  <div className={`
                    relative flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300
                    ${isCompleted 
                      ? 'bg-travliaq-turquoise border-travliaq-turquoise text-white scale-110' 
                      : isCurrent 
                        ? 'bg-white border-travliaq-deep-blue text-travliaq-deep-blue scale-110' 
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                    }
                  `}>
                    <Icon className="w-4 h-4" />
                    
                    {/* Progress ring for current milestone */}
                    {isCurrent && (
                      <svg className="absolute -inset-1 w-11 h-11 -rotate-90">
                        <circle
                          cx="22"
                          cy="22"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          strokeDashoffset={`${2 * Math.PI * 20 * (1 - milestoneProgress / 100)}`}
                          className="text-travliaq-turquoise transition-all duration-500"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </div>
                  
                  <div className="flex flex-col">
                    <span className={`text-xs font-semibold ${
                      isCurrent ? 'text-travliaq-deep-blue' : 'text-gray-600'
                    }`}>
                      {milestone.label}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {currentStep}/{totalSteps} • {Math.round(progress)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Show all milestones */}
          <div className="hidden md:flex items-center justify-between w-full gap-1">
            {milestones.map((milestone, index) => {
              const Icon = milestone.icon;
              const isCompleted = index < currentMilestoneIndex;
              const isCurrent = index === currentMilestoneIndex;
              const milestoneProgress = getMilestoneProgress(index);
              const isLast = index === milestones.length - 1;

              return (
                <div key={milestone.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-0.5 group flex-shrink-0">
                    <div className={`
                      relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300
                      ${isCompleted 
                        ? 'bg-travliaq-turquoise border-travliaq-turquoise text-white scale-110 shadow-md' 
                        : isCurrent 
                          ? 'bg-white border-travliaq-deep-blue text-travliaq-deep-blue scale-110 shadow-md' 
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }
                    `}>
                      <Icon className="w-3.5 h-3.5" />
                      
                      {/* Progress ring for current milestone */}
                      {isCurrent && (
                        <svg className="absolute -inset-1 w-10 h-10 -rotate-90">
                          <circle
                            cx="20"
                            cy="20"
                            r="18"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            className="text-gray-200"
                          />
                          <circle
                            cx="20"
                            cy="20"
                            r="18"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 18}`}
                            strokeDashoffset={`${2 * Math.PI * 18 * (1 - milestoneProgress / 100)}`}
                            className="text-travliaq-turquoise transition-all duration-500"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </div>
                    
                    <span className={`text-[10px] font-medium text-center transition-all duration-300 max-w-[70px] leading-tight truncate ${
                      isCompleted 
                        ? 'text-travliaq-turquoise' 
                        : isCurrent 
                          ? 'text-travliaq-deep-blue font-semibold' 
                          : 'text-gray-500'
                    }`}>
                      {milestone.label}
                    </span>
                  </div>

                  {/* Connector line */}
                  {!isLast && (
                    <div className="flex-1 h-0.5 mx-1 bg-gray-200 relative overflow-hidden min-w-[20px]">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          isCompleted 
                            ? 'bg-gradient-to-r from-travliaq-turquoise to-travliaq-turquoise w-full' 
                            : isCurrent && milestoneProgress > 80
                              ? 'bg-gradient-to-r from-travliaq-turquoise to-transparent'
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
    </div>
  );
};
