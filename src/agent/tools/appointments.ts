import type OpenAI from 'openai';
import { DateTime } from 'luxon';
import { config } from '../../core/config';
import * as booking from '../../services/booking.service';
import type { Appointment } from '../../repositories/appointment.repo';

// Convert appointment_date to Beirut-offset ISO before sending to the LLM.
// Supabase returns UTC timestamps; without conversion the LLM reports UTC time to the patient.
function toBerutISO(utcIso: string): string {
  return DateTime.fromISO(utcIso).setZone(config.business.timezone).toISO()!;
}

function localize(appt: Appointment): Appointment {
  return { ...appt, appointment_date: toBerutISO(appt.appointment_date as string) };
}

export const definitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_available_slots',
      description:
        'Returns the next 5 available appointment slots respecting office hours and existing bookings. ' +
        'If the patient named a specific time, pass preferred_datetime (e.g. "2025-05-05T15:00") so slots start near their requested time. ' +
        'If the patient named only a day, pass preferred_datetime as "YYYY-MM-DD" (start of day). ' +
        'Omit entirely to get the next 5 from now. Always call this — never guess availability.',
      parameters: {
        type: 'object',
        properties: {
          preferred_datetime: {
            type: 'string',
            description:
              'Optional. ISO date ("YYYY-MM-DD") or datetime ("YYYY-MM-DDTHH:MM") in Beirut time. ' +
              'Slots are returned starting from this point. Use full datetime when the patient specifies a time.',
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
          appointment_type: {
            type: 'string',
            enum: ['initial', 'follow_up', 'procedure', 'telemedicine'],
            description: 'Type of appointment. Defaults to follow_up if not specified by the patient.',
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
  switch (name) {
    case 'get_available_slots':
      return JSON.stringify(
        await booking.getAvailableSlots(args.preferred_datetime as string | undefined),
      );

    case 'create_appointment':
      return JSON.stringify(
        localize(await booking.bookAppointment(
          waId,
          args.appointment_date as string,
          args.intake_form as string | undefined,
          (args.appointment_type as string | undefined) ?? 'follow_up',
        )),
      );

    case 'list_appointments_for_client':
      return JSON.stringify((await booking.listClientAppointments(waId)).map(localize));

    case 'reschedule_appointment': {
      const result = await booking.rescheduleClientAppointment(
        waId,
        args.appointment_id as string,
        args.new_date as string,
      );
      return JSON.stringify({ old: localize(result.old), new: localize(result.new) });
    }

    case 'cancel_appointment':
      return JSON.stringify(
        localize(await booking.cancelClientAppointment(waId, args.appointment_id as string)),
      );

    default:
      return JSON.stringify({ error: `Unknown appointment tool: ${name}` });
  }
}
