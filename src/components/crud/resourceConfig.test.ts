import { describe, expect, it } from 'vitest';
import {
  clientesConfig,
  condicoesPagamentoConfig,
  formasPagamentoConfig,
} from '../../resources/pessoasPagamento';
import {
  transportadorasConfig,
  transportadoraVeiculosConfig,
  veiculosFrotaConfig,
} from '../../resources/logistica';
import {
  categoriasConfig,
  fornecedoresConfig,
  marcasConfig,
  produtoFornecedoresConfig,
  produtosConfig,
  servicosConfig,
  unidadesMedidaConfig,
} from '../../resources/fornecedorConveniencia';
import { notaEntradaConfig, notaSaidaConfig, notaServicoConfig } from '../../resources/fiscal';
import { cargosConfig, funcionariosConfig } from '../../resources/rhUsuario';
import {
  hasResourceActionPermission,
  resourceQueryKey,
} from './resourceConfig';
import { buildResourcePayload } from '../form/ResourceFormDialog';

describe('ResourceConfig tenant-aware de pagamentos', () => {
  it.each([formasPagamentoConfig, condicoesPagamentoConfig])(
    'separa leitura e manutencao de $plural',
    (config) => {
      expect(config.tenantAware).toBe(true);
      expect(config.permissions).toEqual({
        read: ['payments:read'],
        create: ['payments:manage'],
        update: ['payments:manage'],
        delete: ['payments:manage'],
      });

      expect(hasResourceActionPermission(config, 'read', ['payments:read'])).toBe(true);
      expect(hasResourceActionPermission(config, 'create', ['payments:read'])).toBe(false);
      expect(hasResourceActionPermission(config, 'update', ['payments:manage'])).toBe(true);
      expect(hasResourceActionPermission(config, 'delete', [])).toBe(false);
    },
  );

  it('particiona consultas de pagamento pela organizacao ativa', () => {
    const organizationOne = resourceQueryKey(
      formasPagamentoConfig,
      10,
      'list',
      formasPagamentoConfig.basePath,
      { page: 0 },
    );
    const organizationTwo = resourceQueryKey(
      formasPagamentoConfig,
      20,
      'list',
      formasPagamentoConfig.basePath,
      { page: 0 },
    );

    expect(organizationOne).toEqual([
      'tenant',
      10,
      'list',
      '/api/formas-pagamento',
      { page: 0 },
    ]);
    expect(organizationTwo).not.toEqual(organizationOne);
  });
});

describe('ResourceConfig tenant-aware de clientes', () => {
  it('separa leitura e manutencao do cadastro', () => {
    expect(clientesConfig.tenantAware).toBe(true);
    expect(clientesConfig.permissions).toEqual({
      read: ['customers:read'],
      create: ['customers:manage'],
      update: ['customers:manage'],
      delete: ['customers:manage'],
    });

    expect(hasResourceActionPermission(clientesConfig, 'read', ['customers:read'])).toBe(true);
    expect(hasResourceActionPermission(clientesConfig, 'create', ['customers:read'])).toBe(false);
    expect(hasResourceActionPermission(clientesConfig, 'update', ['customers:manage'])).toBe(true);
    expect(hasResourceActionPermission(clientesConfig, 'delete', [])).toBe(false);
  });

  it('particiona consultas pela organizacao ativa', () => {
    const organizationOne = resourceQueryKey(
      clientesConfig,
      10,
      'list',
      clientesConfig.basePath,
      { page: 0 },
    );
    const organizationTwo = resourceQueryKey(
      clientesConfig,
      20,
      'list',
      clientesConfig.basePath,
      { page: 0 },
    );

    expect(organizationOne).toEqual([
      'tenant',
      10,
      'list',
      '/api/clientes',
      { page: 0 },
    ]);
    expect(organizationTwo).not.toEqual(organizationOne);
  });
});

