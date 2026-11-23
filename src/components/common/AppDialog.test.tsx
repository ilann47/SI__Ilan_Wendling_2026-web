import { Button } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppDialog } from './AppDialog';

describe('AppDialog', () => {
  it('oferece estrutura, rotulo e fechamento consistentes', async () => {
    const close = vi.fn();
    render(
      <AppDialog
        open
        title="Novo cadastro"
        description="Preencha os dados obrigatorios."
        onClose={close}
        actions={<Button>Salvar</Button>}
      >
        Conteudo do formulario
      </AppDialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Novo cadastro' });
    expect(dialog).toHaveAccessibleDescription('Preencha os dados obrigatorios.');
    const header = screen.getByRole('heading', { name: 'Novo cadastro' }).closest('header');
    expect(header).toContainElement(screen.getByText('Preencha os dados obrigatorios.'));
    expect(header).not.toContainElement(screen.getByText('Conteudo do formulario'));
    expect(screen.getByRole('button', { name: 'Salvar' }).closest('footer')).not.toBeNull();
    expect(screen.getByText('Preencha os dados obrigatorios.')).toBeInTheDocument();
    expect(screen.getByText('Conteudo do formulario')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar Novo cadastro' }));
    expect(close).toHaveBeenCalledOnce();
  });

  it('impede fechamento enquanto uma operacao esta em andamento', async () => {
    const close = vi.fn();
    render(
      <AppDialog open title="Processando" busy onClose={close}>
        Aguarde
      </AppDialog>,
    );

    expect(screen.getByRole('button', { name: 'Fechar Processando' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(close).not.toHaveBeenCalled();
  });

  it('mantem a largura declarada pelo caso de uso', () => {
    render(
      <AppDialog open title="Confirmacao" maxWidth="xs" onClose={() => undefined}>
        Confirme
      </AppDialog>,
    );

    expect(screen.getByRole('dialog')).toHaveClass('MuiDialog-paperWidthXs');
  });
});
