import { fireEvent, screen, waitFor, within } from '@testing-library/react';

export async function openReference(label: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Selecionar ${label.toLowerCase()}` }));
  return screen.findByRole('dialog');
}

export async function chooseReference(label: string, name: string | RegExp, term?: string) {
  const dialog = await openReference(label);
  if (term !== undefined) fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: term } });
  fireEvent.click(await within(dialog).findByRole('button', { name }));
  await waitFor(() => {
    if (dialog.isConnected) throw new Error('O seletor continua aberto');
  });
}
