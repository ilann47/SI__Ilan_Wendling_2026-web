import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppliedFilterChips } from './AppliedFilterChips';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { highlightTerm } from './listingUtils';
import { SecondaryActionsMenu } from './SecondaryActionsMenu';

describe('listing utils', () => {
  it('destaca o termo encontrado sem alterar o restante', () => {
    expect(highlightTerm('Mariana Souza', 'mari')).toEqual([
      { text: 'Mari', match: true },
      { text: 'ana Souza', match: false },
    ]);
  });
});

describe('EmptyState e ErrorState', () => {
  it('apresenta estado vazio útil', () => {
    render(<EmptyState title="Nenhum cliente encontrado" description="Ajuste os filtros." />);
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum cliente encontrado');
    expect(screen.getByText('Ajuste os filtros.')).toBeInTheDocument();
  });

  it('permite tentar novamente no erro', () => {
    const retry = vi.fn();
    render(<ErrorState message="Falha ao carregar" onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe('AppliedFilterChips', () => {
  it('mostra chips e limpa filtros', () => {
    const onClear = vi.fn();
    const onRemove = vi.fn();
    render(
      <AppliedFilterChips
        filters={[{ name: 'ativo', label: 'Situação', type: 'boolean' }]}
        values={{ ativo: 'true' }}
        onRemove={onRemove}
        onClear={onClear}
      />,
    );
    expect(screen.getByText('Situação: Sim')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});

describe('SecondaryActionsMenu', () => {
  it('abre o menu de ações secundárias', () => {
    const onClick = vi.fn();
    render(<SecondaryActionsMenu actions={[{ key: 'edit', label: 'Editar', onClick }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
