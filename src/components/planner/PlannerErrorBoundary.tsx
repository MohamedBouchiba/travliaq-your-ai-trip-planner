import { Component, ReactNode } from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorFallbackProps {
  error: unknown;
  resetErrorBoundary: (...args: unknown[]) => void;
  componentName?: string;
}

function ErrorFallback({ error, resetErrorBoundary, componentName }: ErrorFallbackProps) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    <div className="flex items-center justify-center p-8 h-full w-full">
      <Card className="max-w-md w-full border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg">Une erreur est survenue</CardTitle>
              {componentName && (
                <CardDescription className="text-xs mt-1">
                  Composant : {componentName}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm text-muted-foreground font-mono break-words">
              {message || "Erreur inconnue"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={resetErrorBoundary}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Recharger la page
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Si le problème persiste, veuillez contacter le support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface PlannerErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function PlannerErrorBoundary({
  children,
  componentName,
  onError,
}: PlannerErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log l'erreur en console pour le debugging
    console.error(
      `[PlannerErrorBoundary${componentName ? ` - ${componentName}` : ""}]`,
      error,
      errorInfo
    );

    // Callback optionnel pour logging externe (ex: Sentry)
    if (onError) {
      onError(error, errorInfo);
    }
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => (
        <ErrorFallback {...props} componentName={componentName} />
      )}
      onError={handleError}
      onReset={() => {
        // Optionnel : reset state global si nécessaire
        console.log(`[PlannerErrorBoundary] Reset${componentName ? ` - ${componentName}` : ""}`);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
