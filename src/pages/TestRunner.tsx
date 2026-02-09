/**
 * TestRunner - Page de visualisation des suites de tests du projet
 * Accessible à /test-runner, réservée au développement
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Play, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TestSuite {
  name: string;
  file: string;
  description: string;
  tests: number;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: "Validators",
    file: "src/components/planner/chat/utils/__tests__/validators.test.ts",
    description: "Validation des entrées utilisateur chat (78 tests)",
    tests: 78,
  },
  {
    name: "Security",
    file: "src/components/planner/chat/utils/__tests__/security.test.ts",
    description: "Tests de sécurité et sanitisation (57 tests)",
    tests: 57,
  },
  {
    name: "Parse Action",
    file: "src/components/planner/chat/utils/__tests__/parseAction.test.ts",
    description: "Parsing des tags action dans le chat (11 tests)",
    tests: 11,
  },
  {
    name: "Questionnaire Logic",
    file: "src/test/questionnaire.test.tsx",
    description: "Cohérence du calcul d'étapes du questionnaire (25 tests)",
    tests: 25,
  },
  {
    name: "Questionnaire Data Integrity",
    file: "src/test/questionnaire-data-integrity.test.tsx",
    description: "Intégrité des constantes du questionnaire (35 tests)",
    tests: 35,
  },
  {
    name: "Questionnaire Submission",
    file: "src/test/questionnaire-submission.test.tsx",
    description: "Normalisation des données de soumission (33 tests)",
    tests: 33,
  },
  {
    name: "Hotel Service",
    file: "src/test/hotel-service-request.test.ts",
    description: "Construction des requêtes API hôtels (4 tests)",
    tests: 4,
  },
  {
    name: "Travelers Widget",
    file: "src/components/planner/chat/widgets/__tests__/TravelersWidget.test.tsx",
    description: "Widget sélection voyageurs",
    tests: 5,
  },
  {
    name: "City Selection Widget",
    file: "src/components/planner/chat/widgets/__tests__/CitySelectionWidget.test.tsx",
    description: "Widget sélection de ville",
    tests: 3,
  },
  {
    name: "Airport Widgets",
    file: "src/components/planner/chat/widgets/__tests__/AirportWidgets.test.tsx",
    description: "Widgets sélection aéroports",
    tests: 4,
  },
];

const TestRunner = () => {
  const totalTests = TEST_SUITES.reduce((acc, s) => acc + s.tests, 0);

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
            <div>
              <h1 className="text-xl font-bold">Test Runner</h1>
              <p className="text-sm text-muted-foreground">
                {TEST_SUITES.length} suites · ~{totalTests} tests au total
              </p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              Les tests sont exécutés via <code className="text-primary font-mono">vitest</code> dans le terminal Lovable.
              Cette page liste les suites de tests disponibles dans le projet.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {TEST_SUITES.map((suite) => (
              <Card key={suite.file} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-primary" />
                    {suite.name}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {suite.tests} tests
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{suite.description}</p>
                  <code className="text-xs text-muted-foreground/70 block truncate">
                    {suite.file}
                  </code>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </>
  );
};

export default TestRunner;
