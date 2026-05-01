import type OpenAI from 'openai';
import { DateTime } from 'luxon';
import * as calendar from '../tools/calendar';
import * as gmail from '../tools/gmail';
import * as clients from '../db/clients';
import * as appointments from '../db/appointments';
import { getNextAvailableSlots } from '../tools/availability';
import { config } from '../config';

// ─── Tool Definitions (OpenAI function-calling schema) ────────────────────────

export const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  // ── Calendar ────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'calendar_read',
      description:
        'Get all calendar events from a start time onward to check availability. Always call this before offering time slots.',
      parameters: {
        type: 'object',
        properties: {
          timeMin: {
            type: 'string',
            description: 'Start of the range in ISO 8601 format (e.g. current datetime).',
          },
          timeMax: {
            type: 'string',
            description: 'End of the range in ISO 8601 format (optional).',
          },
        },
        required: ['timeMin'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_create',
      description: 'Create a new 30-minute appointment event on the clinic calendar. Returns the event object including its id — pass that id to create_appointment.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: "Event title — include the patient's name and topic.",
          },
          start: {
            type: 'string',
            description: 'Event start datetime in ISO 8601 format (Beirut timezone).',
          },
          end: {
            type: 'string',
            description: 'Event end datetime in ISO 8601 format (Beirut timezone).',
          },
        },
        required: ['summary', 'start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_delete',
      description: 'Delete an existing calendar event by its ID (for cancellation or rescheduling).',
      parameters: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'The Google Calendar event ID to delete.',
          },
        },
        required: ['eventId'],
      },
    },
  },

  // ── Availability ────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_available_slots',
      description:
        'Returns the next 5 available 30-minute appointment slots, respecting office hours and existing bookings. ' +
        'Pass preferred_date (YYYY-MM-DD) if the patient expressed a day preference; omit it to get the next 5 slots from now.',
      parameters: {
        type: 'object',
        properties: {
          preferred_date: {
            type: 'string',
            description: 'Optional date in YYYY-MM-DD format. Slots will be searched starting from the beginning of this day.',
          },
        },
        required: [],
      },
    },
  },

  // ── Client (long-term memory) ────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_client',
      description:
        'Retrieve the current patient\'s profile from the database using their WhatsApp ID. Returns null if no profile exists yet.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upsert_client',
      description:
        'Create or update the current patient\'s profile. Call this whenever you collect or change any patient detail (name, email, phone, age, medical history).',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: "Patient's email address." },
          name: { type: 'string', description: "Patient's full name." },
          phone: {
            type: 'string',
            description: 'Phone number with country code, digits only (no + or spaces).',
          },
          age: { type: 'number', description: "Patient's age in years." },
          medical_history: {
            type: 'string',
            description: 'Free-form medical history, conditions, or notes. Append new information rather than overwriting.',
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
      description: 'Update specific fields on the current patient\'s existing profile.',
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

  // ── Appointments (long-term memory) ─────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'create_appointment',
      description:
        'Save a confirmed appointment to the database. Call this after calendar_create — pass the calendar event id returned by that call.',
      parameters: {
        type: 'object',
        properties: {
          appointment_date: {
            type: 'string',
            description: 'Confirmed appointment start datetime in ISO 8601 format (Beirut timezone).',
          },
          calendar_event_id: {
            type: 'string',
            description: 'The id of the Google Calendar event just created.',
          },
          intake_form: {
            type: 'string',
            description: "Topics or issues the patient wants to discuss.",
          },
        },
        required: ['appointment_date', 'calendar_event_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_appointments_for_client',
      description:
        "Retrieve all of the current patient's appointments (past and future). Use this to find an appointment's id or calendar_event_id before rescheduling or cancelling.",
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_appointment',
      description: 'Update an existing appointment record (e.g. new date, status change, new calendar event id after rescheduling).',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: {
            type: 'string',
            description: 'The UUID of the appointment to update.',
          },
          appointment_date: {
            type: 'string',
            description: 'New appointment datetime in ISO 8601 format (Beirut timezone).',
          },
          booking_status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'cancelled', 'completed'],
          },
          calendar_event_id: {
            type: 'string',
            description: 'New calendar event id after rescheduling.',
          },
          intake_form: { type: 'string' },
          reminder_sent: { type: 'boolean' },
        },
        required: ['appointment_id'],
      },
    },
  },

  // ── Gmail ────────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'gmail_send',
      description: 'Send a confirmation or update email to the patient.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: "Recipient's email address." },
          subject: { type: 'string', description: 'Email subject line.' },
          message: { type: 'string', description: 'Email body with booking details.' },
        },
        required: ['to', 'subject', 'message'],
      },
    },
  },
];

