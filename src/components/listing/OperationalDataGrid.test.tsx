import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OperationalDataGrid } from './OperationalDataGrid';

describe('OperationalDataGrid', () => {
  it('mantém colunas e ações e destaca a identidade na própria célula', async () => {
    const onAction = vi.fn();
    const onRowClick = vi.fn();
    render(<OperationalDataGrid
      identityField="numero"
      disableVirtualization
      rows={[{ id: 1, numero: '0007', total: 120 }]}
      columns={[
        { field: 'numero', headerName: 'Número' },
        { field: 'total', headerName: 'Total', align: 'right' },
        { field: '__actions', headerName: 'Ações', renderCell: () => <button type="button" onClick={(event) => {
          event.stopPropagation();
          onAction();
        }}>Editar</button> },
      ]}
      onRowClick={onRowClick}
    />);
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent?.trim())).toEqual(['Número', 'Total', 'Ações']);
    const identity = screen.getByRole('gridcell', { name: '0007' });
    expect(identity.querySelector('[data-slot="row-identity"]')).toHaveTextContent('0007');
    const row = identity.closest('[role="row"]') as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: 'Editar' }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onRowClick).not.toHaveBeenCalled();
    await userEvent.click(identity);
    expect(onRowClick).toHaveBeenCalledOnce();
  });
});
