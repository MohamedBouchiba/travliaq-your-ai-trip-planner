import { useTranslation } from "react-i18next";
import { Users, MapPin, Calendar, Wallet, Heart, Bed, CheckCircle2 } from "lucide-react";

interface Milestone {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  stepRange: [number, number]; // [min, max] step numbers for this milestone
}

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
}

export const ProgressBar = ({ currentStep, totalSteps, progress }: ProgressBarProps) => {
  const { t } = useTranslation();

  // Define key milestones with approximate step ranges
  const milestones: Milestone[] = [
    {
      key: "profile",
      icon: Users,
      label: t("questionnaire.progress.profile"),
      stepRange: [1, 3]
    },
    {
      key: "destination",
      icon: MapPin,
      label: t("questionnaire.progress.destination"),
      stepRange: [4, 7]
    },
    {
      key: "dates",
      icon: Calendar,
      label: t("questionnaire.progress.dates"),
      stepRange: [8, 11]
    },
    {
      key: "budget",
      icon: Wallet,
      label: t("questionnaire.progress.budget"),
      stepRange: [12, 14]
    },
    {
      key: "preferences",
      icon: Heart,
      label: t("questionnaire.progress.preferences"),
      stepRange: [15, 20]
    },
    {
      key: "accommodation",
      icon: Bed,
      label: t("questionnaire.progress.accommodation"),
      stepRange: [21, 25]
    },
    {
      key: "finalization",
      icon: CheckCircle2,
      label: t("questionnaire.progress.finalization"),
      stepRange: [26, 100]
    }
  ];

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
    <div className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
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
      <div className="max-w-7xl mx-auto px-4 py-3">
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
                    relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                    ${isCompleted 
                      ? 'bg-travliaq-turquoise border-travliaq-turquoise text-white scale-110' 
                      : isCurrent 
                        ? 'bg-white border-travliaq-deep-blue text-travliaq-deep-blue scale-110' 
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                    
                    {/* Progress ring for current milestone */}
                    {isCurrent && (
                      <svg className="absolute -inset-1 w-12 h-12 -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="22"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="22"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 22}`}
                          strokeDashoffset={`${2 * Math.PI * 22 * (1 - milestoneProgress / 100)}`}
                          className="text-travliaq-turquoise transition-all duration-500"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </div>
                  
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${
                      isCurrent ? 'text-travliaq-deep-blue' : 'text-gray-600'
                    }`}>
                      {milestone.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {currentStep}/{totalSteps} • {Math.round(progress)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Show all milestones */}
          <div className="hidden md:flex items-center justify-between w-full gap-2">
            {milestones.map((milestone, index) => {
              const Icon = milestone.icon;
              const isCompleted = index < currentMilestoneIndex;
              const isCurrent = index === currentMilestoneIndex;
              const milestoneProgress = getMilestoneProgress(index);
              const isLast = index === milestones.length - 1;

              return (
                <div key={milestone.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 group">
                    <div className={`
                      relative flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300
                      ${isCompleted 
                        ? 'bg-travliaq-turquoise border-travliaq-turquoise text-white scale-110 shadow-md' 
                        : isCurrent 
                          ? 'bg-white border-travliaq-deep-blue text-travliaq-deep-blue scale-110 shadow-md' 
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
                    
                    <span className={`text-xs font-medium text-center transition-all duration-300 max-w-[80px] ${
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
                    <div className="flex-1 h-0.5 mx-2 bg-gray-200 relative overflow-hidden">
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
