/**
 * ConfirmedWidget - Displays a confirmed widget selection in read-only mode
 * 
 * This component shows the user's selection from a widget after they've made
 * their choice. The widget remains visible in the chat history.
 */

import { Check, Calendar, Users, Plane, MapPin, Heart, Utensils, Sliders, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetType } from "@/types/flight";

interface ConfirmedWidgetProps {
  widgetType: WidgetType;
  selectedValue: unknown;
  displayLabel: string;
  className?: string;
  onModify?: () => void;
}

// Map widget types to icons
const widgetIcons: Partial<Record<WidgetType, React.ReactNode>> = {
  datePicker: <Calendar className="h-3.5 w-3.5" />,
  dateRangePicker: <Calendar className="h-3.5 w-3.5" />,
  returnDatePicker: <Calendar className="h-3.5 w-3.5" />,
  travelersSelector: <Users className="h-3.5 w-3.5" />,
  travelersConfirmBeforeSearch: <Users className="h-3.5 w-3.5" />,
  tripTypeConfirm: <Plane className="h-3.5 w-3.5" />,
  citySelector: <MapPin className="h-3.5 w-3.5" />,
  destinationSuggestions: <MapPin className="h-3.5 w-3.5" />,
  preferenceStyle: <Sliders className="h-3.5 w-3.5" />,
  preferenceInterests: <Heart className="h-3.5 w-3.5" />,
  mustHaves: <Heart className="h-3.5 w-3.5" />,
  dietary: <Utensils className="h-3.5 w-3.5" />,
  airportConfirmation: <Plane className="h-3.5 w-3.5" />,
};

// Map widget types to labels
const widgetLabels: Partial<Record<WidgetType, string>> = {
  datePicker: "Date",
  dateRangePicker: "Dates",
  returnDatePicker: "Retour",
  travelersSelector: "Voyageurs",
  travelersConfirmBeforeSearch: "Voyageurs",
  tripTypeConfirm: "Type",
  citySelector: "Destination",
  destinationSuggestions: "Destination",
  preferenceStyle: "Style",
  preferenceInterests: "Intérêts",
  mustHaves: "Critères",
  dietary: "Régime",
  airportConfirmation: "Aéroports",
};

export function ConfirmedWidget({
  widgetType,
  displayLabel,
  className,
  onModify,
}: ConfirmedWidgetProps) {
  const icon = widgetIcons[widgetType] || <Check className="h-3.5 w-3.5" />;
  const typeLabel = widgetLabels[widgetType] || "Sélection";

  return (
    <div
      className={cn(
        "mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl",
        "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800",
        "text-sm shadow-sm",
        "animate-in fade-in-0 zoom-in-95 duration-300",
        className
      )}
    >
      <span className="text-green-600 dark:text-green-400">{icon}</span>
      <span className="text-muted-foreground font-medium">{typeLabel} :</span>
      <span className="font-semibold text-foreground">{displayLabel}</span>
      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/50">
        <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
      </span>
      {onModify && (
        <button
          onClick={onModify}
          className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Modifier"
        >
          <Pencil className="h-3 w-3" />
          <span>Modifier</span>
        </button>
      )}
    </div>
  );
}

export default ConfirmedWidget;
