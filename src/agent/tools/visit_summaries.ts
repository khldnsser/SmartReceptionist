import type OpenAI from 'openai';
import * as clientsDb from '../../db/clients';
import * as summariesDb from '../../db/visit_summaries';

export const definitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_latest_visit_summary',
      description:
        "Retrieve the most recent visit summary written by the doctor for the current patient. Returns null if no summary exists yet.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_visit_summaries_for_client',
      description: "List all visit summaries for the current patient, newest first.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

type Args = Record<string, unknown>;

export async function execute(waId: string, name: string, _args: Args): Promise<string> {
  const client = await clientsDb.getClientByWaId(waId);
  if (!client) return JSON.stringify(null);

  switch (name) {
    case 'get_latest_visit_summary':
      return JSON.stringify(await summariesDb.getLatestVisitSummary(client.id));

    case 'list_visit_summaries_for_client':
      return JSON.stringify(await summariesDb.listVisitSummaries(client.id));

    default:
      return JSON.stringify({ error: `Unknown visit_summaries tool: ${name}` });
  }
}