// ─── Tool Executor ─────────────────────────────────────────────────────────────

type ToolArgs = Record<string, unknown>;

export async function executeTool(waId: string, name: string, args: ToolArgs): Promise<string> {
  try {
    switch (name) {
      // ── Calendar ────────────────────────────────────────────────────────────
      case 'calendar_read': {
        const timeMin =
          (args.timeMin as string) ??
          DateTime.now().setZone(config.business.timezone).toISO()!;
        const events = await calendar.listEvents(timeMin, args.timeMax as string | undefined);
        return JSON.stringify(events);
      }

      case 'calendar_create': {
        const event = await calendar.createEvent(
          args.summary as string,
          args.start as string,
          args.end as string,
        );
        return JSON.stringify(event);
      }

      case 'calendar_delete': {
        const result = await calendar.deleteEvent(args.eventId as string);
        return JSON.stringify(result);
      }

      // ── Availability ────────────────────────────────────────────────────────
      case 'get_available_slots': {
        const now = DateTime.now().setZone(config.business.timezone);
        let searchFrom: DateTime | undefined;
        if (args.preferred_date) {
          searchFrom = DateTime.fromISO(args.preferred_date as string, { zone: config.business.timezone }).startOf('day');
        }
        const events = await calendar.listEvents(now.toISO()!);
        const slots = getNextAvailableSlots(now, events, searchFrom);
        return JSON.stringify(slots);
      }

      // ── Client ──────────────────────────────────────────────────────────────
      case 'get_client': {
        const client = await clients.getClientByWaId(waId);
        return JSON.stringify(client);
      }

      case 'upsert_client': {
        const client = await clients.upsertClient(waId, args as clients.ClientFields);
        return JSON.stringify(client);
      }

      case 'update_client': {
        const client = await clients.updateClient(waId, args as clients.ClientFields);
        return JSON.stringify(client);
      }

      // ── Appointments ────────────────────────────────────────────────────────
      case 'create_appointment': {
        const client = await clients.getClientByWaId(waId);
        if (!client) return JSON.stringify({ error: 'No client profile found. Call upsert_client first.' });
        const appt = await appointments.createAppointment(client.id, {
          appointment_date: args.appointment_date as string,
          calendar_event_id: args.calendar_event_id as string | undefined,
          intake_form: args.intake_form as string | undefined,
        });
        return JSON.stringify(appt);
      }

      case 'list_appointments_for_client': {
        const client = await clients.getClientByWaId(waId);
        if (!client) return JSON.stringify([]);
        const appts = await appointments.listAppointmentsForClient(client.id);
        return JSON.stringify(appts);
      }

      case 'update_appointment': {
        const { appointment_id, ...fields } = args as unknown as { appointment_id: string } & appointments.AppointmentUpdate;
        const appt = await appointments.updateAppointment(appointment_id, fields);
        return JSON.stringify(appt);
      }

      // ── Gmail ────────────────────────────────────────────────────────────────
      case 'gmail_send': {
        const result = await gmail.sendConfirmationEmail(
          args.to as string,
          args.subject as string,
          args.message as string,
        );
        return JSON.stringify(result);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[TOOL ERROR] ${name}:`, message);
    return JSON.stringify({ error: message });
  }
}
