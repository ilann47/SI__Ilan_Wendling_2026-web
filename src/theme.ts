import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';
import { getThemeTokens } from './theme/hubTokens';

export type AppColorMode = 'light' | 'dark';

const FONT = '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

/** Tema Kaneko portado do Hub YES7 (yes7one-frontend). */
export function createAppTheme(mode: AppColorMode) {
  const c = getThemeTokens(mode);
  const isDark = mode === 'dark';
  const scrollThumb = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(27,33,64,0.28)';

  const options: ThemeOptions = {
    palette: {
      mode,
      primary: { main: c.purple, contrastText: '#FFFFFF', light: c.purpleSoft, dark: c.purpleDark },
      secondary: { main: c.navy, contrastText: '#FFFFFF' },
      success: { main: c.success },
      error: { main: c.danger },
      warning: { main: c.warning },
      info: { main: '#2563EB' },
      background: { default: c.background, paper: c.card },
      text: { primary: c.text, secondary: c.textMuted },
      divider: c.border,
    },
    typography: {
      fontFamily: FONT,
      h4: { fontWeight: 800 },
      h5: { fontWeight: 800 },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { colorScheme: isDark ? 'dark' : 'light' },
          body: { backgroundColor: c.background, color: c.text, fontFamily: FONT },
          '*': { scrollbarWidth: 'thin', scrollbarColor: `${scrollThumb} transparent` },
          ':focus-visible': { outline: `3px solid ${c.purpleSoft}`, outlineOffset: 2 },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            boxShadow: 'none',
            minHeight: 40,
            '&.MuiButton-containedPrimary': {
              background: c.purple,
              '&:hover': { background: c.purpleDark, boxShadow: 'none' },
            },
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.35)' : '0 4px 16px rgba(27, 33, 64, 0.05)',
            border: `1px solid ${c.border}`,
            borderRadius: 14,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: c.appBar,
            color: c.text,
            borderBottom: `1px solid ${c.border}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: c.appBar,
            borderRight: `1px solid ${c.border}`,
          },
        },
      },
      MuiTableCell: { styleOverrides: { root: { borderColor: c.border } } },
      MuiDialog: {
        styleOverrides: {
          paper: { border: `1px solid ${c.border}`, borderRadius: 16 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            '&.Mui-selected': {
              backgroundColor: c.brandHover,
              color: c.purple,
              fontWeight: 800,
              '& .MuiListItemIcon-root': { color: c.purple },
              '&:hover': { backgroundColor: c.brandHover },
            },
          },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    },
  };

  return createTheme(options, ptBR);
}
