import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ChargeBreakdown } from './ChargeBreakdown';

describe('Composição da cobrança no caixa', () => {
  it('recolhe os detalhes para priorizar a placa e permite consultar todas as seis casas', async () => {
    render(<ChargeBreakdown snapshot={{ valorCalculado: '25.123456', valorDevido: '25.120000', diferencaArredondamento: '-0.003456' }} />);
    const action = screen.getByText('Ver composição do valor');
    const details = action.closest('details');
    expect(details).not.toHaveAttribute('open');
    await userEvent.click(action);
    expect(details).toHaveAttribute('open');
    expect(screen.getByText(/25,123456/)).toBeInTheDocument();
    expect(screen.getByText(/0,003456/)).toBeInTheDocument();
  });
  it('não inventa composição nem recalcula um histórico sem snapshot', () => {
    const { container } = render(<ChargeBreakdown snapshot={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
