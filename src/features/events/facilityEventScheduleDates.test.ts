import { describe, expect, it } from 'vitest';
import {
  calendarDayBounds,
  calendarMonthBounds,
  canEndAt,
  canStartAt,
  dayHasAvailableEnd,
  dayHasAvailableStart,
  findEndLimit,
  timeOptions,
} from './facilityEventScheduleDates';

const zone = 'America/Sao_Paulo';
const start = '2026-11-24T03:00:00.000Z';
const open = '2026-11-24T13:13:00.000Z';
const close = '2026-11-24T15:27:00.000Z';
const next = '2026-11-25T03:00:00.000Z';
const segments = [
  { startsAt: start, endsAt: open, availableCapacity: 0 },
  { startsAt: open, endsAt: close, availableCapacity: 3 },
  { startsAt: close, endsAt: next, availableCapacity: 0 },
  { startsAt: next, endsAt: '2026-11-26T03:00:00.000Z', availableCapacity: 0 },
];

describe('calendário da portaria por pátio', () => {
  it('converte dias/mês pelo fuso da organização, não pelo fuso do navegador', () => {
    expect(calendarDayBounds('2026-11-24', zone)).toEqual({ startsAt: start, endsAt: next });
    expect(calendarMonthBounds('2026-11-01', 'UTC-04:00')).toEqual({
      startsAt: '2026-11-01T04:00:00.000Z', endsAt: '2026-12-01T04:00:00.000Z',
    });
    expect(calendarDayBounds('2018-11-04', zone).startsAt).toBe('2018-11-04T03:00:00.000Z');
  });

  it('bloqueia o dia todo apenas quando nenhum dos seus horários está livre', () => {
    expect(dayHasAvailableStart(calendarDayBounds('2026-11-24', zone), segments)).toBe(true);
    expect(dayHasAvailableStart(calendarDayBounds('2026-11-25', zone), segments)).toBe(false);
    expect(dayHasAvailableStart(calendarDayBounds('2026-11-23', zone), segments)).toBe(false);
  });

  it('permite começar exatamente quando surge uma vaga e encerrar no instante anterior à ocupação', () => {
    expect(canStartAt('2026-11-24', '10:12', zone, segments)).toBe(false);
    expect(canStartAt('2026-11-24', '10:13', zone, segments)).toBe(true);
    expect(canStartAt('2026-11-24', '12:27', zone, segments)).toBe(false);
    const limit = findEndLimit(calendarDayBounds('2026-11-24', zone), segments, open);
    const day = calendarDayBounds('2026-11-24', zone);
    expect(dayHasAvailableEnd(day, open, limit)).toBe(true);
    expect(canEndAt('2026-11-24', '10:13', zone, open, limit)).toBe(false);
    expect(canEndAt('2026-11-24', '12:27', zone, open, limit)).toBe(true);
    expect(canEndAt('2026-11-24', '12:28', zone, open, limit)).toBe(false);
  });

  it('limita o fim ao primeiro intervalo lotado, mesmo que haja vaga mais tarde', () => {
    const ranges = segments.map((segment, index) => index === 3 ? { ...segment, availableCapacity: 10 } : segment);
    const range = { startsAt: start, endsAt: '2026-11-26T03:00:00.000Z' };
    const limit = findEndLimit(range, ranges, open);
    expect(dayHasAvailableEnd(calendarDayBounds('2026-11-25', zone), open, limit)).toBe(false);
    expect(canEndAt('2026-11-25', '12:00', zone, open, limit)).toBe(false);
  });

  it('permite descobrir minutos livres fora das sugestões padrão', () => {
    expect(timeOptions('2026-11-24', zone, segments)).toContain('10:13');
    expect(timeOptions('2026-11-24', zone, segments)).toContain('12:27');
    expect(timeOptions('2026-11-24', zone, segments, '10:1')).toContain('10:17');
  });
});
