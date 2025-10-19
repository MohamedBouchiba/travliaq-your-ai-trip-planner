import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Users, Baby } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

interface Traveler {
  type: 'adult' | 'child';
  age?: number; // Only for children
}

interface TravelersStepProps {
  travelers: Traveler[];
  onUpdate: (travelers: Traveler[]) => void;
  onNext: () => void;
}

export const TravelersStep = ({ travelers, onUpdate, onNext }: TravelersStepProps) => {
  const { t } = useTranslation();

  const addTraveler = (type: 'adult' | 'child') => {
    const newTraveler: Traveler = type === 'child' ? { type, age: 0 } : { type };
    onUpdate([...travelers, newTraveler]);
  };

  const removeTraveler = (index: number) => {
    const updated = travelers.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  const updateTravelerAge = (index: number, age: number) => {
    const updated = [...travelers];
    updated[index] = { ...updated[index], age };
    onUpdate(updated);
  };

  const adultCount = travelers.filter(t => t.type === 'adult').length;
  const childCount = travelers.filter(t => t.type === 'child').length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-travliaq-deep-blue">
          {t('questionnaire.numberOfPeople')}
        </h2>
        <p className="text-muted-foreground">
          {t('questionnaire.travelers.addTravelers')}
        </p>
        <div className="flex justify-center gap-4 mt-4">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Users className="mr-2 h-4 w-4" />
            {adultCount} {adultCount > 1 ? t('questionnaire.travelers.adults') : t('questionnaire.travelers.adult')}
          </Badge>
          {childCount > 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Baby className="mr-2 h-4 w-4" />
              {childCount} {childCount > 1 ? t('questionnaire.travelers.children') : t('questionnaire.travelers.child')}
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Add buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Card
            className="p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-golden hover:border-travliaq-deep-blue"
            onClick={() => addTraveler('adult')}
          >
            <div className="flex flex-col items-center space-y-2">
              <Users className="h-8 w-8 text-travliaq-deep-blue" />
              <span className="text-base font-semibold text-travliaq-deep-blue">
                {t('questionnaire.travelers.addAdult')}
              </span>
            </div>
          </Card>
          <Card
            className="p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-golden hover:border-travliaq-deep-blue"
            onClick={() => addTraveler('child')}
          >
            <div className="flex flex-col items-center space-y-2">
              <Baby className="h-8 w-8 text-travliaq-deep-blue" />
              <span className="text-base font-semibold text-travliaq-deep-blue">
                {t('questionnaire.travelers.addChild')}
              </span>
            </div>
          </Card>
        </div>

        {/* Travelers list */}
        {travelers.length > 0 && (
          <div className="space-y-3 mt-6">
            {travelers.map((traveler, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {traveler.type === 'adult' ? (
                      <Users className="h-6 w-6 text-travliaq-deep-blue" />
                    ) : (
                      <Baby className="h-6 w-6 text-travliaq-turquoise" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-travliaq-deep-blue">
                      {traveler.type === 'adult' ? t('questionnaire.travelers.adultLabel') : t('questionnaire.travelers.childLabel')} {index + 1}
                    </div>
                    {traveler.type === 'child' && (
                      <div className="mt-2">
                        <label className="text-sm text-muted-foreground mb-1 block">
                          {t('questionnaire.travelers.childAge')}
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="17"
                          value={traveler.age || 0}
                          onChange={(e) => updateTravelerAge(index, parseInt(e.target.value) || 0)}
                          className="w-24"
                          placeholder={t('questionnaire.travelers.agePlaceholder')}
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTraveler(index)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center pt-4">
        <Button
          variant="hero"
          size="lg"
          onClick={onNext}
          disabled={travelers.length === 0}
          className="bg-travliaq-deep-blue"
        >
          {t('questionnaire.continue')}
        </Button>
      </div>
    </div>
  );
};
