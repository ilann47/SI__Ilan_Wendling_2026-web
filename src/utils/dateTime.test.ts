import { describe, expect, it } from 'vitest';
import { fromNowLocalInput, toApiDateTime } from './dateTime';

describe('dateTime', () => {
  it('converte datetime-local em instante ISO aceito pela API', () => {
    const value = '2026-08-03T10:30';
    expect(Date.parse(toApiDateTime(value))).toBe(new Date(value).getTime());
  });

  it('gera valor no formato datetime-local', () => {
    expect(fromNowLocalInput(60)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
