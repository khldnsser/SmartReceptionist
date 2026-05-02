import cron from 'node-cron';
import { checkAndSendReminders } from './reminders';
import { checkAndMarkMissedAppointments } from './missed';

export function startScheduler(): void {
  // Daily at 08:00 Beirut time (05:00 UTC): send reminders for tomorrow's appointments
  cron.schedule('0 5 * * *', async () => {
    try {
      await checkAndSendReminders();
    } catch (err) {
      console.error('[SCHEDULER] Unhandled error in reminder check:', err);
    }
  }, { timezone: 'UTC' });

  // Every day at midnight Beirut time (UTC+3 = 21:00 UTC): mark missed appointments
  cron.schedule('0 21 * * *', async () => {
    try {
      await checkAndMarkMissedAppointments();
    } catch (err) {
      console.error('[SCHEDULER] Unhandled error in missed check:', err);
    }
  }, { timezone: 'UTC' });

  // Also run once on startup to catch any that slipped through
  checkAndMarkMissedAppointments().catch(err =>
    console.error('[SCHEDULER] Startup missed check failed:', err),
  );

  console.log('[SCHEDULER] Started — reminders daily at 08:00 Beirut, missed check daily at midnight Beirut');
}
