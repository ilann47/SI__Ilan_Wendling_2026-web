import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useConnectivity } from './connectivity';

describe('conectividade da portaria', () => {
  afterEach(() => vi.restoreAllMocks());
  it('reflete offline e reconexão sem alterar a sessão', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(useConnectivity);
    expect(result.current).toBe(true);
    act(() => window.dispatchEvent(new Event('offline')));
    expect(result.current).toBe(false);
    act(() => window.dispatchEvent(new Event('online')));
    expect(result.current).toBe(true);
  });
});
