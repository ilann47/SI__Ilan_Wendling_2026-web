import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: Props) {
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
      <InboxOutlinedIcon color="disabled" sx={{ fontSize: 40, mb: 1 }} />
      <Typography variant="subtitle1">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
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
