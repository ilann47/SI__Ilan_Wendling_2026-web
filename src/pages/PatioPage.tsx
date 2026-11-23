import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, FormControlLabel, LinearProgress,
  Radio, RadioGroup, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import ViewModuleOutlinedIcon from '@mui/icons-material/ViewModuleOutlined';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import { api, describeError, getHttpStatus } from '../api/client';
import { customersListQueryKey, serviceNotesListQueryKey, tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { allowsAccess, PATIO_CASH_ACCESS, PATIO_VEHICLE_ACCESS } from '../auth/accessPolicy';
import { PageHeader } from '../components/common/PageHeader';
import { AppDialog } from '../components/common/AppDialog';
import { EmptyState } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { formatDateTime, minutesToHuman } from '../utils/format';
import type { PatioAtualResponse } from '../types';
import { FacilityForm } from './FacilitiesPage';
import { NamedResourceSelect } from '../components/enterprise/NamedResourceSelect';
import { cashChange, decimalInput, isValidPatioPlate, normalizePatioPlate, PATIO_PLATE_MAX_LENGTH, readContext, writeContext,
  type OperationContext } from '../features/patio/operation';
import { CashReceived, CorrectionDialog, QuickExit, ReceiptPage, ReceiptHistory } from '../features/patio/PatioTools';
import { PatioVehicles } from '../features/patio/PatioVehicles';
import { readVehicleView, writeVehicleView, type VehicleView } from '../features/patio/vehicleView';
import { useConnectivity } from '../features/patio/connectivity';
import { ChargeBreakdown, type ChargeSnapshot } from '../features/patio/ChargeBreakdown';
import { CashManagement, TurnSupervision } from '../features/patio/CashManagement';
import { linkedDetailId } from '../hooks/useLinkedDetail';
import { RecordDetailPage } from '../components/listing/RecordDetailPage';
import { OptionalFiscalPayer } from '../features/fiscal/FiscalPayerFields';
import { fiscalPayerPayload, type FiscalPayer } from '../features/fiscal/payer';

const PATIO_PATH = '/app/patio';

function receiptListPath(plate: string | null) {
  const search = new URLSearchParams({ tab: 'comprovantes' });
  if (plate !== null) search.set('placa', plate);
  return `${PATIO_PATH}?${search}`;
}

const BASE = '/api/v1/patio';
const meios = { DINHEIRO: 'Dinheiro', PIX: 'Pix', CARTAO: 'Cartão', SEM_COBRANCA: 'Sem cobrança' };
type Meio = keyof typeof meios;
type Tipo = 'MENSALISTA' | 'AVULSO';
type Valor = string | number;
type Turno = { id: number; abertoEm: string; fechadoEm?: string; fundoTroco: Valor; saidas: number;
  dinheiro: Valor; pix: Valor; cartao: Valor; totalRecebido: Valor; dinheiroEsperado: Valor;
  dinheiroContado?: Valor; diferencaDinheiro?: Valor; suprimentos?: Valor; sangrias?: Valor };
type ModoEvento = 'ENTRADA' | 'SAIDA';
type OpcaoEvento = ChargeSnapshot & { eventoId: number; nome: string; patioId: number; patioNome: string; modo: ModoEvento; valor: string };
type EstadiaEvento = { movimentacaoId: number; eventoId: number; nome: string; modo: ModoEvento;
  valor: Valor; valorPago: Valor; fiscalStatus?: 'PENDENTE_EMISSAO' | null;
  ordemServicoNumero?: string | null; ordemServicoStatus?: 'EM_EXECUCAO' | 'CONCLUIDA' | null };
type Caixa = { aberto?: Turno | null; ultimoFechado?: Turno | null; patios: { id: number; nome: string }[];
  eventos?: OpcaoEvento[]; estadiasEvento?: EstadiaEvento[] };
type Previa = ChargeSnapshot & { turnoId: number; chave: string; placa: string; tipo: Tipo; minutos: number;
  valor: Valor; expiraEm: string; evento?: EstadiaEvento | null };
type Saida = { movimentacaoId?: number; placa: string; valor: Valor; meio: Meio; recebido?: string; troco?: string; evento?: EstadiaEvento | null };
type Entrada = { id?: number; placa: string; recebido?: string; troco?: string; evento?: EstadiaEvento | null };
type EntradaDados = { placa: string; patioId?: number; eventoId?: number; chaveEntrada?: string;
  meio?: Meio; valorEsperado?: string; recebido?: string; tomador?: FiscalPayer };
const meiosCobranca = ['DINHEIRO', 'PIX', 'CARTAO'] as const;
const chaveOpcao = ({ eventoId, patioId }: OpcaoEvento) => `${eventoId}:${patioId}`;
const precoSemCentavo = (option?: OpcaoEvento) => option?.valorDevido != null
  && /^0(?:\.0+)?$/.test(option.valorDevido) && /[1-9]/.test(option.valorCalculado ?? option.valor);

function dinheiro(valor: Valor): string {
  const [inteiro, fracao = ''] = String(valor).split('.');
  const parteInteira = BigInt(inteiro === '-0' ? '0' : inteiro).toLocaleString('pt-BR');
  const decimais = fracao.replace(/0+$/, '').padEnd(2, '0');
  return (inteiro.startsWith('-') ? '−' : '') + 'R$ ' + parteInteira.replace(/^-/, '') + ',' + decimais;
}

function valorValido(texto: string) {
  return /^\d{1,12}(?:[.,]\d{1,6})?$/.test(texto) ? texto.replace(',', '.') : null;
}

function valoresCaixa(turno: Turno) {
  return [
    { nome: 'Total recebido', valor: dinheiro(turno.totalRecebido) },
    { nome: 'Dinheiro', valor: dinheiro(turno.dinheiro) },
    { nome: 'Pix', valor: dinheiro(turno.pix) },
    { nome: 'Cartão', valor: dinheiro(turno.cartao) },
    { nome: 'Saídas registradas', valor: turno.saidas },
  ];
}

function ValoresCaixa({ turno }: { turno: Turno }) {
  return (
    <Box component="dl" sx={{ m: 0, display: 'grid', gap: 1.5,
      gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' } }}>
      {valoresCaixa(turno).map(({ nome, valor }) => (
        <Box key={nome}>
          <Typography component="dt" variant="caption" color="text.secondary">{nome}</Typography>
          <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere', fontWeight: 750 }}>{valor}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export function PatioPage() {
  const { activeOrganization, permissions, user } = useAuth();
  const { detailId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const org = activeOrganization?.organizationId;
  const operador = user?.login ?? '';
  const podeConsultar = allowsAccess(permissions, { anyOf: PATIO_VEHICLE_ACCESS });
  const podeOperar = allowsAccess(permissions, { anyOf: PATIO_CASH_ACCESS });
  if (detailId !== undefined) {
    if (!org || !podeOperar) return <Alert severity="warning">Seu acesso não permite consultar comprovantes.</Alert>;
    const id = linkedDetailId(detailId);
    const listing = receiptListPath(searchParams.get('placa'));
    const onBack = () => {
      if (state?.receiptList === listing) navigate(-1);
      else navigate(listing, { replace: true });
    };
    return id === null
      ? <RecordDetailPage title="Comprovante do estacionamento" onBack={onBack}><Alert severity="warning">Comprovante inválido.</Alert></RecordDetailPage>
      : <ReceiptPage org={org} id={id} onBack={onBack} />;
  }
  return org && (podeConsultar || podeOperar)
    ? <PatioWorkspace key={`${org}:${operador}`} org={org} operador={operador} podeConsultar={podeConsultar} podeOperar={podeOperar}
      podeCadastrarPatio={permissions.includes('facilities:manage')} /> : null;
}

function PatioWorkspace({ org, operador, podeConsultar, podeOperar, podeCadastrarPatio }: {
  org: number; operador: string; podeConsultar: boolean; podeOperar: boolean; podeCadastrarPatio: boolean;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const online = useConnectivity();
  const requireOnline = () => { if (!online) throw new Error('Sem conexão. Nenhum envio foi realizado. Confira a conexão e tente novamente.'); };
  const { permissions } = useAuth();
  const podeCorrigir = permissions.includes('operations:manage');
  const tabs = [podeOperar && 'portaria', podeConsultar && 'veiculos', podeOperar && 'caixa',
    podeOperar && 'comprovantes', podeCorrigir && 'supervisao'];
  const requestedTab = searchParams.get('tab') ?? '';
  const aba = tabs.includes(requestedTab) ? requestedTab : (podeOperar ? 'portaria' : 'veiculos');
  const setAba = (tab: string) => setSearchParams({ tab }, { replace: true });
  const openReceipt = (id: number, plate: string | null) => {
    const listing = receiptListPath(plate);
    const search = new URLSearchParams();
    if (plate !== null) search.set('placa', plate);
    navigate({ pathname: `${PATIO_PATH}/comprovantes/${id}`, search: search.toString() }, {
      state: { receiptList: `${location.pathname}${location.search}` === listing ? listing : null },
    });
  };
  const [contexto, setContexto] = useState<OperationContext | null>(() => readContext(org, operador));
  const [trocandoContexto, setTrocandoContexto] = useState(false);
  const [confirmarTroca, setConfirmarTroca] = useState(false);
  const [correcao, setCorrecao] = useState<{ movimentacaoId: number; placa: string } | null>(null);
  const inputPlaca = useRef<HTMLInputElement>(null);
  const [placa, setPlaca] = useState('');
  const [cadastrandoPatio, setCadastrandoPatio] = useState(false);
  const [patioSelecionado, setPatioSelecionado] = useState<number | ''>(() => readContext(org, operador)?.patioId ?? '');
  const [eventoSelecionado, setEventoSelecionado] = useState(() => {
    const saved = readContext(org, operador);
    return saved?.eventoId ? `${saved.eventoId}:${saved.patioId}` : '';
  });
  const [conferirEntrada, setConferirEntrada] = useState<OpcaoEvento | null>(null);
  const [meioEntrada, setMeioEntrada] = useState<Meio | ''>('');
  const [recebidoEntrada, setRecebidoEntrada] = useState('');
  const [recebidoSaida, setRecebidoSaida] = useState('');
  const [tomadorEntrada, setTomadorEntrada] = useState<FiscalPayer | null>(null);
  const [tomadorSaida, setTomadorSaida] = useState<FiscalPayer | null>(null);
  const chaveEntrada = useRef<{ dados: string; chave: string } | null>(null);
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<Tipo | 'TODOS'>('TODOS');
  const [vehicleView, setVehicleView] = useState<VehicleView>(() => readVehicleView(org, operador));
  const [dialogo, setDialogo] = useState<'abrir' | 'fechar' | null>(null);
  const [valorDigitado, setValorDigitado] = useState('');
  const [selecaoSaida, setSelecaoSaida] = useState<{ id: number; placa: string } | null>(null);
  const [meio, setMeio] = useState<Meio | ''>('');
  const [expirada, setExpirada] = useState(false);
  const [ultimaSaida, setUltimaSaida] = useState<Saida | null>(null);
  const [ultimaEntrada, setUltimaEntrada] = useState<Entrada | null>(null);
  const [erroEntrada, setErroEntrada] = useState<string | null>(null);
  const patioKey = tenantQueryKey(org, 'rel', 'patio');
  const caixaKey = tenantQueryKey(org, 'patio-caixa', operador);
  const patioQ = useQuery({ queryKey: patioKey, enabled: podeConsultar,
    refetchInterval: (query) => getHttpStatus(query.state.error) === 403 ? false : 15_000,
    queryFn: () => api.get<PatioAtualResponse>('/api/relatorios/patio').then((r) => r.data) });
  const caixaQ = useQuery({ queryKey: caixaKey, enabled: podeOperar,
    refetchInterval: (query) => getHttpStatus(query.state.error) === 403 ? false : 15_000,
    queryFn: () => api.get<Caixa>(BASE + '/caixa').then((r) => r.data) });
  const turno = caixaQ.data?.aberto;
  const atualizar = () => {
    void queryClient.invalidateQueries({ queryKey: patioKey });
    void queryClient.invalidateQueries({ queryKey: caixaKey });
    void queryClient.invalidateQueries({ queryKey: tenantQueryKey(org, 'patio-receipts') });
    void queryClient.invalidateQueries({ queryKey: tenantQueryKey(org, 'quick-exit') });
  };

  const abrir = useMutation({
    networkMode: 'always',
    mutationFn: (fundoTroco: string) => { requireOnline(); return api.post<Turno>(BASE + '/turnos', { fundoTroco }); },
    onSuccess: ({ data }) => {
      queryClient.setQueryData<Caixa>(caixaKey, (anterior) => ({
        ...anterior,
        aberto: data, ultimoFechado: anterior?.ultimoFechado ?? null, patios: anterior?.patios ?? [],
      }));
      setDialogo(null); setUltimaSaida(null); atualizar();
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: caixaKey }),
  });

  const fechar = useMutation({
    networkMode: 'always',
    mutationFn: ({ id, dinheiroContado }: { id: number; dinheiroContado: string }) =>
      { requireOnline(); return api.post<Turno>(`${BASE}/turnos/${id}/fechamento`, { dinheiroContado }); },
    onSuccess: ({ data }) => {
      queryClient.setQueryData<Caixa>(caixaKey, (anterior) => ({
        ...anterior,
        aberto: null, ultimoFechado: data, patios: anterior?.patios ?? [],
      }));
      setDialogo(null); setPlaca(''); setErroEntrada(null); setUltimaEntrada(null); atualizar();
    },
  });

  const entrada = useMutation({
    networkMode: 'always',
    mutationFn: (dados: EntradaDados) => { requireOnline(); return api.post<Entrada>(BASE + '/entradas', dados); },
    onSuccess: ({ data }, { tomador }) => {
      setUltimaEntrada(data); setConferirEntrada(null); setMeioEntrada(''); chaveEntrada.current = null;
      setTomadorEntrada(null); setPlaca(''); setBusca(''); setErroEntrada(null); atualizar();
      if (org && tomador) void queryClient.invalidateQueries({ queryKey: customersListQueryKey(org) });
    },
    onError: (e) => { setErroEntrada(describeError(e)); atualizar(); },
  });

  function enviarEntradaEvento(opcao: OpcaoEvento, forma?: Meio) {
    if (!online || precoSemCentavo(opcao)) return;
    const recebido = forma === 'DINHEIRO' ? decimalInput(recebidoEntrada) : undefined;
    if (forma === 'DINHEIRO' && (!recebido || cashChange(recebidoEntrada, opcao.valorDevido ?? opcao.valor) === null)) return;
    const tomador = forma && tomadorEntrada ? fiscalPayerPayload(tomadorEntrada) : null;
    if (forma && tomadorEntrada && !tomador) return;
    const dados = JSON.stringify([opcao.eventoId, opcao.patioId, opcao.valor, placaNormalizada, forma, recebido]);
    if (chaveEntrada.current?.dados !== dados) chaveEntrada.current = { dados, chave: crypto.randomUUID() };
    entrada.mutate({ placa: placaNormalizada, eventoId: opcao.eventoId, patioId: opcao.patioId,
      chaveEntrada: chaveEntrada.current.chave, ...(forma ? { meio: forma, valorEsperado: opcao.valor } : {}),
      ...(recebido ? { recebido } : {}), ...(tomador ? { tomador } : {}) });
  }

  useEffect(() => {
    if (entrada.isSuccess || entrada.isError) inputPlaca.current?.focus();
  }, [entrada.isSuccess, entrada.isError]);

  const previa = useMutation({
    networkMode: 'always',
    mutationFn: (id: number) => { requireOnline(); return api.post<Previa>(`${BASE}/movimentacoes/${id}/previa-saida`).then((r) => r.data); },
    onSuccess: () => setExpirada(false),
  });

  const saida = useMutation({
    networkMode: 'always',
    mutationFn: ({ id, dados, forma, tomador }: { id: number; dados: Previa; forma: Meio; tomador?: FiscalPayer }) =>
      { requireOnline(); return api.post<Saida>(`${BASE}/movimentacoes/${id}/saida`, { turnoId: dados.turnoId, chave: dados.chave, meio: forma,
        ...(forma === 'DINHEIRO' ? { recebido: decimalInput(recebidoSaida) } : {}), ...(tomador ? { tomador } : {}) }); },
    onSuccess: ({ data }, { tomador }) => {
      setUltimaSaida(data); setSelecaoSaida(null); setTomadorSaida(null); atualizar();
      if (data.evento) {
        void queryClient.invalidateQueries({ queryKey: tenantQueryKey(org, 'parking-nfse-drafts') });
        if (org) void queryClient.invalidateQueries({ queryKey: serviceNotesListQueryKey(org) });
      }
      if (org && tomador) void queryClient.invalidateQueries({ queryKey: customersListQueryKey(org) });
    },
  });

  useEffect(() => {
    if (!selecaoSaida || !previa.data) return;
    const timer = window.setTimeout(() => setExpirada(true), Math.max(0, Date.parse(previa.data.expiraEm) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [previa.data, selecaoSaida]);

  function mostrarDialogo(tipo: 'abrir' | 'fechar') {
    abrir.reset(); fechar.reset(); setValorDigitado(tipo === 'abrir' ? '0' : ''); setDialogo(tipo);
  }

  function conferirSaida(item: { movimentacaoId: number; placa: string }) {
    if (!online) return;
    previa.reset(); saida.reset(); setExpirada(false); setMeio(''); setRecebidoSaida(''); setTomadorSaida(null);
    setSelecaoSaida({ id: item.movimentacaoId, placa: item.placa });
    previa.mutate(item.movimentacaoId);
  }

  const placaNormalizada = normalizePatioPlate(placa);
  const patios = useMemo(() => caixaQ.data?.patios ?? [], [caixaQ.data?.patios]);
  const eventos = useMemo(() => caixaQ.data?.eventos ?? [], [caixaQ.data?.eventos]);
  const opcaoEvento = eventos.find((item) => chaveOpcao(item) === eventoSelecionado);
  const precoInvalido = precoSemCentavo(opcaoEvento);
  const estadias = new Map(caixaQ.data?.estadiasEvento?.map((item) => [item.movimentacaoId, item]));
  const patioId = eventoSelecionado ? opcaoEvento?.patioId
    : contexto && !trocandoContexto ? patios.find((p) => p.id === contexto.patioId)?.id
      : patios.length === 1 ? patios[0].id : patios.find((p) => p.id === patioSelecionado)?.id;
  const contextoInvalido = caixaQ.isSuccess && !!contexto && !trocandoContexto
    && (contexto.eventoId ? !eventos.some((item) => item.eventoId === contexto.eventoId && item.patioId === contexto.patioId)
      : !patios.some((item) => item.id === contexto.patioId));
  const contextoFixo = !!contexto && !trocandoContexto;
  // O catálogo limita novas entradas, não o direito de sair de uma estadia aberta.
  const patioDaSaida = contextoFixo ? contexto.patioId : patioId;
  const eventoDaSaida = contextoFixo ? contexto.eventoId : opcaoEvento?.eventoId;
  const fixarContexto = (opcao?: OpcaoEvento, patio?: { id: number; nome: string }) => {
    const selected = opcao ? { patioId: opcao.patioId, patioNome: opcao.patioNome, eventoId: opcao.eventoId, eventoNome: opcao.nome }
      : patio ? { patioId: patio.id, patioNome: patio.nome } : null;
    if (!selected) return;
    setContexto(selected); writeContext(org, operador, selected); setTrocandoContexto(false);
  };
  useEffect(() => {
    if (caixaQ.isSuccess && !contexto && !trocandoContexto && patios.length === 1 && eventos.length === 0) {
      const automatic = { patioId: patios[0].id, patioNome: patios[0].nome };
      setContexto(automatic); writeContext(org, operador, automatic);
    }
  }, [caixaQ.isSuccess, contexto, trocandoContexto, patios, eventos, org, operador]);
  const placaValida = isValidPatioPlate(placa);
  const ocupacao = patioQ.data?.resumo;
  const itens = patioQ.data?.itens ?? [];
  const filtro = normalizePatioPlate(busca);
  const filtrados = itens.filter((it) => (tipoFiltro === 'TODOS' || it.tipo === tipoFiltro)
    && normalizePatioPlate(it.placa).includes(filtro));
  const filtrosAtivos = tipoFiltro !== 'TODOS' || busca.length > 0;
  const valorDoCaixa = valorValido(valorDigitado);
  const ocupando = abrir.isPending || fechar.isPending;
  const erroDoCaixa = dialogo === 'abrir' ? abrir.error : fechar.error;
  const previaAtual = previa.data;
  const semCobranca = previaAtual != null && /^0(?:\.0+)?$/.test(String(previaAtual.valor));
  const tomadorNaSaida = !semCobranca && previaAtual?.evento?.modo === 'SAIDA' && tomadorSaida
    ? fiscalPayerPayload(tomadorSaida) : null;
  const faltaTomadorNaSaida = !semCobranca && previaAtual?.evento?.modo === 'SAIDA' && tomadorSaida && !tomadorNaSaida;
  const ultimoFechado = caixaQ.data?.ultimoFechado;
  const semPatioAtivo = caixaQ.isSuccess && patios.length === 0;
  const operacoes = [{ id: 1, label: 'Pátio comum · sem evento' },
    ...eventos.map((item, index) => ({ id: index + 2, label: `${item.nome} · ${item.patioNome}` }))];
  const indexEvento = eventos.findIndex((item) => chaveOpcao(item) === eventoSelecionado);
  const cadastroPatio = podeCadastrarPatio ? { label: 'Cadastrar pátio', run: () => setCadastrandoPatio(true) } : undefined;

  if (cadastrandoPatio && podeOperar && podeCadastrarPatio) return <FacilityForm
    onClose={() => setCadastrandoPatio(false)} navigationAllowed={() => false}
    onSaved={(record) => {
      setPatioSelecionado(record.id);
      void queryClient.invalidateQueries({ queryKey: caixaKey });
    }} />;

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Operação do pátio" subtitle="Registre entradas, receba pagamentos e confira o caixa do turno."
        action={podeConsultar && ocupacao && <Stack direction="row" flexWrap="wrap" gap={1}
          role="group" aria-label="Filtrar veículos no pátio">
          <Chip color={tipoFiltro === 'TODOS' ? 'primary' : 'default'}
            variant={tipoFiltro === 'TODOS' ? 'filled' : 'outlined'} label={`${ocupacao.totalVeiculos} no pátio`}
            aria-label={`Mostrar todos os veículos: ${ocupacao.totalVeiculos}`} aria-pressed={tipoFiltro === 'TODOS'}
            onClick={() => { setTipoFiltro('TODOS'); setAba('veiculos'); }} sx={{ minHeight: 44 }} />
          <Chip color={tipoFiltro === 'AVULSO' ? 'primary' : 'default'}
            variant={tipoFiltro === 'AVULSO' ? 'filled' : 'outlined'}
            label={`${ocupacao.avulsos} ${ocupacao.avulsos === 1 ? 'avulso' : 'avulsos'}`}
            aria-label={`Mostrar avulsos: ${ocupacao.avulsos}`} aria-pressed={tipoFiltro === 'AVULSO'}
            onClick={() => { setTipoFiltro('AVULSO'); setAba('veiculos'); }} sx={{ minHeight: 44 }} />
          <Chip color={tipoFiltro === 'MENSALISTA' ? 'primary' : 'default'}
            variant={tipoFiltro === 'MENSALISTA' ? 'filled' : 'outlined'}
            label={`${ocupacao.mensalistas} ${ocupacao.mensalistas === 1 ? 'mensalista' : 'mensalistas'}`}
            aria-label={`Mostrar mensalistas: ${ocupacao.mensalistas}`} aria-pressed={tipoFiltro === 'MENSALISTA'}
            onClick={() => { setTipoFiltro('MENSALISTA'); setAba('veiculos'); }} sx={{ minHeight: 44 }} />
        </Stack>} />
      {!online && <Alert severity="warning" role="status">Sem conexão. Entradas, saídas e alterações de caixa estão bloqueadas. Nenhum envio será enfileirado. Restabeleça a conexão e confira os registros antes de tentar novamente; sua sessão foi mantida.</Alert>}
      <Tabs value={aba} onChange={(_, value: string) => setAba(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Áreas da operação">
        {podeOperar && <Tab value="portaria" label="Portaria" />}
        {podeConsultar && <Tab value="veiculos" label="Veículos" />}
        {podeOperar && <Tab value="caixa" label="Caixa" />}
        {podeOperar && <Tab value="comprovantes" label="Comprovantes" />}
        {podeCorrigir && <Tab value="supervisao" label="Supervisão" />}
      </Tabs>
      {podeOperar && aba === 'portaria' && <Alert severity={turno ? 'success' : 'info'}
        action={caixaQ.isSuccess && <Button disabled={!online} onClick={() => turno ? setAba('caixa') : mostrarDialogo('abrir')}>{turno ? 'Gerenciar caixa' : 'Abrir turno'}</Button>}>
        {turno ? 'Turno aberto · Pronto para operar.' : 'Abra o turno para registrar entradas e pagamentos.'}
      </Alert>}
      {podeOperar && aba === 'portaria' && caixaQ.isLoading && <LinearProgress aria-label="Carregando caixa" />}
      {podeOperar && aba === 'portaria' && caixaQ.isError && <ErrorState message={describeError(caixaQ.error)}
        onRetry={getHttpStatus(caixaQ.error) === 403 ? undefined : () => void caixaQ.refetch()} />}
      {podeOperar && contextoFixo && <Card><CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
          <Box>
            <Typography component="h2" variant="subtitle1" fontWeight={700}>{contexto.eventoNome ?? 'Estacionamento comum'} · {contexto.patioNome}</Typography>
            {opcaoEvento && <><Typography>{dinheiro(opcaoEvento.valorDevido ?? opcaoEvento.valor)} · Pagamento {opcaoEvento.modo === 'ENTRADA' ? 'na entrada' : 'na saída'}</Typography><ChargeBreakdown snapshot={opcaoEvento} /></>}
            <Typography variant="caption" color="text.secondary">Operação fixada para este usuário e organização.</Typography>
          </Box>
          <Button variant="outlined" disabled={entrada.isPending || saida.isPending} onClick={() => setConfirmarTroca(true)}>Trocar operação</Button>
        </Stack>
        {contextoInvalido && <Alert severity="warning" sx={{ mt: 1.5 }}>O evento ou pátio fixado não aceita mais novas entradas. As saídas das estadias abertas continuam disponíveis abaixo. Troque a operação explicitamente para novas entradas; nenhuma entrada será desviada para outro estacionamento.</Alert>}
      </CardContent></Card>}

      {podeOperar && aba === 'caixa' && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1.5}>
                <Box>
                  <Typography component="h2" variant="h6">{turno ? 'Turno aberto' : 'Caixa do pátio'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {turno ? `Aberto em ${formatDateTime(turno.abertoEm)} · Fundo: ${dinheiro(turno.fundoTroco)}`
                      : 'Abra um turno para registrar entradas e pagamentos.'}
                  </Typography>
                </Box>
                {caixaQ.isSuccess && (turno
                  ? <Button variant="outlined" disabled={!online} onClick={() => mostrarDialogo('fechar')}>Fechar caixa</Button>
                  : <PrimaryButton disabled={!online} onClick={() => mostrarDialogo('abrir')}>Abrir turno</PrimaryButton>)}
              </Stack>
              {caixaQ.isLoading && <LinearProgress aria-label="Carregando caixa" />}
              {caixaQ.isError && <ErrorState message={describeError(caixaQ.error)}
                onRetry={getHttpStatus(caixaQ.error) === 403 ? undefined : () => void caixaQ.refetch()} />}
              {turno && <><ValoresCaixa turno={turno} /><CashManagement key={`${org}:${operador}:${turno.id}`} org={org} operador={operador} turnoId={turno.id} online={online} onSaved={atualizar}
                suprimentos={turno.suprimentos ?? '0'} sangrias={turno.sangrias ?? '0'} dinheiroEsperado={turno.dinheiroEsperado} /></>}
              {!turno && ultimoFechado && <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
                <Typography component="h3" variant="subtitle2" sx={{ mb: 1 }}>Último fechamento</Typography>
                <ValoresCaixa turno={ultimoFechado} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Dinheiro contado: {dinheiro(ultimoFechado.dinheiroContado ?? 0)} ·
                  Diferença: {dinheiro(ultimoFechado.diferencaDinheiro ?? 0)}
                </Typography>
              </Box>}
            </Stack>
          </CardContent>
        </Card>
      )}

      {ultimaSaida && (
        <Alert severity="success" onClose={() => setUltimaSaida(null)}>
          <strong>Saída registrada: {ultimaSaida.placa}</strong>
          {ultimaSaida.evento && ultimaSaida.meio === 'SEM_COBRANCA'
            ? ` · Pago na entrada: ${dinheiro(ultimaSaida.evento.valorPago)}`
            : ` · ${dinheiro(ultimaSaida.valor)} · ${meios[ultimaSaida.meio]}`}
          {ultimaSaida.evento?.fiscalStatus === 'PENDENTE_EMISSAO' &&
            <Typography variant="body2">NFS-e pendente de emissão · {ultimaSaida.evento.nome} · {
              ultimaSaida.evento.ordemServicoNumero
                ? `OS ${ultimaSaida.evento.ordemServicoNumero} concluída`
                : `Estadia ${ultimaSaida.evento.movimentacaoId}`}
            </Typography>}
          {ultimaSaida.movimentacaoId && <Button onClick={() => openReceipt(ultimaSaida.movimentacaoId!, ultimaSaida.placa)}>Ver comprovante</Button>}
        </Alert>
      )}

      <Box sx={{ display: aba === 'portaria' ? 'grid' : 'none', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
      {podeOperar && <Card><CardContent>
        <Typography component="h2" variant="h6" sx={{ mb: 1.5 }}>Entrada pela placa</Typography>
        {semPatioAtivo && <Alert severity="info" sx={{ mb: 1.5 }}>
          {podeCadastrarPatio ? 'Nenhum pátio ativo. Abra a lista de pátios para cadastrar.'
            : 'Nenhum pátio ativo. Peça a um responsável por Instalações para cadastrá-lo.'}
        </Alert>}
        {!eventoSelecionado && patios.length === 1 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Pátio da entrada: {patios[0].nome}
        </Typography>}
        {!contextoFixo && (eventos.length > 0 || eventoSelecionado) && <Box sx={{ mb: 1.5, width: { xs: '100%', sm: 380 } }}>
          <NamedResourceSelect label="Evento e pátio" options={operacoes}
          value={String(indexEvento < 0 ? 1 : indexEvento + 2)} disabled={!turno || entrada.isPending}
          onChange={(id) => {
            const selected = eventos[Number(id) - 2];
            setEventoSelecionado(selected ? chaveOpcao(selected) : ''); setErroEntrada(null);
            if (selected) fixarContexto(selected);
          }} />
        </Box>}
        {!!eventoSelecionado && !opcaoEvento && <Alert severity="warning" sx={{ mb: 1.5 }}
          action={<Button onClick={() => { setEventoSelecionado(''); setErroEntrada(null); }}>Voltar ao pátio comum</Button>}>
          Este evento não está mais disponível para novas entradas.
        </Alert>}
        {opcaoEvento && <Typography variant="body2" sx={{ mb: 1.5 }}>
          {dinheiro(opcaoEvento.valorDevido ?? opcaoEvento.valor)} · Cobrança {opcaoEvento.modo === 'ENTRADA' ? 'na entrada' : 'na saída'} · Sem reserva
        </Typography>}
        {precoInvalido && <Alert severity="warning" sx={{ mb: 1.5 }}>Peça ao gestor para revisar o preço: uma cobrança positiva precisa resultar em pelo menos R$ 0,01. Nenhuma entrada gratuita será criada por arredondamento.</Alert>}
        <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!online || precoInvalido || !turno || !patioId || !placaValida || entrada.isPending || contextoInvalido || trocandoContexto) return;
            if (!contexto) fixarContexto(opcaoEvento, patios.find((p) => p.id === patioId));
            setErroEntrada(null);
            if (opcaoEvento?.modo === 'ENTRADA') {
              setMeioEntrada(''); setRecebidoEntrada(''); setTomadorEntrada(null); setConferirEntrada(opcaoEvento);
            }
            else if (opcaoEvento) enviarEntradaEvento(opcaoEvento);
            else entrada.mutate({ placa: placaNormalizada, ...(patios.length > 1 ? { patioId } : {}) });
          }}>
          {!contextoFixo && !eventoSelecionado && (patios.length > 1 || (semPatioAtivo && cadastroPatio)) &&
            <Box sx={{ width: { xs: '100%', sm: 260 } }}>
            <NamedResourceSelect label="Pátio da entrada" value={patioId ? String(patioId) : ''}
            options={patios.map((patio) => ({ id: patio.id, label: patio.nome }))}
            onCreate={cadastroPatio} emptyText="Nenhum pátio ativo cadastrado."
            disabled={entrada.isPending || (patios.length > 0 && !turno)} onChange={(value) => {
              const id = Number(value); if (!id) return;
              setPatioSelecionado(id);
              fixarContexto(undefined, patios.find((p) => p.id === id));
            }} />
          </Box>}
          <TextField label="Placa" size="small" inputRef={inputPlaca}
            value={placa} disabled={!online || !turno || !patioId || entrada.isPending || contextoInvalido || trocandoContexto}
            inputProps={{ maxLength: PATIO_PLATE_MAX_LENGTH, autoCapitalize: 'characters', spellCheck: false }}
            autoComplete="off" sx={{ width: { xs: '100%', sm: 280 } }}
            onChange={(event) => {
              setPlaca(event.target.value.toUpperCase()); setErroEntrada(null); setUltimaEntrada(null);
            }}
            error={!!erroEntrada || (!!placa && !placaValida)}
            helperText={(conferirEntrada ? null : erroEntrada) ?? (!turno ? 'Abra o turno para registrar.'
              : semPatioAtivo ? undefined
                : 'Informe a placa ou um identificador de até 10 caracteres.')} />
          <PrimaryButton type="submit" startIcon={<LoginIcon />} disabled={!online || precoInvalido || !turno || !patioId || !placaValida || entrada.isPending || contextoInvalido || trocandoContexto}>
            {entrada.isPending ? 'Registrando…' : opcaoEvento?.modo === 'ENTRADA'
              ? 'Conferir pagamento da entrada' : 'Registrar entrada'}
          </PrimaryButton>
        </Stack>
        {ultimaEntrada && <Alert severity="success" role="status" sx={{ mt: 1.25 }}>
          Entrada registrada: {ultimaEntrada.placa}.
          {ultimaEntrada.evento && <Typography variant="body2">{ultimaEntrada.evento.nome} · {
            ultimaEntrada.evento.modo === 'ENTRADA' ? 'Pagamento registrado na entrada.' : 'Receber na saída.'}</Typography>}
          {ultimaEntrada.evento?.ordemServicoNumero && <Typography variant="body2">
            OS {ultimaEntrada.evento.ordemServicoNumero} {ultimaEntrada.evento.ordemServicoStatus === 'CONCLUIDA'
              ? 'concluída' : 'aberta automaticamente'}
          </Typography>}
          {ultimaEntrada.id && ultimaEntrada.evento?.modo === 'ENTRADA' && <Button onClick={() => openReceipt(ultimaEntrada.id!, ultimaEntrada.placa)}>Ver comprovante da entrada</Button>}
        </Alert>}
      </CardContent></Card>}
      {podeOperar && <Card><CardContent><QuickExit org={org} patioId={patioDaSaida} eventoId={eventoDaSaida}
        enabled={online && !!turno && !!patioDaSaida && !trocandoContexto} onSelect={conferirSaida} /></CardContent></Card>}
      </Box>

      {podeConsultar && aba === 'veiculos' && <>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} justifyContent="space-between" alignItems={{ md: 'center' }}>
        <Typography component="h2" variant="h6">Veículos no pátio</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
          <ToggleButtonGroup exclusive value={vehicleView} aria-label="Visualização dos veículos"
            onChange={(_, value: VehicleView | null) => {
              if (value !== 'cards' && value !== 'list') return;
              setVehicleView(value); writeVehicleView(org, operador, value);
            }} sx={{ '& .MuiToggleButton-root': { flex: 1, gap: 0.75, minHeight: 44, px: 1.5 } }}>
            <ToggleButton value="cards" aria-label="Cartões"><ViewModuleOutlinedIcon fontSize="small" />Cartões</ToggleButton>
            <ToggleButton value="list" aria-label="Listagem"><ViewListOutlinedIcon fontSize="small" />Listagem</ToggleButton>
          </ToggleButtonGroup>
          {!!itens.length && <TextField label="Buscar placa no pátio" size="small" value={busca}
            onChange={(e) => setBusca(e.target.value)} sx={{ width: { xs: '100%', sm: 240 } }} />}
        </Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary">Consulta geral dos veículos da organização. Para liberar um veículo da operação fixada, use a saída rápida pela placa.</Typography>
      {patioQ.isSuccess && <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
        <Typography variant="caption" color="text.secondary" role="status">
          Exibindo {filtrados.length} de {itens.length} {itens.length === 1 ? 'veículo' : 'veículos'}
        </Typography>
        {filtrosAtivos && <Button size="small" onClick={() => { setTipoFiltro('TODOS'); setBusca(''); }}>Limpar filtros</Button>}
      </Stack>}

      {patioQ.isError ? <ErrorState message={describeError(patioQ.error)}
        onRetry={getHttpStatus(patioQ.error) === 403 ? undefined : () => void patioQ.refetch()} />
        : patioQ.isLoading ? <ListingSkeleton rows={4} />
          : filtrados.length === 0 ? <EmptyState title={tipoFiltro !== 'TODOS' ? 'Nenhum veículo neste filtro'
            : filtro ? 'Nenhuma placa encontrada' : 'Nenhum veículo no pátio'}
            description={filtrosAtivos ? 'Troque o tipo, confira a placa ou limpe os filtros.' : 'As entradas registradas aparecem aqui.'} />
            : <PatioVehicles items={filtrados} stays={estadias} view={vehicleView}
              canExit={podeOperar} exitDisabled={!online || !turno || previa.isPending || saida.isPending}
              canCorrect={podeCorrigir} onExit={conferirSaida} onCorrect={setCorrecao} />}
      </>}
      {podeOperar && <Card sx={{ display: aba === 'comprovantes' ? 'block' : 'none' }}><CardContent><ReceiptHistory org={org} canManage={podeCorrigir}
        search={aba === 'comprovantes' ? searchParams.get('placa') : null}
        onSearch={(plate) => setSearchParams({ tab: 'comprovantes', placa: plate }, { replace: true })}
        onReceipt={openReceipt} onCorrect={setCorrecao} /></CardContent></Card>}
      {podeCorrigir && aba === 'supervisao' && <TurnSupervision org={org} />}
      {correcao && podeCorrigir && <CorrectionDialog org={org} target={correcao} onClose={() => setCorrecao(null)} onSaved={atualizar} />}
      <AppDialog open={confirmarTroca} title="Trocar operação?" onClose={() => setConfirmarTroca(false)}
        actions={<><Button onClick={() => setConfirmarTroca(false)}>Continuar nesta operação</Button>
          <Button variant="contained" onClick={() => {
            setConfirmarTroca(false); setTrocandoContexto(true); setEventoSelecionado(''); setPatioSelecionado('');
            setPlaca(''); setErroEntrada(null); setUltimaEntrada(null); setConferirEntrada(null);
          }}>Escolher outra operação</Button></>}>
        <Typography>As estadias e os pagamentos já registrados continuam vinculados à operação de origem. A troca vale somente para as próximas entradas.</Typography>
      </AppDialog>
      {trocandoContexto && <Button variant="outlined" onClick={() => {
        setTrocandoContexto(false); setPatioSelecionado(contexto?.patioId ?? '');
        setEventoSelecionado(contexto?.eventoId ? `${contexto.eventoId}:${contexto.patioId}` : '');
      }}>Manter operação anterior</Button>}
      {trocandoContexto && patios.length === 1 && <Button variant="outlined" onClick={() => {
        setEventoSelecionado(''); setPatioSelecionado(patios[0].id); fixarContexto(undefined, patios[0]);
      }}>Usar {patios[0].nome} sem evento</Button>}

      <AppDialog open={dialogo !== null} title={dialogo === 'abrir' ? 'Abrir turno' : 'Fechar caixa'}
        maxWidth="sm" busy={ocupando} closeLabel="Fechar diálogo do caixa" onClose={() => setDialogo(null)}
        actions={<><Button onClick={() => setDialogo(null)} disabled={ocupando}>Cancelar</Button>
          <PrimaryButton type="submit" form="patio-caixa-form" disabled={!online || ocupando || valorDoCaixa === null}>
            {dialogo === 'abrir' ? 'Confirmar abertura' : 'Confirmar fechamento'}
          </PrimaryButton></>}>
        <Stack spacing={2} component="form" id="patio-caixa-form" onSubmit={(event) => {
          event.preventDefault();
          if (!online || valorDoCaixa === null || ocupando) return;
          if (dialogo === 'abrir') abrir.mutate(valorDoCaixa);
          else if (turno) fechar.mutate({ id: turno.id, dinheiroContado: valorDoCaixa });
        }}>
          {dialogo === 'abrir' ? <Typography variant="body2">Informe o dinheiro disponível para troco. Use zero se não houver fundo.</Typography>
            : turno && <>
              <ValoresCaixa turno={turno} />
              <Typography variant="body2">Dinheiro esperado: <strong>{dinheiro(turno.dinheiroEsperado)}</strong> (fundo + recebimentos + suprimentos − sangrias).</Typography>
              <Typography variant="body2" color="text.secondary">Os veículos ainda estacionados permanecem no pátio para o próximo turno.</Typography>
            </>}
          <TextField autoFocus fullWidth label={dialogo === 'abrir' ? 'Fundo de troco' : 'Dinheiro contado'}
            value={valorDigitado} onChange={(event) => setValorDigitado(event.target.value)}
            disabled={ocupando} inputProps={{ inputMode: 'decimal', maxLength: 19 }}
            error={valorDigitado !== '' && valorDoCaixa === null}
            helperText="Use até 6 casas decimais." />
          {erroDoCaixa && <Alert severity="error">{describeError(erroDoCaixa)}</Alert>}
        </Stack>
      </AppDialog>

      <AppDialog open={conferirEntrada !== null} title="Pagamento na entrada" maxWidth="xs"
        busy={entrada.isPending} onClose={() => { setConferirEntrada(null); setErroEntrada(null); setTomadorEntrada(null); }}
        actions={<><Button onClick={() => { setConferirEntrada(null); setErroEntrada(null); setTomadorEntrada(null); }} disabled={entrada.isPending}>
          Cancelar
        </Button><PrimaryButton disabled={!online || !meioEntrada || entrada.isPending || !turno
          || (!!tomadorEntrada && !fiscalPayerPayload(tomadorEntrada))
          || (meioEntrada === 'DINHEIRO' && (!conferirEntrada || cashChange(recebidoEntrada, conferirEntrada.valorDevido ?? conferirEntrada.valor) === null))}
          onClick={() => { if (conferirEntrada && meioEntrada) enviarEntradaEvento(conferirEntrada, meioEntrada); }}>
          Registrar pagamento e entrada
        </PrimaryButton></>}>
        {conferirEntrada && <Stack spacing={1.5}>
          <Typography variant="subtitle1">{placaNormalizada} · {conferirEntrada.nome}</Typography>
          <Typography variant="h5">{dinheiro(conferirEntrada.valorDevido ?? conferirEntrada.valor)}</Typography>
          <ChargeBreakdown snapshot={conferirEntrada} />
          <Typography variant="body2">Confirme somente depois de receber. O sistema registra o pagamento; não realiza a transação.</Typography>
          <RadioGroup aria-label="Meio de pagamento" value={meioEntrada} onChange={(_, valor) => setMeioEntrada(valor as Meio)}>
            {meiosCobranca.map((opcao) => <FormControlLabel key={opcao} value={opcao}
              control={<Radio />} label={meios[opcao]} disabled={entrada.isPending} />)}
          </RadioGroup>
          {meioEntrada === 'DINHEIRO' && <CashReceived value={recebidoEntrada} due={conferirEntrada.valorDevido ?? conferirEntrada.valor}
            onChange={setRecebidoEntrada} disabled={entrada.isPending} />}
          <OptionalFiscalPayer value={tomadorEntrada} onChange={setTomadorEntrada} disabled={entrada.isPending} />
          {erroEntrada && <Alert severity="error">{erroEntrada}</Alert>}
        </Stack>}
      </AppDialog>

      <AppDialog open={selecaoSaida !== null} title="Conferir saída" maxWidth="xs"
        busy={saida.isPending} onClose={() => { setSelecaoSaida(null); setTomadorSaida(null); }}
        actions={<><Button onClick={() => { setSelecaoSaida(null); setTomadorSaida(null); }} disabled={saida.isPending}>Cancelar</Button>
          {(expirada || previa.isError) ? <PrimaryButton onClick={() => {
            if (selecaoSaida) { saida.reset(); setMeio(''); previa.mutate(selecaoSaida.id); }
          }} disabled={!online || previa.isPending}>Atualizar valor</PrimaryButton>
            : <PrimaryButton disabled={!online || !previaAtual || (!semCobranca && !meio) || previa.isPending || saida.isPending || !!faltaTomadorNaSaida
              || (!semCobranca && meio === 'DINHEIRO' && cashChange(recebidoSaida, previaAtual.valor) === null)}
              onClick={() => {
                if (online && selecaoSaida && previaAtual && (semCobranca || meio) && !faltaTomadorNaSaida)
                  saida.mutate({ id: selecaoSaida.id, dados: previaAtual, forma: semCobranca ? 'SEM_COBRANCA' : meio as Meio,
                    ...(tomadorNaSaida ? { tomador: tomadorNaSaida } : {}) });
              }}>{semCobranca ? 'Confirmar saída' : 'Registrar pagamento e saída'}</PrimaryButton>}</>}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">{selecaoSaida?.placa}</Typography>
          {previa.isPending && <LinearProgress aria-label="Calculando valor" />}
          {previa.isError && <Alert severity="error">{describeError(previa.error)}</Alert>}
          {previaAtual && <>
            <Typography variant="body2" color="text.secondary">Permanência: {minutesToHuman(previaAtual.minutos)}</Typography>
            {previaAtual.evento && <Typography variant="body2">{previaAtual.evento.nome}</Typography>}
            <Typography variant="h5">{dinheiro(previaAtual.valor)}</Typography>
            <ChargeBreakdown snapshot={previaAtual} />
            {expirada ? <Alert severity="warning">O valor expirou. Atualize a prévia antes de cobrar.</Alert>
              : semCobranca ? <Typography variant="body2">{previaAtual.evento?.modo === 'ENTRADA'
                ? `Pago na entrada: ${dinheiro(previaAtual.evento.valorPago)}. Não cobre novamente.`
                : previaAtual.tipo === 'MENSALISTA' ? 'Mensalista ativo · sem cobrança na saída.' : 'Sem cobrança nesta saída.'}</Typography>
                : <>
                  <Typography variant="body2">Confirme somente depois de receber. O sistema registra o pagamento; não realiza a transação.</Typography>
                  <RadioGroup aria-label="Meio de pagamento" value={meio} onChange={(_, valor) => setMeio(valor as Meio)}>
                    {meiosCobranca.map((opcao) => (
                      <FormControlLabel key={opcao} value={opcao} control={<Radio />} label={meios[opcao]} disabled={saida.isPending} />
                    ))}
                  </RadioGroup>
                  {meio === 'DINHEIRO' && <CashReceived value={recebidoSaida} due={previaAtual.valor}
                    onChange={setRecebidoSaida} disabled={saida.isPending} />}
                  {previaAtual.evento?.modo === 'SAIDA' &&
                    <OptionalFiscalPayer value={tomadorSaida} onChange={setTomadorSaida} disabled={saida.isPending} />}
                </>}
          </>}
          {saida.isError && <Alert severity="error">{describeError(saida.error)}</Alert>}
        </Stack>
      </AppDialog>
    </Stack>
  );
}
