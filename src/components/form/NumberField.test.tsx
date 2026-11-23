import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumberField, normalizeNumericInput } from './NumberField';

describe('NumberField', () => {
  it('remove zeros à esquerda sem alterar casas decimais', () => {
    expect(normalizeNumericInput('0025')).toBe('25');
    expect(normalizeNumericInput('00.25')).toBe('0.25');
    expect(normalizeNumericInput('-0025')).toBe('-25');
  });

  it('impede valor negativo quando o mínimo é zero e explica o limite', async () => {
    const onValueChange = vi.fn();
    render(<NumberField label="Valor" value="" min={0} onValueChange={onValueChange} />);

    const input = screen.getByLabelText('Valor');
    fireEvent.change(input, { target: { value: '-3' } });

    expect(onValueChange).not.toHaveBeenCalledWith(expect.stringContaining('-'));
    expect(screen.getByText('O valor mínimo é 0.')).toBeInTheDocument();

    await userEvent.type(input, '3');
    expect(onValueChange).toHaveBeenCalledWith('3');
  });

  it('aceita sinal negativo quando o domínio permite ajuste de saída', async () => {
    const onValueChange = vi.fn();
    render(<NumberField label="Delta" value="" onValueChange={onValueChange} />);

    fireEvent.change(screen.getByLabelText('Delta'), { target: { value: '-3' } });
    expect(onValueChange).toHaveBeenLastCalledWith('-3');
  });
});
