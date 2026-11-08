import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';
import type {} from '@mui/x-data-grid/themeAugmentation';
import { getThemeTokens } from './theme/hubTokens';

export type AppColorMode = 'light' | 'dark';

const FONT = '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DIALOG_VIEWPORT_GAP = 24;

/** Tema Kaneko alinhado ao createAppTheme do Hub YES7. */
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
    zIndex: {
      modal: 1600,
      tooltip: 1800,
    },
    typography: {
      fontFamily: FONT,
      h4: { fontWeight: 800, lineHeight: 1.18, letterSpacing: -0.6 },
      h5: { fontWeight: 800, lineHeight: 1.22, letterSpacing: -0.4 },
      h6: { fontWeight: 750, lineHeight: 1.3, letterSpacing: -0.2 },
      subtitle1: { fontWeight: 700, lineHeight: 1.4 },
      body1: { lineHeight: 1.55 },
      body2: { lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { colorScheme: isDark ? 'dark' : 'light' },
          body: {
            backgroundColor: c.background,
            color: c.text,
            fontFamily: FONT,
            overflowX: 'hidden',
            WebkitTextSizeAdjust: '100%',
          },
          '*': { scrollbarWidth: 'thin', scrollbarColor: `${scrollThumb} transparent` },
          ':focus-visible': { outline: `3px solid ${c.purpleSoft}`, outlineOffset: 2 },
          'input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active, textarea:-webkit-autofill':
            {
              WebkitTextFillColor: `${c.text} !important`,
              caretColor: c.text,
              borderRadius: 'inherit',
              transition: 'background-color 99999s ease-out 0s',
              boxShadow: `0 0 0 1000px ${c.card} inset`,
              WebkitBoxShadow: `0 0 0 1000px ${c.card} inset`,
            },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            minHeight: 44,
            paddingInline: 18,
            boxShadow: 'none',
            '&.MuiButton-containedPrimary': {
              background: c.purple,
              '&:hover': { background: c.purpleDark, boxShadow: 'none' },
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            width: 44,
            height: 44,
            '&.MuiIconButton-sizeSmall': { width: 40, height: 40 },
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            boxShadow: isDark ? '0 8px 28px rgba(0,0,0,0.32)' : '0 10px 32px rgba(27, 33, 64, 0.07)',
            border: `1px solid ${c.border}`,
            borderRadius: 18,
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
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.18)' : '0 6px 24px rgba(27,33,64,0.06)',
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
        defaultProps: { scroll: 'paper' },
        styleOverrides: {
          container: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: DIALOG_VIEWPORT_GAP,
            paddingBottom: `max(${DIALOG_VIEWPORT_GAP}px, env(safe-area-inset-bottom))`,
            paddingLeft: 16,
            paddingRight: 16,
            boxSizing: 'border-box',
            overflow: 'auto',
            '@media (max-width: 899.95px)': {
              paddingTop: 12,
              paddingBottom: `max(12px, env(safe-area-inset-bottom))`,
              paddingLeft: 12,
              paddingRight: 12,
            },
          },
          paper: {
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${c.border}`,
            borderRadius: 16,
            overflow: 'hidden',
            margin: 0,
            maxHeight: `calc(100dvh - ${DIALOG_VIEWPORT_GAP * 2}px)`,
          },
          paperFullScreen: {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            maxHeight: '100dvh',
            height: '100dvh',
            borderRadius: 0,
            border: 'none',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            flex: '0 0 auto',
            lineHeight: 1.35,
            padding: '16px 16px 12px 20px',
            fontWeight: 800,
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            paddingTop: '16px !important',
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            flex: '0 0 auto',
            flexWrap: 'wrap',
            gap: 8,
            padding: '12px 20px 16px',
            borderTop: `1px solid ${c.border}`,
            '& .MuiButton-root': { flexShrink: 0, minHeight: 44 },
            '@media (max-width: 599.95px)': {
              padding: '12px 16px max(16px, env(safe-area-inset-bottom))',
              '& .MuiButton-root': { flex: '1 1 100%' },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            minHeight: 44,
            backgroundColor: c.card,
            transition: 'border-color 120ms ease, box-shadow 120ms ease',
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${c.brandHover}` },
          },
          input: {
            '&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active':
              {
                WebkitTextFillColor: `${c.text} !important`,
                caretColor: c.text,
                WebkitBoxShadow: `0 0 0 1000px ${c.card} inset`,
                boxShadow: `0 0 0 1000px ${c.card} inset`,
                transition: 'background-color 99999s ease-out 0s',
              },
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: `1px solid ${c.border}`,
            borderRadius: 18,
            backgroundColor: c.card,
            '--DataGrid-rowBorderColor': c.border,
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFBFC',
              borderBottom: `1px solid ${c.border}`,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 800,
              fontSize: '0.8rem',
              letterSpacing: 0,
              color: c.textMuted,
            },
            '& .MuiDataGrid-cell': {
              borderColor: c.border,
              fontSize: '0.875rem',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: `1px solid ${c.border}`,
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FAFBFC',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: c.brandHover,
            },
          },
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
      MuiChip: { styleOverrides: { root: { minHeight: 28, borderRadius: 8, fontWeight: 700 } } },
      MuiFormHelperText: {
        styleOverrides: { root: { marginTop: 6, lineHeight: 1.35 } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 12, alignItems: 'center' } },
      },
    },
  };

  return createTheme(options, ptBR);
}
