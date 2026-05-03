import { DateTime } from 'luxon';
import { config } from '../core/config';
import * as appointmentRepo from '../repositories/appointment.repo';
import * as clientRepo from '../repositories/client.repo';
import { getNextAvailableSlots } from '../domain/booking/availability';
import type { TimeSlot } from '../domain/booking/availability';
import type { Appointment } from '../repositories/appointment.repo';

export async function getAvailableSlots(preferredDate?: string): Promise<TimeSlot[]> {
  const tz = config.business.timezone;
  const now = DateTime.now().setZone(tz);
  let searchFrom: DateTime | undefined;
  if (preferredDate) {
    searchFrom = DateTime.fromISO(preferredDate, { zone: tz }).startOf('day');
  }
  const booked = await appointmentRepo.listBookedAppointmentsFrom(now.toISO()!);
  return getNextAvailableSlots(now, booked, searchFrom);
}

export async function bookAppointment(
  waId: string,
  appointmentDate: string,
  intakeForm?: string,
  appointmentType = 'follow_up',
): Promise<Appointment> {
  const client = await clientRepo.getClientByWaId(waId);
  if (!client) throw new Error('No client profile. Call upsert_client first.');
  const conflict = await appointmentRepo.isSlotConflict(appointmentDate);
  if (conflict) throw new Error('That time slot is already booked. Please call get_available_slots and offer the patient a different time.');
  return appointmentRepo.createAppointment(client.id, {
    appointment_date: appointmentDate,
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
  const conflict = await appointmentRepo.isSlotConflict(newDate, appointmentId);
  if (conflict) throw new Error('That time slot is already booked. Please call get_available_slots and offer the patient a different time.');
  return appointmentRepo.rescheduleAppointment(appointmentId, newDate);
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
