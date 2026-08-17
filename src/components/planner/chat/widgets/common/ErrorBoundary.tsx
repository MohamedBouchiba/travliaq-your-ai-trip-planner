/**
 * ErrorBoundary - Catches and handles errors in chat widgets
 *
 * Provides graceful degradation when widgets fail to render,
 * with retry functionality and error reporting.
 */

import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import i18n from "i18next";
import { useDebugStore } from "@/stores/debugStore";

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI to show on error */
  fallback?: ReactNode;
  /** Widget name for error reporting */
  widgetName?: string;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show retry button */
  showRetry?: boolean;
  /** Custom retry handler */
  onRetry?: () => void;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the entire application.
 *
 * @example
 * ```tsx
 * <ErrorBoundary widgetName="DatePicker" showRetry>
 *   <DatePickerWidget />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error for debugging
    console.error(`[ErrorBoundary] ${this.props.widgetName || "Widget"} error:`, error);
    console.error("Component stack:", errorInfo.componentStack);

    // Capture in debug store
    if (import.meta.env.DEV) {
      useDebugStore.getState().addWidgetError({
        timestamp: Date.now(),
        widgetName: this.props.widgetName || "unknown",
        errorMessage: error.message,
        componentStack: errorInfo.componentStack?.slice(0, 500),
      });
    }

    // Notify parent if callback provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <WidgetErrorFallback
          widgetName={this.props.widgetName}
          error={this.state.error}
          showRetry={this.props.showRetry}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
interface WidgetErrorFallbackProps {
  widgetName?: string;
  error?: Error | null;
  showRetry?: boolean;
  onRetry?: () => void;
}

export function WidgetErrorFallback({
  widgetName,
  error,
  showRetry = true,
  onRetry,
}: WidgetErrorFallbackProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
      <p className="text-sm font-medium text-red-700 dark:text-red-300 text-center">
        {widgetName
          ? i18n.t("planner.widget.loadError", { widget: widgetName, defaultValue: `${widgetName} failed to load` })
          : i18n.t("planner.widget.loadErrorGeneric", "Loading error")}
      </p>
      {error && import.meta.env.DEV && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1 text-center max-w-xs truncate">
          {error.message}
        </p>
      )}
      {showRetry && onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 text-red-600 border-red-300 hover:bg-red-100 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/40"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          {i18n.t("planner.widget.retry", "Retry")}
        </Button>
      )}
    </div>
  );
}

/**
 * Higher-order component to wrap any widget with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<ErrorBoundaryProps, "children"> = {}
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";

  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary widgetName={displayName} {...options}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}

export default ErrorBoundary;
