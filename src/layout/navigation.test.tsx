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
      'Ordens de Compra': '/app/ordens-compra',
      'Vendas Administrativas': '/app/vendas-administrativas',
      'Ordens de Servico': '/app/ordens-servico',
    });
  });

  it('exige leitura contextual para Vendas Administrativas', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Vendas Administrativas');
    expect(item?.permissions).toEqual(['sales:read']);
  });

  it('exige leitura contextual para Ordens de Servico', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Ordens de Servico');
    expect(item?.permissions).toEqual(['service_orders:read']);
  });

  it('exige leitura contextual para Ordens de Compra', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Ordens de Compra');

    expect(item?.permissions).toEqual(['purchases:read']);
  });

  it.each(['Formas de Pagamento', 'Condições de Pagamento'])(
    'exige leitura contextual para %s',
    (label) => {
      const item = navGroups.flatMap((group) => group.items)
        .find((candidate) => candidate.label === label);

      expect(item?.permissions).toEqual(['payments:read']);
    },
  );

  it('exige leitura contextual para Clientes', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Clientes');

    expect(item?.permissions).toEqual(['customers:read']);
  });

  it('exige leitura contextual para Transportadoras', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Transportadoras');

    expect(item?.permissions).toEqual(['logistics:read']);
  });

  it.each(['Veículos de Frota', 'Frota (Transp. x Veículo)'])(
    'exige leitura contextual para %s',
    (label) => {
      const item = navGroups.flatMap((group) => group.items)
        .find((candidate) => candidate.label === label);

      expect(item?.permissions).toEqual(['logistics:read']);
    },
  );

  it('exige leitura contextual para Fornecedores', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Fornecedores');

    expect(item?.permissions).toEqual(['suppliers:read']);
  });

  it.each(['Produtos', 'Serviços', 'Categorias', 'Marcas', 'Unidades de Medida'])(
    'exige leitura contextual do catalogo para %s',
    (label) => {
      const item = navGroups.flatMap((group) => group.items)
        .find((candidate) => candidate.label === label);

      expect(item?.permissions).toEqual(['catalog:read']);
    },
  );

  it('exige leitura contextual do catalogo para Produto x Fornecedor', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Produto x Fornecedor');

    expect(item?.permissions).toEqual(['catalog:read']);
  });

  it('exige stock:read para Estoque', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Estoque');

    expect(item?.path).toBe('/app/estoque');
    expect(item?.permissions).toEqual(['stock:read']);
  });

  it('exige leitura contextual para Cargos', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Cargos');

    expect(item?.permissions).toEqual(['workforce:read']);
  });

  it('exige leitura contextual para Funcionários', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Funcionários');

    expect(item?.permissions).toEqual(['workforce:read']);
  });
});
