import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { SecondaryActionsMenu, type SecondaryAction } from './SecondaryActionsMenu';

export interface ListingCardField {
  label: string;
  value: ReactNode;
}

interface Props<T> {
  rows: T[];
  getKey: (row: T) => string | number;
  getTitle: (row: T) => ReactNode;
  getFields: (row: T) => ListingCardField[];
  getActions?: (row: T) => SecondaryAction[];
  onOpen?: (row: T) => void;
}

export function ListingCards<T>({ rows, getKey, getTitle, getFields, getActions, onOpen }: Props<T>) {
  return (
    <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {rows.map((row) => {
        const actions = getActions?.(row) ?? [];
        const body = (
          <Stack spacing={0.75} sx={{ mt: 1.5 }}>
            {getFields(row).map((field) => (
              <Stack key={field.label} direction="row" justifyContent="space-between" gap={2}>
                <Typography variant="caption" color="text.secondary">{field.label}</Typography>
                <Typography variant="body2" textAlign="right">{field.value}</Typography>
              </Stack>
            ))}
          </Stack>
        );
        return (
          <Card key={getKey(row)}>
            <Stack direction="row" alignItems="flex-start">
              <Box sx={{ flex: 1 }}>
                {onOpen ? (
                  <CardActionArea onClick={() => onOpen(row)} aria-label="Abrir detalhes">
                    <CardContent>
                      <Typography variant="subtitle1">{getTitle(row)}</Typography>
                      {body}
                    </CardContent>
                  </CardActionArea>
                ) : (
                  <CardContent>
                    <Typography variant="subtitle1">{getTitle(row)}</Typography>
                    {body}
                  </CardContent>
                )}
              </Box>
              {actions.length > 0 && (
                <Box sx={{ pt: 1, pr: 0.5 }}>
                  <SecondaryActionsMenu actions={actions} />
                </Box>
              )}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