describe('ResourceConfig tenant-aware de transportadoras', () => {
  it('separa leitura e manutencao do cadastro', () => {
    expect(transportadorasConfig.tenantAware).toBe(true);
    expect(transportadorasConfig.permissions).toEqual({
      read: ['logistics:read'],
      create: ['logistics:manage'],
      update: ['logistics:manage'],
      delete: ['logistics:manage'],
    });

    expect(hasResourceActionPermission(transportadorasConfig, 'read', ['logistics:read'])).toBe(true);
    expect(hasResourceActionPermission(transportadorasConfig, 'create', ['logistics:read'])).toBe(false);
    expect(hasResourceActionPermission(transportadorasConfig, 'update', ['logistics:manage'])).toBe(true);
    expect(hasResourceActionPermission(transportadorasConfig, 'delete', [])).toBe(false);
  });

  it('particiona consultas pela organizacao ativa', () => {
    const organizationOne = resourceQueryKey(
      transportadorasConfig,
      10,
      'list',
      transportadorasConfig.basePath,
      { page: 0 },
    );
    const organizationTwo = resourceQueryKey(
      transportadorasConfig,
      20,
      'list',
      transportadorasConfig.basePath,
      { page: 0 },
    );

    expect(organizationOne).toEqual([
      'tenant',
      10,
      'list',
      '/api/transportadoras',
      { page: 0 },
    ]);
    expect(organizationTwo).not.toEqual(organizationOne);
  });
});

describe('ResourceConfig tenant-aware da frota', () => {
  it.each([veiculosFrotaConfig, transportadoraVeiculosConfig])(
    'separa leitura e manutencao de $plural',
    (config) => {
      expect(config.tenantAware).toBe(true);
      expect(config.permissions).toEqual({
        read: ['logistics:read'],
        create: ['logistics:manage'],
        update: ['logistics:manage'],
        delete: ['logistics:manage'],
      });

      expect(hasResourceActionPermission(config, 'read', ['logistics:read'])).toBe(true);
      expect(hasResourceActionPermission(config, 'create', ['logistics:read'])).toBe(false);
      expect(hasResourceActionPermission(config, 'update', ['logistics:manage'])).toBe(true);
      expect(hasResourceActionPermission(config, 'delete', [])).toBe(false);
    },
  );

  it.each([veiculosFrotaConfig, transportadoraVeiculosConfig])(
    'particiona consultas de $plural pela organizacao ativa',
    (config) => {
      const organizationOne = resourceQueryKey(config, 10, 'list', config.basePath, { page: 0 });
      const organizationTwo = resourceQueryKey(config, 20, 'list', config.basePath, { page: 0 });

      expect(organizationOne).toEqual([
        'tenant',
        10,
        'list',
        config.basePath,
        { page: 0 },
      ]);
      expect(organizationTwo).not.toEqual(organizationOne);
    },
  );

  it('particiona as duas referencias do vinculo e preserva seus payloads', () => {
    const referenceFields = transportadoraVeiculosConfig.fields.filter(
      (field) => field.type === 'reference' && field.reference,
    );
    const configsByPath = new Map([
      [transportadorasConfig.basePath, transportadorasConfig],
      [veiculosFrotaConfig.basePath, veiculosFrotaConfig],
    ]);

    expect(referenceFields.map((field) => field.name)).toEqual([
      'transportadoraId',
      'veiculoFrotaId',
    ]);
    for (const field of referenceFields) {
      const referenceConfig = configsByPath.get(field.reference!.basePath);
      expect(referenceConfig?.tenantAware).toBe(true);
      expect(resourceQueryKey(
        referenceConfig!,
        10,
        'reference-picker',
        field.reference!.basePath,
      )).toEqual([
        'tenant',
        10,
        'reference-picker',
        field.reference!.basePath,
      ]);
    }

    const forbiddenTenantFields = ['organizationId', 'organizacaoId', 'organization_id', 'organizacao_id'];
    expect(forbiddenTenantFields.some((name) => referenceFields.some((field) => field.name === name))).toBe(false);
  });

  it('preserva ativo real sem inventar status ou reativacao no vinculo', () => {
    const vehicleFields = new Map(veiculosFrotaConfig.fields.map((field) => [field.name, field]));
    const vehicleFilters = new Map((veiculosFrotaConfig.filters ?? []).map((filter) => [filter.name, filter]));
    const linkFieldNames = transportadoraVeiculosConfig.fields.map((field) => field.name);

    expect(vehicleFields.get('ativo')?.type).toBe('switch');
    expect(vehicleFilters.get('ativo')?.type).toBe('boolean');
    expect(transportadoraVeiculosConfig.columns.some((column) => column.field === 'ativo')).toBe(true);
    expect(linkFieldNames).toEqual(['transportadoraId', 'veiculoFrotaId']);
    expect(linkFieldNames).not.toContain('ativo');
    expect(linkFieldNames).not.toContain('status');
  });
});

