/**
 * BookingStepSummary - Summary review step of the booking flow
 */

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Calendar,
  Plane,
  Hotel,
  MapPin,
  Users,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import type { BookingSummary } from "./BookingFlowWidget";

interface SummaryStepProps {
  summary: BookingSummary;
  onContinue: () => void;
  onBookItem?: (itemId: string) => void;
}

export function SummaryStep({ summary, onContinue, onBookItem }: SummaryStepProps) {
  const { t, i18n } = useTranslation();
  const typeIcons = {
    flight: Plane,
    hotel: Hotel,
    activity: MapPin,
    transfer: MapPin,
  };

  const locale = i18n.language === "en" ? "en-US" : "fr-FR";

  return (
    <div className="space-y-4">
      {/* Trip overview */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="font-semibold mb-2">{summary.destination}</h3>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>
              {summary.dates.departure.toLocaleDateString(locale)}
              {summary.dates.return &&
                ` - ${summary.dates.return.toLocaleDateString(locale)}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} />
            <span>
              {summary.travelers.adults} {summary.travelers.adults > 1 ? t("planner.booking.adults") : t("planner.booking.adult")}
              {summary.travelers.children > 0 &&
                `, ${summary.travelers.children} ${summary.travelers.children > 1 ? t("planner.booking.children") : t("planner.booking.child")}`}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {summary.items.map((item) => {
          const Icon = typeIcons[item.type];
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <div
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                  item.type === "flight" &&
                    "bg-blue-100 dark:bg-blue-900/40 text-blue-600",
                  item.type === "hotel" &&
                    "bg-purple-100 dark:bg-purple-900/40 text-purple-600",
                  item.type === "activity" &&
                    "bg-green-100 dark:bg-green-900/40 text-green-600",
                  item.type === "transfer" &&
                    "bg-amber-100 dark:bg-amber-900/40 text-amber-600"
                )}
              >
                <Icon size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.name}</div>
                {item.description && (
                  <div className="text-sm text-muted-foreground truncate">
                    {item.description}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="font-semibold">
                  {item.price}
                  {item.currency}
                </div>
                {item.status === "confirmed" ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle size={12} />
                    {t("planner.booking.confirmed")}
                  </span>
                ) : item.bookingUrl ? (
                  <button
                    type="button"
                    onClick={() => onBookItem?.(item.id)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {t("planner.booking.reserve")}
                    <ExternalLink size={10} />
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {t("planner.booking.pending")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Price breakdown */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("planner.booking.subtotal")}</span>
          <span>
            {summary.subtotal}
            {summary.currency}
          </span>
        </div>
        {summary.fees && summary.fees > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("planner.booking.serviceFees")}</span>
            <span>
              {summary.fees}
              {summary.currency}
            </span>
          </div>
        )}
        {summary.discount && summary.discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>{t("planner.booking.discount")}</span>
            <span>
              -{summary.discount}
              {summary.currency}
            </span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t font-semibold text-lg">
          <span>{t("planner.booking.total")}</span>
          <span className="text-primary">
            {summary.total}
            {summary.currency}
          </span>
        </div>
      </div>

      {/* Continue button */}
      <button
        type="button"
        onClick={onContinue}
        className={cn(
          "w-full py-3 rounded-lg font-medium transition-all",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "hover:scale-[1.01] active:scale-[0.99]"
        )}
      >
        {t("planner.booking.continueToTravelers")}
        <ChevronRight size={18} className="inline ml-2" />
      </button>
    </div>
  );
}
