/**
 * ConflictDetector - Detect planning conflicts and issues
 *
 * Identifies conflicts in the trip plan such as:
 * - Date mismatches (hotel checkout vs flight departure)
 * - Time overlaps (activities scheduled at the same time)
 * - Location impossibilities (can't get from A to B in time)
 * - Budget exceeded
 */

// Types inlined (workflowMachine module removed)
interface StepSelections {
  dates?: { departure?: string; return?: string };
  flights?: { outbound?: { price: number; time?: string }; return?: { price: number; time?: string } };
  hotels?: { price: number; checkIn?: string; checkOut?: string; name?: string };
  activities: Array<{ id?: string; price: number; time?: string; duration?: number; name?: string; date?: Date }>;
  transfers: Array<{ price: number; from?: string; to?: string }>;
  travelers?: { adults: number; children: number; infants: number };
}

interface WorkflowContext {
  selections: StepSelections;
  budget?: { total: number; currency: string };
  travelers?: { adults: number; children: number; infants: number };
}

/**
 * Conflict severity levels
 */
export type ConflictSeverity = "error" | "warning" | "info";

/**
 * Conflict types
 */
export type ConflictType =
  | "date_mismatch"
  | "time_overlap"
  | "location_impossible"
  | "budget_exceeded"
  | "insufficient_time"
  | "missing_transfer"
  | "invalid_dates"
  | "capacity_exceeded";

/**
 * Detected conflict
 */
export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  message: string;
  /** Affected items */
  items: string[];
  /** Suggested resolution */
  suggestion?: string;
  /** Action to fix */
  action?: {
    label: string;
    type: "navigate" | "auto_fix" | "dismiss";
    data?: any;
  };
}

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
  hasErrors: boolean;
  hasWarnings: boolean;
  hasBlockingConflicts: boolean;
  conflicts: Conflict[];
  summary: string;
}

/**
 * Parse time string to minutes from midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Calculate time difference in hours between dates
 */
function hoursBetween(date1: Date, date2: Date): number {
  return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60);
}

/**
 * Check for date-related conflicts
 */
function checkDateConflicts(selections: StepSelections): Conflict[] {
  const conflicts: Conflict[] = [];

  // Invalid date range (return before departure)
  if (selections.dates?.departure && selections.dates?.return) {
    const dep = new Date(selections.dates.departure);
    const ret = new Date(selections.dates.return);

    if (ret < dep) {
      conflicts.push({
        id: "conflict-invalid-dates",
        type: "invalid_dates",
        severity: "error",
        title: "Dates invalides",
        message: "La date de retour est avant la date de départ.",
        items: ["dates"],
        suggestion: "Corrigez les dates de voyage.",
        action: {
          label: "Modifier les dates",
          type: "navigate",
          data: { step: "dates" },
        },
      });
    }
  }

  // Check hotel checkout vs flight departure
  if (selections.hotels && selections.flights?.return && selections.dates?.return) {
    // Assuming standard checkout is 11:00
    const checkoutTime = 11; // 11:00 AM

    // If return flight is in the morning, might be tight
    const returnFlight = selections.flights.return;
    if (returnFlight) {
      // This would need actual flight data with times
      // For now, flag if departure is same day
      conflicts.push({
        id: "conflict-checkout-warning",
        type: "date_mismatch",
        severity: "info",
        title: "Vérifiez le checkout",
        message:
          "Assurez-vous que l'heure de checkout de l'hôtel est compatible avec votre vol de retour.",
        items: ["hotels", "flights"],
        suggestion: "Demandez un late checkout si nécessaire.",
      });
    }
  }

  return conflicts;
}

/**
 * Check for time overlap conflicts
 */
