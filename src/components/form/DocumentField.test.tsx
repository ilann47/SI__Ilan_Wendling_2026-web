import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { DocumentField } from './DocumentField';

function mount(documento: string, tipo: string, allowAlphanumericCnpj = true) {
  const submit = vi.fn();
  function Form() {
    const form = useForm({ defaultValues: { documento, tipo } });
    return <FormProvider {...form}>
      <form onSubmit={(event) => void form.handleSubmit(submit)(event)}>
        <DocumentField field={{ name: 'documento', label: 'Documento', type: 'document', documentTypeFrom: 'tipo',
          required: true, allowAlphanumericCnpj }} />
        <button type="submit">Salvar</button>
      </form>
    </FormProvider>;
  }
  const { unmount } = render(<Form />);
  return { submit, unmount, input: screen.getByRole('textbox', { name: 'Documento' }) as HTMLInputElement };
}

describe('CPF e CNPJ no cadastro de Clientes', () => {
  it('abre e envia novamente um CNPJ alfanumérico sem remover as letras', async () => {
    const { input, submit } = mount('12ABC34501DE35', 'JURIDICA');
    expect(input.value).toBe('12.ABC.345/01DE-35');
    fireEvent.change(input, { target: { value: '12.abc.345/01de-35' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(submit.mock.calls[0]?.[0]).toEqual({ documento: '12ABC34501DE35', tipo: 'JURIDICA' }));
  });

  it('bloqueia CNPJ alfanumérico com dígito verificador errado', async () => {
    const { input, submit } = mount('', 'JURIDICA');
    fireEvent.change(input, { target: { value: '12.ABC.345/01DE-36' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('CNPJ inválido.')).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it('mantém CPF numérico e o campo numérico sem adesão ao CNPJ alfanumérico', () => {
    const { input, unmount } = mount('', 'FISICA', true);
    expect(input.inputMode).toBe('numeric');
    fireEvent.change(input, { target: { value: '529.982.247-25' } });
    expect(input.value).toBe('529.982.247-25');
    unmount();
    expect(mount('', 'JURIDICA', false).input.inputMode).toBe('numeric');
  });
});
