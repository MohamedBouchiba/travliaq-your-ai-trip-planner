import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Trip {
  id: string;
  code: string;
  destination: string;
  destination_en?: string;
  main_image: string;
  flight_from: string | null;
  flight_to: string | null;
  flight_duration: string | null;
  flight_type: string | null;
  hotel_name: string | null;
  hotel_rating: number | null;
  total_price: string | null;
  total_days: number;
  total_budget: string | null;
  average_weather: string | null;
  travel_style: string | null;
  travel_style_en?: string;
  start_date: string | null;
  travelers?: number;
  price_flights?: string;
  price_hotels?: string;
  price_transport?: string;
  price_activities?: string;
}

interface SummaryStat {
  type: 'days' | 'budget' | 'weather' | 'style' | 'cities' | 'people' | 'activities' | 'custom';
  value: string | number;
  icon?: string;
  label?: string;
  color?: 'turquoise' | 'golden';
}

interface Step {
  id: string;
  trip_id: string;
  step_number: number;
  day_number: number;
  title: string;
  title_en?: string;
  subtitle: string;
  subtitle_en?: string;
  main_image: string;
  is_summary: boolean;
  latitude: number;
  longitude: number;
  why: string;
  why_en?: string;
  tips: string;
  tips_en?: string;
  transfer: string;
  transfer_en?: string;
  suggestion: string;
  suggestion_en?: string;
  weather_icon: string;
  weather_temp: string;
  weather_description: string | null;
  weather_description_en?: string;
  price: number | null;
  duration: string | null;
  images: string[];
  step_type?: string;
  summary_stats?: SummaryStat[];
}

export const useTripData = (code: string | null) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTripData = async () => {
      if (!code || !code.trim()) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const normalizedCode = code.trim();

        // Fetch trip with tolerant matching (case/spacing-insensitive)
        const normalize = (s: string) =>
          s
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/gi, '');

        const inputNorm = normalize(normalizedCode);
        const fuzzyPattern = `%${inputNorm.split('').join('%')}%`;

        // Broad match first to reduce result set, then client-pick exact normalized match
        const { data: tripsData, error: tripError } = await supabase
          .from("trips")
          .select("*")
          .ilike("code", fuzzyPattern);

        if (tripError) {
          console.error("Error fetching trip:", tripError);
          toast({
            title: "Erreur",
            description: "Impossible de charger le voyage. Code invalide.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const selectedTrip = (tripsData || []).find(t => normalize((t as any).code) === inputNorm) || (tripsData?.[0] ?? null);

        if (!selectedTrip) {
          console.warn("No trip found for code:", code);
          setTrip(null);
          setSteps([]);
          setLoading(false);
          return;
        }

        setTrip(selectedTrip as any);

        // Fetch steps
        const { data: stepsData, error: stepsError } = await supabase
          .from("steps")
          .select("*")
          .eq("trip_id", (selectedTrip as any).id)
          .order("step_number", { ascending: true });

        if (stepsError) {
          console.error("Error fetching steps:", stepsError);
          toast({
            title: "Erreur",
            description: "Impossible de charger les étapes du voyage.",
            variant: "destructive",
          });
        } else {
          // Transform data to match interface
          const transformedSteps = (stepsData || []).map(step => ({
            ...step,
            images: (Array.isArray(step.images) ? step.images : []) as string[],
            summary_stats: (Array.isArray(step.summary_stats) ? step.summary_stats as unknown as SummaryStat[] : undefined)
          })) as Step[];
          setSteps(transformedSteps);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        toast({
          title: "Erreur",
          description: "Une erreur inattendue s'est produite.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTripData();
  }, [code, toast]);

  return { trip, steps, loading };
};