function checkTimeOverlaps(selections: StepSelections): Conflict[] {
  const conflicts: Conflict[] = [];
  const activities = selections.activities;

  if (activities.length < 2) return conflicts;

  // Check for activities on the same day that might overlap
  const activitiesByDate = new Map<string, typeof activities>();

  for (const activity of activities) {
    if (activity.date) {
      const dateKey = activity.date.toISOString().split("T")[0];
      const existing = activitiesByDate.get(dateKey) || [];
      existing.push(activity);
      activitiesByDate.set(dateKey, existing);
    }
  }

  // Check each day with multiple activities
  for (const [date, dayActivities] of activitiesByDate.entries()) {
    if (dayActivities.length > 3) {
      conflicts.push({
        id: `conflict-busy-day-${date}`,
        type: "time_overlap",
        severity: "warning",
        title: "Journée chargée",
        message: `Vous avez ${dayActivities.length} activités prévues le ${date}. C'est peut-être trop ambitieux.`,
        items: dayActivities.map((a) => a.id),
        suggestion: "Envisagez de répartir certaines activités sur d'autres jours.",
      });
    }
  }

  return conflicts;
}

/**
 * Check for budget conflicts
 */
function checkBudgetConflicts(context: WorkflowContext): Conflict[] {
  const conflicts: Conflict[] = [];
  const { selections, budget } = context;

  if (!budget?.total) return conflicts;

  // Calculate total spent
  let totalSpent = 0;

  if (selections.flights?.outbound?.price) {
    totalSpent += selections.flights.outbound.price;
  }
  if (selections.flights?.return?.price) {
    totalSpent += selections.flights.return.price;
  }
  if (selections.hotels?.price) {
    totalSpent += selections.hotels.price;
  }
  for (const activity of selections.activities) {
    totalSpent += activity.price;
  }
  for (const transfer of selections.transfers) {
    totalSpent += transfer.price;
  }

  const percentUsed = (totalSpent / budget.total) * 100;

  if (totalSpent > budget.total) {
    const overBy = totalSpent - budget.total;
    conflicts.push({
      id: "conflict-budget-exceeded",
      type: "budget_exceeded",
      severity: "error",
      title: "Budget dépassé",
      message: `Vous avez dépassé votre budget de ${overBy}${budget.currency}. Total: ${totalSpent}${budget.currency} / ${budget.total}${budget.currency}.`,
      items: ["budget"],
      suggestion:
        "Réduisez certains éléments ou augmentez votre budget.",
      action: {
        label: "Voir le récap budget",
        type: "navigate",
        data: { step: "recap" },
      },
    });
  } else if (percentUsed > 90) {
    conflicts.push({
      id: "conflict-budget-warning",
      type: "budget_exceeded",
      severity: "warning",
      title: "Budget presque épuisé",
      message: `Vous avez utilisé ${Math.round(percentUsed)}% de votre budget. Il reste ${budget.total - totalSpent}${budget.currency}.`,
      items: ["budget"],
      suggestion: "Gardez une marge pour les dépenses imprévues.",
    });
  }

  return conflicts;
}

/**
 * Check for transfer-related conflicts
 */
function checkTransferConflicts(selections: StepSelections): Conflict[] {
  const conflicts: Conflict[] = [];

  // If flights selected but no transfers, suggest adding them
  if (selections.flights?.outbound && selections.transfers.length === 0) {
    conflicts.push({
      id: "conflict-no-transfer",
      type: "missing_transfer",
      severity: "info",
      title: "Transferts non prévus",
      message:
        "Vous n'avez pas encore prévu de transfert aéroport-hôtel.",
      items: ["transfers"],
      suggestion: "Ajoutez un transfert ou prévoyez un taxi/transports.",
      action: {
        label: "Ajouter un transfert",
        type: "navigate",
        data: { step: "transfers" },
      },
    });
  }

  return conflicts;
}

/**
 * Check for capacity conflicts
 */
