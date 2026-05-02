import { DateTime } from 'luxon';
import { config } from '../config';

export interface TimeSlot {
  start: string; // ISO datetime in the business timezone
  end: string;
}

/** Represents a block of time already occupied by a booked appointment. */
export interface BookedSlot {
  start: string; // ISO datetime
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

function isWithinOfficeHours(dt: DateTime): boolean {
  const local = dt.setZone(tz());
  if (local.weekday > 5) return false;

  const totalMin = local.hour * 60 + local.minute;
  const am = amStart(), ae = amEnd(), ps = pmStart(), pe = pmEnd();

  const inAM = totalMin >= am.hour * 60 + am.minute && totalMin < ae.hour * 60 + ae.minute;
  const inPM = totalMin >= ps.hour * 60 + ps.minute && totalMin < pe.hour * 60 + pe.minute;
  return inAM || inPM;
}

function jumpToNextOfficeHoursSlot(dt: DateTime): DateTime {
  let local = dt.setZone(tz());
  const totalMin = local.hour * 60 + local.minute;
  const am = amStart(), ae = amEnd(), ps = pmStart(), pe = pmEnd();

  const amStartMin = am.hour * 60 + am.minute;
  const amEndMin = ae.hour * 60 + ae.minute;
  const pmStartMin = ps.hour * 60 + ps.minute;
  const pmEndMin = pe.hour * 60 + pe.minute;

  if (totalMin < amStartMin) {
    return local.set({ hour: am.hour, minute: am.minute, second: 0, millisecond: 0 });
  }

  if (totalMin >= amEndMin && totalMin < pmStartMin) {
    return local.set({ hour: ps.hour, minute: ps.minute, second: 0, millisecond: 0 });
  }

  if (totalMin >= pmEndMin || local.weekday > 5) {
    let next = local.plus({ days: 1 }).set({ hour: am.hour, minute: am.minute, second: 0, millisecond: 0 });
    while (next.weekday > 5) next = next.plus({ days: 1 });
    return next;
  }

  return local.plus({ minutes: duration() }).set({ second: 0, millisecond: 0 });
}

function roundUpToSlotBoundary(dt: DateTime): DateTime {
  const slotMin = duration();
  const remainder = dt.minute % slotMin;
  if (remainder === 0 && dt.second === 0 && dt.millisecond === 0) return dt;
  return dt.plus({ minutes: slotMin - remainder }).set({ second: 0, millisecond: 0 });
}

/**
 * Returns the next N available appointment slots.
 * @param now           Current datetime (enforces min lead-time).
 * @param bookedSlots   Existing booked appointments (start times only; end is computed from config duration).
 * @param searchFrom    Optional: start searching from this datetime instead of now+leadTime.
 */
export function getNextAvailableSlots(
  now: DateTime,
  bookedSlots: BookedSlot[],
  searchFrom?: DateTime,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const slotMin = duration();
  const count = config.business.slotsToOffer;

  const leadTimeBoundary = now.plus({ hours: config.business.minBookingLeadHours });
  const rawStart = searchFrom && searchFrom > leadTimeBoundary ? searchFrom : leadTimeBoundary;
  let candidate = roundUpToSlotBoundary(rawStart);

  let iterations = 0;
  while (slots.length < count && iterations < 2000) {
    iterations++;

    if (!isWithinOfficeHours(candidate)) {
      candidate = jumpToNextOfficeHoursSlot(candidate);
      continue;
    }

    const slotEnd = candidate.plus({ minutes: slotMin });

    if (!isWithinOfficeHours(slotEnd.minus({ minutes: 1 }))) {
      candidate = jumpToNextOfficeHoursSlot(candidate);
      continue;
    }

    // Check for conflicts — each booked slot occupies [start, start + duration)
    const hasConflict = bookedSlots.some((booked) => {
      const bookedStart = DateTime.fromISO(booked.start, { zone: tz() });
      const bookedEnd = bookedStart.plus({ minutes: slotMin });
      return candidate < bookedEnd && slotEnd > bookedStart;
    });

    if (!hasConflict) {
      slots.push({ start: candidate.toISO()!, end: slotEnd.toISO()! });
    }

    candidate = candidate.plus({ minutes: slotMin });
  }

  return slots;
}
