import type OpenAI from 'openai';
import * as clientService from '../../services/client.service';
import type { ClientFields } from '../../repositories/client.repo';

export const definitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_client',
      description:
        "Retrieve the current patient's profile from the database. Returns null if no profile exists yet. Call this at the start of every conversation.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upsert_client',
      description:
        "Create or update the current patient's profile. Call immediately when you collect any new detail (name, email, phone, age, medical_history).",
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: "Patient's email address." },
          name: { type: 'string', description: "Patient's full name." },
          phone: {
            type: 'string',
            description: 'Phone with country code, digits only (no + or spaces).',
          },
          age: { type: 'number', description: "Patient's age in years." },
          medical_history: {
            type: 'string',
            description:
              'Free-form medical history, conditions, or notes. Append new info rather than overwriting.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_client',
      description: "Update specific fields on the current patient's existing profile.",
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          name: { type: 'string' },
          phone: { type: 'string' },
          age: { type: 'number' },
          medical_history: { type: 'string' },
        },
        required: [],
      },
    },
  },
];

type Args = Record<string, unknown>;

export async function execute(waId: string, name: string, args: Args): Promise<string> {
  switch (name) {
    case 'get_client':
      return JSON.stringify(await clientService.getClient(waId));

    case 'upsert_client':
      return JSON.stringify(await clientService.upsertClient(waId, args as ClientFields));

    case 'update_client':
      return JSON.stringify(await clientService.updateClient(waId, args as ClientFields));

    default:
      return JSON.stringify({ error: `Unknown client tool: ${name}` });
  }
}
