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
