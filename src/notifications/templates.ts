import { DateTime } from 'luxon';
import { config } from '../config';

function formatDate(isoDate: string): string {
  return DateTime.fromISO(isoDate, { zone: config.business.timezone }).toFormat(
    "EEEE, MMMM d 'at' h:mm a",
  );
}

export function bookingConfirmation(name: string, appointmentDate: string, topic?: string): string {
  const formatted = formatDate(appointmentDate);
  const topicLine = topic ? `\nTopic: ${topic}` : '';
  return (
    `Hi ${name}! ✅ Your appointment is confirmed for ${formatted} (Beirut time).${topicLine}\n\n` +
    `Please arrive 5 minutes early. If you need to reschedule or cancel, message us at least 24 hours in advance.`
  );
}

export function rescheduleNotification(
  name: string,
  oldDate: string,
  newDate: string,
): string {
  const oldFormatted = formatDate(oldDate);
  const newFormatted = formatDate(newDate);
  return (
    `Hi ${name}! 🔄 Your appointment has been rescheduled.\n\n` +
    `Old time: ${oldFormatted}\n` +
    `New time: ${newFormatted} (Beirut time)\n\n` +
    `Please let us know if you have any questions.`
  );
}

export function cancellationNotification(name: string, appointmentDate: string): string {
  const formatted = formatDate(appointmentDate);
  return (
    `Hi ${name}! Your appointment on ${formatted} has been cancelled.\n\n` +
    `Feel free to message us whenever you'd like to book again. Take care! 👋`
  );
}

export function reminderNotification(name: string, appointmentDate: string): string {
  const formatted = formatDate(appointmentDate);
  return (
    `Hi ${name}! 📅 Just a reminder — you have an appointment tomorrow, ${formatted} (Beirut time).\n\n` +
    `Reply here if you need to reschedule or cancel.`
  );
}

export function doctorChangeNotification(
  name: string,
  newDate: string,
  changeType: 'reschedule' | 'cancellation',
): string {
  if (changeType === 'cancellation') {
    const formatted = formatDate(newDate);
    return (
      `Hi ${name}! The clinic has cancelled your appointment scheduled for ${formatted}.\n\n` +
      `Please message us to book a new appointment when you're ready.`
    );
  }
  const formatted = formatDate(newDate);
  return (
    `Hi ${name}! The clinic has updated your appointment to ${formatted} (Beirut time).\n\n` +
    `Please reply if you have any questions or need to make changes.`
  );
}
