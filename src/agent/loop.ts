import OpenAI from 'openai';
import { config } from '../config';
import { buildSystemPrompt } from './prompt';
import { getHistory, addMessage } from './memory';
import { TOOL_DEFINITIONS, executeTool } from './tools/index';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Runs the agent for one user turn:
 * 1. Loads conversation history for the session.
 * 2. Calls the LLM (with tool definitions).
 * 3. Iteratively executes any tool calls and feeds results back.
 * 4. Returns the final text response.
 * 5. Persists the user message and assistant response to memory.
 */
export async function runAgent(sessionId: string, userMessage: string): Promise<string> {
  const history = await getHistory(sessionId);

  // Build the full messages array: system + history + new user message
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt() },
    ...history,
    { role: 'user', content: userMessage },
  ];

  // Agentic loop — keep calling the LLM until it stops requesting tool calls
  let response = await openai.chat.completions.create({
    model: config.openai.model,
    messages,
    tools: TOOL_DEFINITIONS,
    tool_choice: 'auto',
  });

  while (response.choices[0]?.finish_reason === 'tool_calls') {
    const assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls ?? [];

    // Execute all tool calls in parallel
    const toolResults = await Promise.all(
      toolCalls.map(async (tc) => {
        const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        const result = await executeTool(sessionId, tc.function.name, args);
        return {
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: result,
        };
      }),
    );

    messages.push(...toolResults);

    // Call the LLM again with tool results in context
    response = await openai.chat.completions.create({
      model: config.openai.model,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
    });
  }

  const responseText = response.choices[0]?.message?.content ?? '';

  // Persist the user turn and agent response to session memory
  await addMessage(sessionId, { role: 'user', content: userMessage });
  await addMessage(sessionId, { role: 'assistant', content: responseText });

  return responseText;
}
