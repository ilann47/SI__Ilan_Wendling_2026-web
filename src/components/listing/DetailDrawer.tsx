import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

export function DetailDrawer({ open, title, subtitle, onClose, actions, children }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const header = (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ pr: 1 }}>
      <Box>
        <Typography variant="h6" component="h2">{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
      <IconButton aria-label="Fechar detalhes" onClick={onClose}>
        <CloseOutlinedIcon />
      </IconButton>
    </Stack>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onClose={onClose} fullScreen aria-labelledby="detalhe-titulo">
        <DialogTitle id="detalhe-titulo" sx={{ pb: 1 }}>{header}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {children}
          {actions && <Box sx={{ mt: 'auto', pt: 2 }}>{actions}</Box>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        role: 'dialog',
        'aria-labelledby': 'detalhe-titulo',
        sx: { width: { md: 480, lg: 560 }, maxWidth: '100vw', p: 3 },
      }}
    >
      <Box id="detalhe-titulo">{header}</Box>
      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2, pb: 8 }}>
        {children}
      </Box>
      {actions && (
        <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', pt: 2 }}>
          {actions}
        </Box>
      )}
    </Drawer>
  );
}
