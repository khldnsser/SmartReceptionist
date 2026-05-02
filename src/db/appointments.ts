import { supabase } from './client';

export type BookingStatus = 'booked' | 'cancelled' | 'completed' | 'missed';

export interface Appointment {
  id: string;
  client_id: string;
  appointment_date: string;
  booking_status: BookingStatus;
  intake_form: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppointmentInput {
  appointment_date: string;
  booking_status?: BookingStatus;
  intake_form?: string;
}

export interface AppointmentUpdate {
  appointment_date?: string;
  booking_status?: BookingStatus;
  intake_form?: string;
  reminder_sent?: boolean;
}

/**
 * Returns true if any booked appointment overlaps with the given 30-minute slot.
 * Two 30-minute slots overlap when |T_A - T_B| < 30 minutes.
 */
export async function isSlotConflict(
  appointmentDate: string,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const DURATION_MS = 30 * 60 * 1000;
  const t = new Date(appointmentDate).getTime();
  const windowStart = new Date(t - DURATION_MS + 1).toISOString();
  const windowEnd = new Date(t + DURATION_MS - 1).toISOString();

  let query = supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('booking_status', 'booked')
    .gte('appointment_date', windowStart)
    .lte('appointment_date', windowEnd);

  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId);
  }

  const { count, error } = await query;
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return (count ?? 0) > 0;
}

export async function createAppointment(
  clientId: string,
  fields: AppointmentInput,
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({ client_id: clientId, booking_status: 'booked', ...fields })
    .select()
    .single();
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return data;
}

export async function listAppointmentsForClient(clientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_id', clientId)
    .order('appointment_date', { ascending: false });
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return data ?? [];
}

/** Returns all booked appointments across all clients from timeMin onward. Used by availability calculator. */
export async function listBookedAppointmentsFrom(
  timeMin: string,
): Promise<{ start: string; end: string }[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('appointment_date')
    .eq('booking_status', 'booked')
    .gte('appointment_date', timeMin);
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return (data ?? []).map((row) => ({
    start: row.appointment_date as string,
    end: row.appointment_date as string, // end is computed by availability.ts using config duration
  }));
}

export async function updateAppointment(
  appointmentId: string,
  fields: AppointmentUpdate,
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .update(fields)
    .eq('id', appointmentId)
    .select()
    .single();
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return data;
}

export async function cancelAppointment(appointmentId: string): Promise<Appointment> {
  return updateAppointment(appointmentId, { booking_status: 'cancelled' });
}

/**
 * Cancels the old appointment and creates a new booked one.
 * The two writes are sequential — if the second fails the first is already committed.
 * Acceptable for a course project; use a Postgres RPC for atomicity in production.
 */
export async function rescheduleAppointment(
  oldAppointmentId: string,
  newDate: string,
): Promise<{ old: Appointment; new: Appointment }> {
  const old = await cancelAppointment(oldAppointmentId);

  const { data: oldFull } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', oldAppointmentId)
    .single();

  const created = await createAppointment(old.client_id, {
    appointment_date: newDate,
    intake_form: oldFull?.intake_form ?? undefined,
  });

  return { old, new: created };
}

/** Used by the reminder scheduler: finds upcoming booked appointments within a time window. */
export async function listAppointmentsDueForReminder(
  fromISO: string,
  toISO: string,
): Promise<(Appointment & { clients: { wa_id: string; name: string | null } })[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, clients!inner(wa_id, name)')
    .eq('booking_status', 'booked')
    .eq('reminder_sent', false)
    .gte('appointment_date', fromISO)
    .lte('appointment_date', toISO);
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return (data ?? []) as (Appointment & { clients: { wa_id: string; name: string | null } })[];
}
