import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';

export type AppColorMode = 'light' | 'dark';

/**
 * Tema MUI da aplicacao. Visual moderno: cantos arredondados, tipografia Inter,
 * AppBar/Drawer claros, cards com borda sutil. Suporta modo claro/escuro.
 */
export function createAppTheme(mode: AppColorMode) {
  const isLight = mode === 'light';
  const scrollThumb = isLight ? 'rgba(15,23,42,0.25)' : 'rgba(255,255,255,0.22)';
  const scrollThumbHover = isLight ? 'rgba(15,23,42,0.42)' : 'rgba(255,255,255,0.40)';
  const options: ThemeOptions = {
    palette: {
      mode,
      primary: { main: '#1565c0' },
      secondary: { main: '#475569' },
      success: { main: '#2e7d32' },
      warning: { main: '#ed6c02' },
      error: { main: '#d32f2f' },
      info: { main: '#1565c0' },
      background: isLight
        ? { default: '#f8fafc', paper: '#ffffff' }
        : { default: '#0f141a', paper: '#161c24' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700, letterSpacing: -0.3 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': { scrollbarWidth: 'thin', scrollbarColor: `${scrollThumb} transparent` },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: scrollThumb,
            borderRadius: 8,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
          '*::-webkit-scrollbar-thumb:hover': { backgroundColor: scrollThumbHover },
          '*::-webkit-scrollbar-button': { display: 'none', width: 0, height: 0 },
          '*::-webkit-scrollbar-corner': { backgroundColor: 'transparent' },
          ':focus-visible': { outline: '3px solid #ffb300', outlineOffset: 2 },
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { minHeight: 40, borderRadius: 8, paddingLeft: 16, paddingRight: 16 },
          sizeSmall: { minHeight: 36, minWidth: 36 },
          containedPrimary: { boxShadow: 'none' },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { minWidth: 40, minHeight: 40 } },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: '1px solid',
            borderColor: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 2px rgba(15,23,42,0.04)' : 'none',
          },
        },
      },
      MuiDialog: {
        defaultProps: { fullWidth: true },
        styleOverrides: {
          paper: { borderRadius: 12 },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { border: 'none' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
        styleOverrides: {
          root: {
            backgroundColor: isLight ? '#ffffff' : '#161c24',
            borderBottom: '1px solid',
            borderColor: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)',
          },
        },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 8, minHeight: 40 },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              color: isLight ? '#64748b' : 'rgba(255,255,255,0.7)',
              backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)',
            paddingTop: 10,
            paddingBottom: 10,
          },
        },
      },
    },
  };
  return createTheme(options, ptBR);
}
