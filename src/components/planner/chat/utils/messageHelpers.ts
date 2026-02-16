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

// --- Scalable dismissal detection (F6) ---
// Word sets for FR/EN dismissal phrases — any short combination is matched.
// To support a new word, just add it to the relevant set.
const DISMISSAL_WORDS = new Set([
  // FR
  "non", "rien", "pas", "plus", "nope", "ok", "d'autre", "de",
  "c'est", "tout", "bon", "merci", "voila", "voilà",
  // EN
  "no", "nothing", "that's", "all", "else", "fine", "done", "good", "thanks",
]);

/** Detect short dismissal messages regardless of word order */
export function isDismissalMessage(text: string): boolean {
  const cleaned = text.trim().toLowerCase().replace(/[,.'!?]/g, "");
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 6 && words.every((w) => DISMISSAL_WORDS.has(w));
}
