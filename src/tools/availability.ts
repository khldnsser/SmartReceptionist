import { DateTime } from 'luxon';
import { config } from '../config';
import type { CalendarEvent } from './calendar';

export interface TimeSlot {
  start: string; // ISO datetime in the business timezone
  end: string;
}

function parseHHMM(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: h, minute: m };
}

const tz = () => config.business.timezone;
const duration = () => config.business.appointmentDurationMin;

const amStart = () => parseHHMM(config.business.officeHours.amStart);
const amEnd = () => parseHHMM(config.business.officeHours.amEnd);
const pmStart = () => parseHHMM(config.business.officeHours.pmStart);
const pmEnd = () => parseHHMM(config.business.officeHours.pmEnd);

/**
 * Returns true if the given datetime falls within Mon-Fri office hours (Beirut).
 */
function isWithinOfficeHours(dt: DateTime): boolean {
  const local = dt.setZone(tz());
  if (local.weekday > 5) return false; // 6 = Sat, 7 = Sun

  const totalMin = local.hour * 60 + local.minute;
  const am = amStart(), ae = amEnd(), ps = pmStart(), pe = pmEnd();

  const inAM = totalMin >= am.hour * 60 + am.minute && totalMin < ae.hour * 60 + ae.minute;
  const inPM = totalMin >= ps.hour * 60 + ps.minute && totalMin < pe.hour * 60 + pe.minute;
  return inAM || inPM;
}

/**
 * Advances dt to the next office-hours boundary (used when the current candidate
 * falls outside working hours or in the lunch break).
 */
function jumpToNextOfficeHoursSlot(dt: DateTime): DateTime {
  let local = dt.setZone(tz());
  const totalMin = local.hour * 60 + local.minute;
  const am = amStart(), ae = amEnd(), ps = pmStart(), pe = pmEnd();

  const amStartMin = am.hour * 60 + am.minute;
  const amEndMin = ae.hour * 60 + ae.minute;
  const pmStartMin = ps.hour * 60 + ps.minute;
  const pmEndMin = pe.hour * 60 + pe.minute;

  // Before AM session → jump to 09:00 today
  if (totalMin < amStartMin) {
    return local.set({ hour: am.hour, minute: am.minute, second: 0, millisecond: 0 });
  }

  // In lunch break → jump to PM start
  if (totalMin >= amEndMin && totalMin < pmStartMin) {
    return local.set({ hour: ps.hour, minute: ps.minute, second: 0, millisecond: 0 });
  }

  // After PM end or weekend → jump to next weekday 09:00
  if (totalMin >= pmEndMin || local.weekday > 5) {
    let next = local.plus({ days: 1 }).set({ hour: am.hour, minute: am.minute, second: 0, millisecond: 0 });
    while (next.weekday > 5) next = next.plus({ days: 1 });
    return next;
  }

  // Should not reach here, but advance by one slot as a safety net
  return local.plus({ minutes: duration() }).set({ second: 0, millisecond: 0 });
}

/**
 * Rounds a datetime up to the nearest slot boundary (e.g. next :00 or :30).
 */
function roundUpToSlotBoundary(dt: DateTime): DateTime {
  const slotMin = duration();
  const remainder = dt.minute % slotMin;
  if (remainder === 0 && dt.second === 0 && dt.millisecond === 0) return dt;
  return dt
    .plus({ minutes: slotMin - remainder })
    .set({ second: 0, millisecond: 0 });
}

/**
 * Returns the next N available appointment slots, starting from now + lead-time hours.
 */
export function getNextAvailableSlots(
  now: DateTime,
  existingEvents: CalendarEvent[],
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const slotMin = duration();
  const count = config.business.slotsToOffer;

  let candidate = roundUpToSlotBoundary(
    now.plus({ hours: config.business.minBookingLeadHours }),
  );

  let iterations = 0;
  while (slots.length < count && iterations < 2000) {
    iterations++;

    if (!isWithinOfficeHours(candidate)) {
      candidate = jumpToNextOfficeHoursSlot(candidate);
      continue;
    }

    const slotEnd = candidate.plus({ minutes: slotMin });

    // Ensure the end of the slot is still within office hours
    if (!isWithinOfficeHours(slotEnd.minus({ minutes: 1 }))) {
      candidate = jumpToNextOfficeHoursSlot(candidate);
      continue;
    }

    // Check for conflicts with existing events
    const hasConflict = existingEvents.some((event) => {
      const evStart = DateTime.fromISO(event.start, { zone: tz() });
      const evEnd = DateTime.fromISO(event.end, { zone: tz() });
      return candidate < evEnd && slotEnd > evStart;
    });

    if (!hasConflict) {
      slots.push({
        start: candidate.toISO()!,
        end: slotEnd.toISO()!,
      });
    }

    candidate = candidate.plus({ minutes: slotMin });
  }

  return slots;
}
