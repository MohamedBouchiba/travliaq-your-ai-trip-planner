import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface SecurityStepProps {
  security: string[];
  onUpdate: (security: string[]) => void;
  onNext: () => void;
}

export const SecurityStep = ({ security, onUpdate, onNext }: SecurityStepProps) => {
  const { t } = useTranslation();

  const handleToggle = (option: string) => {
    const updated = security.includes(option)
      ? security.filter(s => s !== option)
      : [...security, option];
    onUpdate(updated);
  };

  const securityOptions = [
    { label: t('questionnaire.security.none'), icon: "✅" },
    { label: t('questionnaire.security.crowds'), icon: "👥" },
    { label: t('questionnaire.security.heights'), icon: "🏔️" },
    { label: t('questionnaire.security.tunnels'), icon: "🚇" },
    { label: t('questionnaire.security.water'), icon: "💧" },
    { label: t('questionnaire.security.animals'), icon: "🐍" },
    { label: t('questionnaire.security.darkness'), icon: "🌑" },
    { label: t('questionnaire.security.unsafeAreas'), icon: "🛡️" },
    { label: t('questionnaire.security.extremeActivities'), icon: "⚠️" }
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-travliaq-deep-blue">
          {t('questionnaire.security.title')}
        </h2>
        <p className="text-muted-foreground">
          {t('questionnaire.security.description')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('questionnaire.security.selectAll')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {securityOptions.map((option) => {
          const isSelected = security.includes(option.label);
          return (
            <Card
              key={option.label}
              className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                isSelected 
                  ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                  : "hover:shadow-golden hover:border-travliaq-deep-blue"
              }`}
              onClick={() => handleToggle(option.label)}
            >
              <div className="flex items-center space-x-4">
                <span className="text-4xl">{option.icon}</span>
                <span className="text-lg font-semibold text-travliaq-deep-blue">
                  {option.label}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center pt-4">
        <Button
          variant="hero"
          size="lg"
          onClick={onNext}
          disabled={security.length === 0}
          className="bg-travliaq-deep-blue"
        >
          {t('questionnaire.continue')}
        </Button>
      </div>
    </div>
  );
};
