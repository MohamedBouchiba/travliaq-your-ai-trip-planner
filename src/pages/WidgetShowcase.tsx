/**
 * WidgetShowcase - Live catalog page for all chat widgets
 * Renders actual widgets with mock data for visual reference
 */

import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Calendar, Users, Plane, MapPin, Settings, Filter, Clock, TrendingUp, Bell, AlertCircle, Navigation, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Core widgets
import { DatePickerWidget } from "@/components/planner/chat/widgets/DatePickerWidget";
import { TravelersWidget } from "@/components/planner/chat/widgets/TravelersWidget";
import { PreferenceStyleWidget } from "@/components/planner/chat/widgets/PreferenceStyleWidget";
import { PreferenceInterestsWidget } from "@/components/planner/chat/widgets/PreferenceInterestsWidget";
import { MustHavesWidget } from "@/components/planner/chat/widgets/MustHavesWidget";
import { DietaryWidget } from "@/components/planner/chat/widgets/DietaryWidget";
import { ConfirmedWidget } from "@/components/planner/chat/widgets/ConfirmedWidget";

// Selection widgets
import { StarRatingSelector } from "@/components/planner/chat/widgets/selection/StarRatingSelector";
import { BudgetRangeSlider } from "@/components/planner/chat/widgets/selection/BudgetRangeSlider";
import { CabinClassSelector } from "@/components/planner/chat/widgets/selection/CabinClassSelector";
import { DirectFlightToggle } from "@/components/planner/chat/widgets/selection/DirectFlightToggle";
import { DurationChips } from "@/components/planner/chat/widgets/selection/DurationChips";
import { QuickFilterChips } from "@/components/planner/chat/widgets/selection/QuickFilterChips";

// Noop handlers
const noop = () => {};
const noopDate = (_d: Date) => {};
const noopTravelers = (_t: { adults: number; children: number; infants: number }) => {};

interface ShowcaseSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  widgets: Array<{
    name: string;
    description: string;
    status: "stable" | "beta";
    render: () => React.ReactNode;
  }>;
}

