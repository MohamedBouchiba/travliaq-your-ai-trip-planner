import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STORAGE_KEYS as SK } from "@/config/storageKeys";
import {
  type StoredMessage,
  type ChatSession,
  type ChatTranslations,
  generateId,
  getTranslations,
  getDefaultWelcomeMessage,
  generateSimpleTitle,
  countUserMessages,
  generateSmartTitle,
  generatePreview,
  migrateMessageTimestamps,
} from "./sessionHelpers";

// Re-export types for consumers (PlannerChat.tsx etc.)
export type { StoredMessage, ChatSession, ChatTranslations };

const SESSIONS_INDEX_KEY = SK.CHAT_SESSIONS_INDEX;
const SESSION_PREFIX = SK.CHAT_SESSION_PREFIX;
const SYNC_DEBOUNCE_MS = 3000;

interface UseChatSessionsOptions {
  getFlightMemory?: () => Record<string, unknown>;
  getAccommodationMemory?: () => Record<string, unknown>;
  getTravelMemory?: () => Record<string, unknown>;
  translations?: ChatTranslations;
}

export const useChatSessions = (options: UseChatSessionsOptions = {}) => {
  // Use provided translations or fall back to i18n
  const { getFlightMemory, getAccommodationMemory, getTravelMemory, translations } = options;
  const effectiveTranslations = translations || getTranslations();
  const { user } = useAuth();
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const lastSyncRef = useRef<number>(0);
  const isGeneratingTitleRef = useRef(false); // Prevent concurrent title generation

  // Sync session to database
  const syncToDatabase = useCallback(
    async (sessionId: string, sessionMessages: StoredMessage[], session: ChatSession | undefined) => {
      if (!user || !sessionId) return;
      if (isSyncingRef.current) return;

      const now = Date.now();
      if (now - lastSyncRef.current < SYNC_DEBOUNCE_MS) return;

      isSyncingRef.current = true;
      lastSyncRef.current = now;

      try {
        const currentTranslations = getTranslations();
        
        // Use existing title if already AI-generated, otherwise use simple title
        const existingTitle = session?.titleGenerated ? session.title : undefined;
        
        const payload = {
          chatSessionId: sessionId,
          flightMemory: getFlightMemory?.() || {},
          accommodationMemory: getAccommodationMemory?.() || {},
          travelMemory: getTravelMemory?.() || {},
          chatMessages: sessionMessages,
          title: existingTitle || session?.title || generateSimpleTitle(sessionMessages, currentTranslations),
          preview: session?.preview || generatePreview(sessionMessages, currentTranslations),
        };

        console.log("[ChatSessions] Syncing to database:", sessionId);

        const { error } = await supabase.functions.invoke("sync-planner-session", {
          body: payload,
        });

        if (error) {
          console.error("[ChatSessions] Sync error:", error);
        } else {
          console.log("[ChatSessions] Sync successful");
        }
      } catch (error) {
        console.error("[ChatSessions] Sync failed:", error);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [user, getFlightMemory, getAccommodationMemory, getTravelMemory]
  );

  // Schedule debounced sync
  const scheduleSyncDebounced = useCallback(
    (sessionId: string, sessionMessages: StoredMessage[], session: ChatSession | undefined) => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        syncToDatabase(sessionId, sessionMessages, session);
      }, SYNC_DEBOUNCE_MS);
    },
    [syncToDatabase]
  );

  // Delete session from database
  const deleteFromDatabase = useCallback(
    async (sessionId: string) => {
      if (!user) return;

      try {
        console.log("[ChatSessions] Deleting from database:", sessionId);

        // Use DELETE method via query params
        const { error } = await supabase.functions.invoke(
          `sync-planner-session?sessionId=${sessionId}`,
          { method: "DELETE" }
        );

        if (error) {
          console.error("[ChatSessions] Delete error:", error);
        }
      } catch (error) {
        console.error("[ChatSessions] Delete failed:", error);
      }
    },
    [user]
  );

  // Load sessions index on mount
  useEffect(() => {
    const currentTranslations = getTranslations();
    
    try {
      const indexRaw = localStorage.getItem(SESSIONS_INDEX_KEY);
      let loadedSessions: ChatSession[] = [];
      
      if (indexRaw) {
        loadedSessions = JSON.parse(indexRaw);
      }

      // If no sessions exist, create the first one
      if (loadedSessions.length === 0) {
        const newSession: ChatSession = {
          id: generateId(),
          title: currentTranslations.newConversation,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          preview: currentTranslations.startConversation,
        };
        loadedSessions = [newSession];
        localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(loadedSessions));
        localStorage.setItem(
          SESSION_PREFIX + newSession.id,
          JSON.stringify([getDefaultWelcomeMessage(currentTranslations)])
        );
      }

      setSessions(loadedSessions);

      // Load the most recent session
      const mostRecent = loadedSessions.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setActiveSessionId(mostRecent.id);
      
      // Load messages for that session
      const messagesRaw = localStorage.getItem(SESSION_PREFIX + mostRecent.id);
      if (messagesRaw) {
        const parsed = JSON.parse(messagesRaw);
        const msgs = Array.isArray(parsed) ? migrateMessageTimestamps(parsed, mostRecent.createdAt) : [getDefaultWelcomeMessage(currentTranslations)];
        setMessages(msgs);
      } else {
        setMessages([getDefaultWelcomeMessage(currentTranslations)]);
      }
    } catch (e) {
      console.error("Error loading chat sessions:", e);
      // Create a fresh session on error
      const newSession: ChatSession = {
        id: generateId(),
        title: currentTranslations.newConversation,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        preview: currentTranslations.startConversation,
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      setMessages([getDefaultWelcomeMessage(currentTranslations)]);
    }
  }, []);

  // Sync on visibility change (when user leaves tab)
  // Use refs to avoid re-creating this effect on every message change
  const messagesForSyncRef = useRef<StoredMessage[]>([]);
  const sessionsForSyncRef = useRef<ChatSession[]>([]);
  
  useEffect(() => {
    messagesForSyncRef.current = messages;
  }, [messages]);
  
  useEffect(() => {
    sessionsForSyncRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && user && activeSessionId) {
        const currentSession = sessionsForSyncRef.current.find(s => s.id === activeSessionId);
        syncToDatabase(activeSessionId, messagesForSyncRef.current, currentSession);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncToDatabase, user, activeSessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Refs to prevent infinite loops
  const isUpdatingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionsRef = useRef<ChatSession[]>([]);
  const messagesRef = useRef<StoredMessage[]>([]);

  // Keep refs in sync
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Save messages to localStorage only (no state updates here)
  const saveMessagesToStorage = useCallback(
    (newMessages: StoredMessage[], sessionId: string) => {
      if (!sessionId) return;

      try {
        const currentTranslations = getTranslations();
        
        // Save messages
        localStorage.setItem(SESSION_PREFIX + sessionId, JSON.stringify(newMessages));

        // Get current session to check if title was already generated
        const currentSession = sessionsRef.current.find(s => s.id === sessionId);
        const userMessageCount = countUserMessages(newMessages);
        
        // Determine if we should use simple title or keep AI-generated one
        const shouldKeepTitle = currentSession?.titleGenerated;
        const currentTitle = shouldKeepTitle 
          ? currentSession.title 
          : generateSimpleTitle(newMessages, currentTranslations);

        // Update session metadata in localStorage
        const currentSessions = sessionsRef.current;
        const updated = currentSessions.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                title: currentTitle,
                preview: generatePreview(newMessages, currentTranslations),
                updatedAt: Date.now(),
              }
            : s
        );
        localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(updated));

        // Update sessions state without causing re-render loops
        if (!isUpdatingRef.current) {
          isUpdatingRef.current = true;
          setSessions(updated);
          sessionsRef.current = updated;
          isUpdatingRef.current = false;
        }

        // SMART TITLE GENERATION: Trigger after 2 user messages if not already generated
        if (userMessageCount >= 2 && !currentSession?.titleGenerated && !isGeneratingTitleRef.current) {
          isGeneratingTitleRef.current = true;
          
          // Generate smart title in background (non-blocking)
          generateSmartTitle(newMessages).then((result) => {
            isGeneratingTitleRef.current = false;
            
            if (result) {
              const smartTitle = `${result.emoji} ${result.title}`;
              console.log("[ChatSessions] Smart title generated:", smartTitle);
              
              // Update session with smart title
              setSessions((prev) => {
                const updatedWithTitle = prev.map((s) =>
                  s.id === sessionId
                    ? { ...s, title: smartTitle, titleGenerated: true }
                    : s
                );
                localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(updatedWithTitle));
                sessionsRef.current = updatedWithTitle;
                return updatedWithTitle;
              });
            }
          }).catch(() => {
            isGeneratingTitleRef.current = false;
          });
        }

        // Schedule database sync
        if (user) {
          const syncSession = updated.find((s) => s.id === sessionId);
          scheduleSyncDebounced(sessionId, newMessages, syncSession);
        }
      } catch (e) {
        console.error("Error saving messages:", e);
      }
    },
    [user, scheduleSyncDebounced]
  );

  // Update messages with debounced persistence
  // IMPORTANT: Only save messages that are NOT currently streaming to avoid saving partial content
  const updateMessages = useCallback(
    (newMessages: StoredMessage[] | ((prev: StoredMessage[]) => StoredMessage[])) => {
      setMessages((prev) => {
        const updated = typeof newMessages === "function" ? newMessages(prev) : newMessages;
        messagesRef.current = updated;
        
        // Clear any pending save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // Check if any message is currently streaming - if so, don't save yet
        const hasStreamingMessage = updated.some((m) => m.isStreaming || m.isTyping);
        
        if (!hasStreamingMessage) {
          // Debounce the save to localStorage only when no message is streaming
          saveTimeoutRef.current = setTimeout(() => {
            // Filter out messages with incomplete content before saving
            const messagesToSave = updated.filter((m) => !m.isStreaming && !m.isTyping);
            saveMessagesToStorage(messagesToSave, activeSessionId);
          }, 300);
        }
        
        return updated;
      });
    },
    [activeSessionId, saveMessagesToStorage]
  );

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Switch to a different session
  const selectSession = useCallback((sessionId: string) => {
    const currentTranslations = getTranslations();

    try {
      const messagesRaw = localStorage.getItem(SESSION_PREFIX + sessionId);
      if (messagesRaw) {
        const parsed = JSON.parse(messagesRaw);
        const session = sessionsRef.current.find(s => s.id === sessionId);
        const baseTs = session?.createdAt || Date.now();
        const msgs = Array.isArray(parsed) ? migrateMessageTimestamps(parsed, baseTs) : [getDefaultWelcomeMessage(currentTranslations)];
        setMessages(msgs);
      } else {
        setMessages([getDefaultWelcomeMessage(currentTranslations)]);
      }
      setActiveSessionId(sessionId);
    } catch (e) {
      console.error("Error loading session:", e);
      setMessages([getDefaultWelcomeMessage(currentTranslations)]);
    }
  }, []);

  // Create a new session
  const createNewSession = useCallback(() => {
    const currentTranslations = getTranslations();
    
    const newSession: ChatSession = {
      id: generateId(),
      title: currentTranslations.newConversation,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preview: currentTranslations.startConversation,
    };

    const defaultMessages = [getDefaultWelcomeMessage(currentTranslations)];

    try {
      // Save new session
      localStorage.setItem(SESSION_PREFIX + newSession.id, JSON.stringify(defaultMessages));

      setSessions((prev) => {
        const updated = [newSession, ...prev];
        localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(updated));
        return updated;
      });

      setActiveSessionId(newSession.id);
      setMessages(defaultMessages);

      // Sync new session to database
      if (user) {
        syncToDatabase(newSession.id, defaultMessages, newSession);
      }
    } catch (e) {
      console.error("Error creating new session:", e);
    }

    return newSession.id;
  }, [user, syncToDatabase]);

  // Delete a session - atomic operation with safe state transitions
  const deleteSession = useCallback(
    (sessionId: string) => {
      const currentTranslations = getTranslations();
      
      try {
        // Get current sessions from ref to avoid stale state
        const currentSessions = sessionsRef.current;
        
        // Filter out the session to delete
        const remaining = currentSessions.filter((s) => s.id !== sessionId);
        
        // If we're deleting the active session, switch FIRST before any state changes
        if (sessionId === activeSessionId) {
          if (remaining.length > 0) {
            // Find the most recent session to switch to
            const mostRecent = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0];
            
            // Load new session messages BEFORE any React state updates
            let nextMessages: StoredMessage[] = [getDefaultWelcomeMessage(currentTranslations)];
            const messagesRaw = localStorage.getItem(SESSION_PREFIX + mostRecent.id);
            if (messagesRaw) {
              try {
                const parsed = JSON.parse(messagesRaw);
                if (Array.isArray(parsed)) {
                  nextMessages = migrateMessageTimestamps(parsed, mostRecent.createdAt);
                }
              } catch {
                // Keep default messages
              }
            }
            
            // Update refs first to prevent stale reads during React updates
            sessionsRef.current = remaining;
            messagesRef.current = nextMessages;
            
            // Remove deleted session from localStorage
            localStorage.removeItem(SESSION_PREFIX + sessionId);
            localStorage.removeItem(SK.CHAT_SESSION_STATE_PREFIX + sessionId);
            localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(remaining));
            
            // Delete from database (async, don't wait)
            if (user) {
              deleteFromDatabase(sessionId);
            }
            
            // Batch all React state updates together
            setMessages(nextMessages);
            setActiveSessionId(mostRecent.id);
            setSessions(remaining);
          } else {
            // Create a new session if all are deleted
            const newSession: ChatSession = {
              id: generateId(),
              title: `✈️ ${currentTranslations.newConversation}`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              preview: currentTranslations.startConversation,
            };
            const defaultMessages = [getDefaultWelcomeMessage(currentTranslations)];

            // Update refs first
            sessionsRef.current = [newSession];
            messagesRef.current = defaultMessages;
            
            // Remove deleted session and save new session to localStorage
            localStorage.removeItem(SESSION_PREFIX + sessionId);
            localStorage.removeItem(SK.CHAT_SESSION_STATE_PREFIX + sessionId);
            localStorage.setItem(SESSION_PREFIX + newSession.id, JSON.stringify(defaultMessages));
            localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify([newSession]));
            
            // Delete from database
            if (user) {
              deleteFromDatabase(sessionId);
            }

            // Batch React state updates
            setMessages(defaultMessages);
            setActiveSessionId(newSession.id);
            setSessions([newSession]);
          }
        } else {
          // Not deleting active session - simpler case
          sessionsRef.current = remaining;
          
          localStorage.removeItem(SESSION_PREFIX + sessionId);
            localStorage.removeItem(SK.CHAT_SESSION_STATE_PREFIX + sessionId);
          localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(remaining));
          
          if (user) {
            deleteFromDatabase(sessionId);
          }
          
          setSessions(remaining);
        }
      } catch (e) {
        console.error("Error deleting session:", e);
      }
    },
    [activeSessionId, user, deleteFromDatabase]
  );

  // Delete ALL sessions (clear history completely)
  const deleteAllSessions = useCallback(() => {
    const currentTranslations = getTranslations();
    
    try {
      // Cancel any pending saves/syncs that could re-create data right after clearing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      isSyncingRef.current = false;

      // Prevent state/storage churn while we are nuking everything
      isUpdatingRef.current = true;

      // Get all session IDs to delete from database
      const sessionIds = sessionsRef.current.map((s) => s.id);

      // Clear localStorage for chat sessions and state snapshots
      sessionIds.forEach((id) => {
        localStorage.removeItem(SESSION_PREFIX + id);
        localStorage.removeItem(SK.CHAT_SESSION_STATE_PREFIX + id);
      });
      localStorage.removeItem(SESSIONS_INDEX_KEY);

      // Also clear any flight/accommodation/travel memory keys
      localStorage.removeItem(SK.FLIGHT_MEMORY);
      localStorage.removeItem(SK.ACCOMMODATION_MEMORY);
      localStorage.removeItem(SK.TRAVEL_MEMORY);
      localStorage.removeItem(SK.PREFERENCES_LEGACY);

      // Create fresh session
      const newSession: ChatSession = {
        id: generateId(),
        title: `✈️ ${currentTranslations.newConversation}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        preview: currentTranslations.startConversation,
      };
      const defaultMessages = [getDefaultWelcomeMessage(currentTranslations)];

      // Save new session
      localStorage.setItem(SESSION_PREFIX + newSession.id, JSON.stringify(defaultMessages));
      localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify([newSession]));

      // Update refs
      sessionsRef.current = [newSession];
      messagesRef.current = defaultMessages;

      // Update state (batched by React)
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      setMessages(defaultMessages);

      // Delete from database (async)
      if (user) {
        sessionIds.forEach((id) => deleteFromDatabase(id));
      }

      console.log("[ChatSessions] Deleted all sessions");
    } catch (e) {
      console.error("Error deleting all sessions:", e);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [user, deleteFromDatabase]);

  // Force sync current session to database (for critical actions)
  const forceSyncToDatabase = useCallback(() => {
    if (!user || !activeSessionId) return;
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    const currentSession = sessions.find(s => s.id === activeSessionId);
    syncToDatabase(activeSessionId, messages, currentSession);
  }, [user, activeSessionId, messages, sessions, syncToDatabase]);

  // Get current session metadata
  const getSessionMetadata = useCallback(() => {
    const currentTranslations = getTranslations();
    const currentSession = sessions.find(s => s.id === activeSessionId);
    return {
      title: currentSession?.title || currentTranslations.newConversation,
      preview: currentSession?.preview || currentTranslations.startConversation,
    };
  }, [sessions, activeSessionId]);

  return {
    sessions,
    activeSessionId,
    messages,
    updateMessages,
    selectSession,
    createNewSession,
    deleteSession,
    deleteAllSessions,
    forceSyncToDatabase,
    getSessionMetadata,
  };
};
