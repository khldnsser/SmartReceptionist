'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { notifyPatient } from '@/lib/notify';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Beirut',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function rescheduleAppointmentAction(
  appointmentId: string,
  newDate: string,
  waId: string,
  clientName: string,
  oldDate: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('appointments')
    .update({ appointment_date: newDate })
    .eq('id', appointmentId);

  if (error) return { ok: false, error: error.message };

  await notifyPatient(
    waId,
    `Hi ${clientName}! The clinic has rescheduled your appointment from ${formatDate(oldDate)} to ${formatDate(newDate)} (Beirut time). Please reply if you have any questions.`,
  );

  revalidatePath('/calendar');
  return { ok: true };
}

export async function cancelAppointmentAction(
  appointmentId: string,
  appointmentDate: string,
  waId: string,
  clientName: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('appointments')
    .update({ booking_status: 'cancelled' })
    .eq('id', appointmentId);

  if (error) return { ok: false, error: error.message };

  await notifyPatient(
    waId,
    `Hi ${clientName}! The clinic has cancelled your appointment on ${formatDate(appointmentDate)}. Please message us whenever you'd like to book again.`,
  );

  revalidatePath('/calendar');
  return { ok: true };
}

export async function createAppointmentAction(
  clientId: string,
  waId: string,
  clientName: string,
  appointmentDate: string,
  intakeForm?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('appointments').insert({
    client_id: clientId,
    appointment_date: appointmentDate,
    booking_status: 'booked',
    intake_form: intakeForm ?? null,
  });

  if (error) return { ok: false, error: error.message };

  await notifyPatient(
    waId,
    `Hi ${clientName}! An appointment has been scheduled for you on ${formatDate(appointmentDate)} (Beirut time). Please reply if you need to make any changes.`,
  );

  revalidatePath('/calendar');
  return { ok: true };
}
