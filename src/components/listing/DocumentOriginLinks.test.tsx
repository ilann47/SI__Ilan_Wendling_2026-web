import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { notaSaidaConfig, notaServicoConfig } from '../../resources/fiscal';
import { DocumentOriginLinks } from './DocumentOriginLinks';

describe('origem comercial do documento fiscal', () => {
  it('abre a ordem de serviço exata com a permissão de leitura contextual', () => {
    render(<MemoryRouter><DocumentOriginLinks row={{ ordemServicoId: 18 }} links={notaServicoConfig.detailLinks ?? []} permissions={['service_orders:read']} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Ver ordem de serviço' })).toHaveAttribute('href', '/app/ordens-servico?detail=18');
  });
  it('não oferece seletor ou link de pedido de venda na nota de saída', () => {
    expect(notaSaidaConfig.fields.some((field) => field.name === 'vendaAdministrativaId')).toBe(false);
    render(<MemoryRouter><DocumentOriginLinks row={{ vendaAdministrativaId: 15 }} links={notaSaidaConfig.detailLinks ?? []} permissions={['sales:read']} /></MemoryRouter>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('não mostra links sem permissão do módulo de origem', () => {
    render(<MemoryRouter><DocumentOriginLinks row={{ ordemServicoId: 18 }} links={notaServicoConfig.detailLinks ?? []} permissions={['fiscal:read']} /></MemoryRouter>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it.each([null, undefined, 0, -2, 'abc'])('não inventa origem para id %s', (id) => {
    render(<MemoryRouter><DocumentOriginLinks row={{ ordemServicoId: id }} links={notaServicoConfig.detailLinks ?? []} permissions={['service_orders:read']} /></MemoryRouter>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('comandos fiscais exigem gerenciar fiscal', () => {
    expect(notaSaidaConfig.rowActionPermissions).toEqual(['fiscal:manage']);
    expect(notaServicoConfig.rowActionPermissions).toEqual(['fiscal:manage']);
  });
});
