import { describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { buildNotaSaidaPayload, outboundNotesApi } from './outboundNotes';

const fields = {
  numero: ' s-12 ', clienteId: '2', localEstoqueId: 3, condicaoPagamentoId: 4,
  dataEmissao: '2026-11-03', dataSaida: '2026-11-05',
  itens: [{ produtoId: 8, quantidade: '0.125', valorUnitario: 40, percentualDesconto: '10', valorDesconto: '' }],
};

describe('Notas de saída', () => {
  it('envia o percentual isolado sem converter o desconto no navegador', () => {
    expect(buildNotaSaidaPayload(fields)).toMatchObject({
      numero: 'S-12', clienteId: 2, localEstoqueId: 3, condicaoPagamentoId: 4,
      itens: [{ produtoId: 8, quantidade: 0.125, valorUnitario: 40, percentualDesconto: 10 }],
    });
    expect(buildNotaSaidaPayload(fields).itens[0]).not.toHaveProperty('valorDesconto');
  });

  it('não inclui campos de origem comercial fora do contrato de nota direta', () => {
    expect(buildNotaSaidaPayload({ ...fields, vendaAdministrativaId: 42 })).not.toHaveProperty('vendaAdministrativaId');
  });

  it('protege data, quantidade e precisão antes de salvar', () => {
    expect(() => buildNotaSaidaPayload({ ...fields, dataSaida: '2026-11-01' })).toThrow(/anterior à emissão/);
    expect(() => buildNotaSaidaPayload({ ...fields, itens: [{ ...fields.itens[0], quantidade: '0.0000001' }] })).toThrow(/seis casas/);
    expect(() => buildNotaSaidaPayload({ ...fields, itens: [{ ...fields.itens[0], valorUnitario: -1 }] })).toThrow(/não negativo/);
  });

  it('preserva a sexta casa nos campos e valida o desconto contra o total em milionésimos', () => {
    expect(buildNotaSaidaPayload({ ...fields, serie: '00A', modelo: '055', valorFrete: '0.000001',
      itens: [{ ...fields.itens[0], quantidade: '1.000001', valorUnitario: '2.000001', percentualDesconto: '0.000001' }],
    })).toMatchObject({ serie: '00A', modelo: '055', valorFrete: 0.000001,
      itens: [{ quantidade: 1.000001, valorUnitario: 2.000001, percentualDesconto: 0.000001 }] });
    const item = { produtoId: 8, quantidade: '0.500000', valorUnitario: '0.000001' };
    expect(buildNotaSaidaPayload({ ...fields, itens: [{ ...item, valorDesconto: '0.000001' }] }).itens[0].valorDesconto)
      .toBe(0.000001);
    expect(() => buildNotaSaidaPayload({ ...fields, itens: [{ ...item, valorDesconto: '0.000002' }] }))
      .toThrow(/ultrapassar/);
    expect(() => buildNotaSaidaPayload({ ...fields, valorFrete: '9999999999999.999999' }))
      .toThrow(/preservar todos os dígitos/);
  });

  it('cria com chave e edita só a revisão esperada', async () => {
    const body = buildNotaSaidaPayload(fields);
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 9 } });
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { id: 9, version: 4 } });
    await outboundNotesApi.createDraft(body, 'mesmo-intento');
    await outboundNotesApi.updateDraft(9, body, 3);
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/notas-saida', body, { headers: { 'Idempotency-Key': 'mesmo-intento' } });
    expect(put).toHaveBeenCalledExactlyOnceWith('/api/notas-saida/9', body, { headers: { 'If-Match': '"3"' } });
  });

  it('reconcilia confirmação no mesmo ID sem duplicar POST', async () => {
    const post = vi.spyOn(api, 'post').mockRejectedValue(new Error('timeout'));
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 9, situacao: 'CONFIRMADA' } });
    await expect(outboundNotesApi.confirm(9, 3)).resolves.toMatchObject({ id: 9, situacao: 'CONFIRMADA' });
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/notas-saida/9/confirmacao', null, { headers: { 'If-Match': '"3"' } });
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/notas-saida/9');
  });

  it('não confunde rascunho cancelado com reversão concluída após timeout', async () => {
    const post = vi.spyOn(api, 'post').mockRejectedValue(new Error('timeout'));
    const get = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { id: 9, situacao: 'CANCELADA' } })
      .mockResolvedValueOnce({ data: { id: 9, situacao: 'CANCELADA', revertidaEm: '2026-11-05T15:00:00Z' } });
    await expect(outboundNotesApi.reverse(9, 3, 'Conferência incorreta')).rejects.toThrow('timeout');
    await expect(outboundNotesApi.reverse(9, 3, 'Conferência incorreta')).resolves.toMatchObject({ revertidaEm: '2026-11-05T15:00:00Z' });
    expect(post).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledWith('/api/notas-saida/9/reversao', { motivo: 'Conferência incorreta' }, { headers: { 'If-Match': '"3"' } });
    expect(get).toHaveBeenCalledTimes(2);
  });
});
