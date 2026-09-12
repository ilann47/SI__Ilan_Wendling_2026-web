import type { ReactNode } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { describeError } from '../api/client';
import { inboundNotesApi } from '../api/inboundNotes';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { PurchaseProcessStrip } from '../components/purchases/PurchaseProcessStrip';
import { useSnackbar } from '../components/SnackbarProvider';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../utils/format';

function key(organizationId: number, ...parts: readonly unknown[]) {
  return tenantQueryKey(organizationId, 'notas-entrada', ...parts);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Typography component="div">{children}</Typography>
    </Box>
  );
}

export function InboundNoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const noteId = Number(id);
  const { activeOrganization, permissions } = useAuth();
  const organizationId = activeOrganization?.organizationId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const canRead = permissions.includes('fiscal:read');
  const canManage = permissions.includes('fiscal:manage');

  const detail = useQuery({
    queryKey: organizationId && Number.isFinite(noteId)
      ? key(organizationId, 'detail', noteId)
      : ['notas-entrada', 'detail'],
    queryFn: () => inboundNotesApi.details(noteId),
    enabled: !!organizationId && canRead && Number.isSafeInteger(noteId) && noteId > 0,
  });

  const invalidate = () => organizationId
    && queryClient.invalidateQueries({ queryKey: key(organizationId) });

  const confirmMutation = useMutation({
    mutationFn: () => inboundNotesApi.confirm(noteId),
    onSuccess: () => {
      setConfirming(false);
      notify('Nota de entrada confirmada.', 'success');
      void invalidate();
      void detail.refetch();
    },
    onError: (error) => notify(describeError(error), 'error'),
  });
  const cancelMutation = useMutation({
    mutationFn: () => inboundNotesApi.cancel(noteId),
    onSuccess: () => {
      setCancelling(false);
      notify('Nota de entrada cancelada.', 'success');
      void invalidate();
      void detail.refetch();
    },
    onError: (error) => notify(describeError(error), 'error'),
  });

  if (!organizationId || !canRead) {
    return <Alert severity="warning">Seu contexto não possui permissão fiscal de leitura.</Alert>;
  }
  if (!Number.isSafeInteger(noteId) || noteId <= 0) {
    return <Alert severity="error">Identificador da nota inválido.</Alert>;
  }
  if (detail.isLoading) return <ListingSkeleton />;
  if (detail.isError) {
    return <ErrorState message={describeError(detail.error)} onRetry={() => void detail.refetch()} />;
  }

  const integrated = detail.data!;
  const note = integrated.nota;
  const pending = note.situacao === 'PENDENTE';

  return (
    <Box>
      <PageHeader
        title={`Nota ${note.numero}`}
        subtitle={`Emissão ${formatDate(note.dataEmissao)} · atualizada ${formatDateTime(note.updatedAt)}`}
        action={(
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              startIcon={<ArrowBackOutlinedIcon />}
              onClick={() => navigate('/app/notas-entrada')}
            >
              Voltar para lista
            </Button>
            {canManage && pending && (
              <PrimaryButton
                startIcon={<CheckCircleOutlineIcon />}
                onClick={() => setConfirming(true)}
              >
                Confirmar
              </PrimaryButton>
            )}
            {canManage && pending && (
              <Button
                color="error"
                variant="outlined"
                startIcon={<CancelOutlinedIcon />}
                onClick={() => setCancelling(true)}
              >
                Cancelar
              </Button>
            )}
          </Stack>
        )}
      />

      <PurchaseProcessStrip active="nota" />

      <Stack spacing={3}>
        <Card sx={{
          p: 2.5,
          position: { md: 'sticky' },
          top: { md: 72 },
          zIndex: 5,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'divider',
        }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <Field label="Número">{note.numero}</Field>
            <Field label="Situação"><StatusChip status={note.situacao} /></Field>
            <Field label="Emissão">{formatDate(note.dataEmissao)}</Field>
            <Field label="Chegada">{formatDate(note.dataChegada)}</Field>
            <Field label="Total"><Typography variant="h6">{formatCurrency(note.valorTotal)}</Typography></Field>
          </Stack>
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>Fornecedor</Typography>
          <Typography fontWeight={700}>{note.fornecedorNome}</Typography>
          <Typography variant="body2" color="text.secondary">Fornecedor #{note.fornecedorId}</Typography>
        </Card>

        <Box>
          <Typography variant="h6" gutterBottom>Itens</Typography>
          <TableContainer component={Card} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell align="right">Qtd</TableCell>
                  <TableCell align="right">Unitário</TableCell>
                  <TableCell align="right">Desconto</TableCell>
                  <TableCell align="right">% Desc.</TableCell>
                  <TableCell align="right">Rateio frete</TableCell>
                  <TableCell align="right">Rateio seguro</TableCell>
                  <TableCell align="right">Rateio outras</TableCell>
                  <TableCell align="right">Custo final</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {note.itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Typography fontWeight={600}>{item.produtoNome}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Produto #{item.produtoId}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatNumber(item.quantidade, 3)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.valorUnitario)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.valorDesconto)}</TableCell>
                    <TableCell align="right">{formatNumber(item.percentualDesconto, 2)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.rateioFrete)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.rateioSeguro)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.rateioOutras)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.custoPrecoFinal)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.valorTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Card sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>Totais</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} flexWrap="wrap">
            <Field label="Produtos">{formatCurrency(note.valorProdutos)}</Field>
            <Field label="Frete">{formatCurrency(note.valorFrete)}</Field>
            <Field label="Seguro">{formatCurrency(note.valorSeguro)}</Field>
            <Field label="Outras despesas">{formatCurrency(note.outrasDespesas)}</Field>
            <Field label="Desconto">{formatCurrency(note.valorDesconto)}</Field>
            <Field label="Total">{formatCurrency(note.valorTotal)}</Field>
          </Stack>
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>Local de estoque</Typography>
          {note.localEstoqueId != null ? (
            <>
              <Typography fontWeight={700}>{note.localEstoqueNome ?? `Local #${note.localEstoqueId}`}</Typography>
              <Typography variant="body2" color="text.secondary">Local #{note.localEstoqueId}</Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">Nenhum local informado.</Typography>
          )}
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>Condição de pagamento</Typography>
          {note.condicaoPagamentoId != null ? (
            <>
              <Typography fontWeight={700}>
                {note.condicaoPagamentoNome ?? `Condição #${note.condicaoPagamentoId}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Condição #{note.condicaoPagamentoId}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">Não informada</Typography>
          )}
        </Card>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          <Card sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <ShoppingCartOutlinedIcon color="primary" />
              <Typography variant="h6">Origem da entrada</Typography>
            </Stack>
            {integrated.ordemCompra ? (
              <Stack spacing={1.25}>
                <Field label="Ordem de compra">
                  {integrated.ordemCompra.numero} · {integrated.ordemCompra.status.replace(/_/g, ' ')}
                </Field>
                {integrated.recebimento && (
                  <>
                    <Field label="Recebido em">{formatDateTime(integrated.recebimento.recebidoEm)}</Field>
                    <Field label="Recebido por">{integrated.recebimento.atorNome}</Field>
                    <Field label="Local">{integrated.recebimento.localEstoqueNome}</Field>
                  </>
                )}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button component={RouterLink} to="/app/ordens-compra" size="small" variant="outlined">
                    Ver ordem
                  </Button>
                  <Button component={RouterLink} to="/app/recebimentos" size="small" variant="outlined">
                    Ver recebimentos
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Entrada lançada diretamente, sem ordem de compra.
              </Typography>
            )}
          </Card>

          <Card sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <AccountBalanceWalletOutlinedIcon color="primary" />
              <Typography variant="h6">Contas a pagar</Typography>
            </Stack>
            {integrated.contasPagar.length > 0 ? (
              <Stack spacing={1.5}>
                {integrated.contasPagar.map((account) => (
                  <Box key={account.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography fontWeight={700}>
                        Parcela {account.numeroParcela ?? 1}/{account.totalParcelas ?? 1}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vence em {formatDate(account.dataVencimento)} · {account.situacao.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                    <Typography fontWeight={700}>{formatCurrency(account.valorTotal)}</Typography>
                  </Box>
                ))}
                <Button
                  component={RouterLink}
                  to={`/app/contas-pagar?notaEntradaId=${note.id}`}
                  size="small"
                  variant="outlined"
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Ver o que pagar
                </Button>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma conta foi gerada para esta nota.
              </Typography>
            )}
          </Card>
        </Box>

        <Card sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Inventory2OutlinedIcon color="primary" />
            <Typography variant="h6">Entrada no estoque</Typography>
          </Stack>
          {integrated.movimentosEstoque.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell>Local</TableCell>
                    <TableCell align="right">Quantidade</TableCell>
                    <TableCell align="right">Saldo após entrada</TableCell>
                    <TableCell>Data</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {integrated.movimentosEstoque.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>{movement.produto}</TableCell>
                      <TableCell>{movement.localEstoque}</TableCell>
                      <TableCell align="right">{formatNumber(movement.delta, 3)}</TableCell>
                      <TableCell align="right">{formatNumber(movement.saldoPosterior, 3)}</TableCell>
                      <TableCell>{formatDateTime(movement.ocorridoEm)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Esta nota ainda não gerou movimento de estoque.
            </Typography>
          )}
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>Histórico de ações</Typography>
          <Typography variant="body2" color="text.secondary">
            O histórico de criação, confirmação e cancelamento ainda não está disponível nesta tela.
          </Typography>
        </Card>

        {note.observacao && (
          <Card sx={{ p: 2.5 }}>
            <Typography variant="overline" color="text.secondary">Observação</Typography>
            <Typography>{note.observacao}</Typography>
          </Card>
        )}
      </Stack>

      <ConfirmDialog
        open={confirming}
        title="Confirmar nota de entrada"
        message="Confirmar a nota? Isso soma o estoque e gera as contas a pagar."
        confirmLabel="Confirmar"
        loading={confirmMutation.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() => confirmMutation.mutate()}
      />
      <ConfirmDialog
        open={cancelling}
        title="Cancelar nota de entrada"
        message="Cancelar esta nota pendente?"
        confirmLabel="Cancelar nota"
        confirmColor="error"
        loading={cancelMutation.isPending}
        onClose={() => setCancelling(false)}
        onConfirm={() => cancelMutation.mutate()}
      />
    </Box>
  );
}
