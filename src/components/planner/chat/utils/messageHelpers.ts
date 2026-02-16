import type { ChatMessage } from "../types";

/** Generate a unique message ID with a semantic prefix */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

/** Return a setMessages updater that patches a single message by ID */
export function updateMessageById(
  id: string,
  patch: Partial<ChatMessage>,
): (prev: ChatMessage[]) => ChatMessage[] {
  return (prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m));
}
