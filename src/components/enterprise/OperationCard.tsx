import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface OperationCardProps {
  title: string;
  description?: string;
  error?: string | null;
  children: ReactNode;
  result?: ReactNode;
}

export function OperationCard({ title, description, error, children, result }: OperationCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <div>
            <Typography variant="h6">{title}</Typography>
            {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
          </div>
          {error && <Alert severity="error" aria-live="polite">{error}</Alert>}
          {children}
          {result}
        </Stack>
      </CardContent>
    </Card>
  );
}
