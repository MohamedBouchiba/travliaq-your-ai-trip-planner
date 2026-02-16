import { useMemo } from "react";
import * as Icons from "lucide-react";
import { LucideIcon, Plane, MapPin, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TripShareButtons } from "@/components/travel/TripShareButtons";
import { motion } from "framer-motion";

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

  const displayStats = useMemo(() => (stats || (summary ? [
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
  }), [stats, summary, travelers, activities]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <section
      data-day-id="summary"
      className="relative h-screen snap-start snap-always flex flex-col overflow-hidden"
    >
      {/* Background image with cinematic treatment */}
      {mainImage && (
        <motion.div
          initial={{ scale: 1.15 }}
          whileInView={{ scale: 1.0 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${mainImage})` }}
        />
      )}
      
      {/* Multi-layer gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-br from-travliaq-deep-blue/50 via-transparent to-travliaq-turquoise/10" />
      
      {/* Subtle animated glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-travliaq-turquoise/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-5 lg:px-8">
        {/* Destination pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4"
        >
          <MapPin className="h-3.5 w-3.5 text-travliaq-turquoise" />
          <span className="text-xs font-montserrat font-semibold text-white/90 uppercase tracking-[0.2em]">
            {destination}
          </span>
        </motion.div>

        {/* Title with gradient text */}
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
          className="font-montserrat text-2xl lg:text-4xl font-extrabold text-center mb-1 bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent"
        >
          {t("travel.summary.title")}
        </motion.h2>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="w-16 h-[2px] bg-gradient-to-r from-travliaq-turquoise via-travliaq-golden-sand to-travliaq-turquoise rounded-full mb-7 origin-center"
        />

        {/* Stats grid with stagger animation */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-3 gap-2.5 w-full max-w-md mb-8"
        >
          {displayStats.map((stat, idx) => {
            const Icon = stat.icon;
            const isTurquoise = stat.color === 'turquoise';
            const accentColor = isTurquoise ? 'rgb(56, 189, 248)' : 'rgb(245, 158, 11)';
            
            return (
              <motion.div
                key={idx}
                variants={item}
                whileHover={{ scale: 1.04, y: -2 }}
                className="group relative flex flex-col items-center gap-2 rounded-2xl p-3.5 overflow-hidden cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(16px)',
                  border: `1px solid rgba(255,255,255,0.1)`,
                }}
              >
                {/* Hover glow effect */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${accentColor}15, transparent 70%)`,
                  }}
                />

                {/* Icon with glow ring */}
                <div
                  className="relative p-2 rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}05)`,
                    boxShadow: `0 0 20px ${accentColor}10`,
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color: accentColor }} />
                </div>

                {/* Value */}
                <span className="font-montserrat text-lg font-bold text-white leading-tight text-center relative z-10">
                  {stat.value}
                </span>

                {/* Label */}
                <span className="text-[7px] uppercase tracking-[0.2em] text-white/35 text-center leading-tight font-semibold relative z-10">
                  {stat.label}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Share button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <TripShareButtons
            title={`Voyage à ${destination}`}
            destination={destination}
            totalDays={summary?.totalDays || 7}
          />
        </motion.div>
      </div>

      {/* Bottom branding */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        viewport={{ once: true }}
        className="relative z-10 pb-5 text-center"
      >
        <div className="flex items-center justify-center gap-2 text-white/20">
          <Sparkles className="h-3 w-3" />
          <span className="text-[9px] font-montserrat tracking-[0.3em] uppercase font-medium">
            Powered by Travliaq
          </span>
          <Sparkles className="h-3 w-3" />
        </div>
      </motion.div>
    </section>
  );
};

export default PlannerFooterSummary;
