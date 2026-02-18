/**
 * Airport Selection Widgets with Smart Recommendations
 * Premium / Futuristic redesign — v3 (aligned cards, compact badge, clean button)
 */

import { useState } from "react";
import { Plane, Check, ChevronDown, ChevronUp, Sparkles, MapPin, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Airport } from "@/hooks/useNearestAirports";
import type { AirportChoice, DualAirportChoice, AirportConfirmationData, ConfirmedAirports } from "@/types/flight";

/* ─────────────────────────── helpers ─────────────────────────── */

function getAirportPros(airport: Airport, allAirports: Airport[], t: (k: string) => string): string[] {
  const pros: string[] = [];
  const minDistance = Math.min(...allAirports.map(a => a.distance_km));
  if (airport.distance_km === minDistance && allAirports.length > 1) pros.push(t("planner.airport.closest"));
  const name = airport.name.toLowerCase();
  if (name.includes("international") || name.includes("charles de gaulle") || name.includes("heathrow") || name.includes("schiphol")) {
    pros.push(t("planner.airport.majorInternational"));
  }
  pros.push(t("planner.airport.moreFlights"));
  pros.push(t("planner.airport.betterConnection"));
  return pros.slice(0, 3);
}

/* ─────────────────────── AirportButton (compact) ─────────────── */

export function AirportButton({ airport, onClick, disabled }: {
  airport: Airport; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-left",
        "bg-card hover:bg-primary/10 hover:border-primary/50",
        "border-border/50 text-xs w-full",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className="font-bold text-primary text-sm">{airport.iata}</span>
      <span className="flex-1 truncate text-foreground">{airport.city_name || airport.name.split(" ")[0]}</span>
      <span className="text-muted-foreground text-[10px] shrink-0">{airport.distance_km.toFixed(0)}km</span>
    </button>
  );
}

/* ─────────────────────── DualAirportSelection ─────────────────── */

