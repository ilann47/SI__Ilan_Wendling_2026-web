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
});