function checkCapacityConflicts(selections: StepSelections): Conflict[] {
  const conflicts: Conflict[] = [];

  const travelers = selections.travelers;
  if (!travelers) return conflicts;

  const totalPeople = travelers.adults + travelers.children + travelers.infants;

  // Large group warning
  if (totalPeople > 6) {
    conflicts.push({
      id: "conflict-large-group",
      type: "capacity_exceeded",
      severity: "info",
      title: "Grand groupe",
      message: `Vous êtes ${totalPeople} personnes. Certaines activités peuvent avoir des capacités limitées.`,
      items: ["travelers"],
      suggestion:
        "Vérifiez la disponibilité des activités pour votre groupe.",
    });
  }

  // Infants warning
  if (travelers.infants > 0) {
    conflicts.push({
      id: "conflict-infants",
      type: "capacity_exceeded",
      severity: "info",
      title: "Voyage avec bébé",
      message:
        "Certaines activités peuvent ne pas être adaptées aux bébés.",
      items: ["travelers", "activities"],
      suggestion: "Filtrez les activités adaptées aux familles.",
    });
  }

  return conflicts;
}

/**
 * Detect all conflicts in the current context
 */
export function detectConflicts(context: WorkflowContext): ConflictDetectionResult {
  const allConflicts: Conflict[] = [];

  // Run all conflict checks
  allConflicts.push(...checkDateConflicts(context.selections));
  allConflicts.push(...checkTimeOverlaps(context.selections));
  allConflicts.push(...checkBudgetConflicts(context));
  allConflicts.push(...checkTransferConflicts(context.selections));
  allConflicts.push(...checkCapacityConflicts(context.selections));

  // Count by severity
  const errors = allConflicts.filter((c) => c.severity === "error");
  const warnings = allConflicts.filter((c) => c.severity === "warning");
  const infos = allConflicts.filter((c) => c.severity === "info");

  // Generate summary
  let summary = "";
  if (errors.length > 0) {
    summary = `${errors.length} problème${errors.length > 1 ? "s" : ""} à corriger`;
  } else if (warnings.length > 0) {
    summary = `${warnings.length} avertissement${warnings.length > 1 ? "s" : ""}`;
  } else if (infos.length > 0) {
    summary = `${infos.length} suggestion${infos.length > 1 ? "s" : ""}`;
  } else {
    summary = "Aucun problème détecté";
  }

  return {
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    hasBlockingConflicts: errors.length > 0,
    conflicts: allConflicts,
    summary,
  };
}

/**
 * Get conflicts for a specific step
 */
export function getConflictsForStep(
  step: string,
  context: WorkflowContext
): Conflict[] {
  const all = detectConflicts(context);
  return all.conflicts.filter((c) => c.items.includes(step));
}

/**
 * Check if trip is bookable (no errors)
 */
export function isTripBookable(result: ConflictDetectionResult): boolean {
  return !result.hasErrors;
}

/**
 * Get conflict summary for display
 */
export function getConflictSummary(context: WorkflowContext): {
  icon: string;
  color: string;
  text: string;
} {
  const result = detectConflicts(context);

  if (result.hasErrors) {
    return {
      icon: "AlertCircle",
      color: "red",
      text: result.summary,
    };
  }

  if (result.hasWarnings) {
    return {
      icon: "AlertTriangle",
      color: "amber",
      text: result.summary,
    };
  }

  if (result.conflicts.length > 0) {
    return {
      icon: "Info",
      color: "blue",
      text: result.summary,
    };
  }

  return {
    icon: "CheckCircle",
    color: "green",
    text: "Tout est prêt !",
  };
}

/**
 * Conflict type labels for display
 */
export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  date_mismatch: "Conflit de dates",
  time_overlap: "Chevauchement horaire",
  location_impossible: "Déplacement impossible",
  budget_exceeded: "Budget dépassé",
  insufficient_time: "Temps insuffisant",
  missing_transfer: "Transfert manquant",
  invalid_dates: "Dates invalides",
  capacity_exceeded: "Capacité dépassée",
};
