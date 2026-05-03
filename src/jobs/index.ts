import cron from 'node-cron';
import { checkAndSendReminders } from './appointment-reminders.job';
import { checkAndMarkMissedAppointments } from './mark-missed.job';
import { logger } from '../core/logger';

export function startScheduler(): void {
  // Daily at 08:00 Beirut time (05:00 UTC): send reminders for tomorrow's appointments
  cron.schedule('0 5 * * *', async () => {
    try {
      await checkAndSendReminders();
    } catch (err) {
      logger.error({ err }, '[SCHEDULER] Unhandled error in reminder check');
    }
  }, { timezone: 'UTC' });

  // Every day at midnight Beirut time (UTC+3 = 21:00 UTC): mark missed appointments
  cron.schedule('0 21 * * *', async () => {
    try {
      await checkAndMarkMissedAppointments();
    } catch (err) {
      logger.error({ err }, '[SCHEDULER] Unhandled error in missed check');
    }
  }, { timezone: 'UTC' });

  // Also run once on startup to catch any that slipped through
  checkAndMarkMissedAppointments().catch(err =>
    logger.error({ err }, '[SCHEDULER] Startup missed check failed'),
  );

  logger.info('[SCHEDULER] Started — reminders daily at 08:00 Beirut, missed check daily at midnight Beirut');
}
