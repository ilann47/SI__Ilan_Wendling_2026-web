import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationForm } from './OrganizationForm';

describe('OrganizationForm', () => {
  it('confirma o descarte de alteracoes no dialog padrao', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <OrganizationForm
        title="Nova organizacao"
        description="Dados empresariais"
        submitLabel="Criar"
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.type(screen.getByLabelText('Razão social'), 'Kaneko');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('alertdialog', { name: 'Descartar alterações?' })).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
