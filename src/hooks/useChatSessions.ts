import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StoredMessage {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  hasSearchButton?: boolean;
  isHidden?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  preview: string;
}

const SESSIONS_INDEX_KEY = "travliaq_chat_sessions_index";
const SESSION_PREFIX = "travliaq_chat_session_";
const SYNC_DEBOUNCE_MS = 3000;

const generateId = () => crypto.randomUUID();

const getDefaultWelcomeMessage = (): StoredMessage => ({
  id: "welcome",
  role: "assistant",
  text: "Bonjour ! Je suis votre assistant de voyage. Dites-moi où vous souhaitez aller et je vous aiderai à planifier votre voyage.",
});

const generateTitle = (messages: StoredMessage[]): string => {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (firstUserMessage) {
    const text = firstUserMessage.text.slice(0, 40);
    return text.length < firstUserMessage.text.length ? text + "..." : text;
  }
  return "Nouvelle conversation";
};

const generatePreview = (messages: StoredMessage[]): string => {
  const lastMessage = [...messages].reverse().find((m) => !m.isHidden && m.text);
  if (lastMessage) {
    const text = lastMessage.text.slice(0, 50);
    return text.length < lastMessage.text.length ? text + "..." : text;
  }
  return "Démarrez la conversation...";
};

interface UseChatSessionsOptions {
  getFlightMemory?: () => Record<string, unknown>;
  getAccommodationMemory?: () => Record<string, unknown>;
  getTravelMemory?: () => Record<string, unknown>;
}

export const useChatSessions = (options: UseChatSessionsOptions = {}) => {
  const { getFlightMemory, getAccommodationMemory, getTravelMemory } = options;
  const { user } = useAuth();
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const lastSyncRef = useRef<number>(0);

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
        const payload = {
          chatSessionId: sessionId,
          flightMemory: getFlightMemory?.() || {},
          accommodationMemory: getAccommodationMemory?.() || {},
          travelMemory: getTravelMemory?.() || {},
          chatMessages: sessionMessages,
          title: session?.title || generateTitle(sessionMessages),
          preview: session?.preview || generatePreview(sessionMessages),
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
          title: "Nouvelle conversation",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          preview: "Démarrez la conversation...",
        };
        loadedSessions = [newSession];
        localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(loadedSessions));
        localStorage.setItem(
          SESSION_PREFIX + newSession.id,
          JSON.stringify([getDefaultWelcomeMessage()])
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
        setMessages(Array.isArray(parsed) ? parsed : [getDefaultWelcomeMessage()]);
      } else {
        setMessages([getDefaultWelcomeMessage()]);
      }
    } catch (e) {
      console.error("Error loading chat sessions:", e);
      // Create a fresh session on error
      const newSession: ChatSession = {
        id: generateId(),
        title: "Nouvelle conversation",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        preview: "Démarrez la conversation...",
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      setMessages([getDefaultWelcomeMessage()]);
    }
  }, []);

  // Sync on visibility change (when user leaves tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && user && activeSessionId) {
        const currentSession = sessions.find(s => s.id === activeSessionId);
        syncToDatabase(activeSessionId, messages, currentSession);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncToDatabase, user, activeSessionId, messages, sessions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Save messages whenever they change
  const saveMessages = useCallback(
    (newMessages: StoredMessage[]) => {
      if (!activeSessionId) return;

      try {
        // Save messages to session storage
        localStorage.setItem(SESSION_PREFIX + activeSessionId, JSON.stringify(newMessages));

        // Update session metadata
        setSessions((prev) => {
          const updated = prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  title: generateTitle(newMessages),
                  preview: generatePreview(newMessages),
                  updatedAt: Date.now(),
                }
              : s
          );
          localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(updated));
          
          // Schedule database sync
          const currentSession = updated.find(s => s.id === activeSessionId);
          if (user) {
            scheduleSyncDebounced(activeSessionId, newMessages, currentSession);
          }
          
          return updated;
        });
      } catch (e) {
        console.error("Error saving messages:", e);
      }
    },
    [activeSessionId, user, scheduleSyncDebounced]
  );

  // Update messages and trigger save
  const updateMessages = useCallback(
    (newMessages: StoredMessage[] | ((prev: StoredMessage[]) => StoredMessage[])) => {
      setMessages((prev) => {
        const updated = typeof newMessages === "function" ? newMessages(prev) : newMessages;
        // Debounce save
        setTimeout(() => saveMessages(updated), 100);
        return updated;
      });
    },
    [saveMessages]
  );

  // Switch to a different session
  const selectSession = useCallback((sessionId: string) => {
    try {
      const messagesRaw = localStorage.getItem(SESSION_PREFIX + sessionId);
      if (messagesRaw) {
        const parsed = JSON.parse(messagesRaw);
        setMessages(Array.isArray(parsed) ? parsed : [getDefaultWelcomeMessage()]);
      } else {
        setMessages([getDefaultWelcomeMessage()]);
      }
      setActiveSessionId(sessionId);
    } catch (e) {
      console.error("Error loading session:", e);
      setMessages([getDefaultWelcomeMessage()]);
    }
  }, []);

  // Create a new session
  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: "Nouvelle conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preview: "Démarrez la conversation...",
    };

    const defaultMessages = [getDefaultWelcomeMessage()];

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

  // Delete a session
  const deleteSession = useCallback(
    (sessionId: string) => {
      try {
        // Remove session messages
        localStorage.removeItem(SESSION_PREFIX + sessionId);

        // Delete from database
        if (user) {
          deleteFromDatabase(sessionId);
        }

        setSessions((prev) => {
          const updated = prev.filter((s) => s.id !== sessionId);
          localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(updated));

          // If we deleted the active session, switch to another
          if (sessionId === activeSessionId && updated.length > 0) {
            const mostRecent = updated.sort((a, b) => b.updatedAt - a.updatedAt)[0];
            selectSession(mostRecent.id);
          } else if (updated.length === 0) {
            // Create a new session if all are deleted
            createNewSession();
          }

          return updated;
        });
      } catch (e) {
        console.error("Error deleting session:", e);
      }
    },
    [activeSessionId, selectSession, createNewSession, user, deleteFromDatabase]
  );

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
    const currentSession = sessions.find(s => s.id === activeSessionId);
    return {
      title: currentSession?.title || "Nouvelle conversation",
      preview: currentSession?.preview || "Démarrez la conversation...",
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
    forceSyncToDatabase,
    getSessionMetadata,
  };
};
