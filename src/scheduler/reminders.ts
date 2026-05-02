import { DateTime } from 'luxon';
import { config } from '../config';
import { listAppointmentsDueForReminder, updateAppointment } from '../db/appointments';
import { sendReminderNotification } from '../notifications/send';

/**
 * Sends reminders for all booked appointments scheduled for tomorrow (Beirut date).
 * Intended to run once daily at 08:00 Beirut time.
 * Errors per appointment are caught individually so one failure doesn't stop others.
 */
export async function checkAndSendReminders(): Promise<void> {
  const now = DateTime.now().setZone(config.business.timezone);
  const tomorrowStart = now.plus({ days: 1 }).startOf('day');
  const tomorrowEnd = tomorrowStart.endOf('day');

  const due = await listAppointmentsDueForReminder(tomorrowStart.toISO()!, tomorrowEnd.toISO()!);

  if (due.length === 0) return;

  console.log(`[SCHEDULER] ${due.length} reminder(s) to send`);

  await Promise.allSettled(
    due.map(async (appt) => {
      const { wa_id, name } = appt.clients;
      try {
        await sendReminderNotification(wa_id, name ?? 'there', appt.appointment_date);
        await updateAppointment(appt.id, { reminder_sent: true });
        console.log(`[SCHEDULER] Reminder sent for appointment ${appt.id} → ${wa_id}`);
      } catch (err) {
        console.error(`[SCHEDULER] Failed for appointment ${appt.id}:`, err);
      }
    }),
  );
}
