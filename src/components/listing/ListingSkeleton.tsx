import { Box, Card, Skeleton, Stack } from '@mui/material';

export function ListingSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card aria-label="Carregando listagem" aria-busy="true">
      <Box sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          {Array.from({ length: rows }, (_, index) => (
            <Stack key={index} direction="row" spacing={2}>
              <Skeleton variant="rounded" height={18} width={72} />
              <Skeleton variant="rounded" height={18} sx={{ flex: 1 }} />
              <Skeleton variant="rounded" height={18} width={120} />
              <Skeleton variant="rounded" height={18} width={88} />
            </Stack>
          ))}
        </Stack>
      </Box>
    </Card>
  );
}

export function DetailSkeleton() {
  return (
    <Stack spacing={2} aria-label="Carregando detalhes" aria-busy="true">
      <Skeleton variant="rounded" height={28} width="60%" />
      <Skeleton variant="rounded" height={16} width="40%" />
      <Skeleton variant="rounded" height={120} />
      <Skeleton variant="rounded" height={80} />
    </Stack>
  );
}
