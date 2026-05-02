import type OpenAI from 'openai';
import * as clientTools from './clients';
import * as appointmentTools from './appointments';
import * as testResultTools from './test_results';
import * as visitSummaryTools from './visit_summaries';
import * as notificationTools from './notifications';

// Aggregated tool definitions sent to the LLM
export const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  ...clientTools.definitions,
  ...appointmentTools.definitions,
  ...testResultTools.definitions,
  ...visitSummaryTools.definitions,
  ...notificationTools.definitions,
];

// Tool name → module mapping for fast routing
const TOOL_MODULES: Record<string, (waId: string, name: string, args: Record<string, unknown>) => Promise<string>> = {
  get_client:                   clientTools.execute,
  upsert_client:                clientTools.execute,
  update_client:                clientTools.execute,
  get_available_slots:          appointmentTools.execute,
  create_appointment:           appointmentTools.execute,
  list_appointments_for_client: appointmentTools.execute,
  reschedule_appointment:       appointmentTools.execute,
  cancel_appointment:           appointmentTools.execute,
  list_test_results_for_client: testResultTools.execute,
  get_latest_visit_summary:     visitSummaryTools.execute,
  list_visit_summaries_for_client: visitSummaryTools.execute,
  send_whatsapp_confirmation:   notificationTools.execute,
};

/**
 * Dispatches a tool call to the appropriate module.
 * All errors are caught and returned as a JSON error payload so the agent loop never crashes.
 */
export async function executeTool(
  waId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const handler = TOOL_MODULES[name];
  if (!handler) {
    return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
  try {
    return await handler(waId, name, args);
  } catch (err) {
    // Supabase throws PostgrestError objects (not Error instances) — extract .message explicitly
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as Record<string, unknown>).message)
          : JSON.stringify(err);
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? (err as Record<string, unknown>).code
        : undefined;
    console.error(`[TOOL ERROR] ${name}: ${message}${code ? ` (code: ${code})` : ''}`);
    return JSON.stringify({ error: message });
  }
}
