import type OpenAI from 'openai';
import { DateTime } from 'luxon';
import * as calendar from '../tools/calendar';
import * as sheets from '../tools/sheets';
import * as gmail from '../tools/gmail';
import { config } from '../config';

// ─── Tool Definitions (OpenAI function-calling schema) ────────────────────────

export const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
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
      description: 'Create a new 30-minute appointment event on the clinic calendar.',
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
            description: 'The ID of the calendar event to delete.',
          },
        },
        required: ['eventId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sheets_read',
      description: 'Read all patient records from the appointments sheet.',
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
      name: 'sheets_add_row',
      description:
        'Add a new patient record row to the sheet. Only call this when the email is not already in the sheet.',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: "Patient's email address (unique identifier).",
          },
        },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sheets_update_row',
      description:
        "Update an existing patient's record matched by email. Only update fields provided.",
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: "Patient's email address (used to find the row).",
          },
          name: { type: 'string', description: "Patient's full name." },
          phone: {
            type: 'string',
            description:
              "Phone number with country code. No '+' sign, no spaces.",
          },
          timeZone: {
            type: 'string',
            description: "Patient's location or city in Lebanon.",
          },
          appointmentDate: {
            type: 'string',
            description: 'Confirmed appointment date and time in Beirut timezone.',
          },
          bookingStatus: {
            type: 'string',
            enum: ['confirmed', 'cancelled'],
            description: 'Status of the appointment.',
          },
          intakeForm: {
            type: 'string',
            description: 'Topics or issues the patient wants to discuss.',
          },
        },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_send',
      description: 'Send a confirmation or update email to the patient.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: "Recipient's email address.",
          },
          subject: {
            type: 'string',
            description: 'Email subject line.',
          },
          message: {
            type: 'string',
            description: 'Email body containing booking details.',
          },
        },
        required: ['to', 'subject', 'message'],
      },
    },
  },
];

// ─── Tool Executor ─────────────────────────────────────────────────────────────

type ToolArgs = Record<string, unknown>;

/**
 * Dispatches a tool call from the LLM to the appropriate service function.
 * Returns a JSON-serializable result string.
 */
export async function executeTool(name: string, args: ToolArgs): Promise<string> {
  try {
    switch (name) {
      case 'calendar_read': {
        const timeMin = (args.timeMin as string) ?? DateTime.now().setZone(config.business.timezone).toISO()!;
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

      case 'sheets_read': {
        const rows = await sheets.readAllRows();
        return JSON.stringify(rows);
      }

      case 'sheets_add_row': {
        const patient = await sheets.addRow(args.email as string);
        return JSON.stringify(patient);
      }

      case 'sheets_update_row': {
        const { email, ...fields } = args as { email: string } & Partial<sheets.Patient>;
        const patient = await sheets.updateRow(email, fields);
        return JSON.stringify(patient);
      }

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
    return JSON.stringify({ error: message });
  }
}
