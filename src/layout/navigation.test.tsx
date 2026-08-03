import { describe, expect, it } from 'vitest';
import { navGroups } from './navigation';

describe('navigation - compatibilidade legada', () => {
  it('exibe os modulos legados junto dos modulos de eventos', () => {
    const items = navGroups.flatMap((group) => group.items);
    const pathsByLabel = Object.fromEntries(items.map((item) => [item.label, item.path]));

    expect(pathsByLabel).toMatchObject({
      'Acesso de eventos': '/app/acesso-eventos',
      'Pátio': '/app/patio',
      'Movimentações': '/app/movimentacoes',
      'Notas de Entrada': '/app/notas-entrada',
      'Notas de Saída': '/app/notas-saida',
      Produtos: '/app/produtos',
      Serviços: '/app/servicos',
      'Contas a Pagar': '/app/contas-pagar',
    });
  });
});
