import { useState } from "react";
import { BedDouble, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";
import type { RoomConfig } from "@/stores/hooks";

// Rooms configuration
export function RoomsSelector({
  rooms,
  travelers,
  useAuto,
  onChange,
  onToggleAuto,
}: {
  rooms: RoomConfig[];
  travelers: { adults: number; children: number; childrenAges: number[] };
  useAuto: boolean;
  onChange: (rooms: RoomConfig[]) => void;
  onToggleAuto: () => void;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const addRoom = () => {
    const newRoom: RoomConfig = {
      id: crypto.randomUUID(),
      adults: 2,
      children: 0,
      childrenAges: [],
    };
    onChange([...rooms, newRoom]);
  };

  const removeRoom = (id: string) => {
    if (rooms.length <= 1) return;
    onChange(rooms.filter(r => r.id !== id));
  };

  const updateRoom = (id: string, updates: Partial<RoomConfig>) => {
    onChange(rooms.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const totalInRooms = rooms.reduce((acc, r) => acc + r.adults + r.children, 0);
  const totalTravelers = travelers.adults + travelers.children;

  const summary = rooms.length === 1
    ? (rooms[0].children > 0 ? t("planner.accommodation.rooms.family") : rooms[0].adults === 1 ? t("planner.accommodation.rooms.single") : t("planner.accommodation.rooms.double"))
    : t("planner.accommodation.rooms.count", { count: rooms.length });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/30 text-sm">
          <BedDouble className="h-4 w-4 text-primary" />
          <span>{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3"
        align="start"
      >
        <div className="space-y-3">
          {/* Auto toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="text-xs text-muted-foreground">{t("planner.accommodation.rooms.autoConfig")}</span>
            <button
              onClick={onToggleAuto}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                useAuto ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {useAuto ? t("planner.accommodation.rooms.enabled") : t("planner.accommodation.rooms.disabled")}
            </button>
          </div>

          {/* Rooms list */}
          {rooms.map((room, index) => (
            <div key={room.id} className="p-2 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{t("planner.accommodation.rooms.room", { num: index + 1 })}</span>
                {rooms.length > 1 && (
                  <button
                    onClick={() => removeRoom(room.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    {t("planner.accommodation.rooms.remove")}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("planner.accommodation.adults")}</span>
                  <select
                    value={room.adults}
                    onChange={(e) => updateRoom(room.id, { adults: parseInt(e.target.value) })}
                    className="h-7 px-1.5 rounded border border-border bg-background text-xs"
                    disabled={useAuto}
                  >
                    {[1, 2, 3, 4].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("planner.accommodation.childrenLabel")}</span>
                  <select
                    value={room.children}
                    onChange={(e) => updateRoom(room.id, { children: parseInt(e.target.value) })}
                    className="h-7 px-1.5 rounded border border-border bg-background text-xs"
                    disabled={useAuto}
                  >
                    {[0, 1, 2, 3].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          {/* Add room button */}
          {!useAuto && rooms.length < 4 && (
            <button
              onClick={addRoom}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted/30"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("planner.accommodation.rooms.add")}
            </button>
          )}

          {/* Warning if mismatch */}
          {!useAuto && totalInRooms !== totalTravelers && (
            <p className="text-xs text-amber-500 text-center">
              {t("planner.accommodation.rooms.mismatch", { inRooms: totalInRooms, travelers: totalTravelers })}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
