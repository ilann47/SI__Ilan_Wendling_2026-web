import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { inboundImportsApi, validateXmlFile } from './inboundImports';

afterEach(() => vi.restoreAllMocks());

describe('importação persistida de XML', () => {
  it('envia XML original como application/xml e versões nas transições', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 4, version: 2 } });
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { id: 4, version: 3 } });
    await inboundImportsApi.upload('<nfeProc/>');
    expect(post).toHaveBeenCalledWith('/api/notas-entrada/importacoes', '<nfeProc/>', {
      headers: { 'Content-Type': 'application/xml' },
    });
    const body = { fornecedorId: 1, localEstoqueId: 2, itens: [{ sequencia: 1, produtoId: 3, fatorConversao: 2, valorUnitario: 5 }] };
    await inboundImportsApi.reconcile(4, 2, body);
    expect(put).toHaveBeenCalledWith('/api/notas-entrada/importacoes/4/conciliacao', body, { headers: { 'If-Match': '"2"' } });
    await inboundImportsApi.count(4, 3, [{ sequencia: 1, quantidadeConferida: 2 }]);
    expect(post).toHaveBeenLastCalledWith('/api/notas-entrada/importacoes/4/conferencia', { itens: [{ sequencia: 1, quantidadeConferida: 2 }] }, { headers: { 'If-Match': '"3"' } });
  });
  it('consulta após timeout de confirmação e só aceita situação confirmada real', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('timeout'));
    const get = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { id: 7, status: 'CONFIRMADA', notaEntradaId: 10 } })
      .mockResolvedValueOnce({ data: { id: 7, status: 'CONFERIDA' } });
    await expect(inboundImportsApi.confirm(7, 2)).resolves.toMatchObject({ notaEntradaId: 10 });
    await expect(inboundImportsApi.confirm(7, 2)).rejects.toThrow('timeout');
    expect(get).toHaveBeenCalledWith('/api/notas-entrada/importacoes/7');
  });
  it('recusa arquivo vazio, formato incorreto e acima do limite antes do envio', () => {
    expect(() => validateXmlFile({ name: 'nota.xml', size: 0 })).toThrow('vazio');
    expect(() => validateXmlFile({ name: 'nota.pdf', size: 30 })).toThrow('XML');
    expect(() => validateXmlFile({ name: 'nota.xml', size: 2 * 1024 * 1024 + 1 })).toThrow('2 MB');
    expect(() => validateXmlFile({ name: 'nota.XML', size: 300 })).not.toThrow();
  });
  it('preserva os bytes e a codificação do arquivo sem reinterpretar XML no navegador', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 4 } });
    const file = new File(['<nfeProc/>'], 'nota.xml', { type: 'application/xml' });
    await inboundImportsApi.upload(file);
    expect(post).toHaveBeenCalledWith('/api/notas-entrada/importacoes', file, { headers: { 'Content-Type': 'application/xml' } });
  });
});
