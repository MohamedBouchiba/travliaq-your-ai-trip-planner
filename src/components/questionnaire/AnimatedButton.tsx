import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "hero" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  type?: "button" | "submit" | "reset";
}

export const AnimatedButton = ({ 
  children, 
  onClick, 
  disabled = false,
  variant = "hero",
  size = "lg",
  className = "",
  type = "button"
}: AnimatedButtonProps) => {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={`
        group relative overflow-hidden
        transition-all duration-300
        hover:scale-105
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${!disabled && 'hover:shadow-xl'}
        ${className}
      `}
    >
      {/* Shimmer effect on hover */}
      {!disabled && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer pointer-events-none" />
      )}
      
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </Button>
  );
};
