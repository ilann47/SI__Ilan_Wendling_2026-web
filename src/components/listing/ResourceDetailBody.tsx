import {
  Box,
  Card,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { formatCurrency, formatNumber } from '../../utils/format';
import { StatusChip } from '../common/StatusChip';
import { buildDetailSections, UNAVAILABLE_API, type DetailSection } from './listingUtils';

export function DetailSectionGrid({ sections }: { sections: DetailSection[] }) {
  return (
    <Stack spacing={2.5}>
      {sections.map((section) => (
        <Box key={section.title}>
          <Typography variant="overline" color="text.secondary">{section.title}</Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 1.5,
            mt: 0.5,
          }}>
            {section.fields.map((field) => (
              <Box key={field.label}>
                <Typography variant="caption" color="text.secondary">{field.label}</Typography>
                <Typography variant="body2">{field.value}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function isItemRow(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function RelatedItemsTable({
  title,
  items,
}: {
  title: string;
  items: unknown;
}) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const rows = items.filter(isItemRow);
  if (rows.length === 0) return null;
  const keys = ['produtoNome', 'servico', 'servicoNome', 'quantidade', 'quantidadePedida',
    'quantidadeRecebida', 'quantidadePendente', 'valorUnitario', 'valorDesconto', 'valorTotal']
    .filter((key) => rows.some((row) => key in row));
  const labels: Record<string, string> = {
    produtoNome: 'Produto',
    servico: 'Serviço',
    servicoNome: 'Serviço',
    quantidade: 'Quantidade',
    quantidadePedida: 'Pedida',
    quantidadeRecebida: 'Recebida',
    quantidadePendente: 'Pendente',
    valorUnitario: 'Unitário',
    valorDesconto: 'Desconto',
    valorTotal: 'Subtotal',
  };

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">{title}</Typography>
      <Card variant="outlined" sx={{ mt: 0.5 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {keys.map((key) => (
                <TableCell key={key} align={key.startsWith('valor') || key.startsWith('quantidade') ? 'right' : 'left'}>
                  {labels[key] ?? key}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={String(row.id ?? index)}>
                {keys.map((key) => {
                  const value = row[key];
                  const numeric = typeof value === 'number';
                  const content = key.startsWith('valor') && numeric
                    ? formatCurrency(value)
                    : numeric ? formatNumber(value, Number.isInteger(value) ? 0 : 3) : String(value ?? '—');
                  return (
                    <TableCell key={key} align={key.startsWith('valor') || key.startsWith('quantidade') ? 'right' : 'left'}>
                      {content}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}

export function UnavailableRelations({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">Relacionamentos</Typography>
      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
        {labels.map((label) => (
          <Typography key={label} variant="body2" color="text.secondary">
            {label}: {UNAVAILABLE_API}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

export function ResourceDetailBody({
  row,
  extra,
  unavailable = [],
}: {
  row: Record<string, unknown>;
  extra?: ReactNode;
  unavailable?: string[];
}) {
  const sections = buildDetailSections(row);
  const status = typeof row.status === 'string' ? row.status : typeof row.situacao === 'string' ? row.situacao : null;

  return (
    <Stack spacing={3}>
      {status && (
        <Box>
          <Typography variant="overline" color="text.secondary">Situação</Typography>
          <Box sx={{ mt: 0.5 }}><StatusChip status={status} /></Box>
        </Box>
      )}
      <DetailSectionGrid sections={sections.filter((section) => section.title !== 'Situação')} />
      <RelatedItemsTable title="Itens" items={row.itens ?? row.items} />
      {extra}
      <UnavailableRelations labels={unavailable} />
    </Stack>
  );
}
