import { cn } from "@/lib/utils";

// Chip Button Component
export const ChipButton = ({
  children,
  selected,
  onClick,
  icon: Icon,
  compact = false,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ElementType;
  compact?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "rounded-xl text-xs font-medium transition-all flex items-center gap-1.5",
      compact ? "px-2 py-1.5" : "px-3 py-2",
      selected
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
    )}
  >
    {Icon && <Icon className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />}
    {children}
  </button>
);
