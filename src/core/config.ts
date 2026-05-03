import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3000),

  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_API_TOKEN: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().default(''),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  INTERNAL_API_TOKEN: z.string().min(1),

  TIMEZONE: z.string().default('Asia/Beirut'),
  APPOINTMENT_DURATION_MIN: z.coerce.number().default(30),
  OFFICE_HOURS_AM_START: z.string().default('09:00'),
  OFFICE_HOURS_AM_END: z.string().default('12:00'),
  OFFICE_HOURS_PM_START: z.string().default('13:00'),
  OFFICE_HOURS_PM_END: z.string().default('17:00'),
  MIN_BOOKING_LEAD_HOURS: z.coerce.number().default(24),
  SLOTS_TO_OFFER: z.coerce.number().default(5),
  REMINDER_LEAD_HOURS: z.coerce.number().default(24),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const missing = parsed.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${missing}`);
}

const e = parsed.data;

export const config = {
  port: e.PORT,

  whatsapp: {
    phoneNumberId: e.WHATSAPP_PHONE_NUMBER_ID,
    apiToken: e.WHATSAPP_API_TOKEN,
    verifyToken: e.WHATSAPP_VERIFY_TOKEN,
    appSecret: e.WHATSAPP_APP_SECRET,
    apiVersion: 'v21.0',
  },

  openai: {
    apiKey: e.OPENAI_API_KEY,
    model: e.OPENAI_MODEL,
  },

  supabase: {
    url: e.SUPABASE_URL,
    serviceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY,
  },

  notifications: {
    internalToken: e.INTERNAL_API_TOKEN,
  },

  business: {
    timezone: e.TIMEZONE,
    appointmentDurationMin: e.APPOINTMENT_DURATION_MIN,
    officeHours: {
      amStart: e.OFFICE_HOURS_AM_START,
      amEnd: e.OFFICE_HOURS_AM_END,
      pmStart: e.OFFICE_HOURS_PM_START,
      pmEnd: e.OFFICE_HOURS_PM_END,
    },
    minBookingLeadHours: e.MIN_BOOKING_LEAD_HOURS,
    slotsToOffer: e.SLOTS_TO_OFFER,
    reminderLeadHours: e.REMINDER_LEAD_HOURS,
  },
} as const;
