import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationForm } from './OrganizationForm';

describe('OrganizationForm', () => {
  it('oferece seletores por nome e envia os códigos escolhidos sem perder os dados empresariais', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OrganizationForm title="Nova organização" description="Dados" submitLabel="Criar" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('CNPJ / documento empresarial'), '12345678000195');
    await user.type(screen.getByLabelText('Razão social'), 'Empresa de teste');
    const currency = screen.getByRole('combobox', { name: 'Moeda' });
    const region = screen.getByRole('combobox', { name: 'Região' });
    const plan = screen.getByRole('combobox', { name: 'Plano' });
    const timeZone = screen.getByRole('combobox', { name: 'Fuso horário' });
    expect(currency).toHaveValue('BRL');
    expect(region).toHaveValue('BR-SP');
    expect(plan).toHaveValue('ENTERPRISE');
    expect(timeZone).toHaveValue('America/Sao_Paulo');
    await user.selectOptions(currency, 'USD');
    await user.selectOptions(region, 'BR-PR');
    await user.selectOptions(plan, 'STANDARD');
    await user.selectOptions(timeZone, 'America/Manaus');
    expect(currency).toHaveDisplayValue('USD — Dólar americano');
    expect(region).toHaveDisplayValue('PR — Paraná');
    expect(plan).toHaveDisplayValue('Standard');
    expect(timeZone).toHaveDisplayValue('Manaus (America/Manaus)');
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ document: '12.345.678/0001-95',
      legalName: 'Empresa de teste', currency: 'USD', region: 'BR-PR', plan: 'STANDARD', timeZone: 'America/Manaus' }));
  });

  it('bloqueia a troca das opções enquanto salva', () => {
    render(<OrganizationForm title="Nova organização" description="Dados" submitLabel="Criar" loading onSubmit={vi.fn()} />);
    for (const field of ['Moeda', 'Região', 'Plano', 'Fuso horário']) {
      expect(screen.getByRole('combobox', { name: field })).toBeDisabled();
    }
  });

  it('mostra erro da API no seletor e foca o campo sem apagar os dados', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({ response: { status: 400, data: { erros: { currency: 'Moeda não aceita.' } } } });
    render(<OrganizationForm title="Nova organização" description="Dados" submitLabel="Criar" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('CNPJ / documento empresarial'), '12345678000195');
    await user.type(screen.getByLabelText('Razão social'), 'Empresa preservada');
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(await screen.findByText('Moeda não aceita.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Moeda' })).toHaveFocus());
    expect(screen.getByLabelText('Razão social')).toHaveValue('Empresa preservada');
  });
  it.each(['11.111.111/1111-11', '12.345.678/0001-90'])(
    'bloqueia o envio do CNPJ inválido %s, destaca o campo e permite corrigir',
    async (cnpj) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <OrganizationForm
          title="Nova organização"
          description="Dados empresariais"
          submitLabel="Criar"
          onSubmit={onSubmit}
        />,
      );
      const documentField = screen.getByLabelText('CNPJ / documento empresarial');
      await user.type(documentField, cnpj);
      await user.type(screen.getByLabelText('Razão social'), 'Empresa de teste');
      await user.click(screen.getByRole('button', { name: 'Criar' }));

      expect(await screen.findByText('Informe um CNPJ válido.')).toBeInTheDocument();
      expect(documentField).toHaveFocus();
      expect(onSubmit).not.toHaveBeenCalled();

      await user.clear(documentField);
      await user.type(documentField, '12345678000195');
      await user.click(screen.getByRole('button', { name: 'Criar' }));
      expect(onSubmit).toHaveBeenCalledOnce();
      expect(screen.queryByText('Informe um CNPJ válido.')).not.toBeInTheDocument();
    },
  );

  it('confirma o descarte de alteracoes no dialog padrao', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <OrganizationForm
        title="Nova organizacao"
        description="Dados empresariais"
        submitLabel="Criar"
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.type(screen.getByLabelText('Razão social'), 'Kaneko');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('alertdialog', { name: 'Descartar alterações?' })).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
