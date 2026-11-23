import { describe, expect, it } from 'vitest';
import { fromApiDateTime, fromNowLocalInput, toApiDateTime, validateLocalInterval } from './dateTime';

describe('dateTime', () => {
  it('converte datetime-local em instante ISO aceito pela API', () => {
    const value = '2026-08-03T10:30';
    expect(Date.parse(toApiDateTime(value))).toBe(new Date(value).getTime());
  });

  it('gera valor no formato datetime-local', () => {
    expect(fromNowLocalInput(60)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('preserva o instante ao converter resposta da API para datetime-local', () => {
    const instant = '2026-08-04T03:34:00Z';
    expect(Date.parse(toApiDateTime(fromApiDateTime(instant)))).toBe(Date.parse(instant));
  });
});

describe('horário local no fuso informado', () => {
  it.each([
    ['America/Manaus', '2026-08-05T00:00:00.000Z'],
    ['America/Sao_Paulo', '2026-08-04T23:00:00.000Z'],
    ['Asia/Tokyo', '2026-08-04T11:00:00.000Z'],
    ['UTC-04:00', '2026-08-05T00:00:00.000Z'],
  ])('converte ida e volta no fuso %s', (timeZone, instant) => {
    expect(toApiDateTime('2026-08-04T20:00', timeZone)).toBe(instant);
    expect(fromApiDateTime(instant, timeZone)).toBe('2026-08-04T20:00');
  });

  it('recusa horas inexistentes ou repetidas durante mudança de horário', () => {
    expect(() => toApiDateTime('2026-03-08T02:30', 'America/New_York')).toThrow(/não existe/);
    expect(() => toApiDateTime('2026-11-01T01:30', 'America/New_York')).toThrow(/duas vezes/);
  });
  it('valida o intervalo no fuso selecionado, incluindo a passagem da meia-noite', () => {
    const zone = 'America/Sao_Paulo';
    expect(validateLocalInterval('2026-11-22T23:30', '2026-11-23T01:00', zone)).toEqual({
      startsAt: '2026-11-23T02:30:00.000Z', endsAt: '2026-11-23T04:00:00.000Z', startError: undefined, endError: undefined,
    });
    expect(validateLocalInterval('2026-11-23T01:00', '2026-11-23T01:00', zone).endError).toMatch(/posterior/);
    expect(validateLocalInterval('2026-02-30T00:00', '2026-03-01T00:00', zone).startError).toMatch(/inválidas/);
    expect(validateLocalInterval('2026-11-01T01:30', '2026-11-01T05:00', 'America/New_York').startError).toMatch(/duas vezes/);
  });
});
