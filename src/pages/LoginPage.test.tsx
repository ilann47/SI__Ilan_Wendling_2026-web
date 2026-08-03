import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { LoginPage } from './LoginPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

describe('LoginPage', () => {
  it('permite revelar e ocultar a senha sem alterar seu valor', async () => {
    vi.mocked(useAuth).mockReturnValue({ login: vi.fn(), isAuthenticated: false } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const user = userEvent.setup();
    const password = screen.getByLabelText(/^Senha/);
    await user.type(password, 'segredo-local');

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('segredo-local');

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(password).toHaveAttribute('type', 'password');
  });
});
