import { Chip } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListingCards } from './ListingCards';

describe('ListingCards', () => {
  it.each([true, false])('aceita Chip em campo sem aninhar div dentro de parágrafo (abrir=%s)', (abrir) => {
    const open = vi.fn();
    const row = { id: 1, numero: 'OC-1' };
    render(<ListingCards rows={[row]} getKey={(item) => item.id} getTitle={(item) => item.numero}
      getFields={() => [{ label: 'Situação', value: <Chip label="APROVADA" /> }]}
      onOpen={abrir ? open : undefined} />);
    const chip = screen.getByText('APROVADA').closest('.MuiChip-root');
    expect(chip?.parentElement?.tagName).toBe('DIV');
    expect(chip?.closest('p')).toBeNull();
    if (abrir) {
      fireEvent.click(screen.getByRole('button', { name: 'Abrir detalhes' }));
      expect(open).toHaveBeenCalledWith(row);
    }
  });
});
