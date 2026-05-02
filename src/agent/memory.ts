import type OpenAI from 'openai';
import { supabase } from '../db/client';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const WINDOW_SIZE = 25;

interface MessageRow {
  wa_id: string;
  role: string;
  content: string | null;
  tool_calls: unknown;
  tool_call_id: string | null;
}

function rowToMessage(row: MessageRow): ChatMessage {
  const base = { role: row.role as ChatMessage['role'] };

  if (row.role === 'tool') {
    return {
      ...base,
      role: 'tool',
      tool_call_id: row.tool_call_id ?? '',
      content: row.content ?? '',
    };
  }

  if (row.role === 'assistant' && row.tool_calls) {
    return {
      ...base,
      role: 'assistant',
      content: row.content ?? null,
      tool_calls: row.tool_calls as OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
    };
  }

  return { ...base, content: row.content ?? '' } as ChatMessage;
}

function messageToRow(waId: string, msg: ChatMessage): MessageRow {
  const row: MessageRow = {
    wa_id: waId,
    role: msg.role,
    content: null,
    tool_calls: null,
    tool_call_id: null,
  };

  if ('content' in msg && typeof msg.content === 'string') {
    row.content = msg.content;
  }
  if (msg.role === 'assistant' && 'tool_calls' in msg && msg.tool_calls) {
    row.tool_calls = msg.tool_calls;
  }
  if (msg.role === 'tool' && 'tool_call_id' in msg) {
    row.tool_call_id = msg.tool_call_id ?? null;
  }

  return row;
}

/**
 * Returns the last WINDOW_SIZE messages for a session, in chronological order.
 */
export async function getHistory(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('role, content, tool_calls, tool_call_id')
    .eq('wa_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(WINDOW_SIZE);

  if (error) throw new Error(`${error.message} [${error.code}]`);
  if (!data || data.length === 0) return [];

  // Reverse so the result is oldest → newest (chronological for the LLM)
  return (data as MessageRow[]).reverse().map(rowToMessage);
}

/**
 * Persists a single message to the sliding-window store.
 */
export async function addMessage(sessionId: string, message: ChatMessage): Promise<void> {
  const row = messageToRow(sessionId, message);
  const { error } = await supabase.from('conversation_messages').insert(row);
  if (error) throw new Error(`${error.message} [${error.code}]`);
}

/**
 * Deletes all conversation history for a session.
 */
export async function clearHistory(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('conversation_messages')
    .delete()
    .eq('wa_id', sessionId);
  if (error) throw new Error(`${error.message} [${error.code}]`);
}