describe('ResourceConfig tenant-aware de fornecedores', () => {
  it('separa leitura e manutencao do cadastro', () => {
    expect(fornecedoresConfig.tenantAware).toBe(true);
    expect(fornecedoresConfig.permissions).toEqual({
      read: ['suppliers:read'],
      create: ['suppliers:manage'],
      update: ['suppliers:manage'],
      delete: ['suppliers:manage'],
    });

    expect(hasResourceActionPermission(fornecedoresConfig, 'read', ['suppliers:read'])).toBe(true);
    expect(hasResourceActionPermission(fornecedoresConfig, 'create', ['suppliers:read'])).toBe(false);
    expect(hasResourceActionPermission(fornecedoresConfig, 'update', ['suppliers:manage'])).toBe(true);
    expect(hasResourceActionPermission(fornecedoresConfig, 'delete', [])).toBe(false);
  });

  it('particiona consultas pela organizacao ativa', () => {
    const organizationOne = resourceQueryKey(
      fornecedoresConfig,
      10,
      'list',
      fornecedoresConfig.basePath,
      { page: 0 },
    );
    const organizationTwo = resourceQueryKey(
      fornecedoresConfig,
      20,
      'list',
      fornecedoresConfig.basePath,
      { page: 0 },
    );

    expect(organizationOne).toEqual([
      'tenant',
      10,
      'list',
      '/api/fornecedores',
      { page: 0 },
    ]);
    expect(organizationTwo).not.toEqual(organizationOne);
  });
});

