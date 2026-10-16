import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { notaSaidaConfig, notaServicoConfig } from '../../resources/fiscal';
import { DocumentOriginLinks } from './DocumentOriginLinks';

describe('origem comercial do documento fiscal', () => {
  it.each([
    [notaSaidaConfig, { vendaAdministrativaId: 15 }, 'sales:read', '/app/vendas-administrativas?detail=15', 'Ver pedido de venda'],
    [notaServicoConfig, { ordemServicoId: 18 }, 'service_orders:read', '/app/ordens-servico?detail=18', 'Ver ordem de serviço'],
  ] as const)('config %# abre origem exata respeitando leitura contextual', (config, row, permission, path, label) => {
    render(<MemoryRouter><DocumentOriginLinks row={row} links={config.detailLinks ?? []} permissions={[permission]} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', path);
  });
  it('não mostra links sem permissão do módulo de origem', () => {
    render(<MemoryRouter><DocumentOriginLinks row={{ vendaAdministrativaId: 15 }} links={notaSaidaConfig.detailLinks ?? []} permissions={['fiscal:read']} /></MemoryRouter>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it.each([null, undefined, 0, -2, 'abc'])('não inventa origem para id %s', (id) => {
    render(<MemoryRouter><DocumentOriginLinks row={{ vendaAdministrativaId: id }} links={notaSaidaConfig.detailLinks ?? []} permissions={['sales:read']} /></MemoryRouter>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('comandos fiscais exigem gerenciar fiscal', () => {
    expect(notaSaidaConfig.rowActionPermissions).toEqual(['fiscal:manage']);
    expect(notaServicoConfig.rowActionPermissions).toEqual(['fiscal:manage']);
  });
});
