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

/** Lista em cards para mobile — alvos de toque grandes. */
export function ListingCards<T>({ rows, getKey, getTitle, getFields, getActions, onOpen }: Props<T>) {
  return (
    <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {rows.map((row) => {
        const actions = getActions?.(row) ?? [];
        const body = (
          <Stack spacing={0.85} sx={{ mt: 1.25 }}>
            {getFields(row).map((field) => (
              <Stack key={field.label} direction="row" justifyContent="space-between" gap={2} alignItems="flex-start">
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {field.label}
                </Typography>
                <Typography variant="body2" textAlign="right" sx={{ wordBreak: 'break-word' }}>
                  {field.value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        );
        return (
          <Card key={getKey(row)} sx={{ overflow: 'hidden' }}>
            <Stack direction="row" alignItems="stretch">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {onOpen ? (
                  <CardActionArea
                    onClick={() => onOpen(row)}
                    aria-label="Abrir detalhes"
                    sx={{ minHeight: 72, alignItems: 'stretch' }}
                  >
                    <CardContent sx={{ py: 1.75 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                        {getTitle(row)}
                      </Typography>
                      {body}
                    </CardContent>
                  </CardActionArea>
                ) : (
                  <CardContent sx={{ py: 1.75 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{getTitle(row)}</Typography>
                    {body}
                  </CardContent>
                )}
              </Box>
              {actions.length > 0 && (
                <Box sx={{ pt: 1.25, pr: 0.75, display: 'flex', alignItems: 'flex-start' }}>
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
