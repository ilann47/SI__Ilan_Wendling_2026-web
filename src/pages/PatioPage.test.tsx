import { chooseReference, openReference } from '../test/referencePicker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render as renderComponent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PatioPage } from './PatioPage';
import userEvent from '@testing-library/user-event';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { readContext, writeContext } from '../features/patio/operation';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../workspace/OperationalWorkspaceContext', () => ({ useOperationalWorkspace: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({ useSnackbar: () => ({ notify: vi.fn() }) }));

function CurrentPath() {
  const { pathname, search } = useLocation();
  return <output aria-label="Endereço atual">{pathname}{search}</output>;
}

const render = (children: ReactNode, path = '/app/patio') => renderComponent(<MemoryRouter initialEntries={[path]}>
  <CurrentPath />
  <Routes>
    <Route path="/app/patio" element={children} />
    <Route path="/app/patio/comprovantes/:detailId" element={children} />
  </Routes>
</MemoryRouter>);

describe('Operação do pátio', () => {
  const turno = { id: 4, abertoEm: '2026-11-09T10:00:00Z', fundoTroco: 10, saidas: 0,
    dinheiro: 0, pix: 0, cartao: 0, totalRecebido: 0, dinheiroEsperado: 10 };
  const item = { movimentacaoId: 7, placa: 'ABC1D23', tipo: 'AVULSO',
    dataEntrada: '2026-11-09T10:01:00Z', minutosPermanencia: 30 };

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 2 }, permissions: ['operations:checkout'],
    } as ReturnType<typeof useAuth>);
  });
  afterEach(() => vi.restoreAllMocks());

  it('abre o comprovante em página própria e volta à busca pela placa', async () => {
    const receipt = { ...item, turnoId: 4, valor: '25', meio: 'PIX', registradoEm: '2026-11-09T10:15:00Z' };
    const get = vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data:
      url.endsWith('/movimentacoes/7/comprovante') ? receipt : url.endsWith('/comprovantes') ? [receipt]
        : url.endsWith('/caixa') ? { aberto: turno } : { itens: [] },
    }));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>, '/app/patio?tab=comprovantes');
    fireEvent.change(screen.getByLabelText('Placa do comprovante'), { target: { value: item.placa } });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar comprovantes' }));
    fireEvent.click(await screen.findByRole('button', { name: `Comprovante de ${item.placa}` }));

    expect(await screen.findByRole('heading', { name: 'Comprovante do estacionamento' })).toBeVisible();
    expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/app/patio/comprovantes/7');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Comprovantes' })).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/api/v1/patio/movimentacoes/7/comprovante');

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('tab', { name: 'Comprovantes' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('button', { name: `Comprovante de ${item.placa}` })).toBeVisible();
    expect(screen.getByLabelText('Placa do comprovante')).toHaveValue(item.placa);
  });

  it('não consulta comprovante direto com acesso apenas de leitura do pátio', () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 2 }, permissions: ['operations:read'],
    } as ReturnType<typeof useAuth>);
    const get = vi.spyOn(api, 'get');
    render(<QueryClientProvider client={new QueryClient()}><PatioPage /></QueryClientProvider>, '/app/patio/comprovantes/7');
    expect(screen.queryByRole('heading', { name: 'Comprovante do estacionamento' })).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it('abre Portaria com entrada e saída, bloqueia offline e não reenvia ao reconectar', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }] } : { itens: [item] } }));
    const post = vi.spyOn(api, 'post');
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
    const plate = await screen.findByLabelText('Placa');
    await waitFor(() => expect(plate).toBeEnabled());
    expect(screen.getByRole('tab', { name: 'Portaria' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Placa para saída')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Fechar caixa' })).not.toBeInTheDocument();
    fireEvent.change(plate, { target: { value: item.placa } });
    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByText(/Nenhum envio será enfileirado/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Registrar entrada' })).toBeDisabled();
    fireEvent.submit(plate.closest('form')!);
    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.getByRole('button', { name: 'Registrar entrada' })).toBeEnabled();
    expect(post).not.toHaveBeenCalled();
  });

  it('cobra devido em centavos e preserva a base informativa de seis casas', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }], eventos: [{ eventoId: 12, nome: 'Festival',
        patioId: 1, patioNome: 'Pátio central', modo: 'ENTRADA', valor: '25.12', valorCalculado: '25.123456',
        valorDevido: '25.120000', diferencaArredondamento: '-0.003456' }] } : { itens: [] } }));
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 8, placa: item.placa } });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
    await chooseReference('Evento e pátio', /Festival/);
    const plate = screen.getByLabelText('Placa');
    const confirm = screen.getByRole('button', { name: 'Conferir pagamento da entrada' });
    expect(confirm).toBeDisabled();
    fireEvent.change(plate, { target: { value: 'hbf593' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    const dialog = within(await screen.findByRole('dialog', { name: 'Pagamento na entrada' }));
    expect(dialog.getByText(/Base de cálculo/)).toHaveTextContent('Base de cálculo: R$ 25,123456');
    expect(dialog.getByText(/Diferença de arredondamento/)).toHaveTextContent('0,003456');
    fireEvent.click(dialog.getByRole('radio', { name: 'Dinheiro' }));
    fireEvent.change(dialog.getByLabelText('Valor recebido'), { target: { value: '30' } });
    expect(dialog.getByText('R$ 4,88')).toBeVisible();
    fireEvent.click(dialog.getByRole('button', { name: 'Registrar pagamento e entrada' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/patio/entradas', expect.objectContaining({
      placa: 'HBF593', valorEsperado: '25.12', recebido: '30',
    })));
  });

  it('não transforma preço positivo abaixo de um centavo em entrada gratuita', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }], eventos: [{ eventoId: 12, nome: 'Festival',
        patioId: 1, patioNome: 'Pátio central', modo: 'ENTRADA', valor: '0', valorCalculado: '0.004999', valorDevido: '0' }] } : { itens: [] } }));
    const post = vi.spyOn(api, 'post');
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
    await chooseReference('Evento e pátio', /Festival/);
    fireEvent.change(screen.getByLabelText('Placa'), { target: { value: item.placa } });
    expect(screen.getByText(/Peça ao gestor para revisar o preço/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Conferir pagamento da entrada' })).toBeDisabled();
    fireEvent.submit(screen.getByLabelText('Placa').closest('form')!);
    expect(post).not.toHaveBeenCalled();
  });

  it('restaura o evento fixado e bloqueia entrada se ele não estiver mais disponível', async () => {
    writeContext(2, '', { patioId: 1, patioNome: 'Pátio central', eventoId: 12, eventoNome: 'Festival encerrado' });
    const get = vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }], eventos: [] }
      : url.endsWith('/busca-saida') ? [] : { itens: [] } }));
    const post = vi.spyOn(api, 'post');
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
    expect(await screen.findByText(/nenhuma entrada será desviada/)).toBeVisible();
    expect(screen.getByLabelText('Placa')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Registrar entrada' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Placa para saída'), { target: { value: item.placa } });
    expect(screen.getByRole('button', { name: 'Buscar saída' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar saída' }));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/api/v1/patio/busca-saida', {
      params: { placa: item.placa, patioId: 1, eventoId: 12 },
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Trocar operação' }));
    expect(screen.getByRole('dialog', { name: 'Trocar operação?' })).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('esconde correções de supervisor para o caixa comum', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }] } : { itens: [item] } }));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
    expect(screen.queryByRole('tab', { name: 'Supervisão' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('tab', { name: 'Veículos' }));
    await screen.findByRole('button', { name: 'Conferir saída de ABC1D23' });
    expect(screen.queryByRole('button', { name: 'Corrigir registro de ABC1D23' })).not.toBeInTheDocument();
  });

  it('alterna cartões e listagem mantendo busca, evento, OS e saída do mesmo registro', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }], estadiasEvento: [{
        movimentacaoId: 7, nome: 'Festival teste', modo: 'ENTRADA', ordemServicoNumero: 'PATIO-7',
      }] } : { itens: [item, { ...item, movimentacaoId: 9, placa: 'XYZ9A87' }] } }));
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {
      turnoId: 4, chave: 'previa', placa: item.placa, tipo: 'AVULSO', minutos: 30,
      valor: '12.123456', expiraEm: new Date(Date.now() + 60_000).toISOString(),
    } });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('tab', { name: 'Veículos' }));
    await screen.findByRole('button', { name: 'Conferir saída de ABC1D23' });
    fireEvent.change(screen.getByLabelText('Buscar placa no pátio'), { target: { value: 'ABC' } });
    fireEvent.click(screen.getByRole('button', { name: 'Listagem' }));
    const table = screen.getByRole('table', { name: 'Veículos no pátio' });
    expect(within(table).getByText('ABC1D23')).toBeVisible();
    expect(within(table).queryByText('XYZ9A87')).not.toBeInTheDocument();
    expect(within(table).getByText('Festival teste')).toBeVisible();
    expect(within(table).getByText(/PATIO-7/)).toBeVisible();
    expect(within(table).getByText('Pago na entrada')).toBeVisible();
    expect(screen.getByLabelText('Buscar placa no pátio')).toHaveValue('ABC');
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(within(table).getByRole('button', { name: 'Conferir saída de ABC1D23' }));
    const dialog = await screen.findByRole('dialog', { name: 'Conferir saída' });
    expect(await within(dialog).findByText(/12,123456/)).toBeVisible();
    expect(post).toHaveBeenCalledWith('/api/v1/patio/movimentacoes/7/previa-saida');
    expect(post.mock.calls.some(([url]) => url.endsWith('/saida'))).toBe(false);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cartões' }));
    expect(screen.queryByRole('table', { name: 'Veículos no pátio' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conferir saída de ABC1D23' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Corrigir registro de ABC1D23' })).not.toBeInTheDocument();
  });

  it('restaura a preferência após remontar sem trocar a escolha ao clicar no modo selecionado', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }] } : { itens: [item] } }));
    const mount = () => {
      const rendered = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
      fireEvent.click(screen.getByRole('tab', { name: 'Veículos' }));
      return rendered;
    };
    const first = mount();
    await screen.findByText(item.placa);
    fireEvent.click(screen.getByRole('button', { name: 'Listagem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Listagem' }));
    expect(screen.getByRole('button', { name: 'Listagem' })).toHaveAttribute('aria-pressed', 'true');
    first.unmount();
    mount();
    expect(await screen.findByRole('table', { name: 'Veículos no pátio' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Listagem' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('a listagem mantém o perfil somente leitura sem ações de saída ou correção', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['operations:read'] } as ReturnType<typeof useAuth>);
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { itens: [item] } });
    const post = vi.spyOn(api, 'post');
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
    await screen.findByText(item.placa);
    fireEvent.click(screen.getByRole('button', { name: 'Listagem' }));
    const table = screen.getByRole('table', { name: 'Veículos no pátio' });
    expect(within(table).getByText(item.placa)).toBeVisible();
    expect(within(table).queryByRole('columnheader', { name: 'Ações' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Conferir saída de|Corrigir registro de/ })).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalledWith('/api/v1/patio/caixa');
    expect(post).not.toHaveBeenCalled();
  });

  it('filtra avulsos e mensalistas junto da placa, nos cartões e na listagem', async () => {
    const avulso = { ...item, movimentacaoId: 8, placa: 'DEF2E34' };
    const mensalista = { ...item, movimentacaoId: 9, placa: 'XYZ9A87', tipo: 'MENSALISTA' };
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }], estadiasEvento: [{
        movimentacaoId: 7, nome: 'Festival', modo: 'ENTRADA', ordemServicoNumero: 'PATIO-7',
      }] } : { itens: [item, avulso, mensalista], resumo: { totalVeiculos: 3, avulsos: 2, mensalistas: 1 } } }));
    const post = vi.spyOn(api, 'post');
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
    await screen.findByText('1 mensalista');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mensalistas: 1' }));
    const cards = screen.getByRole('list', { name: 'Veículos no pátio em cartões' });
    expect(within(cards).getAllByRole('listitem')).toHaveLength(1);
    expect(within(cards).getByText(mensalista.placa)).toBeVisible();
    expect(within(cards).getByText('Mensalista', { exact: true })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mostrar mensalistas: 1' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Listagem' }));
    const table = screen.getByRole('table', { name: 'Veículos no pátio' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar avulsos: 2' }));
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByText(item.placa)).toBeVisible(); // Evento também é avulso.
    const linhaAvulsa = within(table).getByRole('row', { name: new RegExp(avulso.placa) });
    expect(within(linhaAvulsa).getByText('Avulso', { exact: true })).toBeVisible();
    expect(within(linhaAvulsa).queryByText('Mensalista', { exact: true })).not.toBeInTheDocument();
    expect(within(table).queryByText(mensalista.placa)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar placa no pátio'), { target: { value: item.placa } });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar todos os veículos: 3' }));
    expect(within(table).getAllByRole('row')).toHaveLength(2); // A placa continua aplicada.
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(screen.getByLabelText('Buscar placa no pátio')).toHaveValue('');
    expect(post).not.toHaveBeenCalled();
  });

  it('distingue filtro sem resultado de pátio vazio e permite voltar a todos', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }] }
      : { itens: [{ ...item, tipo: 'MENSALISTA' }], resumo: { totalVeiculos: 1, avulsos: 0, mensalistas: 1 } } }));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar avulsos: 0' }));
    expect(screen.getByText('Nenhum veículo neste filtro')).toBeVisible();
    expect(screen.queryByText('Nenhum veículo no pátio')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByText(item.placa)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mostrar todos os veículos: 1' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('filtrar no perfil de consulta não libera ações de caixa nem faz comandos', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['operations:read'] } as ReturnType<typeof useAuth>);
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { itens: [item],
      resumo: { totalVeiculos: 1, avulsos: 1, mensalistas: 0 } } });
    const post = vi.spyOn(api, 'post');
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar avulsos: 1' }));
    expect(screen.getByText('1 avulso')).toBeVisible();
    expect(screen.getByText(item.placa)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Conferir saída de|Corrigir registro de/ })).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalledWith('/api/v1/patio/caixa');
    expect(post).not.toHaveBeenCalled();
  });

  it.each([true, false])('respeita o cadastro de pátio no caixa (facilities:manage=%s)', async (permitted) => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 2 }, permissions: ['operations:checkout', ...(permitted ? ['facilities:manage'] : [])],
    } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    let saved = false;
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: saved ? [{ id: 42, nome: 'Pátio Norte' }] : [] }
      : url.endsWith('/installation-cities') ? { content: [{ id: 5, nome: 'Cascavel' }], totalElements: 1 }
      : { itens: [] } }));
    const post = vi.spyOn(api, 'post').mockImplementation(async (url) => {
      if (url === '/api/v1/parking-facilities') { saved = true; return { data: { id: 42, name: 'Pátio Norte' } }; }
      return { data: { placa: 'ABC1D23' } };
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><PatioPage /></QueryClientProvider>);
    await screen.findByText(/Nenhum pátio ativo/);
    if (!permitted) {
      expect(screen.queryByRole('button', { name: 'Selecionar pátio da entrada' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cadastrar pátio' })).not.toBeInTheDocument();
      expect(post).not.toHaveBeenCalled();
      return;
    }
    const user = userEvent.setup();
    await openReference('Pátio da entrada');
    await user.click(screen.getByRole('button', { name: 'Cadastrar pátio' }));
    for (const [label, value] of [['Nome', 'Pátio Norte'], ['Endereço', 'Rua A'], ['Bairro', 'Centro'], ['CEP', '85000-000']]) {
      fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } });
    }
    await chooseReference('Cidade', 'Cascavel', 'Cascavel');
    await user.click(screen.getByRole('button', { name: 'Criar pátio' }));
    await screen.findByText('Pátio da entrada: Pátio Norte');
    expect(screen.getByText(/Turno aberto ·/)).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: 'Placa' }), { target: { value: 'ABC1D23' } });
    await user.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    expect(post).toHaveBeenCalledWith('/api/v1/patio/entradas', { placa: 'ABC1D23' });
  }, 15000);

  it('confirma pagamento de evento na entrada e mostra a nota pendente ao liberar a saída', async () => {
    let entrou = false;
    let saiu = false;
    const evento = { movimentacaoId: 7, eventoId: 12, nome: 'Festival teste', modo: 'ENTRADA',
      valor: '25.123456', valorPago: '25.123456', ordemServicoNumero: 'PATIO-7', ordemServicoStatus: 'EM_EXECUCAO' };
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }],
        eventos: [{ eventoId: 12, nome: evento.nome, patioId: 1, patioNome: 'Pátio central',
          modo: evento.modo, valor: evento.valor }], estadiasEvento: entrou && !saiu ? [evento] : [] }
      : { itens: entrou && !saiu ? [item] : [] } }));
    const post = vi.spyOn(api, 'post').mockImplementation(async (url) => {
      if (url.endsWith('/entradas')) { entrou = true; return { data: { placa: item.placa, evento } }; }
      if (url.endsWith('/previa-saida')) return { data: { turnoId: 4, chave: 'chave', placa: item.placa,
        tipo: 'AVULSO', minutos: 30, valor: '0.000000', expiraEm: new Date(Date.now() + 60_000).toISOString(), evento } };
      if (url.endsWith('/saida')) { saiu = true; return { data: { placa: item.placa, valor: '0.000000',
        meio: 'SEM_COBRANCA', evento: { ...evento, fiscalStatus: 'PENDENTE_EMISSAO', ordemServicoStatus: 'CONCLUIDA' } } }; }
      throw new Error(url);
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><PatioPage /></QueryClientProvider>);

    await chooseReference('Evento e pátio', /Festival teste/);
    expect(readContext(2, '')).toEqual({ patioId: 1, patioNome: 'Pátio central', eventoId: 12, eventoNome: 'Festival teste' });
    expect(screen.queryByRole('textbox', { name: 'Evento e pátio' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Placa'), { target: { value: item.placa } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir pagamento da entrada' }));
    const receber = await screen.findByRole('dialog', { name: 'Pagamento na entrada' });
    expect(within(receber).getByText(/25,123456/)).toBeVisible();
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(within(receber).getByRole('radio', { name: 'Pix' }));
    const registrar = within(receber).getByRole('button', { name: 'Registrar pagamento e entrada' });
    expect(registrar).toBeEnabled();
    fireEvent.click(within(receber).getByRole('checkbox', { name: 'Identificar na nota' }));
    expect(registrar).toBeDisabled();
    fireEvent.change(within(receber).getByRole('textbox', { name: /CPF ou CNPJ/ }), { target: { value: '529.982.247-25' } });
    fireEvent.change(within(receber).getByRole('textbox', { name: /Nome ou razão social/ }), { target: { value: 'Tomador QA' } });
    expect(registrar).toBeEnabled();
    fireEvent.click(registrar);
    expect(await screen.findByText('Entrada registrada: ABC1D23.')).toBeVisible();
    expect(screen.getByText('OS PATIO-7 aberta automaticamente')).toBeVisible();
    expect(post).toHaveBeenCalledWith('/api/v1/patio/entradas', expect.objectContaining({
      placa: 'ABC1D23', eventoId: 12, patioId: 1, chaveEntrada: expect.any(String), meio: 'PIX', valorEsperado: '25.123456',
      tomador: { documento: '52998224725', nome: 'Tomador QA' },
    }));
    fireEvent.click(await screen.findByRole('tab', { name: 'Veículos' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Conferir saída de ABC1D23' }));
    const liberar = await screen.findByRole('dialog', { name: 'Conferir saída' });
    expect(await within(liberar).findByText(/Pago na entrada/)).toBeVisible();
    expect(within(liberar).queryByRole('checkbox', { name: 'Identificar na nota' })).not.toBeInTheDocument();
    fireEvent.click(within(liberar).getByRole('button', { name: 'Confirmar saída' }));
    expect(await screen.findByText(/NFS-e pendente de emissão.*OS PATIO-7 concluída/)).toBeVisible();
    expect(post).toHaveBeenCalledWith('/api/v1/patio/movimentacoes/7/saida',
      { turnoId: 4, chave: 'chave', meio: 'SEM_COBRANCA' });
  });

  it('envia o tomador no próprio pagamento da saída, sem chamar a API de Clientes', async () => {
    const evento = { movimentacaoId: 7, eventoId: 12, nome: 'Festival teste', modo: 'SAIDA',
      valor: '25.00', valorPago: 0, ordemServicoNumero: 'PATIO-7' };
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }] }
      : { itens: [item] } }));
    const post = vi.spyOn(api, 'post').mockImplementation(async (url) => ({ data: url.endsWith('/previa-saida')
      ? { turnoId: 4, chave: 'chave', placa: item.placa, tipo: 'AVULSO', minutos: 30,
        valor: '25.00', expiraEm: new Date(Date.now() + 60_000).toISOString(), evento }
      : { placa: item.placa, valor: '25.00', meio: 'PIX' } }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><PatioPage /></QueryClientProvider>, '/app/patio?tab=veiculos');
    fireEvent.click(await screen.findByRole('button', { name: 'Conferir saída de ABC1D23' }));
    const exit = within(await screen.findByRole('dialog', { name: 'Conferir saída' }));
    fireEvent.click(await exit.findByRole('checkbox', { name: 'Identificar na nota' }));
    fireEvent.change(exit.getByRole('textbox', { name: /CPF ou CNPJ/ }), { target: { value: '12.ABC.345/01DE-35' } });
    fireEvent.change(exit.getByRole('textbox', { name: /Nome ou razão social/ }), { target: { value: 'Empresa QA' } });
    fireEvent.click(exit.getByRole('radio', { name: 'Pix' }));
    fireEvent.click(exit.getByRole('button', { name: 'Registrar pagamento e saída' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/patio/movimentacoes/7/saida',
      { turnoId: 4, chave: 'chave', meio: 'PIX', tomador: { documento: '12ABC34501DE35', nome: 'Empresa QA' } }));
  });

  it('envia dinheiro recebido na entrada apenas depois de validar troco', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: turno, patios: [{ id: 1, nome: 'Pátio central' }], eventos: [{ eventoId: 12, nome: 'Festival',
        patioId: 1, patioNome: 'Pátio central', modo: 'ENTRADA', valor: '25.123456' }] } : { itens: [] } }));
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 8, placa: 'ABC1D23' } });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PatioPage /></QueryClientProvider>);
    await chooseReference('Evento e pátio', /Festival/);
    fireEvent.change(screen.getByLabelText('Placa'), { target: { value: item.placa } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir pagamento da entrada' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Pagamento na entrada' }));
    fireEvent.click(dialog.getByRole('radio', { name: 'Dinheiro' }));
    fireEvent.change(dialog.getByLabelText('Valor recebido'), { target: { value: '24' } });
    expect(dialog.getByRole('button', { name: 'Registrar pagamento e entrada' })).toBeDisabled();
    expect(post).not.toHaveBeenCalled();
    fireEvent.change(dialog.getByLabelText('Valor recebido'), { target: { value: '30,123457' } });
    expect(dialog.getByText('R$ 5,000001')).toBeVisible();
    fireEvent.click(dialog.getByRole('button', { name: 'Registrar pagamento e entrada' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/patio/entradas',
      expect.objectContaining({ meio: 'DINHEIRO', recebido: '30.123457', valorEsperado: '25.123456' })));
  });

  it('abre, registra pela placa, confere antes de pagar e fecha o turno', async () => {
    let aberto = false;
    let entrou = false;
    let saiu = false;
    let fechado = false;
    const recebido = { ...turno, pix: 12.345678, totalRecebido: 12.345678, saidas: 1 };
    const finalizado = { ...recebido, fechadoEm: '2026-11-09T11:00:00Z', dinheiroContado: 9, diferencaDinheiro: -1 };
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/caixa')
      ? { aberto: aberto && !fechado ? (saiu ? recebido : turno) : null, ultimoFechado: fechado ? finalizado : null,
        patios: [{ id: 1, nome: 'Pátio central' }] }
      : url.endsWith('/movimentos-dinheiro') ? [] : { itens: entrou && !saiu ? [item] : [] } }));
    const post = vi.spyOn(api, 'post').mockImplementation(async (url) => {
      if (url.endsWith('/turnos')) { aberto = true; return { data: turno }; }
      if (url.endsWith('/entradas')) { entrou = true; return { data: { id: 7, placa: item.placa } }; }
      if (url.endsWith('/previa-saida')) return { data: { turnoId: 4, chave: 'chave', placa: item.placa, tipo: item.tipo,
        minutos: 30, valor: 12.345678, expiraEm: new Date(Date.now() + 60_000).toISOString() } };
      if (url.endsWith('/saida')) { saiu = true; return { data: { placa: item.placa, valor: 12.345678, meio: 'PIX' } }; }
      if (url.endsWith('/fechamento')) { fechado = true; return { data: finalizado }; }
      throw new Error(url);
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><PatioPage /></QueryClientProvider>);

    expect(screen.queryByRole('button', { name: 'Registrar entrada' })).not.toBeEnabled();
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir turno' }));
    let dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Fundo de troco'), { target: { value: '10,000001' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar abertura' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const placa = await screen.findByLabelText('Placa');
    await waitFor(() => expect(placa).toBeEnabled());
    fireEvent.change(placa, { target: { value: 'abc-1d23' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    expect(await screen.findByText('Entrada registrada: ABC1D23.')).toBeVisible();
    fireEvent.click(await screen.findByRole('tab', { name: 'Veículos' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Conferir saída de ABC1D23' }));
    dialog = await screen.findByRole('dialog', { name: 'Conferir saída' });
    expect(await within(dialog).findByText(/12,345678/)).toBeVisible();
    expect(post.mock.calls.some(([url]) => url.endsWith('/7/saida'))).toBe(false);
    const pagar = within(dialog).getByRole('button', { name: 'Registrar pagamento e saída' });
    expect(pagar).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Pix' }));
    fireEvent.click(pagar);

    await screen.findByText('Saída registrada: ABC1D23');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Caixa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar caixa' }));
    dialog = screen.getByRole('dialog', { name: 'Fechar caixa' });
    fireEvent.change(within(dialog).getByLabelText('Dinheiro contado'), { target: { value: '9' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar fechamento' }));
    expect(await screen.findByText('Último fechamento')).toBeVisible();
    expect(post).toHaveBeenCalledWith('/api/v1/patio/turnos', { fundoTroco: '10.000001' });
    expect(post).toHaveBeenCalledWith('/api/v1/patio/entradas', { placa: 'ABC1D23' });
    expect(post).toHaveBeenCalledWith('/api/v1/patio/movimentacoes/7/saida', { turnoId: 4, chave: 'chave', meio: 'PIX' });
    expect(post).toHaveBeenCalledWith('/api/v1/patio/turnos/4/fechamento', { dinheiroContado: '9' });
  });
});
