/**
 * TestRunner - Page d'exécution des tests en direct dans le navigateur
 * Accessible à /test-runner, réservée au développement
 */

import { useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Play,
  FlaskConical,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SuiteResult, TestResult } from "@/lib/browser-test-runner";

const TestRunner = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SuiteResult[] | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const startTimeRef = useRef(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const runTests = useCallback(async () => {
    setRunning(true);
    setResults(null);
    setProgress({ current: 0, total: 0 });
    startTimeRef.current = performance.now();

    try {
      // Dynamic import to avoid loading test code on initial page load
      const { registerAllBrowserTests } = await import("@/lib/browser-test-suites");
      const { runAllTests } = await import("@/lib/browser-test-runner");

      registerAllBrowserTests();

      const suiteResults = await runAllTests((_, index, total) => {
        setProgress({ current: index + 1, total });
      });

      setResults(suiteResults);
      setTotalDuration(performance.now() - startTimeRef.current);

      // Auto-expand failed suites
      const failedSuites = new Set<string>();
      suiteResults.forEach((s) => {
        if (s.failed > 0) failedSuites.add(s.name);
      });
      setExpandedSuites(failedSuites);
    } catch (e) {
      console.error("Test runner error:", e);
    } finally {
      setRunning(false);
    }
  }, []);

  const toggleSuite = (name: string) => {
    setExpandedSuites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const totalPassed = results?.reduce((a, s) => a + s.passed, 0) ?? 0;
  const totalFailed = results?.reduce((a, s) => a + s.failed, 0) ?? 0;
  const totalTests = totalPassed + totalFailed;

  return (
    <>
      <Helmet>
        <title>Test Runner | Travliaq</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <FlaskConical className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <h1 className="text-xl font-bold">Test Runner</h1>
              <p className="text-sm text-muted-foreground">
                Tests unitaires exécutés dans le navigateur
              </p>
            </div>
            <Button
              onClick={runTests}
              disabled={running}
              variant="default"
              size="lg"
              className="gap-2"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {running ? "En cours..." : "Lancer les tests"}
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-6">
          {/* Progress bar */}
          {running && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Exécution en cours...</span>
                <span>
                  {progress.current}/{progress.total}
                </span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          )}

          {/* Summary */}
          {results && !running && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-primary/30">
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold">{totalTests}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card className="border-green-500/30">
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-green-500">{totalPassed}</p>
                  <p className="text-sm text-muted-foreground">Réussis</p>
                </CardContent>
              </Card>
              <Card className={totalFailed > 0 ? "border-destructive/30" : "border-green-500/30"}>
                <CardContent className="pt-6 text-center">
                  <p className={`text-3xl font-bold ${totalFailed > 0 ? "text-destructive" : "text-green-500"}`}>
                    {totalFailed}
                  </p>
                  <p className="text-sm text-muted-foreground">Échoués</p>
                </CardContent>
              </Card>
            </div>
          )}

          {results && !running && (
            <p className="text-sm text-muted-foreground text-right">
              Terminé en {(totalDuration / 1000).toFixed(2)}s
            </p>
          )}

          {/* No results yet */}
          {!results && !running && (
            <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
              <FlaskConical className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Cliquez sur <strong>Lancer les tests</strong> pour exécuter les suites de tests
                directement dans le navigateur.
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                Validators · Security · ParseAction — fonctions pures testées sans serveur
              </p>
            </div>
          )}

          {/* Suite results */}
          {results && (
            <div className="space-y-3">
              {results.map((suite) => {
                const expanded = expandedSuites.has(suite.name);
                const allPassed = suite.failed === 0;

                return (
                  <Card key={suite.name} className={allPassed ? "border-green-500/20" : "border-destructive/20"}>
                    <CardHeader
                      className="pb-2 cursor-pointer select-none"
                      onClick={() => toggleSuite(suite.name)}
                    >
                      <CardTitle className="text-sm flex items-center gap-2">
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {allPassed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="flex-1">{suite.name}</span>
                        <Badge variant={allPassed ? "secondary" : "destructive"} className="text-xs">
                          {suite.passed}/{suite.passed + suite.failed}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-normal">
                          {suite.duration.toFixed(1)}ms
                        </span>
                      </CardTitle>
                    </CardHeader>

                    {expanded && (
                      <CardContent className="pt-0">
                        <div className="space-y-1">
                          {suite.tests.map((test, i) => (
                            <div
                              key={i}
                              className={`flex items-start gap-2 text-xs py-1 px-2 rounded ${
                                test.passed
                                  ? "text-muted-foreground"
                                  : "text-destructive bg-destructive/5"
                              }`}
                            >
                              {test.passed ? (
                                <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="block truncate">
                                  {test.name.split(" > ").pop()}
                                </span>
                                {test.error && (
                                  <span className="block text-destructive/80 mt-0.5 font-mono text-[10px] break-all">
                                    {test.error}
                                  </span>
                                )}
                              </div>
                              <span className="text-muted-foreground/50 shrink-0">
                                {test.duration.toFixed(1)}ms
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default TestRunner;
