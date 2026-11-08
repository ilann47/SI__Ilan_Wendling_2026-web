import { describe, expect, it } from 'vitest';
import { createAppTheme } from './theme';

describe('createAppTheme', () => {
  it('expõe a camada real dos modais para calendários e popovers', () => {
    const theme = createAppTheme('light');

    expect(theme.zIndex.modal).toBe(1600);
    expect(theme.zIndex.tooltip).toBeGreaterThan(theme.zIndex.modal);
  });

  it('preserva os tamanhos semanticos dos dialogs e bloqueia toda a aplicacao', () => {
    const theme = createAppTheme('light');
    const overrides = theme.components?.MuiDialog?.styleOverrides as Record<string, Record<string, unknown>>;

    expect(overrides.root).toBeUndefined();
    expect(overrides.paper).not.toHaveProperty('width');
    expect(overrides.paper).not.toHaveProperty('maxWidth');
  });

  it('mantem alvos de toque e campos com altura acessivel em todo o sistema', () => {
    const theme = createAppTheme('light');
    const button = theme.components?.MuiButton?.styleOverrides?.root as Record<string, unknown>;
    const input = theme.components?.MuiOutlinedInput?.styleOverrides?.root as Record<string, unknown>;

    expect(button.minHeight).toBe(44);
    expect(input.minHeight).toBe(44);
  });

  it('usa hierarquia tipografica previsivel nas paginas', () => {
    const theme = createAppTheme('light');

    expect(theme.typography.h4.fontWeight).toBe(800);
    expect(theme.typography.h4.letterSpacing).toBeLessThan(0);
    expect(theme.typography.body1.lineHeight).toBeGreaterThanOrEqual(1.5);
  });
});
