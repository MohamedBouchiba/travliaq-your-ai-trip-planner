import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SYNC_DEBOUNCE_MS = 3000; // Debounce sync to every 3 seconds
const CRITICAL_ACTION_TYPES = [
  "flight_search",
  "flight_select",
  "accommodation_search",
  "trip_type_change",
  "date_change",
  "destination_change",
] as const;

type CriticalAction = (typeof CRITICAL_ACTION_TYPES)[number];

interface PlannerSessionData {
  chatSessionId: string;
  flightMemory: Record<string, unknown>;
  accommodationMemory: Record<string, unknown>;
  travelMemory: Record<string, unknown>;
  chatMessages: unknown[];
  title: string;
  preview: string;
}

export const usePlannerPersistence = (
  activeSessionId: string,
  getFlightMemory: () => Record<string, unknown>,
  getAccommodationMemory: () => Record<string, unknown>,
  getTravelMemory: () => Record<string, unknown>,
  getChatMessages: () => unknown[],
  getSessionMetadata: () => { title: string; preview: string }
) => {
  const { user } = useAuth();
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef = useRef<number>(0);
  const isSyncingRef = useRef(false);

  // Sync data to Supabase
  const syncToDatabase = useCallback(
    async (immediate = false) => {
      if (!user || !activeSessionId) {
        console.log("[PlannerPersistence] Skip sync: no user or session");
        return;
      }

      // Prevent concurrent syncs
      if (isSyncingRef.current) {
        console.log("[PlannerPersistence] Skip sync: already syncing");
        return;
      }

      // Debounce non-immediate syncs
      const now = Date.now();
      if (!immediate && now - lastSyncRef.current < SYNC_DEBOUNCE_MS) {
        console.log("[PlannerPersistence] Skip sync: too soon");
        return;
      }

      isSyncingRef.current = true;
      lastSyncRef.current = now;

      try {
        const { title, preview } = getSessionMetadata();
        const payload: PlannerSessionData = {
          chatSessionId: activeSessionId,
          flightMemory: getFlightMemory(),
          accommodationMemory: getAccommodationMemory(),
          travelMemory: getTravelMemory(),
          chatMessages: getChatMessages(),
          title,
          preview,
        };

        console.log("[PlannerPersistence] Syncing session:", activeSessionId);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log("[PlannerPersistence] No active session, skipping sync");
          return;
        }

        const response = await supabase.functions.invoke("sync-planner-session", {
          body: payload,
        });

        if (response.error) {
          console.error("[PlannerPersistence] Sync error:", response.error);
        } else {
          console.log("[PlannerPersistence] Sync successful");
        }
      } catch (error) {
        console.error("[PlannerPersistence] Sync failed:", error);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [
      user,
      activeSessionId,
      getFlightMemory,
      getAccommodationMemory,
      getTravelMemory,
      getChatMessages,
      getSessionMetadata,
    ]
  );

  // Schedule a debounced sync
  const scheduleSyncDebounced = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncToDatabase(false);
    }, SYNC_DEBOUNCE_MS);
  }, [syncToDatabase]);

  // Trigger immediate sync for critical actions
  const triggerCriticalSync = useCallback(
    (action: CriticalAction) => {
      console.log("[PlannerPersistence] Critical action:", action);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncToDatabase(true);
    },
    [syncToDatabase]
  );

  // Delete session from database
  const deleteFromDatabase = useCallback(
    async (sessionId: string) => {
      if (!user) return;

      try {
        console.log("[PlannerPersistence] Deleting session:", sessionId);

        const response = await supabase.functions.invoke("sync-planner-session", {
          method: "DELETE",
          body: { sessionId },
        });

        if (response.error) {
          console.error("[PlannerPersistence] Delete error:", response.error);
        } else {
          console.log("[PlannerPersistence] Delete successful");
        }
      } catch (error) {
        console.error("[PlannerPersistence] Delete failed:", error);
      }
    },
    [user]
  );

  // Load session from database
  const loadFromDatabase = useCallback(
    async (sessionId: string): Promise<PlannerSessionData | null> => {
      if (!user) return null;

      try {
        console.log("[PlannerPersistence] Loading session:", sessionId);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const response = await supabase.functions.invoke("sync-planner-session", {
          method: "GET",
          body: { sessionId },
        });

        if (response.error) {
          console.error("[PlannerPersistence] Load error:", response.error);
          return null;
        }

        const dbSession = response.data?.session;
        if (!dbSession) return null;

        return {
          chatSessionId: dbSession.chat_session_id,
          flightMemory: dbSession.flight_memory || {},
          accommodationMemory: dbSession.accommodation_memory || {},
          travelMemory: dbSession.travel_memory || {},
          chatMessages: dbSession.chat_messages || [],
          title: dbSession.title || "Nouvelle conversation",
          preview: dbSession.preview || "Démarrez la conversation...",
        };
      } catch (error) {
        console.error("[PlannerPersistence] Load failed:", error);
        return null;
      }
    },
    [user]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Sync on visibility change (when user leaves/returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && user && activeSessionId) {
        // Sync before user leaves
        syncToDatabase(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncToDatabase, user, activeSessionId]);

  return {
    syncToDatabase,
    scheduleSyncDebounced,
    triggerCriticalSync,
    deleteFromDatabase,
    loadFromDatabase,
  };
};
