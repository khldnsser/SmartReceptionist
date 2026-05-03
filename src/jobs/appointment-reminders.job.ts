import { DateTime } from 'luxon';
import { config } from '../core/config';
import { listAppointmentsDueForReminder, updateAppointment } from '../repositories/appointment.repo';
import { sendReminderNotification } from '../services/messaging.service';
import { logger } from '../core/logger';

export async function checkAndSendReminders(): Promise<void> {
  const now = DateTime.now().setZone(config.business.timezone);
  const tomorrowStart = now.plus({ days: 1 }).startOf('day');
  const tomorrowEnd = tomorrowStart.endOf('day');

  const due = await listAppointmentsDueForReminder(tomorrowStart.toISO()!, tomorrowEnd.toISO()!);

  if (due.length === 0) return;

  logger.info({ count: due.length }, '[SCHEDULER] Reminders to send');

  await Promise.allSettled(
    due.map(async (appt) => {
      const { wa_id, name } = appt.clients;
      try {
        await sendReminderNotification(wa_id, name ?? 'there', appt.appointment_date);
        await updateAppointment(appt.id, { reminder_sent: true });
        logger.info({ appointmentId: appt.id, waId: wa_id }, '[SCHEDULER] Reminder sent');
      } catch (err) {
        logger.error({ appointmentId: appt.id, err }, '[SCHEDULER] Reminder failed');
      }
    }),
  );
}
