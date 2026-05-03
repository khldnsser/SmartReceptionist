import type OpenAI from 'openai';
import * as clinical from '../../db/clinical';
import { supabase } from '../../db/client';
import { getClientByWaId } from '../../db/clients';

export const definitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_my_allergies',
      description:
        "Returns the patient's known allergies (substance and reaction). Call when the patient asks about their allergies.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_medications',
      description:
        "Returns the patient's currently active medications (name, dose, frequency). Call when the patient asks what medications they are on.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_problems',
      description:
        "Returns the patient's active medical conditions or problems. Call when the patient asks about their conditions or medical history.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_family_history',
      description:
        "Returns the patient's family medical history (relation and condition). Call when the patient asks about their family history on file.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_social_history',
      description:
        "Returns the patient's social history status fields (smoking, alcohol, drug use, occupation, living situation). Call when asked.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_test_results_list',
      description:
        "Returns a list of test result files on file for the patient (file name, date, patient note). Does NOT return file contents or doctor's interpretation. Call when the patient asks whether results were received or what files are on file.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

async function writeAuditLog(
  waId: string,
  resourceType: string,
): Promise<void> {
  try {
    const client = await getClientByWaId(waId);
    if (!client) return;
    await supabase.from('audit_logs').insert({
      action_type: 'read',
      actor_source: 'agent',
      resource_type: resourceType,
      resource_id: client.id,
    });
  } catch {
    // Audit failures must never break the main flow
  }
}

type Args = Record<string, unknown>;

export async function execute(waId: string, name: string, _args: Args): Promise<string> {
  switch (name) {
    case 'get_my_allergies': {
      const data = await clinical.getAllergiesForWaId(waId);
      await writeAuditLog(waId, 'client_allergies');
      if (data.length === 0) return JSON.stringify({ result: 'No allergies on file.' });
      return JSON.stringify(data);
    }

    case 'get_my_medications': {
      const data = await clinical.getMedicationsForWaId(waId);
      await writeAuditLog(waId, 'client_medications');
      if (data.length === 0) return JSON.stringify({ result: 'No active medications on file.' });
      return JSON.stringify(data);
    }

    case 'get_my_problems': {
      const data = await clinical.getProblemsForWaId(waId);
      await writeAuditLog(waId, 'client_problems');
      if (data.length === 0) return JSON.stringify({ result: 'No active conditions on file.' });
      return JSON.stringify(data);
    }

    case 'get_my_family_history': {
      const data = await clinical.getFamilyHistoryForWaId(waId);
      await writeAuditLog(waId, 'client_family_history');
      if (data.length === 0) return JSON.stringify({ result: 'No family history on file.' });
      return JSON.stringify(data);
    }

    case 'get_my_social_history': {
      const data = await clinical.getSocialHistoryForWaId(waId);
      await writeAuditLog(waId, 'client_social_history');
      if (!data) return JSON.stringify({ result: 'No social history on file.' });
      return JSON.stringify(data);
    }

    case 'get_my_test_results_list': {
      const data = await clinical.getTestResultsListForWaId(waId);
      await writeAuditLog(waId, 'test_results');
      if (data.length === 0) return JSON.stringify({ result: 'No test results on file.' });
      return JSON.stringify(data);
    }

    default:
      return JSON.stringify({ error: `Unknown clinical tool: ${name}` });
  }
}
