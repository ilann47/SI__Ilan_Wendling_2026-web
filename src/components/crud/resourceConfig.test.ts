import { describe, expect, it } from 'vitest';
import {
  clientesConfig,
  condicoesPagamentoConfig,
  formasPagamentoConfig,
} from '../../resources/pessoasPagamento';
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
