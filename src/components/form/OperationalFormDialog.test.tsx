import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OperationalFormDialog } from './OperationalFormDialog';

describe('OperationalFormDialog', () => {
  it('mantem acoes fixas e confirma descarte quando o formulario foi alterado', async () => {
    const onClose = vi.fn();
    render(
      <OperationalFormDialog open title="Novo cadastro" formId="custom-form"
        submitLabel="Salvar" dirty onClose={onClose} onSubmit={vi.fn()}>
        <input aria-label="Nome" />
      </OperationalFormDialog>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Descartar alterações?' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Descartar cadastro' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
