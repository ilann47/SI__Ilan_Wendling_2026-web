import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { api, describeError } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { useSnackbar } from '../components/SnackbarProvider';
import { ReferenceSelect } from '../components/form/ReferenceSelect';
import { formatCurrency, formatDateTime, minutesToHuman } from '../utils/format';
import type { MovimentacaoResponse, PatioAtualResponse } from '../types';

export function PatioPage() {
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const { activeOrganization } = useAuth();
  const [veiculoId, setVeiculoId] = useState<number | null>(null);
  const organizationId = activeOrganization?.organizationId;
  const patioKey = organizationId ? tenantQueryKey(organizationId, 'rel', 'patio') : ['rel', 'patio'];

  const patioQ = useQuery({
    queryKey: patioKey,
    queryFn: () => api.get<PatioAtualResponse>('/api/relatorios/patio').then((r) => r.data),
    enabled: !!organizationId,
    refetchInterval: 15_000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: patioKey });

  const entrada = useMutation({
    mutationFn: () => api.post<MovimentacaoResponse>('/api/movimentacoes/entrada', { veiculoId }),
    onSuccess: () => {
      notify('Entrada registrada.', 'success');
      setVeiculoId(null);
      refresh();
    },
    onError: (e) => notify(describeError(e), 'error'),
  });

  const saida = useMutation({
    mutationFn: (id: number) =>
      api.post<MovimentacaoResponse>(`/api/movimentacoes/${id}/saida`).then((r) => r.data),
    onSuccess: (mov) => {
      notify(`Saída registrada. Cobrança: ${formatCurrency(mov.valorCobrado)}`, 'success');
      refresh();
    },
    onError: (e) => notify(describeError(e), 'error'),
  });

  const itens = patioQ.data?.itens ?? [];
  const resumo = patioQ.data?.resumo;

  return (
    <Box>
      <PageHeader
        title="Operação do pátio"
        subtitle="Registre entradas e saídas de veículos."
        action={
          resumo && (
            <Stack direction="row" spacing={1}>
              <Chip color="primary" label={`${resumo.totalVeiculos} no pátio`} />
              <Chip variant="outlined" label={`${resumo.avulsos} avulsos`} />
              <Chip variant="outlined" label={`${resumo.mensalistas} mensalistas`} />
            </Stack>
          )
        }
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Registrar entrada
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Box sx={{ flexGrow: 1, maxWidth: 480 }}>
              <ReferenceSelect
                label="Veículo (placa)"
                value={veiculoId}
                onChange={setVeiculoId}
                reference={{ basePath: '/api/veiculos', labelField: 'placa', secondaryField: 'modelo' }}
              />
            </Box>
            <PrimaryButton
              startIcon={<LoginIcon />}
              disabled={!veiculoId || entrada.isPending}
              onClick={() => entrada.mutate()}
              sx={{ minHeight: 48 }}
            >
              Registrar entrada
            </PrimaryButton>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
        Veículos no pátio
      </Typography>

      {patioQ.isError && <ErrorState message={describeError(patioQ.error)} onRetry={() => void patioQ.refetch()} />}
      {patioQ.isLoading ? (
        <ListingSkeleton rows={4} />
      ) : itens.length === 0 ? (
        <EmptyState title="Nenhum veículo no pátio" description="Registre uma entrada para começar a operação." />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 2,
          }}
        >
          {itens.map((it) => (
            <Card key={it.movimentacaoId}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{it.placa}</Typography>
                  <Chip
                    size="small"
                    color={it.tipo === 'MENSALISTA' ? 'secondary' : 'default'}
                    label={it.tipo === 'MENSALISTA' ? 'Mensalista' : 'Avulso'}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {it.modelo || 'Modelo não informado'}
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 1.5, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Entrada: {formatDateTime(it.dataEntrada)}
                  </Typography>
                  <Typography variant="body2">
                    Permanência: <strong>{minutesToHuman(it.minutosPermanencia)}</strong>
                  </Typography>
                </Stack>
                <Button
                  fullWidth
                  variant="outlined"
                  color="warning"
                  startIcon={<LogoutIcon />}
                  disabled={saida.isPending}
                  onClick={() => saida.mutate(it.movimentacaoId)}
                >
                  Registrar saída
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
