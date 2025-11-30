import { ReactNode, useEffect, useState } from "react";

interface QuestionTransitionProps {
  children: ReactNode;
  step: number;
  className?: string;
}

export const QuestionTransition = ({ children, step, className = "" }: QuestionTransitionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(step);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (step !== currentStep) {
      // Start exit animation
      setIsTransitioning(true);
      setIsVisible(false);

      // Wait for exit animation to complete
      const exitTimer = setTimeout(() => {
        setCurrentStep(step);
        // Start enter animation
        setIsVisible(true);
        setIsTransitioning(false);
      }, 300); // Duration of exit animation

      return () => clearTimeout(exitTimer);
    } else {
      // Initial render
      setIsVisible(true);
    }
  }, [step, currentStep]);

  return (
    <div
      className={`
        transition-all duration-400
        ${isVisible && !isTransitioning
          ? 'animate-scale-up opacity-100'
          : 'opacity-0 translate-y-4'
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
};