const WidgetShowcase = () => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const sections: ShowcaseSection[] = [
    {
      id: "core",
      title: "Widgets de base",
      icon: <Calendar className="h-5 w-5" />,
      description: "Widgets fondamentaux pour la sélection de dates, voyageurs et confirmations",
      widgets: [
        {
          name: "DatePickerWidget",
          description: "Calendrier inline pour sélection de date",
          status: "stable",
          render: () => (
            <DatePickerWidget
              label="Date de départ"
              value={null}
              onChange={noopDate}
              skipStoreSync
            />
          ),
        },
        {
          name: "TravelersWidget",
          description: "Compteur adultes/enfants/bébés",
          status: "stable",
          render: () => (
            <TravelersWidget
              initialValues={{ adults: 2, children: 1, infants: 0 }}
              onConfirm={noopTravelers}
              skipStoreSync
            />
          ),
        },
        {
          name: "ConfirmedWidget",
          description: "Affichage d'une sélection confirmée",
          status: "stable" as const,
          render: () => (
            <ConfirmedWidget widgetType="dateRangePicker" selectedValue={{ departureDate: "2026-03-15", returnDate: "2026-03-22" }} displayLabel="15 mars → 22 mars 2026" />
          ),
        },
      ],
    },
    {
      id: "preferences",
      title: "Widgets Préférences",
      icon: <Settings className="h-5 w-5" />,
      description: "Collecte des préférences de voyage",
      widgets: [
        {
          name: "PreferenceStyleWidget",
          description: "Curseurs style (relax/intense, ville/nature, budget/luxe, touriste/authentique)",
          status: "stable",
          render: () => <PreferenceStyleWidget onContinue={noop} />,
        },
        {
          name: "PreferenceInterestsWidget",
          description: "Sélection centres d'intérêt (max 5)",
          status: "stable",
          render: () => <PreferenceInterestsWidget onContinue={noop} />,
        },
        {
          name: "MustHavesWidget",
          description: "Critères indispensables (accessibilité, animaux, etc.)",
          status: "stable",
          render: () => <MustHavesWidget onContinue={noop} />,
        },
        {
          name: "DietaryWidget",
          description: "Restrictions alimentaires",
          status: "stable",
          render: () => <DietaryWidget onContinue={noop} />,
        },
      ],
    },
    {
      id: "selection",
      title: "Widgets Sélection",
      icon: <Filter className="h-5 w-5" />,
      description: "Filtres rapides et sélecteurs",
      widgets: [
        {
          name: "StarRatingSelector",
          description: "Sélecteur d'étoiles hôtel",
          status: "stable",
          render: () => (
            <StarRatingSelector
              onRatingChange={noop}
              initialRatings={[3, 4]}
              showAnyOption
            />
          ),
        },
        {
          name: "BudgetRangeSlider",
          description: "Curseur plage de budget",
          status: "stable",
          render: () => (
            <BudgetRangeSlider
              onBudgetChange={noop}
              currency="€"
            />
          ),
        },
        {
          name: "CabinClassSelector",
          description: "Classe de cabine vol",
          status: "stable",
          render: () => (
            <CabinClassSelector onCabinChange={noop} />
          ),
        },
        {
          name: "DirectFlightToggle",
          description: "Toggle vols directs / escales",
          status: "stable",
          render: () => (
            <DirectFlightToggle onChange={noop} />
          ),
        },
        {
          name: "DurationChips",
          description: "Filtres durée activité",
          status: "stable",
          render: () => (
            <DurationChips onDurationChange={noop} />
          ),
        },
        {
          name: "QuickFilterChips",
          description: "Chips de filtres configurables",
          status: "stable",
          render: () => (
            <QuickFilterChips
              groups={[
                {
                  id: "amenities",
                  label: "Équipements",
                  chips: [
                    { id: "wifi", label: "WiFi", value: "wifi", icon: "📶" },
                    { id: "pool", label: "Piscine", value: "pool", icon: "🏊" },
                    { id: "spa", label: "Spa", value: "spa", icon: "💆" },
                    { id: "gym", label: "Salle sport", value: "gym", icon: "🏋️" },
                    { id: "parking", label: "Parking", value: "parking", icon: "🅿️" },
                  ],
                },
              ]}
              onFilterChange={noop}
            />
          ),
        },
      ],
    },
  ];

  const totalWidgets = sections.reduce((acc, s) => acc + s.widgets.length, 0);

  return (
    <>
      <Helmet>
        <title>Widget Showcase | Travliaq</title>
        <meta name="description" content="Catalogue visuel des widgets chat Travliaq" />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/planner" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Widget Showcase</h1>
              <p className="text-sm text-muted-foreground">{totalWidgets} widgets affichés en live</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-8">
          {sections.map((section) => {
            const isCollapsed = collapsedSections.has(section.id);
            return (
              <Card key={section.id}>
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => toggleSection(section.id)}
                >
                  <CardTitle className="flex items-center gap-3">
                    {section.icon}
                    {section.title}
                    <Badge variant="secondary">{section.widgets.length}</Badge>
                    <span className="ml-auto text-muted-foreground">
                      {isCollapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </span>
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                {!isCollapsed && (
                  <CardContent>
                    <div className="space-y-8">
                      {section.widgets.map((widget) => (
                        <div key={widget.name} className="space-y-2">
                          {/* Widget label */}
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-semibold text-primary">{widget.name}</code>
                            <Badge variant={widget.status === "stable" ? "default" : "outline"} className="text-xs">
                              {widget.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">— {widget.description}</span>
                          </div>
                          {/* Live widget render */}
                          <div className="max-w-md rounded-xl border border-dashed border-border/60 bg-muted/20 p-4">
                            {widget.render()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </main>
      </div>
    </>
  );
};

export default WidgetShowcase;
