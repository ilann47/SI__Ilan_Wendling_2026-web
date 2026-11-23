const dayMs = 24 * 60 * 60 * 1000;

function wallClock(timeZone: string): (timestamp: number) => string {
  // Java ZoneId also accepts fixed offsets such as UTC-04:00.
  const fixed = /^(?:UTC|GMT|UT)?([+-])(\d{2})(?::?(\d{2}))?(?::?(\d{2}))?$/.exec(timeZone);
  if (fixed) {
    const [, sign, hours, minutes = '0', seconds = '0'] = fixed;
    const offset = (sign === '-' ? -1 : 1) * (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds));
    return (timestamp) => new Date(timestamp + offset * 1000).toISOString().slice(0, 19);
  }
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone, calendar: 'iso8601', numberingSystem: 'latn', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  return (timestamp) => {
    const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(({ type, value }) => [type, value]));
    return `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  };
}

export function supportsTimeZone(timeZone?: string): timeZone is string {
  if (!timeZone) return false;
  try { wallClock(timeZone); return true; } catch { return false; }
}

export function toApiDateTime(value: string, timeZone?: string): string {
  if (timeZone) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) throw new Error('Data e hora inválidas.');
    const local = value.length === 16 ? value + ':00' : value;
    const asUtc = Date.parse(local + 'Z');
    if (!Number.isFinite(asUtc) || new Date(asUtc).toISOString().slice(0, 19) !== local) {
      throw new Error('Data e hora inválidas.');
    }
    const render = wallClock(timeZone);
    // Consider both sides of a possible offset transition and round-trip the candidates.
    const offsets = new Set([asUtc - dayMs, asUtc, asUtc + dayMs]
      .map((probe) => Date.parse(render(probe) + 'Z') - probe));
    const candidates = [...offsets].map((offset) => asUtc - offset).filter((instant) => render(instant) === local);
    if (candidates.length === 0) throw new Error('Esse horário não existe no fuso da organização.');
    if (candidates.length > 1) throw new Error('Esse horário ocorre duas vezes no fuso da organização. Escolha outro horário.');
    return new Date(candidates[0]).toISOString();
  }
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error('Data e hora invalidas.');
  return date.toISOString();
}

export function fromNowLocalInput(minutes: number, timeZone?: string): string {
  const date = new Date(Date.now() + minutes * 60_000);
  if (timeZone) return wallClock(timeZone)(date.getTime()).slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromApiDateTime(value: string, timeZone?: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error('Data e hora invalidas.');
  if (timeZone) return wallClock(timeZone)(date.getTime()).slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function validateLocalInterval(start: string, end: string, timeZone?: string) {
  if (!timeZone) return { startsAt: undefined, endsAt: undefined, startError: undefined, endError: undefined };
  const parse = (value: string) => {
    if (!value) return {};
    try { return { value: toApiDateTime(value, timeZone) }; }
    catch (cause) { return { error: cause instanceof Error ? cause.message : 'Data e hora inválidas.' }; }
  };
  const parsedStart = parse(start);
  const parsedEnd = parse(end);
  const inverted = parsedStart.value && parsedEnd.value && Date.parse(parsedEnd.value) <= Date.parse(parsedStart.value);
  return { startsAt: parsedStart.value, endsAt: parsedEnd.value, startError: parsedStart.error,
    endError: inverted ? 'O fim deve ser posterior ao início.' : parsedEnd.error };
}
