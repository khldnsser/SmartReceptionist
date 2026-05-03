import { supabase } from '../infra/supabase/client';
import { logger } from '../core/logger';

export async function checkAndMarkMissedAppointments(): Promise<void> {
  const todayBeirut = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Beirut' }),
  );
  todayBeirut.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('appointments')
    .update({ booking_status: 'missed' })
    .eq('booking_status', 'booked')
    .lt('appointment_date', todayBeirut.toISOString())
    .select('id');

  if (error) {
    logger.error({ err: error.message }, '[MISSED] Failed to mark missed appointments');
    return;
  }

  if (data && data.length > 0) {
    logger.info({ count: data.length }, '[MISSED] Marked appointments as missed');
  }
}
