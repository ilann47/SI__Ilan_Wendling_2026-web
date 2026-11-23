import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import { CashReceived, CorrectionDialog, QuickExit, ReceiptPage } from './PatioTools';
import type { ReactNode } from 'react';

const mount = (children: ReactNode) => render(<QueryClientProvider client={new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})}>{children}</QueryClientProvider>);
afterEach(() => vi.restoreAllMocks());

describe('Ferramentas do pátio', () => {
  it('busca placa na API com contexto e não registra saída sem conferência', async () => {
    const match = { movimentacaoId: 90, placa: 'ABC1D23', patioId: 4, patioNome: 'Norte', eventoId: 7, eventoNome: 'Festival' };
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [match] });
    const post = vi.spyOn(api, 'post');
    const selected = vi.fn();
    mount(<QuickExit org={2} patioId={4} eventoId={7} enabled onSelect={selected} />);
    fireEvent.change(screen.getByLabelText('Placa para saída'), { target: { value: 'abc-1d23' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar saída' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Conferir saída encontrada de ABC1D23' }));
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/patio/busca-saida', {
      params: { placa: 'ABC1D23', patioId: 4, eventoId: 7 },
    });
    expect(selected).toHaveBeenCalledWith(match);
    expect(post).not.toHaveBeenCalled();
  });
  it('explica busca sem resultado sem oferecer entrada automática', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    mount(<QuickExit org={2} patioId={4} enabled onSelect={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Placa para saída'), { target: { value: 'XYZ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar saída' }));
    expect(await screen.findByText(/não registre uma nova entrada/)).toBeVisible();
  });
  it('busca identificador curto ou com símbolos sem alterar o valor enviado', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    mount(<QuickExit org={2} enabled onSelect={vi.fn()} />);
    const input = screen.getByLabelText('Placa para saída');
    const search = screen.getByRole('button', { name: 'Buscar saída' });
    expect(search).toBeDisabled();
    fireEvent.change(input, { target: { value: '%' } });
    await waitFor(() => expect(search).toBeEnabled());
    fireEvent.click(search);
    await waitFor(() => expect(get).toHaveBeenCalledWith('/api/v1/patio/busca-saida', {
      params: { placa: '%', patioId: undefined, eventoId: undefined },
    }));
  });
  it('mostra erro de dinheiro insuficiente e preserva centavos fracionários', () => {
    mount(<CashReceived value="24" due="25.123456" onChange={vi.fn()} />);
    expect(screen.getByText(/igual ou maior/)).toBeVisible();
    expect(screen.getByLabelText('Valor recebido')).toHaveAttribute('aria-invalid', 'true');
  });
  it('consulta comprovante sem emitir cobrança e permite segunda via', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: {
      movimentacaoId: 5, turnoId: 4, placa: 'ABC1D23', valor: '25.123456', recebido: '30', troco: '4.876544',
      meio: 'DINHEIRO', registradoEm: '2026-11-19T20:00:00Z', cancelada: true,
    } });
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const post = vi.spyOn(api, 'post');
    mount(<ReceiptPage org={2} id={5} onBack={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Comprovante do estacionamento' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const button = await screen.findByRole('button', { name: 'Imprimir segunda via' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/patio/movimentacoes/5/comprovante');
    expect(screen.getByText(/não é nota fiscal/)).toBeVisible();
    expect(screen.getByText(/Estadia cancelada/)).toBeVisible();
    expect(post).not.toHaveBeenCalled();
  });
  it('exige motivo e confirma correção sem apagar o registro', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    const done = vi.fn();
    mount(<CorrectionDialog org={2} target={{ movimentacaoId: 5, placa: 'ABC1D23' }} onClose={vi.fn()} onSaved={done} />);
    expect(screen.getByRole('button', { name: 'Confirmar correção' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Placa correta'), { target: { value: 'ABC-1D24' } });
    fireEvent.change(screen.getByLabelText('Motivo da correção'), { target: { value: 'Placa digitada incorretamente na portaria' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar correção' }));
    await waitFor(() => expect(done).toHaveBeenCalledOnce());
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/v1/patio/movimentacoes/5/correcao', {
      chave: expect.any(String), acao: 'CORRIGIR_PLACA', motivo: 'Placa digitada incorretamente na portaria', placa: 'ABC1D24',
    });
  });
});
