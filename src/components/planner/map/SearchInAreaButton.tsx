import { useTranslation } from "react-i18next";
import eventBus from "@/lib/eventBus";

interface SearchInAreaButtonProps {
  isSearchingInArea: boolean;
}

/**
 * "Search in this area" button overlay for the activities tab map view.
 */
export function SearchInAreaButton({ isSearchingInArea }: SearchInAreaButtonProps) {
  const { t } = useTranslation();

  return (
    <div className="absolute top-4 right-4 z-10">
      <button
        onClick={() => !isSearchingInArea && eventBus.emit("map:searchInArea")}
        disabled={isSearchingInArea}
        className={`
          px-3 py-2 bg-white dark:bg-gray-900
          text-gray-900 dark:text-gray-100
          rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
          font-medium text-xs transition-all flex items-center gap-1.5
          ${isSearchingInArea
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-xl cursor-pointer'
          }
        `}
        title={isSearchingInArea ? t("planner.common.searchInProgressTitle") : t("planner.common.searchActivitiesInZone")}
      >
        <svg
          className={`h-3.5 w-3.5 ${isSearchingInArea ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isSearchingInArea
              ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            }
          />
        </svg>
        {isSearchingInArea ? t("planner.common.searchInProgress") : t("planner.common.searchInZone")}
      </button>
    </div>
  );
}
