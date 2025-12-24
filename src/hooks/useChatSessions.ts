import { useState, useCallback, useEffect } from "react";

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

const generateId = () => crypto.randomUUID();

const getDefaultWelcomeMessage = (): StoredMessage => ({
  id: "welcome",
  role: "assistant",
  text: "Bonjour ! Je suis votre assistant de voyage. Dites-moi où vous souhaitez aller et je vous aiderai à planifier votre voyage.",
});

const generateTitle = (messages: StoredMessage[]): string => {
  // Find first user message to generate title
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (firstUserMessage) {
    const text = firstUserMessage.text.slice(0, 40);
    return text.length < firstUserMessage.text.length ? text + "..." : text;
  }
  return "Nouvelle conversation";
};

const generatePreview = (messages: StoredMessage[]): string => {
  // Get last non-hidden message
  const lastMessage = [...messages].reverse().find((m) => !m.isHidden && m.text);
  if (lastMessage) {
    const text = lastMessage.text.slice(0, 50);
    return text.length < lastMessage.text.length ? text + "..." : text;
  }
  return "Démarrez la conversation...";
};

export const useChatSessions = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<StoredMessage[]>([]);

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
          return updated;
        });
      } catch (e) {
        console.error("Error saving messages:", e);
      }
    },
    [activeSessionId]
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
    } catch (e) {
      console.error("Error creating new session:", e);
    }

    return newSession.id;
  }, []);

  // Delete a session
  const deleteSession = useCallback(
    (sessionId: string) => {
      try {
        // Remove session messages
        localStorage.removeItem(SESSION_PREFIX + sessionId);

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
    [activeSessionId, selectSession, createNewSession]
  );

  return {
    sessions,
    activeSessionId,
    messages,
    updateMessages,
    selectSession,
    createNewSession,
    deleteSession,
  };
};
