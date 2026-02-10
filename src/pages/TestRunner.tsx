/**
 * TestRunner - Page d'exécution des tests en direct dans le navigateur
 * Accessible à /test-runner, réservée au développement
 *
 * Supporte l'exécution par catégorie et l'exécution globale.
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
  RotateCcw,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SuiteResult, TestResult } from "@/lib/browser-test-runner";
import { TEST_CATEGORIES, type CategoryInfo } from "@/lib/browser-test-suites";

const TestRunner = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SuiteResult[] | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [lastRunCategories, setLastRunCategories] = useState<string[] | null>(null);
  const startTimeRef = useRef(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(new Set(TEST_CATEGORIES.map((c) => c.id)));
  };

  const clearCategorySelection = () => {
    setSelectedCategories(new Set());
  };

  const runTests = useCallback(
    async (categories?: string[]) => {
      setRunning(true);
      setResults(null);
      setProgress({ current: 0, total: 0 });
      startTimeRef.current = performance.now();
      setLastRunCategories(categories ?? null);

      try {
        const { registerAllBrowserTests } = await import("@/lib/browser-test-suites");
        const { runAllTests } = await import("@/lib/browser-test-runner");

        await registerAllBrowserTests(categories);

        const suiteResults = await runAllTests(
          (_, index, total) => {
            setProgress({ current: index + 1, total });
          },
          categories
        );

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
    },
    []
  );

  const handleRunAll = () => runTests();
  const handleRunSelected = () => {
    if (selectedCategories.size === 0) return runTests();
    return runTests([...selectedCategories]);
  };
  const handleRunCategory = (categoryId: string) => runTests([categoryId]);

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

  // Group results by category
  const resultsByCategory = results
    ? results.reduce(
        (acc, suite) => {
          if (!acc[suite.category]) acc[suite.category] = [];
          acc[suite.category].push(suite);
          return acc;
        },
        {} as Record<string, SuiteResult[]>
      )
    : {};

  const getCategoryMeta = (id: string): CategoryInfo | undefined =>
    TEST_CATEGORIES.find((c) => c.id === id);

  const getCategoryStats = (categoryId: string) => {
    const suites = resultsByCategory[categoryId];
    if (!suites) return null;
    const passed = suites.reduce((a, s) => a + s.passed, 0);
    const failed = suites.reduce((a, s) => a + s.failed, 0);
    const duration = suites.reduce((a, s) => a + s.duration, 0);
    return { passed, failed, total: passed + failed, duration };
  };

  return (
    <>
      <Helmet>
        <title>Test Runner | Travliaq</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <FlaskConical className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <h1 className="text-xl font-bold">Test Runner</h1>
              <p className="text-sm text-muted-foreground">
                {TEST_CATEGORIES.length} catégories · Tests exécutés dans le navigateur
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedCategories.size > 0 && (
                <Button
                  onClick={handleRunSelected}
                  disabled={running}
                  variant="secondary"
                  size="default"
                  className="gap-2"
                >
                  {running ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Filter className="h-4 w-4" />
                  )}
                  Lancer la sélection ({selectedCategories.size})
                </Button>
              )}
              <Button
                onClick={handleRunAll}
                disabled={running}
                variant="default"
                size="default"
                className="gap-2"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {running ? "En cours..." : "Tout lancer"}
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Category selection chips */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Catégories
              </h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllCategories} className="text-xs">
                  Tout sélectionner
                </Button>
                <Button variant="ghost" size="sm" onClick={clearCategorySelection} className="text-xs">
                  Effacer
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEST_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.has(cat.id);
                const stats = getCategoryStats(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-card border-border hover:border-primary/30 text-foreground"
                    }`}
                  >
                    <span className="text-base">{cat.emoji}</span>
                    <span className="font-medium">{cat.label}</span>
                    {stats && (
                      <Badge
                        variant={stats.failed > 0 ? "destructive" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {stats.passed}/{stats.total}
                      </Badge>
                    )}
                    {!running && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunCategory(cat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-primary/20 transition-opacity"
                        title={`Lancer ${cat.label}`}
                      >
                        <Play className="h-3 w-3" />
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

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

          {/* Global summary */}
          {results && !running && (
            <>
              <div className="grid grid-cols-4 gap-4">
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
                <Card className="border-border">
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-muted-foreground">
                      {(totalDuration / 1000).toFixed(2)}s
                    </p>
                    <p className="text-sm text-muted-foreground">Durée</p>
                  </CardContent>
                </Card>
              </div>
              {lastRunCategories && (
                <p className="text-xs text-muted-foreground">
                  Filtré : {lastRunCategories.map((c) => getCategoryMeta(c)?.label || c).join(", ")}
                </p>
              )}
            </>
          )}

          {/* No results yet */}
          {!results && !running && (
            <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
              <FlaskConical className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Sélectionnez des catégories puis cliquez sur <strong>Lancer la sélection</strong>,
                ou <strong>Tout lancer</strong> pour exécuter les {TEST_CATEGORIES.length} catégories.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {TEST_CATEGORIES.map((cat) => (
                  <span key={cat.id} className="text-xs text-muted-foreground/60">
                    {cat.emoji} {cat.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Results grouped by category */}
          {results && !running && (
            <div className="space-y-6">
              {Object.entries(resultsByCategory).map(([categoryId, suites]) => {
                const catMeta = getCategoryMeta(categoryId);
                const stats = getCategoryStats(categoryId)!;
                const allPassed = stats.failed === 0;

                return (
                  <div key={categoryId} className="space-y-2">
                    {/* Category header */}
                    <div className="flex items-center gap-3 pb-1 border-b border-border">
                      <span className="text-lg">{catMeta?.emoji || "📦"}</span>
                      <h3 className="text-sm font-semibold flex-1">
                        {catMeta?.label || categoryId}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {catMeta?.description}
                      </span>
                      <Badge variant={allPassed ? "secondary" : "destructive"} className="text-xs">
                        {stats.passed}/{stats.total}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {stats.duration.toFixed(1)}ms
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleRunCategory(categoryId)}
                        disabled={running}
                        title="Relancer cette catégorie"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Suites in this category */}
                    <div className="space-y-2 pl-2">
                      {suites.map((suite) => {
                        const expanded = expandedSuites.has(suite.name);
                        const suiteAllPassed = suite.failed === 0;

                        return (
                          <Card
                            key={suite.name}
                            className={suiteAllPassed ? "border-green-500/20" : "border-destructive/20"}
                          >
                            <CardHeader
                              className="pb-2 cursor-pointer select-none py-2 px-3"
                              onClick={() => toggleSuite(suite.name)}
                            >
                              <CardTitle className="text-xs flex items-center gap-2">
                                {expanded ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                )}
                                {suiteAllPassed ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-destructive" />
                                )}
                                <span className="flex-1 font-medium">{suite.name}</span>
                                <Badge
                                  variant={suiteAllPassed ? "secondary" : "destructive"}
                                  className="text-[10px]"
                                >
                                  {suite.passed}/{suite.passed + suite.failed}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  {suite.duration.toFixed(1)}ms
                                </span>
                              </CardTitle>
                            </CardHeader>

                            {expanded && (
                              <CardContent className="pt-0 px-3 pb-2">
                                <div className="space-y-0.5">
                                  {suite.tests.map((test, i) => (
                                    <div
                                      key={i}
                                      className={`flex items-start gap-2 text-[11px] py-0.5 px-2 rounded ${
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
                  </div>
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
