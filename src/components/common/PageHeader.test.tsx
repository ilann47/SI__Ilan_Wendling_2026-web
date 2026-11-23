import { Button } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ColorModeProvider } from '../../context/ColorModeContext';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('permite renderização isolada sem depender do contexto de rotas', () => {
    render(<ColorModeProvider><PageHeader title="Resumo" /></ColorModeProvider>);

    expect(screen.getByRole('heading', { level: 1, name: 'Resumo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
  });

  it('expõe uma hierarquia única e compreensível para a página', () => {
    render(<MemoryRouter initialEntries={['/app/clientes']}>
      <ColorModeProvider>
        <PageHeader
          title="Clientes"
          subtitle="Consulte e mantenha os clientes da organização."
          count={2}
          action={<Button>Novo cliente</Button>}
        />
      </ColorModeProvider>
    </MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: 'Clientes' })).toBeInTheDocument();
    expect(screen.getByText('Consulte e mantenha os clientes da organização.')).toBeInTheDocument();
    expect(screen.getByText('2 registros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo cliente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
  });

  it('volta pelo histórico quando existe uma página anterior', () => {
    render(<MemoryRouter initialEntries={['/app', '/app/clientes']} initialIndex={1}>
      <ColorModeProvider>
        <Routes>
          <Route path="/app/clientes" element={<PageHeader title="Clientes" />} />
          <Route path="/app" element={<div>Hub anterior</div>} />
        </Routes>
      </ColorModeProvider>
    </MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByText('Hub anterior')).toBeInTheDocument();
  });

  it('abre o Hub quando a tela foi acessada diretamente', () => {
    render(<MemoryRouter initialEntries={['/app/clientes']}>
      <ColorModeProvider>
        <Routes>
          <Route path="/app/clientes" element={<PageHeader title="Clientes" />} />
          <Route path="/app" element={<div>Hub seguro</div>} />
        </Routes>
      </ColorModeProvider>
    </MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByText('Hub seguro')).toBeInTheDocument();
  });
});
