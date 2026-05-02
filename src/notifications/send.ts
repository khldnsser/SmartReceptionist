import { sendTextMessage } from '../whatsapp/sender';
import {
  bookingConfirmation,
  rescheduleNotification,
  cancellationNotification,
  reminderNotification,
  doctorChangeNotification,
} from './templates';

export async function sendWhatsAppMessage(waId: string, message: string): Promise<void> {
  await sendTextMessage(waId, message);
}

export async function sendBookingConfirmation(
  waId: string,
  name: string,
  appointmentDate: string,
  topic?: string,
): Promise<void> {
  const message = bookingConfirmation(name, appointmentDate, topic);
  await sendTextMessage(waId, message);
}

export async function sendRescheduleNotification(
  waId: string,
  name: string,
  oldDate: string,
  newDate: string,
): Promise<void> {
  const message = rescheduleNotification(name, oldDate, newDate);
  await sendTextMessage(waId, message);
}

export async function sendCancellationNotification(
  waId: string,
  name: string,
  appointmentDate: string,
): Promise<void> {
  const message = cancellationNotification(name, appointmentDate);
  await sendTextMessage(waId, message);
}

export async function sendReminderNotification(
  waId: string,
  name: string,
  appointmentDate: string,
): Promise<void> {
  const message = reminderNotification(name, appointmentDate);
  await sendTextMessage(waId, message);
}

export async function sendDoctorChangeNotification(
  waId: string,
  name: string,
  appointmentDate: string,
  changeType: 'reschedule' | 'cancellation',
): Promise<void> {
  const message = doctorChangeNotification(name, appointmentDate, changeType);
  await sendTextMessage(waId, message);
}
