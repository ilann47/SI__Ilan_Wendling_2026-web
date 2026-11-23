import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppRouteError } from './AppRouteError';

function renderWithError(error: Error, pathname = '/app') {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const router = createMemoryRouter([{
    path: '*',
    loader: () => { throw error; },
    errorElement: <AppRouteError />,
  }], { initialEntries: [pathname] });
  render(<RouterProvider router={router} />);
}

afterEach(() => vi.restoreAllMocks());

describe('AppRouteError', () => {
  it.each([
    'Failed to fetch dynamically imported module: /assets/HubHomePage-antigo.js',
    'error loading dynamically imported module: /assets/HubHomePage-antigo.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/style.css',
  ])('orienta a recarregar quando um arquivo da tela não carrega', async (message) => {
    renderWithError(new TypeError(message));

    expect(await screen.findByRole('heading', { name: 'Não foi possível carregar esta tela' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar página' })).toBeEnabled();
    expect(screen.queryByRole('link', { name: 'Ir para o início' })).not.toBeInTheDocument();
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it('mostra uma mensagem genérica sem expor detalhes de outros erros', async () => {
    const message = 'Internal implementation detail';
    renderWithError(new Error(message));

    expect(await screen.findByRole('heading', { name: 'Algo deu errado nesta página' })).toBeInTheDocument();
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it('oferece a home como alternativa quando uma tela interna falha', async () => {
    renderWithError(new Error('unexpected'), '/app/patio');
    const heading = await screen.findByRole('heading', { name: 'Algo deu errado nesta página' });
    expect(heading).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/app');
    expect(screen.getByText('Recarregar não encerra sua sessão.')).toBeInTheDocument();
  });
});
