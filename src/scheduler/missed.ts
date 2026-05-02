import { supabase } from '../db/client';

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
    console.error('[MISSED] Failed to mark missed appointments:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log(`[MISSED] Marked ${data.length} appointment(s) as missed`);
  }
}
