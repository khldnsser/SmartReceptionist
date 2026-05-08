import { DateTime } from 'luxon';
import { config } from '../core/config';
import { logger } from '../core/logger';
import * as appointmentRepo from '../repositories/appointment.repo';
import * as clientRepo from '../repositories/client.repo';
import { getNextAvailableSlots } from '../domain/booking/availability';
import type { TimeSlot } from '../domain/booking/availability';
import type { Appointment } from '../repositories/appointment.repo';

// The LLM sometimes drops the timezone offset when echoing a slot back into create_appointment.
// A naked "2026-05-06T09:00:00" inserted into a timestamptz column is interpreted as UTC,
// which then renders as 12:00 Beirut. Force the offset before storage.
function normalizeBeirutISO(input: string): string {
  const dt = DateTime.fromISO(input, { zone: config.business.timezone });
  if (!dt.isValid) throw new Error(`Invalid appointment_date: ${input}`);
  return dt.toISO()!;
}

export async function getAvailableSlots(preferredDatetime?: string): Promise<TimeSlot[]> {
  const tz = config.business.timezone;
  const now = DateTime.now().setZone(tz);
  let searchFrom: DateTime | undefined;
  if (preferredDatetime) {
    const parsed = DateTime.fromISO(preferredDatetime, { zone: tz });
    // Date-only string (YYYY-MM-DD) → start of that day; datetime string → exact time
    searchFrom = preferredDatetime.length <= 10 ? parsed.startOf('day') : parsed;
  }
  const booked = await appointmentRepo.listBookedAppointmentsFrom(now.toISO()!);
  const slots = getNextAvailableSlots(now, booked, searchFrom);
  logger.debug({
    preferredDatetime,
    now: now.toISO(),
    searchFrom: searchFrom?.toISO(),
    bookedCount: booked.length,
    bookedDates: booked.map(b => b.start),
    slotsFound: slots.length,
    slots,
  }, '[SLOTS] availability query');
  return slots;
}

export async function bookAppointment(
  waId: string,
  appointmentDate: string,
  intakeForm?: string,
  appointmentType = 'follow_up',
): Promise<Appointment> {
  const client = await clientRepo.getClientByWaId(waId);
  if (!client) throw new Error('No client profile. Call upsert_client first.');
  const normalizedDate = normalizeBeirutISO(appointmentDate);
  const conflict = await appointmentRepo.isSlotConflict(normalizedDate);
  if (conflict) throw new Error('That time slot is already booked. Please call get_available_slots and offer the patient a different time.');
  return appointmentRepo.createAppointment(client.id, {
    appointment_date: normalizedDate,
    intake_form: intakeForm,
    appointment_type: appointmentType,
  });
}

export async function listClientAppointments(waId: string): Promise<Appointment[]> {
  const client = await clientRepo.getClientByWaId(waId);
  if (!client) return [];
  return appointmentRepo.listAppointmentsForClient(client.id);
}

export async function rescheduleClientAppointment(
  waId: string,
  appointmentId: string,
  newDate: string,
): Promise<{ old: Appointment; new: Appointment }> {
  const client = await clientRepo.getClientByWaId(waId);
  if (!client) throw new Error('No client profile found.');
  const appts = await appointmentRepo.listAppointmentsForClient(client.id);
  if (!appts.some(a => a.id === appointmentId)) {
    throw new Error('Appointment not found for this patient.');
  }
  const normalizedDate = normalizeBeirutISO(newDate);
  const conflict = await appointmentRepo.isSlotConflict(normalizedDate, appointmentId);
  if (conflict) throw new Error('That time slot is already booked. Please call get_available_slots and offer the patient a different time.');
  return appointmentRepo.rescheduleAppointment(appointmentId, normalizedDate);
}

export async function cancelClientAppointment(
  waId: string,
  appointmentId: string,
): Promise<Appointment> {
  const client = await clientRepo.getClientByWaId(waId);
  if (!client) throw new Error('No client profile found.');
  const appts = await appointmentRepo.listAppointmentsForClient(client.id);
  if (!appts.some(a => a.id === appointmentId)) {
    throw new Error('Appointment not found for this patient.');
  }
  return appointmentRepo.cancelAppointment(appointmentId);
}
