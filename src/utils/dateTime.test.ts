import { describe, expect, it } from 'vitest';
import { fromApiDateTime, fromNowLocalInput, toApiDateTime } from './dateTime';

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
