import { sendTextMessage } from '../whatsapp/sender';
import { supabase } from '../infra/supabase/client';
import {
  bookingConfirmation,
  rescheduleNotification,
  cancellationNotification,
  reminderNotification,
  doctorChangeNotification,
} from '../notifications/templates';

export async function sendToPatient(waId: string, text: string): Promise<void> {
  await sendTextMessage(waId, text);
}

export async function sendAndLog(waId: string, text: string): Promise<void> {
  await sendTextMessage(waId, text);
  await supabase.from('conversation_messages').insert({
    wa_id: waId,
    role: 'assistant',
    content: text,
  });
}

export async function sendBookingConfirmation(
  waId: string,
  name: string,
  appointmentDate: string,
  topic?: string,
): Promise<void> {
  await sendToPatient(waId, bookingConfirmation(name, appointmentDate, topic));
}

export async function sendRescheduleNotification(
  waId: string,
  name: string,
  oldDate: string,
  newDate: string,
): Promise<void> {
  await sendToPatient(waId, rescheduleNotification(name, oldDate, newDate));
}

export async function sendCancellationNotification(
  waId: string,
  name: string,
  appointmentDate: string,
): Promise<void> {
  await sendToPatient(waId, cancellationNotification(name, appointmentDate));
}

export async function sendReminderNotification(
  waId: string,
  name: string,
  appointmentDate: string,
): Promise<void> {
  await sendToPatient(waId, reminderNotification(name, appointmentDate));
}

export async function sendDoctorChangeNotification(
  waId: string,
  name: string,
  appointmentDate: string,
  changeType: 'reschedule' | 'cancellation',
): Promise<void> {
  await sendToPatient(waId, doctorChangeNotification(name, appointmentDate, changeType));
}

export async function sendWhatsAppMessage(waId: string, message: string): Promise<void> {
  await sendToPatient(waId, message);
}