export function DualAirportSelection({ choices, onSelect, disabled }: {
  choices: DualAirportChoice;
  onSelect: (field: "from" | "to", airport: Airport) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      {choices.from && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span className="text-primary">✈</span> {t("planner.dualAirport.departure")} · {choices.from.cityName}
          </div>
          <div className="space-y-1">
            {choices.from.airports.map(a => (
              <AirportButton key={a.iata} airport={a} onClick={() => onSelect("from", a)} disabled={disabled} />
            ))}
          </div>
        </div>
      )}
      {choices.to && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span className="text-primary">🛬</span> {t("planner.dualAirport.arrival")} · {choices.to.cityName}
          </div>
          <div className="space-y-1">
            {choices.to.airports.map(a => (
              <AirportButton key={a.iata} airport={a} onClick={() => onSelect("to", a)} disabled={disabled} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── PremiumAirportCard (recommended) ───────────────
   Full-height card — both departure and arrival are always the same height
   because they live in a CSS grid with items-stretch.
   ──────────────────────────────────────────────────────────────── */

function PremiumAirportCard({
  airport,
  label,
  allAirports,
  showAlts,
  onToggleAlts,
  onSelect,
  disabled,
}: {
  airport: Airport;
  label: string;
  allAirports: Airport[];
  showAlts: boolean;
  onToggleAlts: () => void;
  onSelect: (a: Airport) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const pros = getAirportPros(airport, allAirports, t);

  return (
    /* stretch wrapper — fills the grid cell height so both cards are equal */
    <div className="flex flex-col gap-2 h-full">
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none">{label}</span>
      </div>

      {/* Main card — flex-1 so both fill the same height */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border p-4 flex flex-col flex-1",
          "bg-gradient-to-br from-primary/10 via-card to-primary/5",
          "border-primary/20 shadow-lg shadow-primary/10",
        )}
      >
        {/* Glow orb */}
        <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/15 blur-2xl" />

        {/* IATA + compact badge — inline on same row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-4xl font-black tracking-tight text-primary leading-none">
            {airport.iata}
          </span>
          {/* ← small badge, not an oval pill */}
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md shadow-sm leading-none flex-shrink-0">
            <Zap className="w-2 h-2" />
            {t("planner.airport.bestChoice")}
          </span>
        </div>

        {/* Distance */}
        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] text-muted-foreground">
            {airport.distance_km.toFixed(0)} km
          </span>
        </div>

        {/* Airport name */}
        <p className="text-xs font-semibold text-foreground leading-snug mb-3">
          {airport.name}
        </p>

        {/* Pros */}
        <div className="space-y-1 mb-4 flex-1">
          {pros.map((pro, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              {pro}
            </div>
          ))}
        </div>

        {/* Toggle alternatives — always at bottom */}
        <button
          onClick={onToggleAlts}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 mt-auto",
            "py-2 rounded-xl border border-border/60 text-xs font-medium",
            "text-muted-foreground bg-muted/50 hover:bg-muted/80 transition-all",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {showAlts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {t("planner.airport.seeOthers")}
        </button>
      </motion.div>

      {/* Alternatives dropdown */}
      <AnimatePresence>
        {showAlts && (
          <motion.div
            key="alts"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-1">
              {allAirports.map((a, idx) => (
                <motion.button
                  key={a.iata}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onSelect(a)}
                  disabled={disabled}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
                    a.iata === airport.iata
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/40 bg-card hover:bg-muted/50 hover:border-border",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className={cn(
                    "text-sm font-black w-10 shrink-0",
                    a.iata === airport.iata ? "text-primary" : "text-foreground"
                  )}>{a.iata}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{a.city_name || a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.distance_km.toFixed(0)} km</p>
                  </div>
                  {a.iata === airport.iata && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────── AirportConfirmationWidget ──────────────────
   Main widget — premium redesign v3
   ──────────────────────────────────────────────────────────────── */

export function AirportConfirmationWidget({
  data,
  onConfirm,
  isLoading = false,
}: {
  data: AirportConfirmationData;
  onConfirm: (confirmed: ConfirmedAirports) => void;
  isLoading?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState<Record<number, { from: boolean; to: boolean }>>({});

  const [selectedAirports, setSelectedAirports] = useState<Record<number, { from: Airport; to: Airport }>>(() => {
    const initial: Record<number, { from: Airport; to: Airport }> = {};
    data.legs.forEach(leg => {
      initial[leg.legIndex] = { from: leg.from.suggestedAirport, to: leg.to.suggestedAirport };
    });
    return initial;
  });

  const handleAirportChange = (legIndex: number, field: "from" | "to", airport: Airport) => {
    setSelectedAirports(prev => ({ ...prev, [legIndex]: { ...prev[legIndex], [field]: airport } }));
    setShowAlternatives(prev => ({ ...prev, [legIndex]: { ...prev[legIndex], [field]: false } }));
  };

  const toggleAlternatives = (legIndex: number, field: "from" | "to") => {
    setShowAlternatives(prev => ({
      ...prev,
      [legIndex]: {
        from: prev[legIndex]?.from || false,
        to: prev[legIndex]?.to || false,
        [field]: !prev[legIndex]?.[field],
      },
    }));
  };

  const handleConfirm = () => {
    setConfirmed(true);
    const confirmedLegs = data.legs.map(leg => {
      const selected = selectedAirports[leg.legIndex];
      return {
        legIndex: leg.legIndex,
        fromIata: selected.from.iata,
        fromDisplay: `${selected.from.name} (${selected.from.iata})`,
        toIata: selected.to.iata,
        toDisplay: `${selected.to.name} (${selected.to.iata})`,
        date: leg.date,
      };
    });
    onConfirm({ legs: confirmedLegs });
  };

  /* ── Confirmed state ── */
  if (confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-3 p-4 rounded-2xl bg-primary/10 border border-primary/30 max-w-md"
      >
        <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2">
          <Check className="w-4 h-4" />
          <span>{t("planner.airport.confirmedAirports")}</span>
        </div>
        <div className="space-y-1.5">
          {data.legs.map(leg => {
            const s = selectedAirports[leg.legIndex];
            return (
              <div key={leg.legIndex} className="flex items-center gap-2 text-sm">
                <span className="font-black text-primary text-base">{s.from.iata}</span>
                <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-black text-primary text-base">{s.to.iata}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  /* ── Main widget ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="mt-3 max-w-xl w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15">
          <Plane className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("planner.airport.airportSelection")}
        </span>
      </div>

      {/* Legs */}
      <div className="space-y-4">
        {data.legs.map((leg, idx) => {
          const selected = selectedAirports[leg.legIndex];
          const showFromAlts = showAlternatives[leg.legIndex]?.from || false;
          const showToAlts = showAlternatives[leg.legIndex]?.to || false;
          const allFromAirports = [leg.from.suggestedAirport, ...leg.from.alternativeAirports];
          const allToAirports = [leg.to.suggestedAirport, ...leg.to.alternativeAirports];

          return (
            <motion.div
              key={leg.legIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm overflow-hidden"
            >
              {/* Leg header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/30">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-bold text-foreground truncate">{leg.from.city}</span>
                  <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                    <div className="w-4 h-px bg-border" />
                    <Plane className="w-3 h-3" />
                    <div className="w-4 h-px bg-border" />
                  </div>
                  <span className="text-sm font-bold text-foreground truncate">{leg.to.city}</span>
                </div>
                {leg.date && (
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                    {(leg.date instanceof Date ? leg.date : new Date(leg.date))
                      .toLocaleDateString(i18n.language === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>

              {/* Cards grid — items-stretch forces equal heights */}
              <div className="grid grid-cols-2 gap-3 p-4 items-stretch">
                <PremiumAirportCard
                  airport={selected.from}
                  label={t("planner.airport.departure")}
                  allAirports={allFromAirports}
                  showAlts={showFromAlts}
                  onToggleAlts={() => toggleAlternatives(leg.legIndex, "from")}
                  onSelect={(a) => handleAirportChange(leg.legIndex, "from", a)}
                  disabled={isLoading}
                />
                <PremiumAirportCard
                  airport={selected.to}
                  label={t("planner.airport.arrival")}
                  allAirports={allToAirports}
                  showAlts={showToAlts}
                  onToggleAlts={() => toggleAlternatives(leg.legIndex, "to")}
                  onSelect={(a) => handleAirportChange(leg.legIndex, "to", a)}
                  disabled={isLoading}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Confirm button — compact height, full width */}
      <motion.button
        onClick={handleConfirm}
        disabled={isLoading}
        whileHover={{ scale: 1.012 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative mt-4 w-full py-3 rounded-2xl text-sm font-bold overflow-hidden",
          "bg-primary text-primary-foreground",
          "shadow-md shadow-primary/25",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "flex items-center justify-center gap-2 transition-all"
        )}
      >
        {/* Shimmer */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
          animate={{ x: ["-120%", "120%"] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
        />
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            {t("planner.airport.searchingFlights")}
          </>
        ) : (
          <>
            <Plane className="w-4 h-4 relative z-10" />
            <span className="relative z-10">
              {data.legs.length > 1
                ? t("planner.airport.searchFlightsPlural", { count: data.legs.length })
                : t("planner.airport.searchFlights", { count: data.legs.length })}
            </span>
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
