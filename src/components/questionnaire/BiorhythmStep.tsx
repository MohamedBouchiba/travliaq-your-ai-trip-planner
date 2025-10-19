import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface BiorhythmStepProps {
  biorhythm: string[];
  onUpdate: (biorhythm: string[]) => void;
  onNext: () => void;
}

export const BiorhythmStep = ({ biorhythm, onUpdate, onNext }: BiorhythmStepProps) => {
  const { t } = useTranslation();

  const handleToggle = (option: string) => {
    const updated = biorhythm.includes(option)
      ? biorhythm.filter(b => b !== option)
      : [...biorhythm, option];
    onUpdate(updated);
  };

  const biorhythmOptions = [
    { label: t('questionnaire.biorhythm.earlyBird'), icon: "🌅" },
    { label: t('questionnaire.biorhythm.nightOwl'), icon: "🌙" },
    { label: t('questionnaire.biorhythm.naps'), icon: "😴" },
    { label: t('questionnaire.biorhythm.dailyFreeTime'), icon: "⏰" },
    { label: t('questionnaire.biorhythm.earlyTolerant'), icon: "⏰" },
    { label: t('questionnaire.biorhythm.regularMeals'), icon: "🍽️" },
    { label: t('questionnaire.biorhythm.flexible'), icon: "🔄" }
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-travliaq-deep-blue">
          {t('questionnaire.biorhythm.title')}
        </h2>
        <p className="text-muted-foreground">
          {t('questionnaire.biorhythm.description')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('questionnaire.biorhythm.selectAll')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {biorhythmOptions.map((option) => {
          const isSelected = biorhythm.includes(option.label);
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
          disabled={biorhythm.length === 0}
          className="bg-travliaq-deep-blue"
        >
          {t('questionnaire.continue')}
        </Button>
      </div>
    </div>
  );
};
