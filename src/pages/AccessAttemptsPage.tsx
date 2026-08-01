import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { api, describeError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { formatDateTime } from '../utils/format';

interface AccessAttempt {
  id: number;
  eventId: number;
  parkingFacilityId: number;
  actorId: number;
  credentialId?: number;
  operation: 'VALIDACAO' | 'CHECKIN' | 'CHECKOUT';
  direction?: string;
  readSource: string;
  lane: string;
  decision: 'AUTORIZADA' | 'RECUSADA';
  reasonCode: string;
  resultingOccupancy?: number;
  receivedAt: string;
  decidedAt: string;
}

interface AccessAttemptPage {
  items: AccessAttempt[];
  nextCursor?: number;
  hasMore: boolean;
}

interface Filters {
  eventId: string;
  decision: string;
  reason: string;
}

const reasons = [
  'AUTORIZADA',
  'CREDENCIAL_INVALIDA',
  'CREDENCIAL_INATIVA',
  'FORA_DA_JANELA',
  'EVENTO_FORA_DE_OPERACAO',
  'PATIO_INCORRETO',
  'ENTRADA_DUPLICADA',
  'PATIO_LOTADO',
  'PRESENCA_INEXISTENTE',
  'SAIDA_DUPLICADA',
];

const emptyFilters: Filters = { eventId: '', decision: '', reason: '' };

export function AccessAttemptsPage() {
  const { permissions } = useAuth();
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [cursorHistory, setCursorHistory] = useState<(number | null)[]>([null]);
  const cursor = cursorHistory[cursorHistory.length - 1] ?? null;
  const canRead = permissions.includes('audit:read');

  const query = useQuery({
    queryKey: ['access-attempts', cursor, filters],
    enabled: canRead,
    queryFn: () => api.get<AccessAttemptPage>('/api/v1/access-attempts', {
      params: {
        cursor: cursor ?? undefined,
        eventId: filters.eventId ? Number(filters.eventId) : undefined,
        decision: filters.decision || undefined,
        reason: filters.reason || undefined,
        limit: 50,
      },
    }).then((response) => response.data),
  });

  if (!canRead) {
    return <Alert severity="warning">Seu contexto não possui permissão de auditoria.</Alert>;
  }

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters(draft);
    setCursorHistory([null]);
  };

  return (
    <Box>
      <PageHeader
        title="Tentativas de acesso"
        subtitle="Feed auditável do tenant ativo, sem exposição do token ou hash do QR."
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box component="form" onSubmit={applyFilters}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="ID do evento"
                type="number"
                value={draft.eventId}
                onChange={(event) => setDraft({ ...draft, eventId: event.target.value })}
                inputProps={{ min: 1 }}
                fullWidth
              />
              <TextField
                select
                label="Decisão"
                value={draft.decision}
                onChange={(event) => setDraft({ ...draft, decision: event.target.value })}
                fullWidth
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="AUTORIZADA">Autorizada</MenuItem>
                <MenuItem value="RECUSADA">Recusada</MenuItem>
              </TextField>
              <TextField
                select
                label="Motivo"
                value={draft.reason}
                onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
                fullWidth
              >
                <MenuItem value="">Todos</MenuItem>
                {reasons.map((reason) => (
                  <MenuItem key={reason} value={reason}>{reason}</MenuItem>
                ))}
              </TextField>
              <Button type="submit" variant="contained" startIcon={<SearchOutlinedIcon />}>
                Filtrar
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {query.isError && <Alert severity="error" sx={{ mb: 2 }}>{describeError(query.error)}</Alert>}
      {query.isLoading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <Card>
          <TableContainer>
            <Table size="small" aria-label="Tentativas de acesso">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Decisão</TableCell>
                  <TableCell>Operação</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Evento / Pátio</TableCell>
                  <TableCell>Faixa</TableCell>
                  <TableCell>Credencial</TableCell>
                  <TableCell>Decidida em</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(query.data?.items ?? []).map((attempt) => (
                  <TableRow key={attempt.id} hover>
                    <TableCell>{attempt.id}</TableCell>
                    <TableCell><StatusChip status={attempt.decision} /></TableCell>
                    <TableCell>{attempt.operation}</TableCell>
                    <TableCell>{attempt.reasonCode}</TableCell>
                    <TableCell>{attempt.eventId} / {attempt.parkingFacilityId}</TableCell>
                    <TableCell>{attempt.lane}</TableCell>
                    <TableCell>{attempt.credentialId ?? '—'}</TableCell>
                    <TableCell>{formatDateTime(attempt.decidedAt)}</TableCell>
                  </TableRow>
                ))}
                {query.data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        Nenhuma tentativa encontrada.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
            <Button
              startIcon={<ArrowBackOutlinedIcon />}
              disabled={cursorHistory.length === 1 || query.isFetching}
              onClick={() => setCursorHistory((history) => history.slice(0, -1))}
            >
              Anterior
            </Button>
            <Typography variant="body2" color="text.secondary">
              {query.isFetching ? 'Atualizando…' : `${query.data?.items.length ?? 0} registros nesta página`}
            </Typography>
            <Button
              endIcon={<ArrowForwardOutlinedIcon />}
              disabled={!query.data?.hasMore || !query.data.nextCursor || query.isFetching}
              onClick={() => query.data?.nextCursor
                && setCursorHistory((history) => [...history, query.data!.nextCursor!])}
            >
              Próxima
            </Button>
          </Stack>
        </Card>
      )}
    </Box>
  );
}
