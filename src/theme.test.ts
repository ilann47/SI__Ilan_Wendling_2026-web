import { describe, expect, it } from 'vitest';
import { createAppTheme } from './theme';
import { getThemeTokens } from './theme/hubTokens';
import { getContrastRatio } from '@mui/material/styles';

describe('createAppTheme', () => {
  it('separa a faixa de marca das superfícies operacionais e mantém contraste nos dois modos', () => {
    for (const mode of ['light', 'dark'] as const) {
      const tokens = getThemeTokens(mode);
      expect(tokens.masthead).not.toBe(tokens.card);
      expect(getContrastRatio(tokens.onMasthead, tokens.masthead)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(tokens.purple, tokens.panelHeader)).toBeGreaterThanOrEqual(4.5);
    }
    expect(getThemeTokens('light').masthead).toBe('#800084');
  });

  it('aplica a linguagem da área do produtor sem trocar os controles', () => {
    const theme = createAppTheme('light');
    const overrides = theme.components;
    expect(overrides?.MuiTableCell?.styleOverrides?.head).toMatchObject({ textTransform: 'uppercase' });
    expect(overrides?.MuiTabs?.styleOverrides?.root).toHaveProperty('backgroundColor');
    expect(overrides?.MuiDialogTitle?.styleOverrides?.root).toMatchObject({ backgroundColor: getThemeTokens('light').panelHeader });
  });

  it('usa a tipografia e o formato dos controles Seven sem reduzir a área de toque', () => {
    const theme = createAppTheme('light');
    const overrides = theme.components;
    expect(theme.typography.fontFamily).toMatch(/^Montserrat,/);
    expect(overrides?.MuiButton?.styleOverrides?.root).toMatchObject({ borderRadius: 100, minHeight: 44 });
    expect(overrides?.MuiDialogActions?.styleOverrides?.root).toHaveProperty('backgroundColor');
    expect(overrides?.MuiTableCell?.styleOverrides?.head).toMatchObject({ fontWeight: 700 });
  });

  it('mapeia a identidade visual do Seven Tickets no MUI, nos dois modos', () => {
    const light = createAppTheme('light');
    const dark = createAppTheme('dark');
    expect(light.palette.primary.main).toBe('#800084');
    expect(light.palette.background.default).toBe('#F4F4F5');
    expect(light.palette.divider).toBe('#DFE0E5');
    expect(getThemeTokens('dark').actionFill).not.toBe(dark.palette.primary.main);
    for (const component of ['MuiMenu', 'MuiTooltip', 'MuiTabs', 'MuiSwitch', 'MuiTableRow', 'MuiPaginationItem']) {
      expect(light.components).toHaveProperty(component);
      expect(dark.components).toHaveProperty(component);
    }
  });

  it('usa tratamentos visuais para superfícies e status sem diminuir os alvos de toque', () => {
    const { components } = createAppTheme('light');
    const card = components?.MuiCard?.styleOverrides?.root;
    const chip = components?.MuiChip?.styleOverrides?.root;
    expect(card).toMatchObject({ borderRadius: 14, boxShadow: 'none' });
    expect(chip).toMatchObject({ borderRadius: 100, minHeight: 28 });
    expect(components?.MuiButton?.styleOverrides?.root).toHaveProperty('minHeight', 44);
  });

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
