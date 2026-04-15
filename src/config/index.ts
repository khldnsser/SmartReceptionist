import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function loadServiceAccountKey(): object {
  const keyFile = optional('GOOGLE_SERVICE_ACCOUNT_KEY_FILE', './google-service-account.json');
  const resolved = path.resolve(keyFile);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Google service account key file not found: ${resolved}`);
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

export const config = {
  port: parseInt(optional('PORT', '3000')),

  whatsapp: {
    phoneNumberId: required('WHATSAPP_PHONE_NUMBER_ID'),
    apiToken: required('WHATSAPP_API_TOKEN'),
    verifyToken: required('WHATSAPP_VERIFY_TOKEN'),
    appSecret: optional('WHATSAPP_APP_SECRET', ''),
    apiVersion: 'v21.0',
  },

  openai: {
    apiKey: required('OPENAI_API_KEY'),
    model: optional('OPENAI_MODEL', 'gpt-4o-mini'),
  },

  google: {
    get serviceAccountKey() { return loadServiceAccountKey(); },
    calendarId: required('GOOGLE_CALENDAR_ID'),
    sheetId: required('GOOGLE_SHEET_ID'),
    sheetName: optional('GOOGLE_SHEET_NAME', 'Appointments'),
    gmail: {
      clientId: required('GMAIL_CLIENT_ID'),
      clientSecret: required('GMAIL_CLIENT_SECRET'),
      refreshToken: required('GMAIL_REFRESH_TOKEN'),
      sender: required('GMAIL_SENDER'),
    },
  },

  business: {
    timezone: optional('TIMEZONE', 'Asia/Beirut'),
    appointmentDurationMin: parseInt(optional('APPOINTMENT_DURATION_MIN', '30')),
    officeHours: {
      amStart: optional('OFFICE_HOURS_AM_START', '09:00'),
      amEnd: optional('OFFICE_HOURS_AM_END', '12:00'),
      pmStart: optional('OFFICE_HOURS_PM_START', '13:00'),
      pmEnd: optional('OFFICE_HOURS_PM_END', '17:00'),
    },
    minBookingLeadHours: parseInt(optional('MIN_BOOKING_LEAD_HOURS', '24')),
    slotsToOffer: parseInt(optional('SLOTS_TO_OFFER', '5')),
  },
} as const;
