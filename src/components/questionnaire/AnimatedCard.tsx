import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface AnimatedCardProps {
  children: ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  delay?: number;
}

export const AnimatedCard = ({ 
  children, 
  isSelected = false, 
  onClick, 
  className = "",
  delay = 0 
}: AnimatedCardProps) => {
  return (
    <Card
      className={`
        group relative overflow-hidden
        cursor-pointer
        transition-all duration-300 ease-out
        hover:scale-105 hover:shadow-xl
        border-2
        ${isSelected 
          ? 'border-travliaq-turquoise bg-gradient-to-br from-travliaq-turquoise/10 to-travliaq-golden-sand/10 shadow-xl scale-105' 
          : 'border-transparent hover:border-travliaq-turquoise/50 hover:shadow-lg'
        }
        animate-slide-in
        ${className}
      `}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'both'
      }}
      onClick={onClick}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer pointer-events-none" />
      
      {/* Glow effect when selected */}
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-br from-travliaq-turquoise/20 to-travliaq-golden-sand/20 animate-pulse pointer-events-none" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </Card>
  );
};
