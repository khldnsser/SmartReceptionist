import { supabase } from './client';

export interface Appointment {
  id: string;
  client_id: string;
  appointment_date: string;
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  calendar_event_id: string | null;
  intake_form: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppointmentInput {
  appointment_date: string;
  booking_status?: Appointment['booking_status'];
  calendar_event_id?: string;
  intake_form?: string;
}

export interface AppointmentUpdate {
  appointment_date?: string;
  booking_status?: Appointment['booking_status'];
  calendar_event_id?: string;
  intake_form?: string;
  reminder_sent?: boolean;
}

export async function createAppointment(
  clientId: string,
  fields: AppointmentInput,
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({ client_id: clientId, booking_status: 'confirmed', ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listAppointmentsForClient(clientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_id', clientId)
    .order('appointment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
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
  if (error) throw error;
  return data;
}
