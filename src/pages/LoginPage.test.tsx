import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { LoginPage } from './LoginPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../context/ColorModeContext', () => ({
  useColorMode: () => ({ mode: 'light', toggle: vi.fn() }),
}));

function renderLogin(loginImpl: ReturnType<typeof vi.fn>) {
  vi.mocked(useAuth).mockReturnValue({
    login: loginImpl,
    isAuthenticated: false,
  } as unknown as ReturnType<typeof useAuth>);
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

function axiosError(status: number, data?: unknown, message = `Request failed with status code ${status}`) {
  const error = new AxiosError(message);
  error.response = {
    status,
    statusText: 'Error',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  error.config = { headers: new AxiosHeaders(), url: '/api/auth/login' };
  return error;
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('apresenta a identidade do hub e somente capacidades reais do produto', () => {
    renderLogin(vi.fn());

    expect(screen.getByRole('heading', { name: /Hub Operacional Kaneko/i })).toBeInTheDocument();
    expect(screen.getByText('Acesso contextual por organização')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/register');
    expect(screen.queryByText('Lembrar meu acesso')).not.toBeInTheDocument();
  });

  it('permite revelar e ocultar a senha sem alterar seu valor', async () => {
    renderLogin(vi.fn());
    const user = userEvent.setup();
    const password = screen.getByLabelText(/^Senha/);
    await user.type(password, 'segredo-local');

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('segredo-local');

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('exibe credencial invalida amigavel em ProblemDetail 401', async () => {
    const login = vi.fn().mockRejectedValue(axiosError(401, {
      title: 'Nao autenticado',
      detail: 'Login ou senha inválidos.',
      status: 401,
      traceId: 'login-trace',
    }));
    renderLogin(login);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^Login/), 'admin');
    await user.type(screen.getByLabelText(/^Senha/), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Login ou senha inválidos.');
    expect(screen.getByRole('alert')).toHaveTextContent('Código para suporte: login-trace');
    expect(screen.getByRole('alert').textContent).not.toMatch(/request failed/i);
  });

  it('nunca mostra texto do Axios em erro 500', async () => {
    const login = vi.fn().mockRejectedValue(axiosError(500, undefined, 'Request failed with status code 500'));
    renderLogin(login);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^Login/), 'admin');
    await user.type(screen.getByLabelText(/^Senha/), 'senha');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('O sistema encontrou um problema. Tente novamente.');
    expect(screen.getByRole('alert').textContent).not.toMatch(/Request failed|status code/i);
  });

  it('diferencia backend indisponivel e timeout', async () => {
    const user = userEvent.setup();
    const network = new AxiosError('Network Error', 'ERR_NETWORK');
    network.request = {};
    network.config = { headers: new AxiosHeaders(), url: '/api/auth/login' };
    const login = vi.fn()
      .mockRejectedValueOnce(network)
      .mockRejectedValueOnce(Object.assign(new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED'), {
        request: {},
        config: { headers: new AxiosHeaders(), url: '/api/auth/login' },
      }));

    renderLogin(login);
    await user.type(screen.getByLabelText(/^Login/), 'admin');
    await user.type(screen.getByLabelText(/^Senha/), 'senha');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor.');

    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('A solicitação demorou demais. Tente novamente.');
    });
  });

  it('permite nova tentativa sem recarregar a pagina', async () => {
    const login = vi.fn()
      .mockRejectedValueOnce(axiosError(500))
      .mockResolvedValueOnce(undefined);
    renderLogin(login);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^Login/), 'admin');
    await user.type(screen.getByLabelText(/^Senha/), 'senha');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(login).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
