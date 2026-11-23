import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { InboundNotePreview } from '../../api/inboundNotes';
import type { NotaEntradaResponse } from '../../types';
import { formatCurrencyMicros, formatDate, formatNumber } from '../../utils/format';

/** Valor resumido do documento de entrada. */
function TotalValue({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography fontWeight={strong ? 850 : 700} color={strong ? 'primary.main' : 'text.primary'}
      fontSize={strong ? '1.05rem' : undefined}>{value}</Typography>
  </Box>;
}

function InlineNotice({ children }: { children: ReactNode }) {
  return <Typography variant="body2" color="text.secondary" sx={{ borderLeft: 3, borderColor: 'primary.main', pl: 1.25, py: 0.25 }}>
    {children}
  </Typography>;
}

/** Leitura compacta da composição já salva, sem repetir a identidade do cabeçalho. */
export function InboundNoteDocumentReview({ value, situacao, revertida = false }: {
  value: InboundNotePreview;
  situacao: NotaEntradaResponse['situacao'];
  revertida?: boolean;
}) {
  const note = value.nota;
  const confirmed = situacao === 'CONFIRMADA';
  const cancelled = situacao === 'CANCELADA';
  const compositionTitle = revertida ? 'Itens e custos originais' : cancelled ? 'Composição do rascunho cancelado' : 'Itens e custos';
  const scheduleTitle = revertida ? 'Cronograma original' : cancelled ? 'Cronograma do rascunho cancelado' : 'Parcelas';

  return <Stack spacing={3}>
    <Box component="section">
      <Typography component="h2" variant="h6" fontWeight={800}>{compositionTitle}</Typography>
      {note.itens.length === 0 ? <Typography color="text.secondary" mt={1}>Nenhum item registrado.</Typography> : <Box role="table" aria-label={compositionTitle}
        sx={{ mt: 1.25, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Box role="row" sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: 'minmax(220px, 2fr) repeat(6, minmax(88px, 1fr))', gap: 1.5, px: 1, py: 1, bgcolor: 'action.hover' }}>
          {['Produto', 'Quantidade', 'Valor unitário', 'Desconto', 'Rateio', 'Custo unitário', 'Custo total'].map((label) =>
            <Typography key={label} role="columnheader" variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>)}
        </Box>
        {note.itens.map((item, index) => {
          const cost = value.custosMedios.find((entry) => entry.sequencia === item.sequencia && entry.produtoId === item.produtoId);
          const expenses = item.rateioFrete + item.rateioSeguro + item.rateioOutras;
          const metrics = [
            ['Quantidade', `${formatNumber(item.quantidade, 3, 6)} ${item.unidadeMedida ?? 'un.'}`],
            ['Valor unitário', formatCurrencyMicros(item.valorUnitario)],
            ['Desconto', formatCurrencyMicros(item.valorDesconto)],
            ['Rateio', formatCurrencyMicros(expenses)],
            ['Custo unitário', formatCurrencyMicros(item.custoPrecoFinal)],
            ['Custo total', formatCurrencyMicros(item.custoTotal ?? item.custoPrecoFinal * item.quantidade)],
          ];
          return <Box role="row" key={item.sequencia ?? index} sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'minmax(220px, 2fr) repeat(6, minmax(88px, 1fr))' }, gap: { xs: 1.25, md: 1.5 }, px: 1, py: 1.5, borderTop: index === 0 ? 0 : 1, borderColor: 'divider', alignItems: 'start' }}>
            <Box role="cell" sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, minWidth: 0 }}>
              <Typography fontWeight={800}>{item.produtoNome}</Typography>
              {item.codigoProdutoFornecedor && <Typography variant="caption" color="text.secondary">Código do fornecedor: {item.codigoProdutoFornecedor}</Typography>}
            </Box>
            {metrics.map(([label, amount]) => <Box role="cell" key={label} sx={{ minWidth: 0 }}>
              <Typography display={{ xs: 'block', md: 'none' }} variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="body2" fontWeight={label.startsWith('Custo') ? 800 : 600}>{amount}</Typography>
            </Box>)}
            {cost && <Accordion disableGutters elevation={0} sx={{ gridColumn: '1 / -1', bgcolor: 'transparent', borderTop: 1, borderColor: 'divider', mt: 0.25, '&:before': { display: 'none' } }}>
                <AccordionSummary aria-label={`Ver cálculo do custo médio de ${item.produtoNome}`} expandIcon={<ExpandMoreIcon />}
                  sx={{ minHeight: 40, px: 0, '& .MuiAccordionSummary-content': { alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1 } }}>
                  <Box><Typography fontWeight={700} variant="body2">Impacto no custo médio</Typography><Typography color="text.secondary" variant="caption">Ver memória do cálculo</Typography></Box>
                  <Typography color={cost.aplicaAoEstoque ? 'primary.main' : 'text.secondary'} fontWeight={800} sx={{ whiteSpace: { sm: 'nowrap' } }}>
                    {cost.aplicaAoEstoque && cost.custoMedioAnterior != null && cost.custoMedioPosterior != null
                      ? `${formatCurrencyMicros(cost.custoMedioAnterior)} → ${formatCurrencyMicros(cost.custoMedioPosterior)}` : 'Sem alteração no custo médio'}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails aria-label={`Cálculo do custo médio de ${item.produtoNome}`} sx={{ px: 0, pt: 0 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                    {[
                      ['Saldo atual', cost.saldoAnterior == null ? 'Não disponível' : `${formatNumber(cost.saldoAnterior, 3, 6)} ${item.unidadeMedida ?? 'un.'}`],
                      ['Custo médio atual', cost.custoMedioAnterior == null ? 'Não disponível' : formatCurrencyMicros(cost.custoMedioAnterior)],
                      ['Custo desta entrada', formatCurrencyMicros(cost.custoUnitarioEntrada)],
                      [cost.projecao ? 'Custo médio após entrada (estimado)' : 'Custo médio registrado', cost.custoMedioPosterior == null ? 'Não se aplica' : formatCurrencyMicros(cost.custoMedioPosterior)],
                    ].map(([label, amount], metricIndex) => <Box key={label}><Typography color="text.secondary" variant="caption">{label}</Typography><Typography color={metricIndex === 3 && cost.aplicaAoEstoque ? 'primary.main' : 'text.primary'} fontWeight={metricIndex === 3 ? 800 : 700}>{amount}</Typography></Box>)}
                    <Typography color="text.secondary" sx={{ gridColumn: '1 / -1' }} variant="caption">
                      {cost.aplicaAoEstoque ? 'Cálculo ponderado: saldo atual × custo médio atual + quantidade recebida × custo desta entrada, dividido pelo novo saldo.' : 'Não há memória de custo médio registrada para este item.'}
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>}
          </Box>;
        })}
      </Box>}
    </Box>

    <Box component="section">
      <Typography component="h2" variant="h6" fontWeight={800}>Totais</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }, gap: 2, mt: 1.25, py: 1.5, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        <TotalValue label="Produtos líquidos" value={formatCurrencyMicros(note.valorProdutos)} />
        <TotalValue label="Frete" value={formatCurrencyMicros(note.valorFrete)} />
        <TotalValue label="Seguro" value={formatCurrencyMicros(note.valorSeguro)} />
        <TotalValue label="Outras despesas" value={formatCurrencyMicros(note.outrasDespesas)} />
        <TotalValue label="Desconto geral" value={formatCurrencyMicros(note.valorDesconto)} />
        <TotalValue label="Custo de aquisição" value={formatCurrencyMicros(value.valorCustoTotal)} strong />
        <TotalValue label={revertida ? 'Obrigação original' : cancelled ? 'Valor registrado no rascunho cancelado' : 'Obrigação a pagar'} value={formatCurrencyMicros(value.valorObrigacao)} strong />
      </Box>
    </Box>

    <Box component="section">
      <Typography component="h2" variant="h6" fontWeight={800}>{scheduleTitle}</Typography>
      {value.parcelas.length === 0 ? <Typography color="text.secondary" mt={1}>{cancelled ? 'Nenhuma parcela positiva na composição registrada.' : 'Não há obrigação financeira de valor positivo para gerar.'}</Typography> : <Box sx={{ mt: 1, borderTop: 1, borderColor: 'divider' }}>
        {value.parcelas.map((part) => <Stack key={part.numeroParcela} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={0.5} sx={{ py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
          <Box><Typography fontWeight={700}>Parcela {part.numeroParcela}/{part.totalParcelas}</Typography><Typography variant="body2" color="text.secondary">{cancelled ? 'vencimento registrado' : 'Vence em'} {formatDate(part.dataVencimento)} · {part.formaPagamentoNome ?? 'Forma de pagamento não informada'}</Typography></Box>
          <Typography fontWeight={800}>{formatCurrencyMicros(part.valor)}</Typography>
        </Stack>)}
      </Box>}
    </Box>

    <Stack spacing={1}>
      {value.diferencaDescontoGeral !== 0 && <InlineNotice>{cancelled ? `Desconto geral registrado: ${formatCurrencyMicros(value.diferencaDescontoGeral)}.` : `O desconto geral de ${formatCurrencyMicros(value.diferencaDescontoGeral)} reduz o valor a pagar.`} O custo de aquisição mantém a composição dos itens e despesas.</InlineNotice>}
      {!cancelled && !note.condicaoPagamentoId && value.parcelas.length > 0 && <InlineNotice>Sem condição de pagamento: uma obrigação com vencimento na emissão. A confirmação não registra pagamento.</InlineNotice>}
      <InlineNotice>{revertida ? 'Nota revertida internamente: composição e cronograma originais, apenas para consulta. Confira os lançamentos vinculados abaixo.' : cancelled ? 'Nota cancelada: composição e cronograma apenas para consulta. Esta nota não permite confirmação nem novos lançamentos de estoque ou títulos.' : confirmed ? 'Consulte abaixo os movimentos e títulos efetivamente vinculados à nota.' : 'As quantidades serão lançadas no local informado somente ao confirmar. Os títulos positivos serão gerados uma única vez.'} Nenhum pagamento bancário ou transmissão fiscal é executado.</InlineNotice>
    </Stack>
  </Stack>;
}
