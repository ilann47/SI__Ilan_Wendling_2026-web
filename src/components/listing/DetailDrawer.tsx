import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {
  Box,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { AppDialog } from '../common/AppDialog';

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
  width?: 'default' | 'wide';
}

export function DetailDrawer({
  open,
  title,
  subtitle,
  onClose,
  actions,
  children,
  width = 'default',
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const header = (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
      <Box sx={{ minWidth: 0 }}>
        <Typography id="detalhe-titulo" variant="h6" component="h2" sx={{ wordBreak: 'break-word' }}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
      <IconButton aria-label="Fechar detalhes" onClick={onClose} size="small" sx={{ mt: -0.75, mr: -0.75, flexShrink: 0 }}>
        <CloseOutlinedIcon />
      </IconButton>
    </Stack>
  );

  if (isMobile) {
    return (
      <AppDialog open={open} onClose={onClose} title={title} description={subtitle}
        fullScreenOnMobile fullScreenBreakpoint="md" maxWidth={width === 'wide' ? 'lg' : 'md'}
        contentSx={{ display: 'flex', flexDirection: 'column', gap: 2 }} actions={actions}>
        {children}
      </AppDialog>
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
        sx: {
          width: width === 'wide' ? { md: 720, lg: 800 } : { md: 480, lg: 560 },
          maxWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>{header}</Box>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, overflowY: 'auto', minHeight: 0, flex: 1, '& > *': { minWidth: 0 } }}>
        {children}
      </Box>
      {actions && (
        <Box sx={{ bgcolor: 'background.paper', p: 2, borderTop: '1px solid', borderColor: 'divider', '& .MuiButton-root': { minHeight: 44 } }}>
          {actions}
        </Box>
      )}
    </Drawer>
  );
}
