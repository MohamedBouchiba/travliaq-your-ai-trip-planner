import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Edit2, Mail, Loader2 } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getTravelGroupLabel, getYesNoLabel, getDatesTypeLabel, getRhythmLabel, getSchedulePrefLabel } from "@/lib/questionnaireValues";

interface ReviewStepProps {
  answers: any;
  email: string;
  onEmailChange: (email: string) => void;
  onEdit: (section: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

// Helper pour formater les valeurs d'affichage
const formatValue = (value: any, t: any): string => {
  if (!value) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'number') return value.toString();
  return value;
};

// Helper pour traduire les valeurs des codes internes
const translateValue = (key: string, value: any, t: any): string => {
  if (!value) return '';
  
  // Codes yes/no
  if (key === 'hasDestination') {
    return t(getYesNoLabel(value));
  }
  
  // Codes travel group
  if (key === 'travelGroup') {
    return t(getTravelGroupLabel(value));
  }
  
  // Codes dates type
  if (key === 'datesType') {
    return t(getDatesTypeLabel(value));
  }

  // Rhythm (relaxed/balanced/intense)
  if (key === 'rhythm') {
    return t(getRhythmLabel(value));
  }

  // Schedule preferences (arrays)
  if (key === 'schedulePrefs' && Array.isArray(value)) {
    return value.map((v) => t(getSchedulePrefLabel(v))).join(', ');
  }
  
  // Codes help_with
  if (key === 'helpWith' && Array.isArray(value)) {
    return value.map(v => {
      const lowerV = v.toLowerCase();
      if (lowerV === 'flights') return t('questionnaire.flights');
      if (lowerV === 'accommodation') return t('questionnaire.accommodation');
      if (lowerV === 'activities') return t('questionnaire.activities');
      return v;
    }).join(', ');
  }
  
  return formatValue(value, t);
};

export const ReviewStep = ({ answers, email, onEmailChange, onEdit, onSubmit, isSubmitting }: ReviewStepProps) => {
  const { t } = useTranslation();
  
  const [openSections, setOpenSections] = useState<string[]>(['contact']);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const sections = [
    {
      id: 'group',
      title: t('questionnaire.review.group'),
      data: [
        { key: 'travelGroup', label: t('questionnaire.travelGroup'), value: translateValue('travelGroup', answers.travelGroup, t) },
        { key: 'numberOfTravelers', label: t('questionnaire.numberOfTravelers'), value: formatValue(answers.numberOfTravelers, t) }
      ]
    },
    {
      id: 'destination',
      title: t('questionnaire.review.destination'),
      data: [
        { key: 'hasDestination', label: t('questionnaire.hasDestination'), value: translateValue('hasDestination', answers.hasDestination, t) },
        { key: 'destination', label: t('questionnaire.destination'), value: formatValue(answers.destination, t) },
        { key: 'departureLocation', label: t('questionnaire.departureLocation'), value: formatValue(answers.departureLocation, t) }
      ]
    },
    {
      id: 'dates',
      title: t('questionnaire.review.dates'),
      data: [
        { key: 'datesType', label: t('questionnaire.datesType'), value: translateValue('datesType', answers.datesType, t) },
        { key: 'departureDate', label: t('questionnaire.departureDate'), value: formatValue(answers.departureDate, t) },
        { key: 'returnDate', label: t('questionnaire.returnDate'), value: formatValue(answers.returnDate, t) },
        { key: 'duration', label: t('questionnaire.duration'), value: formatValue(answers.duration, t) }
      ]
    },
    {
      id: 'budget',
      title: t('questionnaire.review.budget'),
      data: [
        { key: 'budget', label: t('questionnaire.budget'), value: formatValue(answers.budget, t) },
        { key: 'budgetAmount', label: t('questionnaire.budgetAmount'), value: formatValue(answers.budgetAmount, t) },
        { key: 'budgetCurrency', label: t('questionnaire.budgetCurrency'), value: formatValue(answers.budgetCurrency, t) }
      ]
    },
    {
      id: 'preferences',
      title: t('questionnaire.review.preferences'),
      data: [
        { key: 'travelAmbiance', label: t('questionnaire.travelAmbiance'), value: formatValue(answers.travelAmbiance, t) },
        { key: 'styles', label: t('questionnaire.styles'), value: formatValue(answers.styles, t) },
        { key: 'rhythm', label: t('questionnaire.rhythm'), value: translateValue('rhythm', answers.rhythm, t) },
        { key: 'schedulePrefs', label: t('questionnaire.schedulePrefs'), value: translateValue('schedulePrefs', answers.schedulePrefs, t) }
      ]
    },
    {
      id: 'accommodation',
      title: t('questionnaire.review.accommodation'),
      data: [
        { key: 'accommodationType', label: t('questionnaire.accommodationType'), value: formatValue(answers.accommodationType, t) },
        { key: 'hotelPreferences', label: t('questionnaire.hotelPreferences'), value: formatValue(answers.hotelPreferences, t) },
        { key: 'comfort', label: t('questionnaire.comfort'), value: formatValue(answers.comfort, t) }
      ]
    },
    {
      id: 'constraints',
      title: t('questionnaire.review.constraints'),
      data: [
        { key: 'security', label: t('questionnaire.security'), value: formatValue(answers.security, t) },
        { key: 'mobility', label: t('questionnaire.mobility'), value: formatValue(answers.mobility, t) },
        { key: 'constraints', label: t('questionnaire.constraints'), value: formatValue(answers.constraints, t) }
      ]
    }
  ];

  return (
    <div className="space-y-6 animate-fade-up max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-travliaq-deep-blue">
          {t('questionnaire.review.title')}
        </h2>
        <p className="text-muted-foreground">
          {t('questionnaire.review.description')}
        </p>
      </div>

      {/* Email et bouton en ligne */}
      <Card className="border-[2px] border-travliaq-golden-sand bg-travliaq-golden-sand/5">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-travliaq-deep-blue flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5" />
            {t('questionnaire.review.contact')}
          </h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="review-email" className="text-sm font-medium">
                {t('questionnaire.email')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="review-email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder={t('questionnaire.emailPlaceholder')}
                className="w-full h-12"
              />
              <p className="text-xs text-muted-foreground">
                {t('questionnaire.review.emailDesc')}
              </p>
            </div>
            <Button
              variant="hero"
              size="lg"
              onClick={onSubmit}
              disabled={isSubmitting || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              className="w-full h-12 bg-travliaq-golden-sand text-travliaq-deep-blue hover:bg-travliaq-golden-sand/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('questionnaire.submitting')}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  {t('questionnaire.submit')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Sections à valider */}
      <div className="space-y-4">
        {sections.map((section) => (
          <Collapsible
            key={section.id}
            open={openSections.includes(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-travliaq-turquoise/10 hover:bg-travliaq-turquoise/20 cursor-pointer transition-colors">
                  <h3 className="text-lg font-semibold text-travliaq-deep-blue">
                    {section.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(section.id);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      {t('questionnaire.review.edit')}
                    </Button>
                    {openSections.includes(section.id) ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 space-y-2">
                  {section.data.map((item, idx) => (
                    item.value && (
                      <div key={idx} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-muted-foreground">{item.label}:</span>
                        <span className="text-sm font-medium text-travliaq-deep-blue">{item.value}</span>
                      </div>
                    )
                  ))}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};
