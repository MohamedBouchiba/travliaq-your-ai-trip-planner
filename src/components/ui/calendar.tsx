import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-2",
        head_row: "hidden", // default hidden; can be overridden per instance
        head_cell: "hidden",
        row: "grid grid-cols-7 gap-2 mt-2",
        cell: "h-14 w-14 text-center text-base p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-lg [&:has([aria-selected].day-range-start)]:rounded-l-lg [&:has([aria-selected])]:bg-primary/25 focus-within:relative focus-within:z-20",
        day: cn(
          "h-full w-full p-0 font-medium rounded-lg transition-all duration-200 flex items-center justify-center",
          "hover:bg-primary/10 hover:scale-110 hover:shadow-md",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "active:scale-95",
          "aria-selected:opacity-100"
        ),
        day_range_start: "rounded-lg bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold shadow-lg",
        day_range_end: "rounded-lg bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold shadow-lg",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-lg",
        day_today: "bg-primary/5 text-primary/60",
        day_outside:
          "day-outside text-muted-foreground/40 opacity-40 aria-selected:bg-primary/15 aria-selected:text-muted-foreground aria-selected:opacity-60",
        day_disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed hover:bg-transparent hover:scale-100",
        day_range_middle: "bg-primary/25 text-foreground hover:bg-primary/30 rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <ChevronLeft className="h-4 w-4" />;
          }
          return <ChevronRight className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
