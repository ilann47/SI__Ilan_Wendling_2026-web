import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';
import type {} from '@mui/x-data-grid/themeAugmentation';
import { APP_HEADER_HEIGHT } from './layout/layoutMetrics';
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
            boxShadow: 'none',
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
        defaultProps: { scroll: 'paper' },
        styleOverrides: {
          root: {
            zIndex: 1600,
            // Desktop: dialogs abaixo do header. Mobile/fullscreen: viewport inteiro.
            '@media (min-width: 900px)': {
              top: APP_HEADER_HEIGHT,
              '& .MuiBackdrop-root': { top: APP_HEADER_HEIGHT },
            },
          },
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
            width: '100%',
            maxWidth: '100%',
            maxHeight: `calc(100dvh - ${DIALOG_VIEWPORT_GAP * 2}px)`,
            '@media (min-width: 900px)': {
              maxHeight: `calc(100dvh - ${APP_HEADER_HEIGHT}px - ${DIALOG_VIEWPORT_GAP * 2}px)`,
            },
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
            '& .MuiButton-root': { flexShrink: 0 },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 10 },
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
            borderRadius: 14,
            backgroundColor: c.card,
            '--DataGrid-rowBorderColor': c.border,
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFBFC',
              borderBottom: `1px solid ${c.border}`,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 800,
              fontSize: '0.75rem',
              letterSpacing: 0.3,
              textTransform: 'uppercase',
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
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    },
  };

  return createTheme(options, ptBR);
}
