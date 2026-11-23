import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ColorModeProvider } from '../../context/ColorModeContext';
import { ListingToolbar } from './ListingToolbar';

describe('ListingToolbar', () => {
  it('abre filtros no dialog padrao e mantem as acoes proximas do formulario', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(
      <ColorModeProvider>
        <ListingToolbar
          searchValue=""
          onSearchChange={vi.fn()}
          appliedCount={1}
          onClear={onClear}
          filterForm={<label htmlFor="situacao">Situação<input id="situacao" /></label>}
        />
      </ColorModeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Filtros, 1 aplicados' }));

    expect(screen.getByRole('dialog', { name: 'Filtros' })).toBeInTheDocument();
    expect(screen.getByLabelText('Situação')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('permite limpar a busca sem apagar os demais filtros', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    render(
      <ColorModeProvider>
        <ListingToolbar
          searchValue="cliente"
          searchLabel="Buscar cliente"
          onSearchChange={onSearchChange}
        />
      </ColorModeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(onSearchChange).toHaveBeenCalledWith('');
  });
});
