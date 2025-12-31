/**
 * Toast notification utility
 * Wrapper around Sonner with predefined toast types for consistent UX
 */

import { toast as sonnerToast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2 } from "lucide-react";

/**
 * Success toast - green theme
 * Use for: successful actions, confirmations, completions
 */
export const toastSuccess = (message: string, description?: string) => {
  sonnerToast.success(message, {
    description,
    icon: CheckCircle2,
    duration: 4000,
  });
};

/**
 * Error toast - red theme
 * Use for: errors, failures, critical issues
 */
export const toastError = (message: string, description?: string) => {
  sonnerToast.error(message, {
    description,
    icon: XCircle,
    duration: 6000, // Longer duration for errors
  });
};

/**
 * Warning toast - yellow/amber theme
 * Use for: warnings, cautions, important notices
 */
export const toastWarning = (message: string, description?: string) => {
  sonnerToast.warning(message, {
    description,
    icon: AlertCircle,
    duration: 5000,
  });
};

/**
 * Info toast - blue theme
 * Use for: general information, tips, helpful messages
 */
export const toastInfo = (message: string, description?: string) => {
  sonnerToast.info(message, {
    description,
    icon: Info,
    duration: 4000,
  });
};

/**
 * Loading toast - shows until dismissed or promise resolves
 * Use for: long-running operations
 *
 * @returns toast ID to update or dismiss later
 */
export const toastLoading = (message: string, description?: string) => {
  return sonnerToast.loading(message, {
    description,
    icon: Loader2,
  });
};

/**
 * Promise toast - automatically shows loading/success/error states
 * Use for: async operations with clear success/failure states
 *
 * @example
 * toastPromise(
 *   fetchFlights(),
 *   {
 *     loading: "Recherche des vols...",
 *     success: "Vols trouvés !",
 *     error: "Erreur lors de la recherche"
 *   }
 * );
 */
export const toastPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) => {
  return sonnerToast.promise(promise, messages);
};

/**
 * Dismiss a specific toast by ID
 */
export const toastDismiss = (toastId: string | number) => {
  sonnerToast.dismiss(toastId);
};

/**
 * Dismiss all active toasts
 */
export const toastDismissAll = () => {
  sonnerToast.dismiss();
};

/**
 * Custom toast with full control
 */
export const toastCustom = (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
  return sonnerToast(message, options);
};

// Re-export the base toast for advanced usage
export { sonnerToast as toast };
