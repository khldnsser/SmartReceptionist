import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { config } from '../config';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
}

function getAuth(): JWT {
  const key = config.google.serviceAccountKey as {
    client_email: string;
    private_key: string;
  };
  return new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
}

function getCalendar() {
  return google.calendar({ version: 'v3', auth: getAuth() });
}

/**
 * Lists all calendar events from timeMin onward (optionally up to timeMax).
 */
export async function listEvents(timeMin: string, timeMax?: string): Promise<CalendarEvent[]> {
  const calendar = getCalendar();

  const response = await calendar.events.list({
    calendarId: config.google.calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });

  return (response.data.items ?? []).map((item) => ({
    id: item.id ?? '',
    summary: item.summary ?? '',
    start: item.start?.dateTime ?? item.start?.date ?? '',
    end: item.end?.dateTime ?? item.end?.date ?? '',
  }));
}

/**
 * Creates a new calendar event and returns the created event.
 */
export async function createEvent(
  summary: string,
  start: string,
  end: string,
): Promise<CalendarEvent> {
  const calendar = getCalendar();

  const response = await calendar.events.insert({
    calendarId: config.google.calendarId,
    requestBody: {
      summary,
      start: { dateTime: start, timeZone: config.business.timezone },
      end: { dateTime: end, timeZone: config.business.timezone },
    },
  });

  return {
    id: response.data.id ?? '',
    summary: response.data.summary ?? '',
    start: response.data.start?.dateTime ?? '',
    end: response.data.end?.dateTime ?? '',
  };
}

/**
 * Deletes a calendar event by its ID.
 */
export async function deleteEvent(eventId: string): Promise<{ success: boolean }> {
  const calendar = getCalendar();

  await calendar.events.delete({
    calendarId: config.google.calendarId,
    eventId,
  });

  return { success: true };
}
