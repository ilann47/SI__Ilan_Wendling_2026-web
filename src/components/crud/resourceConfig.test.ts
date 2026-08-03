import { describe, expect, it } from 'vitest';
import {
  clientesConfig,
  condicoesPagamentoConfig,
  formasPagamentoConfig,
} from '../../resources/pessoasPagamento';
import { transportadorasConfig } from '../../resources/logistica';
import { fornecedoresConfig } from '../../resources/fornecedorConveniencia';
import {
  hasResourceActionPermission,
  resourceQueryKey,
} from './resourceConfig';

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
