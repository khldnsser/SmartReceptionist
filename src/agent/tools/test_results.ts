import type OpenAI from 'openai';
import * as clientsDb from '../../db/clients';
import * as testResultsDb from '../../db/test_results';

export const definitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_test_results_for_client',
      description:
        "Retrieve all test results uploaded by the current patient. Use this when the patient asks whether their results were received or wants to know what's on file.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

type Args = Record<string, unknown>;

export async function execute(waId: string, name: string, _args: Args): Promise<string> {
  switch (name) {
    case 'list_test_results_for_client': {
      const client = await clientsDb.getClientByWaId(waId);
      if (!client) return JSON.stringify([]);
      const results = await testResultsDb.listTestResults(client.id);
      // Return only the fields the agent needs — omit storage_path for privacy
      const summary = results.map((r) => ({
        id: r.id,
        file_name: r.file_name,
        mime_type: r.mime_type,
        doctor_label: r.doctor_label,
        patient_note: r.patient_note,
        created_at: r.created_at,
      }));
      return JSON.stringify(summary);
    }

    default:
      return JSON.stringify({ error: `Unknown test_results tool: ${name}` });
  }
}
