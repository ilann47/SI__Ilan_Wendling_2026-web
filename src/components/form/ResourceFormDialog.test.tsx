import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FieldConfig } from './fieldConfig';
import { buildResourcePayload, ResourceFormDialog } from './ResourceFormDialog';

describe('ResourceFormDialog', () => {
  it('omite campos desconhecidos e disabled sem perder false, zero ou null', () => {
    const fields: FieldConfig[] = [
      { name: 'nome', label: 'Nome', type: 'text' },
      { name: 'ativo', label: 'Ativo', type: 'switch' },
      { name: 'quantidadeMinima', label: 'Minimo', type: 'number' },
      { name: 'categoriaId', label: 'Categoria', type: 'reference' },
      { name: 'custo', label: 'Custo', type: 'money', disabled: true },
      { name: 'observacao', label: 'Observacao', type: 'text' },
    ];

    expect(buildResourcePayload(fields, {
      nome: 'PRODUTO',
      ativo: false,
      quantidadeMinima: 0,
      categoriaId: null,
      custo: 99,
      observacao: '',
      organizationId: 42,
      version: 7,
    })).toEqual({
      nome: 'PRODUTO',
      ativo: false,
      quantidadeMinima: 0,
      categoriaId: null,
    });
  });

  it('oferece recarga explicita quando a versao fica desatualizada', async () => {
    const reload = vi.fn();
    render(
      <ResourceFormDialog
        open
        title="Editar Produto"
        fields={[{ name: 'nome', label: 'Nome', type: 'text' }]}
        initialValues={{ nome: 'ORIGINAL' }}
        conflictMessage="O cadastro mudou no servidor."
        onReload={reload}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(screen.getByText('O cadastro mudou no servidor.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Recarregar dados' }));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('bloqueia uma identidade imutavel somente durante a edicao', () => {
    const field: FieldConfig = {
      name: 'produtoId',
      label: 'Produto',
      type: 'text',
      disabledOnEdit: true,
    };
    const { rerender } = render(
      <ResourceFormDialog
        open
        title="Novo vinculo"
        fields={[field]}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Produto' })).toBeEnabled();

    rerender(
      <ResourceFormDialog
        open
        title="Editar vinculo"
        fields={[field]}
        initialValues={{ produtoId: 10 }}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Produto' })).toBeDisabled();
  });
});
