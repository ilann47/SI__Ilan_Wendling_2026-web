import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppliedFilterChips } from './AppliedFilterChips';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { buildDetailSections, formatDetailValue, highlightTerm } from './listingUtils';
import { SecondaryActionsMenu } from './SecondaryActionsMenu';

describe('listing utils', () => {
  it('destaca o termo encontrado sem alterar o restante', () => {
    expect(highlightTerm('Mariana Souza', 'mari')).toEqual([
      { text: 'Mari', match: true },
      { text: 'ana Souza', match: false },
    ]);
  });

  it('prioriza nomes legíveis e remove identificadores técnicos duplicados', () => {
    const fields = buildDetailSections({
      id: 1,
      clienteId: 6,
      clienteNome: 'Mariana Souza',
      condicaoPagamentoId: 4,
      condicaoPagamentoNome: 'À vista',
      localEstoqueId: 3,
      localEstoqueNome: 'Depósito principal',
      veiculoId: 7,
      veiculoPlaca: 'ABC1D23',
      createdAt: '2026-09-28T10:00:00Z',
      updatedAt: '2026-09-28T11:00:00Z',
    }).flatMap((section) => section.fields);

    expect(fields.map((field) => field.label)).toEqual([
      'Criado em', 'Atualizado em', 'Cliente', 'Condição de pagamento', 'Local de estoque', 'Veículo',
    ]);
    expect(fields.map((field) => field.value)).toEqual(expect.arrayContaining([
      'Mariana Souza', 'À vista', 'Depósito principal', 'ABC1D23',
    ]));
  });

  it('formata despesas monetárias como moeda', () => {
    expect(formatDetailValue(0, 'outrasDespesas')).toBe('R$ 0,00');
  });

  it('trata limite de crédito como moeda e mantém rótulos em português', () => {
    const fields = buildDetailSections({
      limiteCredito: 5000,
      dataNascimento: '1988-03-20',
      endereco: 'Rua A',
    }).flatMap((section) => section.fields);

    expect(fields).toEqual(expect.arrayContaining([
      { label: 'Limite de crédito', value: 'R$ 5.000,00' },
      { label: 'Data de nascimento', value: '20/03/1988' },
      { label: 'Endereço', value: 'Rua A' },
    ]));
  });

  it('não expõe enums técnicos no detalhe de pessoas', () => {
    const fields = buildDetailSections({
      tipo: 'FISICA',
      sexo: 'FEMININO',
      estadoCivil: 'CASADO',
      email: 'pessoa@exemplo.com',
    }).flatMap((section) => section.fields);

    expect(fields).toEqual(expect.arrayContaining([
      { label: 'Tipo', value: 'Física' },
      { label: 'Sexo', value: 'Feminino' },
      { label: 'Estado civil', value: 'Casado' },
      { label: 'E-mail', value: 'pessoa@exemplo.com' },
    ]));
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
