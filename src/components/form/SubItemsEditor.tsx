import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Box, Button, Chip, Divider, IconButton, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { FieldConfig } from './fieldConfig';
import { FieldRenderer } from './FieldRenderer';
import { defaultValueFor } from './fieldConfig';
import { calculatePurchaseCosts } from '../purchases/purchaseCosts';
import { formatCurrency, formatNumber } from '../../utils/format';

interface Props {
  name: string;
  label: string;
  subFields: FieldConfig[];
  summary?: FieldConfig['subItemsSummary'];
  disabled?: boolean;
}

export function PurchaseCostsSummary() {
  const { control } = useFormContext();
  const [rows, valorFrete, valorSeguro, outrasDespesas] = useWatch({
    control,
    name: ['itens', 'valorFrete', 'valorSeguro', 'outrasDespesas'],
  }) as [Array<Record<string, unknown>> | undefined, unknown, unknown, unknown];
  const purchaseCosts = calculatePurchaseCosts(
    rows ?? [],
    { valorFrete, valorSeguro, outrasDespesas },
  );

  if (!rows?.length) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
      <Typography variant="subtitle2" gutterBottom>Totais dos itens</Typography>
      <Divider sx={{ mb: 1.5 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <Box><Typography variant="caption" color="text.secondary">Quantidade total</Typography>
          <Typography fontWeight={700}>{formatNumber(purchaseCosts.quantidadeTotal)}</Typography></Box>
        <Box><Typography variant="caption" color="text.secondary">Produtos antes dos descontos</Typography>
          <Typography fontWeight={700}>{formatCurrency(purchaseCosts.valorProdutosBruto)}</Typography></Box>
        <Box><Typography variant="caption" color="text.secondary">Descontos nos itens</Typography>
          <Typography fontWeight={700}>{formatCurrency(purchaseCosts.descontoItens)}</Typography></Box>
        <Box><Typography variant="caption" color="text.secondary">Subtotal dos produtos</Typography>
          <Typography fontWeight={700}>{formatCurrency(purchaseCosts.subtotalProdutos)}</Typography></Box>
        <Box><Typography variant="caption" color="text.secondary">Frete, seguro e outras despesas</Typography>
          <Typography fontWeight={700}>{formatCurrency(purchaseCosts.valorFrete
            + purchaseCosts.valorSeguro + purchaseCosts.outrasDespesas)}</Typography></Box>
        <Box sx={{ gridColumn: { xs: 'span 2', md: 'span 2' } }}>
          <Typography variant="caption" color="text.secondary">Total estimado da ordem</Typography>
          <Typography variant="h6" fontWeight={800} color="primary.main">
            {formatCurrency(purchaseCosts.valorTotal)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

export function SubItemsEditor({ name, label, subFields, summary, disabled }: Props) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = useWatch({ control, name }) as Array<Record<string, unknown>> | undefined;
  const [valorFrete, valorSeguro, outrasDespesas] = useWatch({
    control,
    name: ['valorFrete', 'valorSeguro', 'outrasDespesas'],
  });
  const purchaseCosts = summary === 'purchase-costs'
    ? calculatePurchaseCosts(rows ?? [], { valorFrete, valorSeguro, outrasDespesas })
    : null;

  const emptyRow = () => {
    const row: Record<string, unknown> = {};
    for (const sf of subFields) row[sf.name] = defaultValueFor(sf);
    return row;
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">{label}</Typography>
        <Button size="small" startIcon={<AddIcon />} disabled={disabled}
          onClick={() => append(emptyRow())}>
          Adicionar
        </Button>
      </Stack>
      <Stack spacing={1}>
        {fields.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Nenhum item.
          </Typography>
        )}
        {fields.map((row, index) => (
          <Paper key={row.id} variant="outlined" sx={{ p: 1.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, 1fr)' },
                gap: 1.5,
                alignItems: 'start',
              }}
            >
              {subFields.map((sf) => (
                <Box key={sf.name} sx={{ gridColumn: { sm: `span ${sf.cols ?? 4}` }, minWidth: 0 }}>
                  <FieldRenderer field={{ ...sf, disabled: disabled || sf.disabled }}
                    namePrefix={`${name}.${index}.`} dense />
                </Box>
              ))}
              <Box sx={{ gridColumn: { sm: 'span 1' }, textAlign: 'right', pt: 0.75 }}>
                <IconButton color="error" disabled={disabled}
                  onClick={() => remove(index)} aria-label="Remover">
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
            </Box>
            {purchaseCosts?.itens[index] && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
                <Chip size="small" label={`Total do item: ${formatCurrency(purchaseCosts.itens[index].valorTotal)}`} />
                <Chip size="small" label={`Despesas rateadas: ${formatCurrency(
                  purchaseCosts.itens[index].rateioFrete
                    + purchaseCosts.itens[index].rateioSeguro
                    + purchaseCosts.itens[index].rateioOutrasDespesas,
                )}`} />
                <Chip size="small" color="primary" variant="outlined"
                  label={`Custo unitário: ${formatCurrency(purchaseCosts.itens[index].custoUnitarioFinal)}`} />
              </Stack>
            )}
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
