/**
 * TravelersWidget - Counter for adults, children, infants
 * Now syncs with Zustand store on confirmation
 * Fully i18n-enabled
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { usePlannerStoreV2 } from "@/stores/plannerStoreV2";

interface TravelersWidgetProps {
  initialValues?: { adults: number; children: number; infants: number };
  onConfirm: (travelers: { adults: number; children: number; infants: number }) => void;
  /** If true, skip syncing to Zustand (for isolated usage) */
  skipStoreSync?: boolean;
}

function CounterButton({
  value,
  onChange,
  min = 0,
  max = 9,
  disabled = false,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min || disabled}
        aria-label={`${label} −`}
        className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-medium hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        −
      </button>
      <span className="w-6 text-center font-semibold text-lg" aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max || disabled}
        aria-label={`${label} +`}
        className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-medium hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        +
      </button>
    </div>
  );
}

export function TravelersWidget({
  initialValues = { adults: 1, children: 0, infants: 0 },
  onConfirm,
  skipStoreSync = false,
}: TravelersWidgetProps) {
  const { t } = useTranslation();
  const updateTravelers = usePlannerStoreV2((s) => s.updateTravelers);
  
  const [adults, setAdults] = useState(Math.max(1, initialValues.adults));
  const [children, setChildren] = useState(initialValues.children);
  const [infants, setInfants] = useState(Math.min(initialValues.infants, Math.max(1, initialValues.adults)));
  const [confirmed, setConfirmed] = useState(false);

  // Ensure infants don't exceed adults when adults change
  const handleAdultsChange = (newAdults: number) => {
    setAdults(newAdults);
    if (infants > newAdults) {
      setInfants(newAdults);
    }
  };

  const handleConfirm = () => {
    if (adults < 1) return;
    setConfirmed(true);
    const travelers = { adults, children, infants };
    // Sync to Zustand store
    if (!skipStoreSync) {
      updateTravelers(travelers);
    }
    onConfirm(travelers);
  };

  const total = adults + children + infants;

  if (confirmed) {
    const parts: string[] = [];
    parts.push(`${adults} ${t(adults > 1 ? "planner.adults_plural" : "planner.adults")}`);
    if (children > 0) parts.push(`${children} ${t(children > 1 ? "planner.children_plural" : "planner.children")}`);
    if (infants > 0) parts.push(`${infants} ${t(infants > 1 ? "planner.infants_plural" : "planner.infants")}`);
    
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <span>✓</span>
        <span>{parts.join(", ")}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 space-y-4 max-w-xs">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("planner.travelers.countTitle")}
      </div>

      {/* Adults */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">{t("planner.travelers.adults")}</div>
          <div className="text-xs text-muted-foreground">{t("planner.travelers.adultsDesc")}</div>
        </div>
        <CounterButton value={adults} onChange={handleAdultsChange} min={1} label={t("planner.travelers.adults")} />
      </div>

      {/* Children */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">{t("planner.travelers.children")}</div>
          <div className="text-xs text-muted-foreground">{t("planner.travelers.childrenDesc")}</div>
        </div>
        <CounterButton value={children} onChange={setChildren} label={t("planner.travelers.children")} />
      </div>

      {/* Infants */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">{t("planner.travelers.infants")}</div>
          <div className="text-xs text-muted-foreground">{t("planner.travelers.infantsDesc")}</div>
        </div>
        <CounterButton value={infants} onChange={setInfants} max={adults} label={t("planner.travelers.infants")} />
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
      >
        {t(total > 1 ? "planner.travelers.confirmCount_plural" : "planner.travelers.confirmCount", { count: total })}
      </button>
    </div>
  );
}

/**
 * TravelersConfirmBeforeSearchWidget - Quick confirmation of 1 traveler before search
 * Now syncs with Zustand store on confirmation
 */
export function TravelersConfirmBeforeSearchWidget({
  currentTravelers,
  onConfirm,
  onEditConfirm,
  skipStoreSync = false,
}: {
  currentTravelers: { adults: number; children: number; infants: number };
  onConfirm: () => void;
  onEditConfirm: (travelers: { adults: number; children: number; infants: number }) => void;
  /** If true, skip syncing to Zustand (for isolated usage) */
  skipStoreSync?: boolean;
}) {
  const { t } = useTranslation();
  const updateTravelers = usePlannerStoreV2((s) => s.updateTravelers);
  
  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [adults, setAdults] = useState(currentTravelers.adults);
  const [children, setChildren] = useState(currentTravelers.children);
  const [infants, setInfants] = useState(currentTravelers.infants);

  const handleConfirmSolo = () => {
    setConfirmed(true);
    // Sync solo traveler to Zustand
    if (!skipStoreSync) {
      updateTravelers({ adults: 1, children: 0, infants: 0 });
    }
    onConfirm();
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleConfirmEdited = () => {
    setConfirmed(true);
    const travelers = { adults, children, infants };
    // Sync to Zustand store
    if (!skipStoreSync) {
      updateTravelers(travelers);
    }
    onEditConfirm(travelers);
  };

  const handleAdultsChange = (val: number) => setAdults(Math.max(1, val));

  if (confirmed) {
    const total = adults + children + infants;
    const parts: string[] = [];
    parts.push(`${adults} ${t(adults > 1 ? "planner.adults_plural" : "planner.adults")}`);
    if (children > 0) parts.push(`${children} ${t(children > 1 ? "planner.children_plural" : "planner.children")}`);
    if (infants > 0) parts.push(`${infants} ${t(infants > 1 ? "planner.infants_plural" : "planner.infants")}`);
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <span>✓</span>
        <span>{parts.join(", ")}</span>
      </div>
    );
  }

  const total = adults + children + infants;

  if (editing) {
    return (
      <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 space-y-4 max-w-xs">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("planner.travelers.editTitle")}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">{t("planner.travelers.adults")}</div>
            <div className="text-xs text-muted-foreground">{t("planner.travelers.adultsDesc")}</div>
          </div>
          <CounterButton value={adults} onChange={handleAdultsChange} min={1} label={t("planner.travelers.adults")} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">{t("planner.travelers.children")}</div>
            <div className="text-xs text-muted-foreground">{t("planner.travelers.childrenDesc")}</div>
          </div>
          <CounterButton value={children} onChange={setChildren} label={t("planner.travelers.children")} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">{t("planner.travelers.infants")}</div>
            <div className="text-xs text-muted-foreground">{t("planner.travelers.infantsDesc")}</div>
          </div>
          <CounterButton value={infants} onChange={setInfants} max={adults} label={t("planner.travelers.infants")} />
        </div>

        <button
          onClick={handleConfirmEdited}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
        >
          {t(total > 1 ? "planner.travelers.confirmCount_plural" : "planner.travelers.confirmCount", { count: total })}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 space-y-3 max-w-sm">
      <div className="text-sm text-foreground">
        {t("planner.travelers.soloQuestion")}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleConfirmSolo}
          className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
        >
          ✓ {t("planner.travelers.yesSolo")}
        </button>
        <button
          onClick={handleEdit}
          className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-all"
        >
          👥 {t("planner.travelers.noEdit")}
        </button>
      </div>
    </div>
  );
}
