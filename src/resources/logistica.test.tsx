import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import { transportadorasConfig } from './logistica';

function renderTransportadora() {
  const onSubmit = vi.fn();
  render(
    <ResourceFormDialog
      open
      title="Nova transportadora"
      fields={transportadorasConfig.fields.filter((field) => field.type !== 'reference')}
      initialValues={{ nome: 'TRANSPORTADORA TESTE', documento: '11222333000181' }}
      onClose={vi.fn()}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, save: screen.getByRole('button', { name: 'Salvar' }) };
}

describe('validação da transportadora', () => {
  it('sinaliza os campos inválidos e não envia, mesmo com submit direto no formulário', async () => {
    const { onSubmit, save } = renderTransportadora();
    await waitFor(() => expect(save).toBeEnabled());

    const invalidFields = [
      ['Telefone', '(45) 123', 'Informe um telefone com DDD e 10 ou 11 dígitos.'],
      ['E-mail', 'contato@', 'Informe um e-mail válido.'],
      ['CEP', '12345-6', 'Informe um CEP de 8 dígitos.'],
      ['Nome (razão social)', '   ', 'Informe a razão social.'],
    ];
    for (const [label, value, error] of invalidFields) {
      const input = screen.getByRole('textbox', { name: label });
      fireEvent.change(input, { target: { value } });
      expect(await screen.findByText(error)).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveValue(value);
    }
    expect(save).toBeDisabled();
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Nova transportadora' }));
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('mascara a digitação e impede letras e dígitos extras', async () => {
    const { save } = renderTransportadora();
    const user = userEvent.setup();
    const phone = screen.getByRole('textbox', { name: 'Telefone' });
    const cep = screen.getByRole('textbox', { name: 'CEP' });

    await user.type(phone, '45abc99999123456789');
    await user.type(cep, '01234xyz567890');

    expect(phone).toHaveValue('(45) 99999-1234');
    expect(cep).toHaveValue('01234-567');
    await waitFor(() => expect(save).toBeEnabled());
    await user.type(phone, '{Backspace}');
    expect(phone).toHaveValue('(45) 9999-9123');
  });

  it('recusa colagem acima do limite sem trocar o número existente', async () => {
    const { save } = renderTransportadora();
    const user = userEvent.setup();
    const phone = screen.getByRole('textbox', { name: 'Telefone' });
    const cep = screen.getByRole('textbox', { name: 'CEP' });
    await user.click(phone);
    await user.paste('+5545999991234');
    expect(phone).toHaveValue('+55 (45) 99999-1234');
    await user.keyboard('{Control>}a{/Control}');
    await user.paste('1'.repeat(30));
    expect(phone).toHaveValue('+55 (45) 99999-1234');
    await user.click(cep);
    await user.paste('123456789');
    expect(cep).toHaveValue('');
    await user.paste('01234567');
    expect(cep).toHaveValue('01234-567');
    await waitFor(() => expect(save).toBeEnabled());
  });

  it.each([
    ['4532221234', '(45) 3222-1234'],
    ['(45) 99999-1234', '(45) 99999-1234'],
    ['+55 (45) 99999-1234', '+55 (45) 99999-1234'],
    ['', ''],
  ])(
    'aceita telefone válido ou opcional vazio (%s) e envia o valor formatado',
    async (value, formatted) => {
      const { onSubmit, save } = renderTransportadora();
      const phone = screen.getByRole('textbox', { name: 'Telefone' });
      await waitFor(() => expect(save).toBeEnabled());
      expect(phone).toHaveAttribute('inputmode', 'tel');
      fireEvent.change(phone, { target: { value: '45123' } });
      await waitFor(() => expect(save).toBeDisabled());
      fireEvent.change(phone, { target: { value } });
      fireEvent.change(screen.getByRole('textbox', { name: 'E-mail' }),
        { target: { value: 'Contato@example.com' } });
      fireEvent.change(screen.getByRole('textbox', { name: 'CEP' }), { target: { value: '85890-000' } });

      await waitFor(() => expect(save).toBeEnabled());
      await userEvent.click(save);
      const payload = onSubmit.mock.calls[0]?.[0];
      expect(payload).toMatchObject({ email: 'Contato@example.com', cep: '85890-000' });
      if (formatted) expect(payload).toHaveProperty('telefone', formatted);
      else expect(payload).not.toHaveProperty('telefone');
    },
  );
});
