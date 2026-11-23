import { render, screen, waitFor } from '@testing-library/react';
import { chooseReference } from '../test/referencePicker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { useAuth } from '../auth/AuthContext';
import { SalesPage } from './SalesPage';

vi.mock('../workspace/OperationalWorkspaceContext', () => ({
  useOperationalWorkspace: vi.fn(),
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

function SalesLocation() {
  return <output aria-label="Endereço atual">{useLocation().pathname}</output>;
}

function renderSales(path = '/app/vendas') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>
    <SalesLocation />
    <Routes>
      <Route path="/app/vendas" element={<SalesPage />} />
      <Route path="/app/vendas/:section/:detailId" element={<SalesPage />} />
    </Routes>
  </MemoryRouter></QueryClientProvider>);
}

const order = {
  id: 40, number: 'PED-40', eventId: 5, inventoryHoldId: 7, status: 'CRIADO', total: 50,
  currency: 'BRL', version: 2, buyer: { name: 'Cliente de teste', email: 'cliente@example.test' },
};

describe('SalesPage', () => {
  it('exibe somente a area autorizada pelo tenant', () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['credentials:issue'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [], remember: vi.fn(),
    } as unknown as ReturnType<typeof useOperationalWorkspace>);

    renderSales();

    expect(screen.getByRole('tab', { name: 'Credenciais' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Reservas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Pedidos' })).not.toBeInTheDocument();
  });

  it('abre a operação sem fazer consulta quando o perfil só pode confirmar', async () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 2 }, permissions: ['orders:manual-confirm'],
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [], remember: vi.fn(),
    } as unknown as ReturnType<typeof useOperationalWorkspace>);

    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [{ id: 40, label: 'PED-40' }], totalElements: 1 } });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ...order, status: 'CONFIRMADO', version: 3 } });
    renderSales();

    const user = userEvent.setup();
    await chooseReference('Pedido', 'PED-40');
    await user.click(screen.getByRole('button', { name: 'Abrir pedido' }));

    expect(screen.getByText('Confirmação manual')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar pedido' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consultar' })).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalledWith('/api/v1/orders/40');
    const revision = screen.getByLabelText(/Revisão do pedido/);
    await user.clear(revision);
    await user.type(revision, '2');
    await user.type(screen.getByLabelText('Referência da evidência'), 'REC-12');
    await user.type(screen.getByLabelText('Motivo'), 'Pagamento em balcão');
    await user.click(screen.getByRole('button', { name: 'Confirmar manualmente' }));

    expect(post).toHaveBeenCalledWith('/api/v1/orders/40/manual-confirmation', {
      paymentMethod: 'DINHEIRO', evidenceReference: 'REC-12', reason: 'Pagamento em balcão',
    }, { headers: { 'If-Match': '"2"', 'Idempotency-Key': expect.any(String) } });
    expect(screen.queryByText('Cliente de teste')).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalledWith('/api/v1/orders/40');
  });

  it('abre detalhes do pedido em uma subpágina e volta aos filtros da listagem', async () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 2 }, permissions: ['orders:read'],
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [], remember: vi.fn(),
    } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const get = vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url === '/api/v1/orders/40' ? order : { items: [order], hasMore: false } }));

    renderSales('/app/vendas?tab=pedidos&canal=WEB');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Ver detalhes' }));

    expect(await screen.findByRole('heading', { name: 'Pedido PED-40' })).toBeInTheDocument();
    expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/app/vendas/pedidos/40');
    expect(screen.queryByText('Meus pedidos')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/api/v1/orders/40');
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByText('Meus pedidos')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Canal' })).toHaveValue('WEB');
  });

  it('cria hold idempotente a partir de produto real', async () => {
    const remember = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 }, permissions: ['inventory:hold'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [], remember,
    } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const hold = {
      id: 40, eventId: 5, parkingProductId: 7, quantity: 1, channel: 'WEB',
      priceTierId: 9, unitPrice: 50, currency: 'BRL', status: 'MANTIDA',
      expiresAt: '2026-08-03T04:00:00Z', version: 0,
    };
    vi.spyOn(api, 'post').mockResolvedValueOnce({ data: hold });
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/sales-products')
      ? { content: [{ id: 7, label: 'Estacionamento do Festival' }], totalElements: 1 } : hold }));

    renderSales();
    const user = userEvent.setup();
    await chooseReference('Produto', 'Estacionamento do Festival');
    await user.click(screen.getByRole('button', { name: 'Reservar vaga' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({ parkingProductId: 7, quantity: 1, channel: 'WEB' });
    expect(vi.mocked(api.post).mock.calls[0][2]?.headers).toHaveProperty('Idempotency-Key');
    expect(remember).toHaveBeenCalledWith('hold', expect.objectContaining({ id: 40, version: 0 }));
    expect(await screen.findByRole('heading', { name: 'Reserva #40' })).toBeInTheDocument();
    expect(screen.queryByText('Reservar vaga temporariamente')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByText('Reservar vaga temporariamente')).toBeInTheDocument();
  });

  it('abre uma credencial por URL, gera QR com a revisão do registro e volta para a aba', async () => {
    const remember = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 }, permissions: ['credentials:issue'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const get = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: {
      id: 90, publicCode: 'CRE-90', parkingFacilityId: 1, status: 'ATIVA', qrVersion: 0, version: 2,
    } });
    const post = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: {
      id: 12, credentialId: 90, representationVersion: 1, token: 'qr-apenas-no-teste', credentialVersion: 3, expiresAt: '2026-11-22T13:00:00Z',
    } });
    renderSales('/app/vendas/credenciais/90');
    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: 'Credencial CRE-90' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/credentials/90');
    await user.click(screen.getByRole('button', { name: 'Gerar QR' }));
    expect(await screen.findByLabelText('Token QR')).toHaveAttribute('type', 'password');
    expect(post).toHaveBeenCalledWith('/api/v1/credentials/90/qr-code', null, { headers: { 'If-Match': '"2"' } });
    expect(remember).toHaveBeenCalledExactlyOnceWith('credential', { id: 90, label: expect.any(String), version: 2 });
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('tab', { name: 'Credenciais', selected: true })).toBeInTheDocument();
    expect(screen.queryByLabelText('Token QR')).not.toBeInTheDocument();
  });
});
