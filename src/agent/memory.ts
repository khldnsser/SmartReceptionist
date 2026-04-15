import type OpenAI from 'openai';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const MAX_MESSAGES = 15;

// In-memory store keyed by session ID (WhatsApp wa_id).
// Replace this map with a Redis or DB-backed store for production persistence.
const store = new Map<string, ChatMessage[]>();

/**
 * Returns the conversation history for a session (up to MAX_MESSAGES).
 */
export function getHistory(sessionId: string): ChatMessage[] {
  return store.get(sessionId) ?? [];
}

/**
 * Appends a message to the session history and enforces the sliding window cap.
 */
export function addMessage(sessionId: string, message: ChatMessage): void {
  const history = store.get(sessionId) ?? [];
  history.push(message);

  // Keep only the most recent MAX_MESSAGES entries
  if (history.length > MAX_MESSAGES) {
    history.splice(0, history.length - MAX_MESSAGES);
  }

  store.set(sessionId, history);
}

/**
 * Clears all conversation history for a session.
 */
export function clearHistory(sessionId: string): void {
  store.delete(sessionId);
}
