/**
 * BookingStepConfirmation - Confirmation step of the booking flow
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Check,
  Mail,
  ExternalLink,
  Copy,
  CheckCircle,
  Download,
} from "lucide-react";
import type { BookingSummary } from "./BookingFlowWidget";

interface ConfirmationStepProps {
  summary: BookingSummary;
  onExport?: (format: "pdf" | "email") => void;
  onComplete?: () => void;
}

export function ConfirmationStep({ summary, onExport, onComplete }: ConfirmationStepProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const confirmedItems = summary.items.filter((i) => i.status === "confirmed");
  const pendingItems = summary.items.filter((i) => i.status !== "confirmed");

  const handleCopyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Success message */}
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {t("planner.booking.tripReady")}
        </h3>
        <p className="text-muted-foreground">
          {confirmedItems.length > 0
            ? confirmedItems.length > 1
              ? t("planner.booking.reservationsConfirmedPlural", { count: confirmedItems.length })
              : t("planner.booking.reservationsConfirmed", { count: confirmedItems.length })
            : t("planner.booking.finalizeBelow")}
        </p>
      </div>

      {/* Confirmed items */}
      {confirmedItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">
            {t("planner.booking.confirmedReservations")}
          </h4>
          {confirmedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            >
              <div>
                <div className="font-medium">{item.name}</div>
                {item.reference && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    {t("planner.booking.ref")}: {item.reference}
                    <button
                      type="button"
                      onClick={() => handleCopyReference(item.reference!)}
                      className="text-primary hover:underline"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
              </div>
              <CheckCircle size={20} className="text-green-500" />
            </div>
          ))}
        </div>
      )}

      {/* Pending items */}
      {pendingItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">
            {t("planner.booking.toBook")}
          </h4>
          {pendingItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">
                  {item.price}
                  {item.currency}
                </div>
              </div>
              {item.bookingUrl && (
                <a
                  href={item.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "transition-all hover:scale-[1.02]"
                  )}
                >
                  {t("planner.booking.reserve")}
                  <ExternalLink size={14} className="inline ml-1.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Export options */}
      <div className="flex gap-3 pt-4 border-t">
        {onExport && (
          <>
            <button
              type="button"
              onClick={() => onExport("pdf")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border hover:bg-muted transition-colors"
            >
              <Download size={16} />
              {t("planner.booking.downloadPdf")}
            </button>
            <button
              type="button"
              onClick={() => onExport("email")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border hover:bg-muted transition-colors"
            >
              <Mail size={16} />
              {t("planner.booking.sendByEmail")}
            </button>
          </>
        )}
      </div>

      {/* Complete button */}
      {onComplete && (
        <button
          type="button"
          onClick={onComplete}
          className={cn(
            "w-full py-3 rounded-lg font-medium transition-all",
            "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {t("planner.booking.finish")}
        </button>
      )}
    </div>
  );
}