describe('ResourceConfig tenant-aware do catalogo de conveniencia', () => {
  const catalogConfigs = [
    categoriasConfig,
    marcasConfig,
    unidadesMedidaConfig,
    produtosConfig,
    servicosConfig,
  ];

  it.each(catalogConfigs)('protege $plural com catalog:read/manage e ETag', (config) => {
    expect(config.tenantAware).toBe(true);
    expect(config.optimisticLocking).toBe(true);
    expect(config.permissions).toEqual({
      read: ['catalog:read'],
      create: ['catalog:manage'],
      update: ['catalog:manage'],
      delete: ['catalog:manage'],
    });

    expect(hasResourceActionPermission(config, 'read', ['catalog:read'])).toBe(true);
    expect(hasResourceActionPermission(config, 'create', ['catalog:read'])).toBe(false);
    expect(hasResourceActionPermission(config, 'update', ['catalog:manage'])).toBe(true);
    expect(hasResourceActionPermission(config, 'delete', [])).toBe(false);
  });

  it.each(catalogConfigs)('particiona $plural pela organizacao ativa', (config) => {
    const organizationOne = resourceQueryKey(config, 10, 'list', config.basePath);
    const organizationTwo = resourceQueryKey(config, 20, 'list', config.basePath);

    expect(organizationOne).toEqual(['tenant', 10, 'list', config.basePath]);
    expect(organizationTwo).not.toEqual(organizationOne);
  });

  it('mantem as referencias de Produto dentro do catalogo tenant-aware', () => {
    const targetByPath = new Map([
      [categoriasConfig.basePath, categoriasConfig],
      [marcasConfig.basePath, marcasConfig],
      [unidadesMedidaConfig.basePath, unidadesMedidaConfig],
    ]);
    const references = produtosConfig.fields.filter((field) => field.type === 'reference');

    expect(references.map((field) => field.name)).toEqual([
      'marcaId',
      'unidadeMedidaId',
      'categoriaId',
    ]);
    for (const field of references) {
      expect(targetByPath.get(field.reference!.basePath)?.tenantAware).toBe(true);
    }
  });

  it('preserva ativo e identifica as projecoes disabled de Produto', () => {
    const productFields = new Map(produtosConfig.fields.map((field) => [field.name, field]));
    const disabled = produtosConfig.fields.filter((field) => field.disabled).map((field) => field.name);
    const forbiddenTenantFields = ['organizationId', 'organizacaoId', 'organization_id', 'organizacao_id'];

    expect(productFields.get('ativo')?.type).toBe('switch');
    expect(disabled).toEqual(['valorCompra', 'custo', 'percentualLucro', 'quantidade']);
    expect(forbiddenTenantFields.some((field) => productFields.has(field))).toBe(false);
    expect(productFields.has('status')).toBe(false);
  });

  it('ativa Produto x Fornecedor no contexto do catalogo V53', () => {
    expect(produtoFornecedoresConfig.tenantAware).toBe(true);
    expect(produtoFornecedoresConfig.optimisticLocking).toBe(true);
    expect(produtoFornecedoresConfig.permissions).toEqual({
      read: ['catalog:read'],
      create: ['catalog:manage'],
      update: ['catalog:manage'],
      delete: ['catalog:manage'],
    });
    expect(produtoFornecedoresConfig.requiredAllPermissions).toEqual({
      create: ['suppliers:read'],
      update: ['suppliers:read'],
    });
    expect(hasResourceActionPermission(
      produtoFornecedoresConfig,
      'read',
      ['catalog:read'],
    )).toBe(true);
    expect(hasResourceActionPermission(
      produtoFornecedoresConfig,
      'create',
      ['catalog:manage'],
    )).toBe(false);
    expect(hasResourceActionPermission(
      produtoFornecedoresConfig,
      'create',
      ['catalog:manage', 'suppliers:read'],
    )).toBe(true);
    expect(hasResourceActionPermission(
      produtoFornecedoresConfig,
      'update',
      ['catalog:manage'],
    )).toBe(false);
    expect(hasResourceActionPermission(
      produtoFornecedoresConfig,
      'delete',
      ['catalog:manage'],
    )).toBe(true);

    const organizationOne = resourceQueryKey(
      produtoFornecedoresConfig,
      10,
      'list',
      produtoFornecedoresConfig.basePath,
    );
    const organizationTwo = resourceQueryKey(
      produtoFornecedoresConfig,
      20,
      'list',
      produtoFornecedoresConfig.basePath,
    );
    expect(organizationOne).toEqual([
      'tenant',
      10,
      'list',
      '/api/produto-fornecedores',
    ]);
    expect(organizationTwo).not.toEqual(organizationOne);
  });

  it('fecha o payload e mantem as referencias V53 no mesmo contexto', () => {
    expect(produtoFornecedoresConfig.filters).toEqual([
      expect.objectContaining({ name: 'produtoId' }),
    ]);

    const fields = new Map(produtoFornecedoresConfig.fields.map((field) => [field.name, field]));
    expect([...fields.keys()]).toEqual([
      'produtoId',
      'fornecedorId',
      'codigoProd',
      'custo',
      'ativo',
    ]);
    expect(fields.get('produtoId')).toMatchObject({
      disabledOnEdit: true,
      reference: { basePath: produtosConfig.basePath },
    });
    expect(fields.get('fornecedorId')).toMatchObject({
      disabledOnEdit: true,
      reference: { basePath: fornecedoresConfig.basePath },
    });
    expect(produtosConfig.tenantAware).toBe(true);
    expect(fornecedoresConfig.tenantAware).toBe(true);

    expect(buildResourcePayload(produtoFornecedoresConfig.fields, {
      produtoId: 10,
      fornecedorId: 20,
      codigoProd: 'REF-1',
      custo: 0,
      ativo: false,
      id: 30,
      version: 4,
      organizationId: 40,
      produtoNome: 'PRODUTO',
      fornecedorNome: 'FORNECEDOR',
    })).toEqual({
      produtoId: 10,
      fornecedorId: 20,
      codigoProd: 'REF-1',
      custo: 0,
      ativo: false,
    });
  });

  it('migra nota de entrada na V55 e mantem nota de saida pendente', () => {
    expect(notaEntradaConfig.tenantAware).toBe(true);
    expect(notaEntradaConfig.permissions?.read).toEqual(['fiscal:read']);
    expect(notaEntradaConfig.fields.find((field) => field.name === 'localEstoqueId'))
      .toMatchObject({ required: true, type: 'reference' });
    expect(notaSaidaConfig.tenantAware).toBe(true);
    expect(notaServicoConfig.tenantAware).toBe(true);
  });
});

