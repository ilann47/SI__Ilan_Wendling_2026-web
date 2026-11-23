import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import { CashManagement } from './CashManagement';

describe('movimentos auditáveis do caixa', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());
  it('registra suprimento com motivo e chave estável sem registrar receita', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    const saved = vi.fn();
    render(<QueryClientProvider client={new QueryClient()}><CashManagement org={2} operador="caixa" turnoId={4} online onSaved={saved}
      suprimentos="0" sangrias="0" dinheiroEsperado="10" /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar suprimento' }));
    expect(screen.getByRole('button', { name: 'Confirmar movimento' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Valor do movimento'), { target: { value: '20,12' } });
    fireEvent.change(screen.getByLabelText('Motivo do movimento'), { target: { value: 'Troco adicional recebido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar movimento' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/patio/turnos/4/movimentos-dinheiro', {
      chave: expect.any(String), tipo: 'SUPRIMENTO', valor: '20.12', motivo: 'Troco adicional recebido',
    }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  });
  it('bloqueia operações quando offline', () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    render(<QueryClientProvider client={new QueryClient()}><CashManagement org={2} operador="caixa" turnoId={4} online={false} onSaved={vi.fn()}
      suprimentos="0" sangrias="0" dinheiroEsperado="10" /></QueryClientProvider>);
    expect(screen.getByRole('button', { name: 'Registrar sangria' })).toBeDisabled();
  });

  it('preserva a intenção após timeout aplicado, fechar e remontar; reconcilia sem duplicar', async () => {
    let recorded: Record<string, unknown> | null = null;
    vi.spyOn(api, 'get').mockImplementation(async () => ({ data: recorded ? [{ id: 1, ...recorded, registradoEm: '2026-11-22T00:00:00Z' }] : [] }));
    const post = vi.spyOn(api, 'post').mockImplementation(async (_, body) => {
      recorded = body as Record<string, unknown>;
      throw new Error('timeout depois do envio');
    });
    const saved = vi.fn();
    const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CashManagement org={2} operador="caixa" turnoId={4} online onSaved={saved} suprimentos="0" sangrias="0" dinheiroEsperado="10" />
    </QueryClientProvider>);
    const first = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar suprimento' }));
    fireEvent.change(screen.getByLabelText('Valor do movimento'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Motivo do movimento'), { target: { value: 'Reposição de troco para turno' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar movimento' }));
    await screen.findByText(/Resultado ainda não confirmado/);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    first.unmount();
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Retomar movimento pendente' }));
    expect(screen.getByLabelText('Valor do movimento')).toHaveValue('20');
    expect(screen.getByLabelText('Valor do movimento')).toBeDisabled();
    expect(post).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Verificar resultado' }));
    await screen.findByText(/Movimento confirmado no histórico/);
    expect(post).toHaveBeenCalledTimes(1);
    expect(saved).toHaveBeenCalledOnce();
  });

  it('repete a mesma UUID/payload após remount e resolve 409 definitivo sem registro', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce({ response: { status: 409, data: { message: 'Turno fechado' } } });
    const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CashManagement org={2} operador="caixa" turnoId={4} online onSaved={vi.fn()} suprimentos="0" sangrias="0" dinheiroEsperado="10" />
    </QueryClientProvider>);
    const first = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar suprimento' }));
    fireEvent.change(screen.getByLabelText('Valor do movimento'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Motivo do movimento'), { target: { value: 'Reposição de troco para turno' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar movimento' }));
    await screen.findByText(/Resultado ainda não confirmado/);
    first.unmount();
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Retomar movimento pendente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Repetir o mesmo envio' }));
    await screen.findByText(/Movimento recusado e não encontrado no histórico/);
    expect(post.mock.calls[1][1]).toEqual(post.mock.calls[0][1]);
    expect(screen.getByRole('button', { name: 'Novo movimento' })).toBeEnabled();
  });

  it('fechar e repetir um timeout aplicado reutiliza a UUID e preserva um único efeito financeiro', async () => {
    const effects = new Set<string>();
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    const post = vi.spyOn(api, 'post').mockImplementation(async (_, body) => {
      const intent = body as { chave: string };
      const existed = effects.has(intent.chave);
      effects.add(intent.chave);
      if (!existed) throw new Error('resposta perdida após aplicar');
      return { data: {} };
    });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CashManagement org={2} operador="caixa" turnoId={4} online onSaved={vi.fn()} suprimentos="0" sangrias="0" dinheiroEsperado="10" />
    </QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar suprimento' }));
    fireEvent.change(screen.getByLabelText('Valor do movimento'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Motivo do movimento'), { target: { value: 'Reposição de troco para turno' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar movimento' }));
    await screen.findByText(/Resultado ainda não confirmado/);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Retomar movimento pendente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Repetir o mesmo envio' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][1]).toEqual(post.mock.calls[0][1]);
    expect(effects.size).toBe(1);
  });

  it('não envia sem conseguir persistir a intenção antes do POST', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    const post = vi.spyOn(api, 'post');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    render(<QueryClientProvider client={new QueryClient()}><CashManagement org={2} operador="caixa" turnoId={4} online onSaved={vi.fn()}
      suprimentos="0" sangrias="0" dinheiroEsperado="10" /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar suprimento' }));
    fireEvent.change(screen.getByLabelText('Valor do movimento'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Motivo do movimento'), { target: { value: 'Reposição de troco para turno' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar movimento' }));
    await screen.findByText(/Não foi possível guardar a intenção com segurança/);
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirmar movimento' })).toBeDisabled();
  });
});
