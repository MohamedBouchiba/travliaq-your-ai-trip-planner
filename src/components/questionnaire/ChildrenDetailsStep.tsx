import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ChildrenDetailsStepProps {
  children: Array<{ age: number }>;
  onUpdate: (children: Array<{ age: number }>) => void;
  onNext: () => void;
}

export const ChildrenDetailsStep = ({ children, onUpdate, onNext }: ChildrenDetailsStepProps) => {
  const { t } = useTranslation();

  const addChild = () => {
    onUpdate([...children, { age: 0 }]);
  };

  const removeChild = (index: number) => {
    const updated = children.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  const updateChildAge = (index: number, age: number) => {
    const updated = [...children];
    updated[index] = { age };
    onUpdate(updated);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-travliaq-deep-blue">
          {t('questionnaire.children.title')}
        </h2>
        <p className="text-muted-foreground">
          {t('questionnaire.children.description')}
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-sm font-medium text-travliaq-deep-blue">
          {t('questionnaire.children.howMany')}
        </p>

        {children.map((child, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">
                  {t('questionnaire.children.child')} {index + 1}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="17"
                    placeholder="0"
                    value={child.age || ""}
                    onChange={(e) => updateChildAge(index, parseInt(e.target.value) || 0)}
                    className="w-24 text-center"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('questionnaire.children.years')}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeChild(index)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}

        <Button
          variant="outline"
          onClick={addChild}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('questionnaire.children.addChild')}
        </Button>

        <div className="flex justify-center pt-4">
          <Button
            variant="hero"
            size="lg"
            onClick={onNext}
            disabled={children.length === 0 || children.some(c => !c.age || c.age === 0)}
            className="bg-travliaq-deep-blue"
          >
            {t('questionnaire.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
};
