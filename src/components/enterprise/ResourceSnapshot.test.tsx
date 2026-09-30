import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResourceSnapshot } from './ResourceSnapshot';

describe('ResourceSnapshot', () => {
  it('apresenta rótulos e valores operacionais sem expor chaves técnicas', () => {
    render(<ResourceSnapshot data={{
      eventId: 7,
      status: 'VENDAS_ABERTAS',
      configurationChecklist: { ready: true, parkingProduct: false },
    }} />);

    expect(screen.getByText('Dados confirmados pelo sistema')).toBeInTheDocument();
    expect(screen.getByText('Evento')).toBeInTheDocument();
    expect(screen.getAllByText('Vendas abertas').length).toBeGreaterThan(0);
    expect(screen.getByText('Conferência da configuração')).toBeInTheDocument();
    expect(screen.getByText('Pronto: Sim · Produto de estacionamento: Não')).toBeInTheDocument();
    expect(screen.queryByText('VENDAS_ABERTAS')).not.toBeInTheDocument();
  });

  it('não interpreta totais de capacidade como valores monetários', () => {
    render(<ResourceSnapshot data={{ totalAvailable: 89, guaranteesHold: false }} />);

    expect(screen.getByText('Total disponível')).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(screen.getByText('Disponibilidade garantida')).toBeInTheDocument();
    expect(screen.getByText('Não')).toBeInTheDocument();
  });

  it('traduz os campos operacionais comuns de pedidos', () => {
    render(<ResourceSnapshot data={{
      id: 1,
      number: 'PED-1',
      buyer: 'Mariana',
      status: 'CONFIRMADO',
      vehiclePlate: 'ABC1D23',
      version: 2,
    }} />);

    expect(screen.getByText('Código interno')).toBeInTheDocument();
    expect(screen.getByText('Número')).toBeInTheDocument();
    expect(screen.getByText('Comprador')).toBeInTheDocument();
    expect(screen.getByText('Situação')).toBeInTheDocument();
    expect(screen.getByText('Placa do veículo')).toBeInTheDocument();
    expect(screen.getByText('Versão')).toBeInTheDocument();
    expect(screen.queryByText('Buyer')).not.toBeInTheDocument();
    expect(screen.queryByText('Vehicle Plate')).not.toBeInTheDocument();
  });
});
