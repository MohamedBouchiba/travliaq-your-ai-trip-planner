import { useState } from "react";
import { Users, ChevronDown, Plus, Minus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

// Travelers selector (inspired by flight widget) - Syncs with TravelMemory
export function TravelersSelector({
  adults,
  children,
  childrenAges,
  onChange
}: {
  adults: number;
  children: number;
  childrenAges: number[];
  onChange: (adults: number, children: number, ages: number[]) => void;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleAdultsChange = (delta: number) => {
    const newAdults = Math.max(1, Math.min(10, adults + delta));
    onChange(newAdults, children, childrenAges);
  };

  const handleChildrenChange = (delta: number) => {
    const newChildren = Math.max(0, Math.min(6, children + delta));
    const newAges = [...childrenAges];
    if (newChildren > childrenAges.length) {
      newAges.push(8); // Default age
    } else if (newChildren < childrenAges.length) {
      newAges.pop();
    }
    onChange(adults, newChildren, newAges);
  };

  const handleAgeChange = (index: number, age: number) => {
    const newAges = [...childrenAges];
    newAges[index] = age;
    onChange(adults, children, newAges);
  };

  const summary = children > 0
    ? `${adults} ${adults > 1 ? t("planner.travelers.adults") : t("planner.accommodation.adult")} · ${children} ${children > 1 ? t("planner.travelers.children") : t("planner.accommodation.child")}`
    : `${adults} ${adults > 1 ? t("planner.travelers.adults") : t("planner.accommodation.adult")}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/30 text-sm"
        >
          <Users className="h-4 w-4 text-primary" />
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          {/* Adults */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("planner.accommodation.adults")}</p>
              <p className="text-xs text-muted-foreground">{t("planner.accommodation.adultsDesc")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAdultsChange(-1)}
                disabled={adults <= 1}
                className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-sm font-medium">{adults}</span>
              <button
                onClick={() => handleAdultsChange(1)}
                disabled={adults >= 10}
                className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Children */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("planner.accommodation.childrenLabel")}</p>
              <p className="text-xs text-muted-foreground">{t("planner.accommodation.childrenDesc")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleChildrenChange(-1)}
                disabled={children <= 0}
                className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-sm font-medium">{children}</span>
              <button
                onClick={() => handleChildrenChange(1)}
                disabled={children >= 6}
                className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Children ages */}
          {children > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("planner.accommodation.childrenAges")}</p>
              <div className="flex flex-wrap gap-2">
                {childrenAges.map((age, index) => (
                  <select
                    key={index}
                    value={age}
                    onChange={(e) => handleAgeChange(index, parseInt(e.target.value))}
                    className="h-8 px-2 rounded-lg border border-border bg-background text-xs"
                  >
                    {Array.from({ length: 18 }, (_, i) => (
                      <option key={i} value={i}>{i} {i > 1 ? t("planner.accommodation.years") : t("planner.accommodation.year")}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