describe('ResourceConfig tenant-aware de cargos', () => {
  it('separa leitura e manutencao do cadastro', () => {
    expect(cargosConfig.tenantAware).toBe(true);
    expect(cargosConfig.permissions).toEqual({
      read: ['workforce:read'],
      create: ['workforce:manage'],
      update: ['workforce:manage'],
      delete: ['workforce:manage'],
    });

    expect(hasResourceActionPermission(cargosConfig, 'read', ['workforce:read'])).toBe(true);
    expect(hasResourceActionPermission(cargosConfig, 'create', ['workforce:read'])).toBe(false);
    expect(hasResourceActionPermission(cargosConfig, 'update', ['workforce:manage'])).toBe(true);
    expect(hasResourceActionPermission(cargosConfig, 'delete', [])).toBe(false);
  });

  it('particiona consultas pela organizacao ativa', () => {
    const organizationOne = resourceQueryKey(
      cargosConfig,
      10,
      'list',
      cargosConfig.basePath,
      { page: 0 },
    );
    const organizationTwo = resourceQueryKey(
      cargosConfig,
      20,
      'list',
      cargosConfig.basePath,
      { page: 0 },
    );

    expect(organizationOne).toEqual([
      'tenant',
      10,
      'list',
      '/api/cargos',
      { page: 0 },
    ]);
    expect(organizationTwo).not.toEqual(organizationOne);
  });
});

describe('ResourceConfig tenant-aware de funcionarios', () => {
  it('separa leitura e manutencao do cadastro', () => {
    expect(funcionariosConfig.tenantAware).toBe(true);
    expect(funcionariosConfig.permissions).toEqual({
      read: ['workforce:read'],
      create: ['workforce:manage'],
      update: ['workforce:manage'],
      delete: ['workforce:manage'],
    });

    expect(hasResourceActionPermission(funcionariosConfig, 'read', ['workforce:read'])).toBe(true);
    expect(hasResourceActionPermission(funcionariosConfig, 'create', ['workforce:read'])).toBe(false);
    expect(hasResourceActionPermission(funcionariosConfig, 'update', ['workforce:manage'])).toBe(true);
    expect(hasResourceActionPermission(funcionariosConfig, 'delete', [])).toBe(false);
  });

  it('particiona consultas pela organizacao ativa', () => {
    const organizationOne = resourceQueryKey(
      funcionariosConfig,
      10,
      'list',
      funcionariosConfig.basePath,
      { page: 0 },
    );
    const organizationTwo = resourceQueryKey(
      funcionariosConfig,
      20,
      'list',
      funcionariosConfig.basePath,
      { page: 0 },
    );

    expect(organizationOne).toEqual([
      'tenant',
      10,
      'list',
      '/api/funcionarios',
      { page: 0 },
    ]);
    expect(organizationTwo).not.toEqual(organizationOne);
  });

  it('usa o estado booleano real e nao expoe seletor de tenant no payload', () => {
    const fieldsByName = new Map(funcionariosConfig.fields.map((field) => [field.name, field]));
    const filtersByName = new Map((funcionariosConfig.filters ?? []).map((filter) => [filter.name, filter]));
    const forbiddenTenantFields = ['organizationId', 'organizacaoId', 'organization_id', 'organizacao_id'];

    expect(fieldsByName.get('ativo')?.type).toBe('switch');
    expect(filtersByName.get('ativo')?.type).toBe('boolean');
    expect(fieldsByName.has('status')).toBe(false);
    expect(forbiddenTenantFields.some((field) => fieldsByName.has(field))).toBe(false);
  });
});
