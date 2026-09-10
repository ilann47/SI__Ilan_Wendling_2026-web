import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useColorMode } from '../../context/ColorModeContext';
import { getThemeTokens } from '../../theme/hubTokens';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: Props) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);

  return (
    <Box
      role="status"
      sx={{
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        px: 3,
        py: 8,
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2,
          bgcolor: colors.brandHover,
          color: colors.purple,
          display: 'grid',
          placeItems: 'center',
          mb: 1,
        }}
      >
        <InboxOutlinedIcon sx={{ fontSize: 28 }} />
      </Box>
      <Typography sx={{ fontWeight: 800, color: colors.text }}>{title}</Typography>
      {description && (
        <Typography variant="body2" sx={{ maxWidth: 420, color: colors.textMuted }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}

export function EmptyStateAction({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="contained" onClick={onClick} sx={{ mt: 1 }}>
      {label}
    </Button>
  );
}
