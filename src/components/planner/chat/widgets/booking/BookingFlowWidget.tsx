/**
 * BookingFlowWidget - Complete booking process widget
 *
 * Guides users through the final booking steps including
 * summary review, traveler details, and payment initiation.
 *
 * Step components extracted to BookingStep*.tsx files.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Check,
  Mail,
  Phone,
  Shield,
  Wallet,
} from "lucide-react";
import { SummaryStep } from "./BookingStepSummary";
import { TravelersStep } from "./BookingStepTravelers";
import { ConfirmationStep } from "./BookingStepConfirmation";

/**
 * Booking step
 */
export type BookingStep = "summary" | "travelers" | "contact" | "payment" | "confirmation";

/**
 * Traveler info
 */
export interface TravelerInfo {
  id: string;
  type: "adult" | "child" | "infant";
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  passport?: string;
  nationality?: string;
}

/**
 * Contact info
 */
export interface ContactInfo {
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

/**
 * Booking item
 */
export interface BookingItem {
  id: string;
  type: "flight" | "hotel" | "activity" | "transfer";
  name: string;
  description?: string;
  price: number;
  currency: string;
  /** Booking reference if already booked */
  reference?: string;
  /** External booking URL */
  bookingUrl?: string;
  /** Status */
  status: "pending" | "processing" | "confirmed" | "failed";
  /** Additional details */
  details?: Record<string, string>;
}

/**
 * Booking summary
 */
export interface BookingSummary {
  items: BookingItem[];
  subtotal: number;
  fees?: number;
  discount?: number;
  total: number;
  currency: string;
  travelers: {
    adults: number;
    children: number;
    infants: number;
  };
  dates: {
    departure: Date;
    return?: Date;
  };
  destination: string;
}

/**
 * BookingFlowWidget props
 */
interface BookingFlowWidgetProps {
  /** Booking summary */
  summary: BookingSummary;
  /** Initial step */
  initialStep?: BookingStep;
  /** Traveler info change handler */
  onTravelersChange?: (travelers: TravelerInfo[]) => void;
  /** Contact info change handler */
  onContactChange?: (contact: ContactInfo) => void;
  /** Book item handler */
  onBookItem?: (itemId: string) => void;
  /** Complete booking handler */
  onComplete?: () => void;
  /** Export trip handler */
  onExport?: (format: "pdf" | "email") => void;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Step indicator
 */
function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: { id: BookingStep; label: string }[];
  currentStep: BookingStep;
  onStepClick?: (step: BookingStep) => void;
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step circle */}
            <button
              type="button"
              onClick={() => isCompleted && onStepClick?.(step.id)}
              disabled={!isCompleted}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all",
                isCompleted &&
                  "bg-green-500 text-white cursor-pointer hover:bg-green-600",
                isCurrent && "bg-primary text-primary-foreground",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? <Check size={16} /> : index + 1}
            </button>

            {/* Step label */}
            <span
              className={cn(
                "ml-2 text-sm hidden sm:block",
                isCurrent ? "font-medium" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-3",
                  index < currentIndex ? "bg-green-500" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Contact step content (kept inline — small component)
 */
function ContactStep({
  contact,
  onChange,
  onContinue,
  onBack,
}: {
  contact: ContactInfo;
  onChange: (contact: ContactInfo) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const isValid = contact.email && contact.phone;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        {t("planner.booking.contactInfo")}
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div>
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Mail size={14} />
            {t("planner.booking.email")} *
          </label>
          <input
            type="email"
            value={contact.email}
            onChange={(e) => onChange({ ...contact, email: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="jean.dupont@email.com"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Phone size={14} />
            {t("planner.booking.phone")} *
          </label>
          <input
            type="tel"
            value={contact.phone}
            onChange={(e) => onChange({ ...contact, phone: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="+33 6 12 34 56 78"
          />
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm">
        <Shield size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          {t("planner.booking.securityNote")}
        </span>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-lg font-medium border hover:bg-muted transition-colors"
        >
          {t("planner.booking.back")}
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!isValid}
          className={cn(
            "flex-1 py-3 rounded-lg font-medium transition-all",
            isValid
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {t("planner.booking.finalize")}
        </button>
      </div>
    </div>
  );
}

/**
 * BookingFlowWidget Component
 */
export function BookingFlowWidget({
  summary,
  initialStep = "summary",
  onTravelersChange,
  onContactChange,
  onBookItem,
  onComplete,
  onExport,
  compact = false,
}: BookingFlowWidgetProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<BookingStep>(initialStep);
  const [travelers, setTravelers] = useState<TravelerInfo[]>([]);
  const [contact, setContact] = useState<ContactInfo>({ email: "", phone: "" });

  const steps: { id: BookingStep; label: string }[] = [
    { id: "summary", label: t("planner.booking.summary") },
    { id: "travelers", label: t("planner.booking.travelers") },
    { id: "contact", label: t("planner.booking.contact") },
    { id: "confirmation", label: t("planner.booking.confirmation") },
  ];

  const handleTravelersChange = (newTravelers: TravelerInfo[]) => {
    setTravelers(newTravelers);
    onTravelersChange?.(newTravelers);
  };

  const handleContactChange = (newContact: ContactInfo) => {
    setContact(newContact);
    onContactChange?.(newContact);
  };

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", compact ? "p-3" : "p-4")}>
      {/* Step indicator */}
      <StepIndicator
        steps={steps}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

      {/* Step content */}
      {currentStep === "summary" && (
        <SummaryStep
          summary={summary}
          onContinue={() => setCurrentStep("travelers")}
          onBookItem={onBookItem}
        />
      )}

      {currentStep === "travelers" && (
        <TravelersStep
          travelers={travelers}
          requiredCount={summary.travelers}
          onChange={handleTravelersChange}
          onContinue={() => setCurrentStep("contact")}
          onBack={() => setCurrentStep("summary")}
        />
      )}

      {currentStep === "contact" && (
        <ContactStep
          contact={contact}
          onChange={handleContactChange}
          onContinue={() => setCurrentStep("confirmation")}
          onBack={() => setCurrentStep("travelers")}
        />
      )}

      {currentStep === "confirmation" && (
        <ConfirmationStep
          summary={summary}
          onExport={onExport}
          onComplete={onComplete}
        />
      )}
    </div>
  );
}

/**
 * Compact booking summary card
 */
export function BookingSummaryCard({
  total,
  currency,
  itemCount,
  onClick,
}: {
  total: number;
  currency: string;
  itemCount: number;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-lg",
        "bg-primary/10 border border-primary/20",
        "hover:bg-primary/15 transition-colors"
      )}
    >
      <div className="flex items-center gap-3">
        <Wallet className="text-primary" size={20} />
        <div className="text-left">
          <div className="font-medium">
            {itemCount} {itemCount > 1 ? t("planner.booking.itemsSelected") : t("planner.booking.itemSelected")}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("planner.booking.readyToBook")}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold text-primary">
          {total}
          {currency}
        </div>
        <div className="text-xs text-muted-foreground">{t("planner.booking.total")}</div>
      </div>
    </button>
  );
}

export default BookingFlowWidget;
