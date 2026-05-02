import type OpenAI from 'openai';
import { DateTime } from 'luxon';
import * as db from '../../db/appointments';
import * as clientsDb from '../../db/clients';
import { getNextAvailableSlots } from '../../tools/availability';
import { config } from '../../config';

export const definitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_available_slots',
      description:
        'Returns the next 5 available 30-minute appointment slots respecting office hours and existing bookings. ' +
        'Pass preferred_date (YYYY-MM-DD) if the patient named a day; omit to get the next 5 from now. Always call this — never guess availability.',
      parameters: {
        type: 'object',
        properties: {
          preferred_date: {
            type: 'string',
            description:
              'Optional date in YYYY-MM-DD format. Slots are searched from the start of that day.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_appointment',
      description:
        'Books a confirmed appointment. Call only after the patient has explicitly confirmed a specific slot.',
      parameters: {
        type: 'object',
        properties: {
          appointment_date: {
            type: 'string',
            description: 'Confirmed appointment start datetime in ISO 8601 format (Beirut timezone).',
          },
          intake_form: {
            type: 'string',
            description: 'Topics or issues the patient wants to discuss.',
          },
        },
        required: ['appointment_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_appointments_for_client',
      description:
        "Retrieve all of the current patient's appointments (past and future). Use this to find an appointment before rescheduling or cancelling.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_appointment',
      description:
        'Cancels the old appointment and creates a new booked one. Call only after the patient confirms the new slot.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: {
            type: 'string',
            description: 'UUID of the appointment to reschedule.',
          },
          new_date: {
            type: 'string',
            description: 'New appointment start datetime in ISO 8601 format (Beirut timezone).',
          },
        },
        required: ['appointment_id', 'new_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description:
        "Cancels the patient's appointment. Call only after the patient explicitly confirms they want to cancel.",
      parameters: {
        type: 'object',
        properties: {
          appointment_id: {
            type: 'string',
            description: 'UUID of the appointment to cancel.',
          },
        },
        required: ['appointment_id'],
      },
    },
  },
];

type Args = Record<string, unknown>;

export async function execute(waId: string, name: string, args: Args): Promise<string> {
  const tz = config.business.timezone;

  switch (name) {
    case 'get_available_slots': {
      const now = DateTime.now().setZone(tz);
      let searchFrom: DateTime | undefined;
      if (args.preferred_date) {
        searchFrom = DateTime.fromISO(args.preferred_date as string, { zone: tz }).startOf('day');
      }
      const booked = await db.listBookedAppointmentsFrom(now.toISO()!);
      const slots = getNextAvailableSlots(now, booked, searchFrom);
      return JSON.stringify(slots);
    }

    case 'create_appointment': {
      const client = await clientsDb.getClientByWaId(waId);
      if (!client) {
        return JSON.stringify({ error: 'No client profile. Call upsert_client first.' });
      }
      const conflict = await db.isSlotConflict(args.appointment_date as string);
      if (conflict) {
        return JSON.stringify({ error: 'That time slot is already booked. Please call get_available_slots and offer the patient a different time.' });
      }
      const appt = await db.createAppointment(client.id, {
        appointment_date: args.appointment_date as string,
        intake_form: args.intake_form as string | undefined,
      });
      return JSON.stringify(appt);
    }

    case 'list_appointments_for_client': {
      const client = await clientsDb.getClientByWaId(waId);
      if (!client) return JSON.stringify([]);
      const appts = await db.listAppointmentsForClient(client.id);
      return JSON.stringify(appts);
    }

    case 'reschedule_appointment': {
      const client = await clientsDb.getClientByWaId(waId);
      if (!client) return JSON.stringify({ error: 'No client profile found.' });
      const appts = await db.listAppointmentsForClient(client.id);
      const owns = appts.some(a => a.id === args.appointment_id);
      if (!owns) return JSON.stringify({ error: 'Appointment not found for this patient.' });
      const conflict = await db.isSlotConflict(args.new_date as string, args.appointment_id as string);
      if (conflict) {
        return JSON.stringify({ error: 'That time slot is already booked. Please call get_available_slots and offer the patient a different time.' });
      }
      const result = await db.rescheduleAppointment(
        args.appointment_id as string,
        args.new_date as string,
      );
      return JSON.stringify(result);
    }

    case 'cancel_appointment': {
      const client = await clientsDb.getClientByWaId(waId);
      if (!client) return JSON.stringify({ error: 'No client profile found.' });
      const appts = await db.listAppointmentsForClient(client.id);
      const owns = appts.some(a => a.id === args.appointment_id);
      if (!owns) return JSON.stringify({ error: 'Appointment not found for this patient.' });
      const cancelled = await db.cancelAppointment(args.appointment_id as string);
      return JSON.stringify(cancelled);
    }

    default:
      return JSON.stringify({ error: `Unknown appointment tool: ${name}` });
  }
}
