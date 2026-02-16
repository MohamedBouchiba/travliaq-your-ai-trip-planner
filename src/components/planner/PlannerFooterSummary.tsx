import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface SummaryStat {
  type: 'days' | 'budget' | 'weather' | 'style' | 'cities' | 'people' | 'activities' | 'custom';
  value: string | number;
  icon?: string;
  label?: string;
  color?: 'turquoise' | 'golden';
}

interface PlannerFooterSummaryProps {
  stats?: SummaryStat[];
  summary?: {
    totalDays: number;
    totalBudget: string;
    averageWeather: string;
    travelStyle: string;
  };
  travelers?: number;
  activities?: number;
  cities?: number;
  stopovers?: number;
  destination?: string;
}

const PlannerFooterSummary = ({
  stats,
  summary,
  travelers = 2,
  activities = 0,
  cities = 0,
  stopovers = 0,
  destination = "votre destination",
}: PlannerFooterSummaryProps) => {
  const { t } = useTranslation();

  const typeConfig: Record<string, { icon: LucideIcon; label: string; color: 'turquoise' | 'golden' }> = {
    days: { icon: Icons.Calendar, label: t("travel.summary.stats.days"), color: 'turquoise' },
    budget: { icon: Icons.DollarSign, label: t("travel.summary.stats.budget"), color: 'golden' },
    weather: { icon: Icons.CloudSun, label: t("travel.summary.stats.weather"), color: 'turquoise' },
    style: { icon: Icons.Sparkles, label: t("travel.summary.stats.style"), color: 'golden' },
    cities: { icon: Icons.MapPin, label: t("travel.summary.stats.cities"), color: 'turquoise' },
    people: { icon: Icons.Users, label: t("travel.summary.stats.travelers"), color: 'turquoise' },
    activities: { icon: Icons.Activity, label: t("travel.summary.stats.activities"), color: 'golden' },
    custom: { icon: Icons.Info, label: "INFO", color: 'turquoise' },
  };

  const displayStats = (stats || (summary ? [
    { type: 'days' as const, value: summary.totalDays },
    { type: 'budget' as const, value: summary.totalBudget },
    { type: 'weather' as const, value: summary.averageWeather },
    { type: 'style' as const, value: summary.travelStyle.split(' ')[0] },
    { type: 'people' as const, value: travelers },
    { type: 'activities' as const, value: activities > 0 ? activities : summary.totalDays * 2 },
  ] : [])).map(stat => {
    const config = typeConfig[stat.type];
    let IconComponent: LucideIcon = config.icon;
    if (stat.type === 'custom' && stat.icon) {
      const iconName = stat.icon as keyof typeof Icons;
      IconComponent = (Icons[iconName] as LucideIcon) || config.icon;
    }
    return {
      icon: IconComponent,
      value: stat.value,
      label: stat.label || config.label,
      color: stat.color || config.color,
    };
  });

  return (
    <section
      data-day-id="summary"
      className="relative min-h-[60vh] bg-gradient-to-b from-background to-background/95 text-foreground snap-start flex items-center py-10"
    >
      <div className="w-full px-6">
        <h2 className="font-montserrat text-xl font-bold text-center mb-1">
          {t("travel.summary.title")}
        </h2>
        <p className="text-xs text-muted-foreground text-center mb-5">{destination}</p>

        {/* Compact stat grid — 3 columns */}
        <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
          {displayStats.map((stat, idx) => {
            const Icon = stat.icon;
            const colorClass =
              stat.color === 'turquoise'
                ? 'text-primary'
                : 'text-amber-400';

            return (
              <div
                key={idx}
                className="flex flex-col items-center gap-1 rounded-lg bg-card/60 border border-border/30 p-2.5"
              >
                <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
                <span className="font-montserrat text-sm font-bold text-foreground leading-tight text-center">
                  {stat.value}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground text-center leading-tight">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PlannerFooterSummary;
