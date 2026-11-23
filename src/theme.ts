import { alpha, createTheme, type ThemeOptions } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';
import type {} from '@mui/x-data-grid/themeAugmentation';
import { componentRadius, getThemeTokens } from './theme/hubTokens';

export type AppColorMode = 'light' | 'dark';

const FONT = 'Montserrat, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DIALOG_VIEWPORT_GAP = 24;

/** Linguagem visual do Seven Tickets, sem alterar as métricas dos componentes Kaneko. */
export function createAppTheme(mode: AppColorMode) {
  const c = getThemeTokens(mode);
  const isDark = mode === 'dark';
  const scrollThumb = alpha(c.text, 0.28);
  const info = isDark ? c.tealSoft : c.teal;
  const onStatus = isDark ? c.background : '#FFFFFF';
  const popoverSurface = {
    backgroundColor: c.card,
    borderRadius: componentRadius.control,
    boxShadow: `inset 0 0 0 1px ${c.border}, ${c.raisedShadow}`,
  };
  const selectable = {
    '&:hover': { backgroundColor: c.surfaceMuted },
    '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: c.brandHover, color: c.purple },
  };
  const tonal = (color: string) => ({ color, backgroundColor: alpha(color, isDark ? 0.16 : 0.09) });
  const tableHeading = {
    backgroundColor: c.surfaceMuted,
    color: c.textMuted,
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.035em',
    textTransform: 'uppercase' as const,
  };

  const options: ThemeOptions = {
    palette: {
      mode,
      primary: { main: c.purple, contrastText: onStatus, light: c.purpleSoft, dark: c.purpleDark },
      secondary: { main: c.text, contrastText: onStatus },
      success: { main: c.success, contrastText: onStatus },
      error: { main: c.danger, contrastText: onStatus },
      warning: { main: c.warning, contrastText: onStatus },
      info: { main: info, contrastText: onStatus },
      background: { default: c.background, paper: c.card },
      text: { primary: c.text, secondary: c.textMuted },
      divider: c.border,
      action: { hover: c.surfaceMuted, selected: c.brandHover, disabled: c.disabledText, disabledBackground: c.disabledSurface },
    },
    zIndex: {
      modal: 1600,
      tooltip: 1800,
    },
    typography: {
      fontFamily: FONT,
      h4: { fontWeight: 800, lineHeight: 1.18, letterSpacing: -0.6 },
      h5: { fontWeight: 800, lineHeight: 1.22, letterSpacing: -0.4 },
      h6: { fontWeight: 650, lineHeight: 1.3, letterSpacing: -0.15 },
      subtitle1: { fontWeight: 650, lineHeight: 1.4 },
      body1: { lineHeight: 1.55 },
      body2: { lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
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
          ':focus-visible': { outline: `2px solid ${c.focusRing}`, outlineOffset: 2 },
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
            borderRadius: componentRadius.pill,
            minHeight: 44,
            paddingInline: 18,
            boxShadow: 'none',
            '&.MuiButton-containedPrimary': {
              color: '#FFFFFF',
              background: c.actionFill,
              '&:hover': { background: c.actionHover, boxShadow: 'none' },
            },
            '&.MuiButton-outlinedPrimary': { borderColor: c.purple, '&:hover': { backgroundColor: c.brandHover } },
            '&.MuiButton-textPrimary:hover': { backgroundColor: c.brandHover },
            '&.Mui-disabled': { color: c.disabledText },
            '&.MuiButton-contained.Mui-disabled': { background: c.disabledSurface, color: c.disabledText },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            width: 44,
            height: 44,
            '&.MuiIconButton-sizeSmall': { width: 40, height: 40 },
            '&:hover': { backgroundColor: c.surfaceMuted },
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            boxShadow: 'none',
            border: `1px solid ${c.border}`,
            borderRadius: componentRadius.surface,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCardHeader: { styleOverrides: { title: { fontWeight: 650 }, subheader: { color: c.textMuted } } },
      MuiCardActions: { styleOverrides: { root: {
        boxShadow: `inset 0 1px ${c.border}`, backgroundColor: c.surfaceMuted,
      } } },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: c.appBar,
            color: c.text,
            borderBottom: `1px solid ${c.border}`,
            boxShadow: 'none',
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
      MuiTable: { styleOverrides: { root: {
        '& tbody tr:last-of-type > td': { borderBottom: 0 },
        '& tbody tr > td:first-of-type:not([colspan])': { fontWeight: 650 },
      } } },
      MuiTableCell: { styleOverrides: {
        root: {
          borderColor: c.border,
          '&.MuiTableCell-alignRight': { fontVariantNumeric: 'tabular-nums', fontWeight: 650 },
        },
        body: { paddingBlock: 12 },
        head: tableHeading,
        footer: { backgroundColor: c.surfaceMuted, fontWeight: 600 },
      } },
      MuiTableRow: { styleOverrides: { root: {
        '&.MuiTableRow-hover:hover': { backgroundColor: c.surfaceMuted },
        '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: c.brandHover },
      } } },
      MuiBackdrop: { styleOverrides: { root: { '&:not(.MuiBackdrop-invisible)': {
        backgroundColor: c.overlay,
        '@supports (backdrop-filter: blur(2px))': { backdropFilter: 'blur(2px)' },
      } } } },
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
            borderRadius: componentRadius.surface,
            boxShadow: c.raisedShadow,
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
            padding: '18px 24px 14px',
            fontWeight: 700,
            backgroundColor: c.panelHeader,
            color: c.purple,
            '@media (max-width: 599.95px)': { padding: '16px 16px 12px' },
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
            '&.MuiDialogContent-dividers': { borderBlockWidth: 0 },
            '@media (max-width: 599.95px)': { paddingInline: 16 },
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            flex: '0 0 auto',
            flexWrap: 'wrap',
            gap: 8,
            padding: '14px 24px 16px',
            borderTop: `1px solid ${c.border}`,
            backgroundColor: c.surfaceMuted,
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
            borderRadius: componentRadius.control,
            minHeight: 44,
            backgroundColor: c.card,
            transition: 'border-color 120ms ease, box-shadow 120ms ease',
            '&:hover:not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline': { borderColor: c.textMuted },
            '&.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline': { borderColor: c.focusRing },
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(c.focusRing, 0.14)}` },
            '&.Mui-focused.Mui-error': { boxShadow: `0 0 0 3px ${alpha(c.danger, 0.16)}` },
            '&.Mui-disabled': { backgroundColor: c.surfaceMuted },
          },
          notchedOutline: { borderColor: c.inputBorder },
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
            borderRadius: componentRadius.surface,
            backgroundColor: c.card,
            '--DataGrid-rowBorderColor': c.border,
            '--DataGrid-containerBackground': c.surfaceMuted,
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: c.surfaceMuted,
              borderBottom: `1px solid ${c.border}`,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              ...tableHeading,
              backgroundColor: 'transparent',
            },
            '& .MuiDataGrid-cell': {
              borderColor: c.border,
              fontSize: '0.875rem',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: `1px solid ${c.border}`,
              backgroundColor: c.surfaceMuted,
            },
            '& .MuiDataGrid-row:hover': { backgroundColor: c.surfaceMuted },
            '& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.Mui-selected:hover': { backgroundColor: c.brandHover },
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
      MuiChip: { styleOverrides: { root: {
        minHeight: 28, borderRadius: componentRadius.pill, fontWeight: 700,
        '&.MuiChip-filled.MuiChip-colorDefault': { backgroundColor: c.surfaceMuted, color: c.text },
        '&.MuiChip-filled.MuiChip-colorPrimary': tonal(c.purple),
        '&.MuiChip-filled.MuiChip-colorSuccess': tonal(c.success),
        '&.MuiChip-filled.MuiChip-colorError': tonal(c.danger),
        '&.MuiChip-filled.MuiChip-colorWarning': tonal(c.warning),
        '&.MuiChip-filled.MuiChip-colorInfo': tonal(info),
      } } },
      MuiMenu: { styleOverrides: { paper: popoverSurface } },
      MuiPopover: { styleOverrides: { paper: popoverSurface } },
      MuiMenuItem: { styleOverrides: { root: selectable } },
      MuiAutocomplete: { styleOverrides: { paper: popoverSurface, option: {
        '&.Mui-focused': { backgroundColor: c.surfaceMuted },
        '&[aria-selected="true"], &[aria-selected="true"].Mui-focused': { backgroundColor: c.brandHover, color: c.purple },
      } } },
      MuiTooltip: { styleOverrides: { tooltip: {
        backgroundColor: isDark ? c.border : c.text, color: '#FFFFFF', borderRadius: componentRadius.control,
      }, arrow: { color: isDark ? c.border : c.text } } },
      MuiTabs: { styleOverrides: {
        root: { backgroundColor: c.surfaceMuted, borderRadius: componentRadius.control },
        indicator: { backgroundColor: c.purple, borderRadius: componentRadius.pill },
      } },
      MuiTab: { styleOverrides: { root: {
        color: c.textMuted,
        fontWeight: 650,
        '&:hover': { backgroundColor: c.brandHover },
        '&.Mui-selected': { backgroundColor: c.card, color: c.purple },
      } } },
      MuiToggleButton: { styleOverrides: { root: { ...selectable, borderColor: c.border } } },
      MuiPaginationItem: { styleOverrides: { root: selectable } },
      MuiSwitch: { styleOverrides: {
        track: { backgroundColor: c.inputBorder },
        switchBase: { '&.Mui-checked:not(.Mui-disabled) + .MuiSwitch-track': { backgroundColor: c.actionFill, opacity: 0.72 } },
      } },
      MuiFormHelperText: {
        styleOverrides: { root: { marginTop: 6, lineHeight: 1.35 } },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: componentRadius.control, alignItems: 'center' },
          standardSuccess: tonal(c.success),
          standardError: tonal(c.danger),
          standardWarning: tonal(c.warning),
          standardInfo: tonal(info),
        },
      },
    },
  };

  return createTheme(options, ptBR);
}
