import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  type DialogProps,
  type SxProps,
  type Theme,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { Breakpoint } from '@mui/material/styles';
import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import { SuspendedDialogContext } from '../../context/quickFormPages';

const NestedDialogContext = createContext(false);

interface Props {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  maxWidth?: DialogProps['maxWidth'];
  fullScreenOnMobile?: boolean;
  fullScreenBreakpoint?: Breakpoint;
  busy?: boolean;
  contentDividers?: boolean;
  contentSx?: SxProps<Theme>;
  paperSx?: SxProps<Theme>;
  closeLabel?: string;
  role?: 'dialog' | 'alertdialog';
}

/** Estrutura unica para dialogs Kaneko: cabecalho, rolagem, acoes e fechamento previsiveis. */
export function AppDialog({
  open,
  title,
  description,
  children,
  actions,
  onClose,
  maxWidth = 'sm',
  fullScreenOnMobile = false,
  fullScreenBreakpoint = 'sm',
  busy = false,
  contentDividers = true,
  contentSx,
  paperSx,
  closeLabel,
  role = 'dialog',
}: Props) {
  const theme = useTheme();
  const suspended = useContext(SuspendedDialogContext);
  const nested = useContext(NestedDialogContext);
  const [restoring, setRestoring] = useState(false);
  useEffect(() => {
    if (!nested) return;
    if (suspended) {
      setRestoring(true);
    } else if (restoring) {
      // Registra o seletor depois do diálogo pai para devolver o foco ao topo.
      const frame = window.requestAnimationFrame(() => setRestoring(false));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [nested, suspended, restoring]);
  const paused = suspended || restoring;
  const mobile = useMediaQuery(theme.breakpoints.down(fullScreenBreakpoint));
  const titleId = useId();
  const descriptionId = useId();
  const accessibleTitle = typeof title === 'string' ? title : 'dialogo';
  const fullScreen = fullScreenOnMobile && mobile;

  const requestClose: DialogProps['onClose'] = () => {
    if (!busy) onClose();
  };

  return (
    <Dialog
      open={open && !paused}
      keepMounted={paused}
      onClose={requestClose}
      disableEscapeKeyDown={busy}
      fullWidth
      maxWidth={maxWidth}
      fullScreen={fullScreen}
      scroll="paper"
      sx={paused ? { display: 'none' } : fullScreen ? { '& .MuiDialog-container': { p: 0 } } : undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      slotProps={{
        paper: {
          role,
          sx: paperSx,
        },
      }}
    >
      <DialogTitle id={`${titleId}-header`} component="header" data-slot="dialog-header"
        sx={{ borderBottom: contentDividers ? '1px solid' : 0, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Stack spacing={0.55} sx={{ minWidth: 0 }}>
            <Typography id={titleId} component="h2" variant="h6" sx={{ fontWeight: 750, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
              {title}
            </Typography>
            {description && (
              <DialogContentText id={descriptionId} component="div" sx={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.45 }}>
                {description}
              </DialogContentText>
            )}
          </Stack>
          <IconButton
            aria-label={closeLabel ?? `Fechar ${accessibleTitle}`}
            onClick={onClose}
            disabled={busy}
            size="small"
            edge="end"
            sx={{ mt: -0.5, mr: -0.5, flexShrink: 0, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
          >
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent data-slot="dialog-body" dividers={contentDividers} sx={contentSx}>
        <NestedDialogContext.Provider value>{children}</NestedDialogContext.Provider>
      </DialogContent>
      {actions && (
        <Box component="footer" data-slot="dialog-footer" sx={{ flex: '0 0 auto' }}>
          <DialogActions>{actions}</DialogActions>
        </Box>
      )}
    </Dialog>
  );
}
