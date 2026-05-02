/** Merges class names (avoids the need for clsx for basic usage). */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Formats an ISO datetime string for display in Beirut time. */
export function formatAppointmentDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Beirut',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
