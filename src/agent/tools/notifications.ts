import type OpenAI from 'openai';

// No agent-facing notification tools — the agent's text reply IS the WhatsApp message.
// A separate send_whatsapp_confirmation tool caused duplicate messages (tool call +
// the agent response both being delivered to the patient).
export const definitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [];

type Args = Record<string, unknown>;

export async function execute(_waId: string, name: string, _args: Args): Promise<string> {
  return JSON.stringify({ error: `Unknown notifications tool: ${name}` });
}
