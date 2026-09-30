import { fireEvent, render, screen } from '@testing-library/react';
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
      { name: '_totais', label: 'Totais', type: 'subitems-summary', subItemsSummary: 'purchase-costs' },
      { name: 'observacao', label: 'Observacao', type: 'text' },
    ];

    expect(buildResourcePayload(fields, {
      nome: 'PRODUTO',
      ativo: false,
      quantidadeMinima: 0,
      categoriaId: null,
      custo: 99,
      _totais: 'nao enviar',
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
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
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

  it('confirma antes de descartar um cadastro alterado', async () => {
    const close = vi.fn();
    const user = userEvent.setup();
    render(
      <ResourceFormDialog
        open
        title="Nova ordem"
        fields={[{ name: 'numero', label: 'Número', type: 'text' }]}
        onClose={close}
        onSubmit={() => undefined}
      />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Número' }), 'OC-1');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Descartar alterações?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Descartar cadastro' }));
    expect(close).toHaveBeenCalledOnce();
  });

  it('fecha sem confirmação quando o formulário permanece intacto', async () => {
    const close = vi.fn();
    render(
      <ResourceFormDialog
        open
        title="Novo cadastro"
        fields={[{ name: 'nome', label: 'Nome', type: 'text' }]}
        onClose={close}
        onSubmit={() => undefined}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(close).toHaveBeenCalledOnce();
    expect(screen.queryByRole('heading', { name: 'Descartar alterações?' })).not.toBeInTheDocument();
  });

  it('substitui o zero inicial ao preencher um valor monetário', async () => {
    const user = userEvent.setup();
    render(
      <ResourceFormDialog
        open
        title="Nova ordem"
        fields={[{ name: 'frete', label: 'Frete', type: 'money', defaultValue: 0 }]}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const frete = screen.getByRole('spinbutton', { name: 'Frete' });
    await user.click(frete);
    await user.type(frete, '25');
    expect(frete).toHaveValue(25);
  });

  it('normaliza zeros à esquerda mesmo quando o navegador mantém o zero inicial', () => {
    render(
      <ResourceFormDialog
        open
        title="Nova ordem"
        fields={[{ name: 'despesas', label: 'Outras despesas', type: 'money', defaultValue: 0 }]}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const despesas = screen.getByRole('spinbutton', { name: 'Outras despesas' });
    fireEvent.change(despesas, { target: { value: '011' } });

    expect(despesas).toHaveDisplayValue('11');
  });

  it('recusa valores monetários negativos com erro no próprio campo', async () => {
    const submit = vi.fn();
    render(
      <ResourceFormDialog
        open
        title="Novo lançamento"
        fields={[{ name: 'valorUnitario', label: 'Valor unitário', type: 'money', required: true }]}
        onClose={() => undefined}
        onSubmit={submit}
      />,
    );

    const input = screen.getByRole('spinbutton', { name: 'Valor unitário' });
    fireEvent.change(input, { target: { value: '-3' } });

    expect(submit).not.toHaveBeenCalled();
    expect(await screen.findByText('O valor mínimo é 0.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveValue(null);
  });

  it('valida percentuais entre zero e cem', async () => {
    const submit = vi.fn();
    render(
      <ResourceFormDialog
        open
        title="Nova condição"
        fields={[{ name: 'percentual', label: 'Percentual', type: 'percent' }]}
        onClose={() => undefined}
        onSubmit={submit}
      />,
    );

    const input = screen.getByRole('spinbutton', { name: 'Percentual' });
    fireEvent.change(input, { target: { value: '101' } });

    expect(submit).not.toHaveBeenCalled();
    expect(await screen.findByText('O valor máximo é 100.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
  });
});
