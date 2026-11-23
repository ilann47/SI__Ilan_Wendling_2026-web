import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Card, Stack, Typography } from '@mui/material';
import type { InboundNotePreview } from '../../api/inboundNotes';
import type { NotaEntradaResponse } from '../../types';
import { formatCurrencyMicros, formatDate, formatNumber } from '../../utils/format';

/** Conferência autoritativa, compartilhada entre formulário e detalhe da Nota de Entrada. */
export function InboundNoteReview({ value, situacao = 'PENDENTE' }: { value: InboundNotePreview; situacao?: NotaEntradaResponse['situacao'] }) {
  const note = value.nota;
  const confirmed = situacao === 'CONFIRMADA';
  const cancelled = situacao === 'CANCELADA';
  return <Stack spacing={2}>
    <Typography variant="h6">{cancelled ? 'Composição do rascunho cancelado' : confirmed ? 'Composição registrada' : 'Conferência da entrada'}</Typography>
    <Typography>Nota {note.numero} · série {note.serie} · modelo {note.modelo} · {note.fornecedorNome}</Typography>
    <Typography>Local: {note.localEstoqueNome} · Condição: {note.condicaoPagamentoNome ?? 'Não informada'}</Typography>
    {note.itens.map((item, index) => {
      const custoMedio = value.custosMedios.find((cost) => cost.sequencia === item.sequencia && cost.produtoId === item.produtoId);
      return <Card key={item.sequencia ?? index} variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={700}>{item.produtoNome}</Typography>
      <Typography variant="body2">{formatNumber(item.quantidade, 3, 6)} {item.unidadeMedida ?? '(unidade não disponível)'} × {formatCurrencyMicros(item.valorUnitario)}</Typography>
      {item.codigoProdutoFornecedor && <Typography variant="caption">Código no fornecedor: {item.codigoProdutoFornecedor}</Typography>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1, mt: 1 }}>
        <Typography>Desconto: {formatCurrencyMicros(item.valorDesconto)}</Typography>
        <Typography>Produtos: {formatCurrencyMicros(item.valorTotal)}</Typography>
        <Typography>Despesas: {formatCurrencyMicros(item.rateioFrete + item.rateioSeguro + item.rateioOutras)}</Typography>
        <Typography>Custo unitário: {formatCurrencyMicros(item.custoPrecoFinal)}</Typography>
        {item.custoTotal != null && <Typography>Custo do item: {formatCurrencyMicros(item.custoTotal)}</Typography>}
      </Box>
      {custoMedio && <Accordion disableGutters elevation={0} sx={{ bgcolor: 'action.hover', borderRadius: 2, mt: 1.5, '&:before': { display: 'none' } }}>
        <AccordionSummary
          aria-label={`Ver cálculo do custo médio de ${item.produtoNome}`}
          expandIcon={<ExpandMoreIcon />}
          sx={{ minHeight: 48, '& .MuiAccordionSummary-content': { alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1 } }}
        >
          <Box>
            <Typography fontWeight={700} variant="body2">Impacto no estoque</Typography>
            <Typography color="text.secondary" variant="caption">Ver memória do cálculo</Typography>
          </Box>
          <Typography color={custoMedio.aplicaAoEstoque ? 'primary.main' : 'text.secondary'} fontWeight={800} sx={{ whiteSpace: 'nowrap' }}>
            {custoMedio.aplicaAoEstoque && custoMedio.custoMedioAnterior != null && custoMedio.custoMedioPosterior != null
              ? `${formatCurrencyMicros(custoMedio.custoMedioAnterior)} → ${formatCurrencyMicros(custoMedio.custoMedioPosterior)}`
              : 'Sem alteração no custo médio'}
          </Typography>
        </AccordionSummary>
        <AccordionDetails aria-label={`Cálculo do custo médio de ${item.produtoNome}`} sx={{ pt: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            <Box>
              <Typography color="text.secondary" variant="caption">Saldo atual</Typography>
              <Typography fontWeight={700}>{custoMedio.saldoAnterior == null ? 'Não disponível' : `${formatNumber(custoMedio.saldoAnterior, 3, 6)} ${item.unidadeMedida ?? 'un.'}`}</Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="caption">Custo médio atual</Typography>
              <Typography fontWeight={700}>{custoMedio.custoMedioAnterior == null ? 'Não disponível' : formatCurrencyMicros(custoMedio.custoMedioAnterior)}</Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="caption">Custo desta entrada</Typography>
              <Typography fontWeight={700}>{formatCurrencyMicros(custoMedio.custoUnitarioEntrada)}</Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="caption">{custoMedio.projecao ? 'Custo médio após entrada (estimado)' : 'Custo médio registrado'}</Typography>
              <Typography color={custoMedio.aplicaAoEstoque ? 'primary.main' : 'text.primary'} fontWeight={800}>{custoMedio.custoMedioPosterior == null ? 'Não se aplica' : formatCurrencyMicros(custoMedio.custoMedioPosterior)}</Typography>
            </Box>
            <Typography color="text.secondary" sx={{ gridColumn: '1 / -1' }} variant="caption">
              {custoMedio.aplicaAoEstoque
                ? 'Cálculo ponderado: saldo atual × custo médio atual + quantidade recebida × custo desta entrada, dividido pelo novo saldo.'
                : 'Não há memória de custo médio registrada para este item.'}
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>}
    </Card>})}
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack gap={1}>
        <Typography>Produtos líquidos: {formatCurrencyMicros(note.valorProdutos)}</Typography>
        <Typography>Frete: {formatCurrencyMicros(note.valorFrete)} · Seguro: {formatCurrencyMicros(note.valorSeguro)} · Outras despesas: {formatCurrencyMicros(note.outrasDespesas)}</Typography>
        <Typography>Desconto geral: {formatCurrencyMicros(note.valorDesconto)}</Typography>
        <Typography fontWeight={700}>Custo de aquisição: {formatCurrencyMicros(value.valorCustoTotal)}</Typography>
        <Typography fontWeight={700}>{cancelled ? 'Valor registrado no rascunho cancelado' : 'Obrigação a pagar'}: {formatCurrencyMicros(value.valorObrigacao)}</Typography>
      </Stack>
    </Card>
    {value.diferencaDescontoGeral !== 0 && <Alert severity="info">{cancelled ? `Desconto geral registrado: ${formatCurrencyMicros(value.diferencaDescontoGeral)}.` : `O desconto geral de ${formatCurrencyMicros(value.diferencaDescontoGeral)} reduz o valor a pagar.`} O custo de aquisição mantém a composição dos itens e despesas.</Alert>}
    <Typography variant="h6">{cancelled ? 'Cronograma do rascunho cancelado' : confirmed ? 'Cronograma registrado' : 'Parcelas previstas'}</Typography>
    {value.parcelas.length === 0 ? <Typography>{cancelled ? 'Nenhuma parcela positiva na composição registrada.' : 'Não há obrigação financeira de valor positivo para gerar.'}</Typography> : value.parcelas.map((part) => <Card key={part.numeroParcela} variant="outlined" sx={{ p: 1.5 }}>
      <Typography>Parcela {part.numeroParcela}/{part.totalParcelas} · {formatCurrencyMicros(part.valor)} · {cancelled ? 'vencimento registrado' : 'vence em'} {formatDate(part.dataVencimento)}</Typography>
      <Typography variant="body2">{part.formaPagamentoNome ?? 'Forma de pagamento não informada'}</Typography>
    </Card>)}
    {!cancelled && !note.condicaoPagamentoId && value.parcelas.length > 0 && <Alert severity="info">Sem condição de pagamento: uma obrigação com vencimento na emissão. A confirmação não registra pagamento.</Alert>}
    <Alert severity="info">{cancelled ? 'Nota cancelada: composição e cronograma apenas para consulta. Esta nota não permite confirmação nem novos lançamentos de estoque ou títulos.' : confirmed ? 'Consulte abaixo os movimentos e títulos efetivamente vinculados à nota.' : 'As quantidades serão lançadas no local informado somente ao confirmar. Os títulos positivos serão gerados uma única vez.'} Nenhum pagamento bancário ou transmissão fiscal é executado.</Alert>
  </Stack>;
}
