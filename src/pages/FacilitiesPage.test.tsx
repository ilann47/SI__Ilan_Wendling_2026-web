import { chooseReference } from '../test/referencePicker';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { FacilitiesPage } from './FacilitiesPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../workspace/OperationalWorkspaceContext', () => ({ useOperationalWorkspace: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({ useSnackbar: () => ({ notify: vi.fn() }) }));
afterEach(() => vi.restoreAllMocks());

function mount(path = '/app/instalacoes') {
  return render(<MemoryRouter initialEntries={[path]}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <FacilitiesPage />
  </QueryClientProvider></MemoryRouter>);
}

describe('FacilitiesPage', () => {
  it('abre setores do pátio e consulta as vagas somente do setor escolhido', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'], activeOrganization: { organizationId: 7 } } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const facility = { id: 42, name: 'Pátio Norte', active: true };
    const sector = { id: 11, name: 'Área Coberta', code: 'S1', parkingFacilityId: 42, active: true, categories: ['COMUM'] };
    const get = vi.spyOn(api, 'get').mockImplementation(async (url) => ({
      data: url === '/api/v1/parking-facilities/42' ? facility : url === '/api/v1/sectors/11' ? sector
        : { content: url.endsWith('/management') ? [facility] : url.endsWith('/sectors') ? [sector] : [], totalElements: 1 },
    }));
    mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Abrir Pátio Norte' }));
    await user.click(await screen.findByRole('button', { name: 'Novo setor' }));
    expect(screen.getByRole('textbox', { name: 'Pátio' })).toHaveValue('Pátio Norte');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(await screen.findByRole('button', { name: 'Ver vagas de Área Coberta' }));
    expect(await screen.findByRole('heading', { name: 'Vagas · Área Coberta' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Setores' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Importar vagas' }));
    expect(screen.getByRole('form', { name: 'Importar vagas' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Buscar vagas por código')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/api/v1/spaces',
      expect.objectContaining({ params: expect.objectContaining({ sectorId: 11 }) })));
    expect(get).toHaveBeenCalledWith('/api/v1/sectors',
      expect.objectContaining({ params: expect.objectContaining({ parkingFacilityId: 42 }) }));
    expect(screen.queryByRole('textbox', { name: 'Setor' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nova vaga' }));
    expect(screen.getByRole('textbox', { name: 'Setor' })).toHaveValue('Área Coberta');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByRole('heading', { name: 'Setores' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Vagas · Área Coberta' })).not.toBeInTheDocument();
  });

  it('confirma, altera e libera a vaga pelo menu da listagem, sem perder a busca', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'], activeOrganization: { organizationId: 7 } } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    let row = { id: 19, code: 'A-01', sectorId: 11, sectorName: 'Coberto', parkingFacilityName: 'Pátio',
      type: 'COMUM', accessible: false, status: 'LIVRE', position: null, version: 2 };
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({
      data: url === '/api/v1/spaces' ? { content: [row], totalElements: 1 } : { content: [], totalElements: 0 },
    }));
    const patch = vi.spyOn(api, 'patch').mockImplementation(async (_url, body) => {
      row = { ...row, status: (body as { status: string }).status, version: row.version + 1 };
      return { data: row };
    });
    mount('/app/instalacoes?aba=spaces');
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Buscar vagas por código'), 'a-01');
    const chooseAction = async (action: string) => {
      await user.click(await screen.findByRole('button', { name: /Situação da vaga A-01/ }));
      await user.click(await screen.findByRole('menuitem', { name: action }));
      return within(await screen.findByRole('alertdialog'));
    };
    const cancel = await chooseAction('Bloquear');
    await user.click(cancel.getByRole('button', { name: 'Cancelar' }));
    expect(patch).not.toHaveBeenCalled();
    for (const [action, label, status, version] of [
      ['Bloquear', 'Bloqueada', 'BLOQUEADA', 2],
      ['Colocar em manutenção', 'Em manutenção', 'MANUTENCAO', 3],
      ['Liberar', 'Livre', 'LIVRE', 4],
    ] as const) {
      const dialog = await chooseAction(action);
      await user.click(dialog.getByRole('button', { name: action }));
      await waitFor(() => expect(patch).toHaveBeenLastCalledWith('/api/v1/spaces/19/status',
        { status }, { headers: { 'If-Match': `"${version}"` } }));
      expect(await screen.findByText(label, { exact: true })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Buscar vagas por código')).toHaveValue('a-01');
    }
  });
  it('cadastra uma vaga sem importar e volta para a lista com a vaga salva', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'], activeOrganization: { organizationId: 7 } } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const sector = { id: 11, name: 'Área Coberta', code: 'S1', parkingFacilityName: 'Pátio Norte', active: true, categories: ['PCD'] };
    const space = { id: 19, code: 'R-09', sectorId: 11, sectorName: sector.name, parkingFacilityName: sector.parkingFacilityName,
      type: 'PCD', accessible: true, status: 'LIVRE', position: 'Rampa', version: 0, allowedCategories: ['PCD'] };
    let saved = false;
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({
      data: url === '/api/v1/sectors/11' ? sector
        : url === '/api/v1/sectors' ? { content: [sector], totalElements: 1 }
        : url === '/api/v1/spaces' && saved ? { content: [space], totalElements: 1 }
        : { content: [], totalElements: 0 },
    }));
    const post = vi.spyOn(api, 'post').mockImplementation(async () => { saved = true; return { data: space }; });
    mount('/app/instalacoes?aba=spaces');
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Importar vagas' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nova vaga' }));
    expect(screen.getByRole('form', { name: 'Nova vaga' })).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Cadastrar vaga' });
    expect(submit).toBeDisabled();
    await chooseReference('Setor', /Área Coberta.*Pátio Norte/, 'coberta');
    await user.type(screen.getByRole('textbox', { name: 'Código' }), 'r-09');
    await user.type(screen.getByRole('textbox', { name: 'Posição' }), 'Rampa');
    await user.click(screen.getByRole('checkbox', { name: 'Vaga acessível' }));
    await user.click(submit);
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/v1/sectors/11/spaces',
      { code: 'R-09', type: 'PCD', accessible: true, position: 'Rampa' });
    expect(await screen.findByRole('button', { name: /Editar vaga R-09/ }, { timeout: 5000 })).toBeInTheDocument();
  });
  it('busca vagas por código e setor, edita e mantém os filtros ao voltar', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'], activeOrganization: { organizationId: 7 } } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const sector = { id: 11, name: 'Área Coberta', code: 'S1', parkingFacilityName: 'Pátio Norte' };
    const space = { id: 19, code: 'A-01', sectorId: 11, sectorName: sector.name, parkingFacilityName: sector.parkingFacilityName,
      type: 'COMUM', accessible: false, status: 'LIVRE', position: 'Entrada', version: 2, allowedCategories: ['COMUM', 'PCD'] };
    const get = vi.spyOn(api, 'get').mockImplementation(async (url, config) => ({
      data: url === '/api/v1/spaces/19' ? space
        : url === '/api/v1/sectors/management' ? { content: [sector], totalElements: 1 }
        : url === '/api/v1/spaces' && config?.params.code === 'a-' && config?.params.sectorId === 11
          ? { content: [space], totalElements: 1 } : { content: [], totalElements: 0 },
    }));
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ...space, position: 'Rampa', version: 3 } });
    mount('/app/instalacoes?aba=spaces');
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Importar vagas' })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Buscar vagas por código'), 'a-');
    await chooseReference('Setor', /Área Coberta.*Pátio Norte/, 'coberta');
    await user.click(await screen.findByRole('button', { name: /Editar vaga A-01/ }));
    expect(await screen.findByRole('form', { name: 'Editar vaga' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Setor' })).toHaveAttribute('readonly');
    const position = screen.getByRole('textbox', { name: 'Posição' });
    expect(position).toHaveValue('Entrada');
    await user.clear(position);
    await user.type(position, 'Rampa');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(put).toHaveBeenCalledWith('/api/v1/spaces/19',
      { code: 'A-01', type: 'COMUM', accessible: false, position: 'Rampa' }, { headers: { 'If-Match': '"2"' } });
    expect(await screen.findByPlaceholderText('Buscar vagas por código')).toHaveValue('a-');
    expect(await screen.findByDisplayValue('Área Coberta · Pátio Norte · S1')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/api/v1/spaces', expect.objectContaining({ params: { code: 'a-', sectorId: 11, page: 0, size: 20 } }));
  });
  it('busca os registros da organização, edita em página e mantém a busca no retorno', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'], activeOrganization: { organizationId: 7 } } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const get = vi.spyOn(api, 'get').mockImplementation(async (url, config) => ({
      data: url.endsWith('/42') ? { id: 42, name: 'Pátio São José', version: 3, cityId: 5,
        address: 'Rua A', number: '12A', district: 'Centro', postalCode: '80000-000', physicalCapacity: 90, operationalCapacity: 80, active: true }
        : url.endsWith('installation-cities') ? { content: [{ id: 5, nome: 'Cidade cadastrada' }], totalElements: 1 }
        : { content: config?.params?.name ? [{ id: 42, name: 'Pátio São José', active: true }] : [], totalElements: 1 },
    }));
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { id: 42, name: 'Pátio São José Norte', version: 4 } });
    mount();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Buscar pátios por nome'), 'sao jose');
    await user.click(await screen.findByRole('button', { name: 'Editar Pátio São José' }));
    const name = await screen.findByRole('textbox', { name: 'Nome' });
    expect(name).toHaveValue('Pátio São José');
    expect(await screen.findByDisplayValue('Cidade cadastrada')).toBeInTheDocument();
    await user.type(name, ' Norte');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/api/v1/parking-facilities/42',
      expect.objectContaining({ name: 'Pátio São José Norte', number: '12A' }), { headers: { 'If-Match': '"3"' } }));
    expect(await screen.findByPlaceholderText('Buscar pátios por nome')).toHaveValue('sao jose');
    expect(get).toHaveBeenCalledWith('/api/v1/parking-facilities/management',
      expect.objectContaining({ params: expect.objectContaining({ name: 'sao jose' }) }));
  });
  it('reserva cadastro de local para administracao organizacional', () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);

    mount();

    expect(screen.queryByRole('tab', { name: 'Locais' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pátios' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Setores' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Vagas' })).not.toBeInTheDocument();
  });

  it('abre o cadastro de pátio em página e confirma o descarte antes de voltar', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);

    mount();

    expect(screen.queryByRole('textbox', { name: 'Nome' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Novo pátio' }));

    expect(screen.getByRole('form', { name: 'Novo pátio' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Novo pátio' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nome' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar pátio' })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Nome' }), 'Pátio de teste');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('alertdialog', { name: 'Descartar alterações?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar preenchendo' }));
    expect(await screen.findByRole('textbox', { name: 'Nome' })).toHaveValue('Pátio de teste');
  });

  it('limita a capacidade operacional à física e revalida se a física diminuir', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'], activeOrganization: { organizationId: 7 } } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [{ id: 5, nome: 'Cascavel' }], totalElements: 1 } });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 12, name: 'Pátio Teste', version: 0 } });
    const user = userEvent.setup();
    mount('/app/instalacoes?formulario=facility');
    const form = screen.getByRole('form', { name: 'Novo pátio' });
    const physical = within(form).getByRole('spinbutton', { name: 'Capacidade física' });
    const operational = within(form).getByRole('spinbutton', { name: 'Capacidade operacional' });
    const save = within(form).getByRole('button', { name: 'Criar pátio' });
    for (const [field, value] of [['Nome', 'Pátio de teste'], ['Endereço', 'Rua A'], ['Bairro', 'Centro']]) {
      await user.type(within(form).getByRole('textbox', { name: field }), value);
    }
    await chooseReference('Cidade', 'Cascavel', 'Cascavel');
    await user.type(within(form).getByRole('textbox', { name: 'CEP' }), '80000000');
    fireEvent.change(operational, { target: { value: '1010' } });
    expect(operational).toHaveAttribute('max', '100');
    expect(operational).toHaveValue(100);
    expect(screen.getByText('O valor máximo é 100.')).toBeVisible();
    fireEvent.change(operational, { target: { value: '90' } });
    fireEvent.change(physical, { target: { value: '80' } });
    expect(operational).toHaveValue(90);
    expect(operational).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Informe entre 0 e 80 vagas operacionais.')).toBeVisible();
    expect(save).toBeDisabled();
    fireEvent.submit(form);
    expect(post).not.toHaveBeenCalled();
    fireEvent.change(operational, { target: { value: '80' } });
    expect(save).toBeEnabled();
    fireEvent.submit(form);
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/parking-facilities',
      expect.objectContaining({ physicalCapacity: 80, operationalCapacity: 80 })));
  });

  it('mostra cidade e estado no seletor de busca e permite selecionar pelo teclado', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'], activeOrganization: { organizationId: 7 } } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const city = { id: 5, nome: 'São José dos Pinhais', estadoNome: 'Paraná' };
    const get = vi.spyOn(api, 'get').mockImplementation(async (url, config) => ({
      data: url.endsWith('installation-cities') && (config?.params.name === 'São José' || config?.params.id === 5)
        ? { content: [city], totalElements: 1 } : { content: [], totalElements: 0 },
    }));
    mount('/app/instalacoes?formulario=facility');
    const field = within(screen.getByRole('form', { name: 'Novo pátio' })).getByRole('textbox', { name: 'Cidade' });
    await chooseReference('Cidade', 'São José dos Pinhais · Paraná', 'São José');
    expect(get).toHaveBeenCalledWith('/api/v1/installation-cities', expect.objectContaining({
      params: expect.objectContaining({ name: 'São José' }),
    }));
    expect(field).toHaveValue('São José dos Pinhais · Paraná');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('recusa texto no número e no CEP e só envia o CEP depois dos oito dígitos', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'], activeOrganization: { organizationId: 7 } } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [{ id: 5, nome: 'Cascavel' }], totalElements: 1 } });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 12, name: 'Pátio Teste', version: 0 } });
    const user = userEvent.setup();
    mount('/app/instalacoes?formulario=facility');
    const form = screen.getByRole('form', { name: 'Novo pátio' });
    const number = within(form).getByRole('textbox', { name: 'Número' });
    const cep = within(form).getByRole('textbox', { name: 'CEP' });
    const save = within(form).getByRole('button', { name: 'Criar pátio' });
    for (const [field, value] of [['Endereço', ' Rua A '], ['Bairro', ' Centro ']]) {
      await user.type(within(form).getByRole('textbox', { name: field }), value);
    }
    await chooseReference('Cidade', 'Cascavel', 'Cascavel');
    await user.type(number, 'teste');
    fireEvent.change(cep, { target: { value: 'teste' } });
    expect(number).toHaveValue('');
    expect(cep).toHaveValue('');
    await user.type(number, '0012');
    await user.type(cep, '08500');
    expect(save).toBeDisabled();
    expect(cep).toHaveAttribute('aria-invalid', 'true');
    fireEvent.submit(form);
    expect(post).not.toHaveBeenCalled();
    await user.type(cep, '000');
    expect(cep).toHaveValue('08500-000');
    await user.type(within(form).getByRole('textbox', { name: 'Nome' }), '   ');
    expect(save).toBeDisabled();
    fireEvent.submit(form);
    expect(post).not.toHaveBeenCalled();
    await user.type(within(form).getByRole('textbox', { name: 'Nome' }), 'Pátio Teste ');
    expect(save).toBeEnabled();
    fireEvent.submit(form);
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/parking-facilities',
      expect.objectContaining({ number: '0012', postalCode: '08500-000', name: 'Pátio Teste', address: 'Rua A', district: 'Centro' })));
  });

  it('busca pátio no servidor sem referências locais e envia o ID escolhido', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'], activeOrganization: { organizationId: 7 } } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const get = vi.spyOn(api, 'get').mockImplementation(async (_url, config) => ({
      data: config?.params.name === 'sao jose' || config?.params.id === 42
        ? { content: [{ id: 42, name: 'Pátio São José' }], totalElements: 1 }
        : { content: [], totalElements: 0 },
    }));
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 11, name: 'Setor coberto', version: 0 } });
    mount('/app/instalacoes?aba=sector');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Novo setor' }));
    await chooseReference('Pátio', 'Pátio São José', 'sao jose');
    await user.type(screen.getByRole('textbox', { name: 'Código' }), 'S1');
    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Setor coberto');
    await user.click(screen.getByRole('button', { name: 'Criar setor' }));
    expect(get).toHaveBeenCalledWith('/api/v1/parking-facilities', expect.objectContaining({ params: { size: 20, name: 'sao jose' } }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/parking-facilities/42/sectors', expect.objectContaining({ name: 'Setor coberto' })));
  });
});
