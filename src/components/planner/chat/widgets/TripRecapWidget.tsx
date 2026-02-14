/**
 * TripRecapWidget - Structured trip summary display
 *
 * E2: Renders trip recap data from the LLM's generate_trip_recap tool call
 * as a card with sections for destination, dates, travelers, flight, accommodation,
 * activities, and budget.
 */

import { useTranslation } from "react-i18next";
import { MapPin, Calendar, Users, Plane, Hotel, Activity, Wallet, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import type { TripRecapData } from "../types";

interface TripRecapWidgetProps {
  data: TripRecapData;
}

function RecapSection({ icon: Icon, label, children }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2">
      <div className="shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function formatRecapAsText(data: TripRecapData): string {
  const lines: string[] = [];
  lines.push(`=== ${data.destination.city}, ${data.destination.country} ===`);

  if (data.dates) {
    const parts: string[] = [];
    if (data.dates.departure) parts.push(`Départ: ${data.dates.departure}`);
    if (data.dates.return) parts.push(`Retour: ${data.dates.return}`);
    if (data.dates.duration) parts.push(`Durée: ${data.dates.duration}`);
    if (parts.length) lines.push(`Dates: ${parts.join(" | ")}`);
  }

  if (data.travelers?.description) {
    lines.push(`Voyageurs: ${data.travelers.description}`);
  }

  if (data.flight) {
    const parts: string[] = [];
    if (data.flight.fromCity && data.flight.toCity) parts.push(`${data.flight.fromCity} → ${data.flight.toCity}`);
    if (data.flight.airline) parts.push(data.flight.airline);
    if (data.flight.price) parts.push(`${data.flight.price} ${data.flight.currency || "EUR"}`);
    if (parts.length) lines.push(`Vol: ${parts.join(" | ")}`);
  }

  if (data.accommodation) {
    const parts: string[] = [];
    if (data.accommodation.name) parts.push(data.accommodation.name);
    if (data.accommodation.type) parts.push(data.accommodation.type);
    if (data.accommodation.pricePerNight) parts.push(`${data.accommodation.pricePerNight} ${data.accommodation.currency || "EUR"}/nuit`);
    if (parts.length) lines.push(`Hébergement: ${parts.join(" | ")}`);
  }

  if (data.activities?.length) {
    lines.push("Activités:");
    for (const act of data.activities) {
      const dayPrefix = act.day ? `Jour ${act.day}: ` : "- ";
      lines.push(`  ${dayPrefix}${act.title}`);
    }
  }

  if (data.budget?.estimated) {
    lines.push(`Budget estimé: ${data.budget.estimated} ${data.budget.currency || "EUR"}`);
    if (data.budget.breakdown) lines.push(`  (${data.budget.breakdown})`);
  }

  if (data.notes) {
    lines.push(`Notes: ${data.notes}`);
  }

  return lines.join("\n");
}

export function TripRecapWidget({ data }: TripRecapWidgetProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatRecapAsText(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
    }
  }, [data]);

  return (
    <div className="mt-3 max-w-[85%] rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">
          {data.destination.city}, {data.destination.country}
          {data.destination.countryCode && (
            <span className="ml-1.5 text-xs text-muted-foreground">({data.destination.countryCode})</span>
          )}
        </h3>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors"
          title={t("planner.message.copy")}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? t("planner.message.copied") : t("planner.message.copy")}
        </button>
      </div>

      <div className="divide-y divide-border">
        {/* Dates */}
        {data.dates && (data.dates.departure || data.dates.duration) && (
          <RecapSection icon={Calendar} label={t("planner.recap.dates", "Dates")}>
            {data.dates.departure && data.dates.return ? (
              <p>{data.dates.departure} → {data.dates.return}</p>
            ) : data.dates.departure ? (
              <p>{data.dates.departure}</p>
            ) : null}
            {data.dates.duration && <p className="text-muted-foreground text-xs">{data.dates.duration}</p>}
          </RecapSection>
        )}

        {/* Travelers */}
        {data.travelers && (
          <RecapSection icon={Users} label={t("planner.recap.travelers", "Voyageurs")}>
            <p>{data.travelers.description || `${data.travelers.adults || 1} adulte(s)`}</p>
          </RecapSection>
        )}

        {/* Flight */}
        {data.flight && (data.flight.fromCity || data.flight.toCity) && (
          <RecapSection icon={Plane} label={t("planner.recap.flight", "Vol")}>
            {data.flight.fromCity && data.flight.toCity && (
              <p>
                {data.flight.fromCity} ({data.flight.fromIata}) → {data.flight.toCity} ({data.flight.toIata})
              </p>
            )}
            {data.flight.airline && <p className="text-muted-foreground text-xs">{data.flight.airline}</p>}
            {data.flight.price != null && (
              <p className="font-medium">{data.flight.price} {data.flight.currency || "EUR"}</p>
            )}
          </RecapSection>
        )}

        {/* Accommodation */}
        {data.accommodation && (data.accommodation.name || data.accommodation.type) && (
          <RecapSection icon={Hotel} label={t("planner.recap.accommodation", "Hébergement")}>
            {data.accommodation.name && <p>{data.accommodation.name}</p>}
            {data.accommodation.type && (
              <p className="text-muted-foreground text-xs">
                {data.accommodation.type}
                {data.accommodation.stars ? ` ${"★".repeat(data.accommodation.stars)}` : ""}
              </p>
            )}
            {data.accommodation.pricePerNight != null && (
              <p className="font-medium">{data.accommodation.pricePerNight} {data.accommodation.currency || "EUR"}/nuit</p>
            )}
            {data.accommodation.neighborhood && (
              <p className="text-muted-foreground text-xs">{data.accommodation.neighborhood}</p>
            )}
          </RecapSection>
        )}

        {/* Activities */}
        {data.activities && data.activities.length > 0 && (
          <RecapSection icon={Activity} label={t("planner.recap.activities", "Activités")}>
            <ul className="space-y-1">
              {data.activities.map((act, i) => (
                <li key={i} className="text-sm">
                  {act.day != null && <span className="font-medium text-muted-foreground mr-1">J{act.day}</span>}
                  {act.title}
                  {act.description && <span className="text-muted-foreground text-xs ml-1">— {act.description}</span>}
                </li>
              ))}
            </ul>
          </RecapSection>
        )}

        {/* Budget */}
        {data.budget && data.budget.estimated != null && (
          <RecapSection icon={Wallet} label={t("planner.recap.budget", "Budget")}>
            <p className="font-semibold">{data.budget.estimated} {data.budget.currency || "EUR"}</p>
            {data.budget.breakdown && <p className="text-muted-foreground text-xs">{data.budget.breakdown}</p>}
          </RecapSection>
        )}
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="mt-3 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground italic">{data.notes}</p>
        </div>
      )}
    </div>
  );
}
