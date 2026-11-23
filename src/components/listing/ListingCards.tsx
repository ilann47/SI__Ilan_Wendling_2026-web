import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
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
  getOpenLabel?: (row: T) => string;
}

/** Lista em cards para mobile — alvos de toque grandes. */
export function ListingCards<T>({
  rows, getKey, getTitle, getFields, getActions, onOpen, getOpenLabel,
}: Props<T>) {
  return (
    <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {rows.map((row) => {
        const actions = getActions?.(row) ?? [];
        const content = (
          <CardContent sx={{ py: 1.75 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box aria-hidden="true" sx={{ width: 26, height: 26, flexShrink: 0, borderRadius: '6px',
                display: 'grid', placeItems: 'center', bgcolor: 'action.selected', color: 'primary.main' }}>
                <ArticleOutlinedIcon sx={{ fontSize: 16 }} />
              </Box>
              <Typography component="div" variant="subtitle1" sx={{ fontWeight: 750, lineHeight: 1.25, overflowWrap: 'anywhere' }}>
                {getTitle(row)}
              </Typography>
            </Stack>
            <Stack component="dl" spacing={0.85} sx={{ m: 0, mt: 1.25, pt: 1.25, borderTop: 1, borderColor: 'divider' }}>
              {getFields(row).map((field) => (
                <Stack key={field.label} direction="row" justifyContent="space-between" gap={2} alignItems="flex-start">
                  <Typography component="dt" variant="caption" color="text.secondary" sx={{ flexShrink: 0, maxWidth: '50%', fontWeight: 550 }}>
                    {field.label}
                  </Typography>
                  <Typography component="dd" variant="body2" textAlign="right" sx={{ m: 0, wordBreak: 'break-word', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {field.value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        );
        return (
          <Card key={getKey(row)} sx={{ overflow: 'hidden' }}>
            <Stack direction="row" alignItems="stretch">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {onOpen ? (
                  <CardActionArea
                    onClick={() => onOpen(row)}
                    aria-label={getOpenLabel?.(row) ?? 'Abrir detalhes'}
                    sx={{ minHeight: 88, alignItems: 'stretch', '&:focus-visible': { outlineOffset: -3 } }}
                  >
                    {content}
                  </CardActionArea>
                ) : (
                  content
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
