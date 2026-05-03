import { config } from '../config';
import { openai } from '../infra/openai/client';
import { buildSystemPrompt } from './prompt';
import { getHistory, addMessage } from './memory';
import { TOOL_DEFINITIONS, executeTool } from './tools/index';
import { runGuardrails } from './guardrails/index';
import type OpenAI from 'openai';

export async function runAgent(sessionId: string, userMessage: string): Promise<string> {
  const guardrail = runGuardrails(userMessage);
  if (guardrail.action === 'block') {
    return guardrail.response ?? '';
  }

  const history = await getHistory(sessionId);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt() },
    ...history,
    { role: 'user', content: userMessage },
  ];

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

    response = await openai.chat.completions.create({
      model: config.openai.model,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
    });
  }

  const responseText = response.choices[0]?.message?.content ?? '';

  await addMessage(sessionId, { role: 'user', content: userMessage });
  await addMessage(sessionId, { role: 'assistant', content: responseText });

  return responseText;
}
