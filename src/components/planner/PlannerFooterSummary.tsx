import * as Icons from "lucide-react";
import { LucideIcon, Plane, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TripShareButtons } from "@/components/travel/TripShareButtons";

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
  destination?: string;
  mainImage?: string;
}

const PlannerFooterSummary = ({
  stats,
  summary,
  travelers = 2,
  activities = 0,
  cities = 0,
  destination = "votre destination",
  mainImage,
}: PlannerFooterSummaryProps) => {
  const { t } = useTranslation();

  const typeConfig: Record<string, { icon: LucideIcon; label: string; color: 'turquoise' | 'golden' }> = {
    days: { icon: Icons.Calendar, label: t("travel.summary.stats.days"), color: 'turquoise' },
    budget: { icon: Icons.DollarSign, label: t("travel.summary.stats.budget"), color: 'golden' },
    weather: { icon: Icons.CloudSun, label: t("travel.summary.stats.weather"), color: 'turquoise' },
    style: { icon: Icons.Sparkles, label: t("travel.summary.stats.style"), color: 'golden' },
    people: { icon: Icons.Users, label: t("travel.summary.stats.travelers"), color: 'turquoise' },
    activities: { icon: Icons.Activity, label: t("travel.summary.stats.activities"), color: 'golden' },
    custom: { icon: Icons.Info, label: "INFO", color: 'turquoise' },
  };

  const displayStats = (stats || (summary ? [
    { type: 'days' as const, value: `${summary.totalDays}` },
    { type: 'budget' as const, value: summary.totalBudget },
    { type: 'weather' as const, value: summary.averageWeather },
    { type: 'style' as const, value: summary.travelStyle },
    { type: 'people' as const, value: `${travelers}` },
    { type: 'activities' as const, value: `${activities > 0 ? activities : summary.totalDays * 2}` },
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
      className="relative h-screen snap-start snap-always flex flex-col"
    >
      {/* Background image + overlay */}
      {mainImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${mainImage})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-travliaq-deep-blue/90" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 lg:px-10">
        {/* Destination badge */}
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-travliaq-turquoise" />
          <span className="text-sm font-inter text-white/70 uppercase tracking-widest">{destination}</span>
        </div>

        <h2 className="font-montserrat text-2xl lg:text-3xl font-bold text-center text-white mb-2">
          {t("travel.summary.title")}
        </h2>

        <div className="w-12 h-0.5 bg-gradient-to-r from-travliaq-turquoise to-travliaq-golden-sand rounded-full mb-6" />

        {/* Stats — 2x3 grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-8">
          {displayStats.map((stat, idx) => {
            const Icon = stat.icon;
            const accentClass =
              stat.color === 'turquoise' ? 'text-travliaq-turquoise' : 'text-travliaq-golden-sand';
            const borderClass =
              stat.color === 'turquoise' ? 'border-travliaq-turquoise/20' : 'border-travliaq-golden-sand/20';

            return (
              <div
                key={idx}
                className={`flex flex-col items-center gap-1.5 rounded-2xl bg-white/5 backdrop-blur-md border ${borderClass} p-3 transition-all hover:bg-white/10 hover:scale-[1.02]`}
              >
                <div className={`p-1.5 rounded-lg bg-white/5 ${accentClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-montserrat text-lg font-bold text-white leading-tight text-center">
                  {stat.value}
                </span>
                <span className="text-[7px] uppercase tracking-[0.15em] text-white/40 text-center leading-tight font-medium">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Share button */}
        <TripShareButtons
          title={`Voyage à ${destination}`}
          destination={destination}
          totalDays={summary?.totalDays || 7}
        />
      </div>

      {/* Bottom branding */}
      <div className="relative z-10 pb-6 text-center">
        <div className="flex items-center justify-center gap-1.5 text-white/30">
          <Plane className="h-3 w-3" />
          <span className="text-[10px] font-inter tracking-widest uppercase">Travliaq</span>
        </div>
      </div>
    </section>
  );
};

export default PlannerFooterSummary;
