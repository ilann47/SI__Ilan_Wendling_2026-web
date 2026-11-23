import type { AvailabilityRange, AvailabilitySegment } from '../../api/facilityAvailability';
import { fromApiDateTime, toApiDateTime } from '../../utils/dateTime';

const minute = 60_000;
const dayMs = 24 * 60 * minute;

function civilDate(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

export function calendarMonth(day: string) {
  return `${day.slice(0, 7)}-01`;
}

function midnight(day: string, timeZone: string) {
  try { return toApiDateTime(`${day}T00:00`, timeZone); }
  catch {
    // A mudança de offset pode pular ou repetir a meia-noite. Nesse caso,
    // procuramos a primeira ocorrência da data no relógio da organização.
    const utc = civilDate(day).getTime();
    let lower = utc - dayMs;
    let upper = utc + dayMs;
    while (upper - lower > 1) {
      const middle = Math.floor((lower + upper) / 2);
      if (fromApiDateTime(new Date(middle).toISOString(), timeZone).slice(0, 10) < day) lower = middle;
      else upper = middle;
    }
    return new Date(upper).toISOString();
  }
}

export function calendarDayBounds(day: string, timeZone: string): AvailabilityRange {
  const next = new Date(civilDate(day).getTime() + dayMs).toISOString().slice(0, 10);
  return { startsAt: midnight(day, timeZone), endsAt: midnight(next, timeZone) };
}

export function calendarMonthBounds(day: string, timeZone: string): AvailabilityRange {
  const first = calendarMonth(day);
  const next = civilDate(first);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { startsAt: midnight(first, timeZone), endsAt: midnight(next.toISOString().slice(0, 10), timeZone) };
}

export function dayHasAvailableStart(day: AvailabilityRange, segments: AvailabilitySegment[]) {
  return segments.some((segment) => {
    if (segment.availableCapacity <= 0) return false;
    const start = Math.max(Date.parse(day.startsAt), Date.parse(segment.startsAt));
    const end = Math.min(Date.parse(day.endsAt), Date.parse(segment.endsAt));
    return Math.ceil(start / minute) * minute < end;
  });
}

function localMinute(day: string, time: string, timeZone: string) {
  try { return Date.parse(toApiDateTime(`${day}T${time}`, timeZone)); }
  catch { return NaN; }
}

export function canStartAt(day: string, time: string, timeZone: string, segments: AvailabilitySegment[]) {
  const timestamp = localMinute(day, time, timeZone);
  return segments.some((segment) => segment.availableCapacity > 0
    && timestamp >= Date.parse(segment.startsAt) && timestamp < Date.parse(segment.endsAt));
}

/** Último instante permitido para encerrar, considerando somente este mês. */
export function findEndLimit(month: AvailabilityRange, segments: AvailabilitySegment[], start: string) {
  let until = Math.max(Date.parse(start), Date.parse(month.startsAt));
  for (const segment of segments) {
    const segmentEnd = Date.parse(segment.endsAt);
    if (segmentEnd <= until) continue;
    if (Date.parse(segment.startsAt) > until || segment.availableCapacity <= 0) break;
    until = segmentEnd;
  }
  return Math.min(until, Date.parse(month.endsAt));
}

export function dayHasAvailableEnd(day: AvailabilityRange, start: string, limit: number) {
  const earliest = Math.max(Date.parse(day.startsAt), Date.parse(start) + 1);
  const firstMinute = Math.ceil(earliest / minute) * minute;
  return firstMinute < Date.parse(day.endsAt) && firstMinute <= limit;
}

export function canEndAt(day: string, time: string, timeZone: string, start: string, limit: number) {
  const timestamp = localMinute(day, time, timeZone);
  return timestamp > Date.parse(start) && timestamp <= limit;
}

const allTimes = Array.from({ length: 24 * 60 }, (_, index) =>
  `${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}`);

export function timeOptions(day: string, timeZone: string, segments: AvailabilitySegment[], input = '', extra: string[] = []) {
  if (input) {
    const digits = input.replace(':', '');
    return /^\d{1,4}$/.test(digits)
      ? allTimes.filter((time) => time.replace(':', '').startsWith(digits)) : [];
  }
  const bounds = new Set<number>();
  for (const segment of segments) {
    for (const instant of [segment.startsAt, segment.endsAt]) {
      const timestamp = Date.parse(instant);
      bounds.add(Math.floor(timestamp / minute) * minute);
      bounds.add(Math.ceil(timestamp / minute) * minute);
    }
  }
  for (const instant of extra) {
    const timestamp = Date.parse(instant);
    if (Number.isFinite(timestamp)) bounds.add(timestamp);
  }
  const precise = [...bounds].map((timestamp) => fromApiDateTime(new Date(timestamp).toISOString(), timeZone))
    .filter((local) => local.startsWith(day)).map((local) => local.slice(11));
  return [...new Set([...allTimes.filter((_, index) => index % 15 === 0), ...precise])].sort();
}
