import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {
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
import { useId, type ReactNode } from 'react';

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
      open={open}
      onClose={requestClose}
      disableEscapeKeyDown={busy}
      fullWidth
      maxWidth={maxWidth}
      fullScreen={fullScreen}
      scroll="paper"
      sx={fullScreen ? { '& .MuiDialog-container': { p: 0 } } : undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      slotProps={{
        paper: {
          role,
          sx: paperSx,
        },
      }}
    >
      <DialogTitle id={titleId}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Typography component="span" variant="h6" sx={{ lineHeight: 1.35 }}>
            {title}
          </Typography>
          <IconButton
            aria-label={closeLabel ?? `Fechar ${accessibleTitle}`}
            onClick={onClose}
            disabled={busy}
            size="small"
            edge="end"
            sx={{ mt: -0.5, flexShrink: 0 }}
          >
            <CloseOutlinedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers={contentDividers} sx={contentSx}>
        {description && (
          <DialogContentText id={descriptionId} sx={{ mb: 2 }}>
            {description}
          </DialogContentText>
        )}
        {children}
      </DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
}
