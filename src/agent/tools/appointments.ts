import type OpenAI from 'openai';
import * as booking from '../../services/booking.service';

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
        await booking.getAvailableSlots(args.preferred_date as string | undefined),
      );

    case 'create_appointment':
      return JSON.stringify(
        await booking.bookAppointment(
          waId,
          args.appointment_date as string,
          args.intake_form as string | undefined,
          (args.appointment_type as string | undefined) ?? 'follow_up',
        ),
      );

    case 'list_appointments_for_client':
      return JSON.stringify(await booking.listClientAppointments(waId));

    case 'reschedule_appointment':
      return JSON.stringify(
        await booking.rescheduleClientAppointment(
          waId,
          args.appointment_id as string,
          args.new_date as string,
        ),
      );

    case 'cancel_appointment':
      return JSON.stringify(
        await booking.cancelClientAppointment(waId, args.appointment_id as string),
      );

    default:
      return JSON.stringify({ error: `Unknown appointment tool: ${name}` });
  }
}
