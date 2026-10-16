import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { api } from '../api/client';
import { AuthProvider } from '../auth/AuthContext';
import { OrganizationAccessBoundary } from '../auth/OrganizationAccessBoundary';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

vi.mock('../context/ColorModeContext', () => ({
  useColorMode: () => ({ mode: 'light', toggle: vi.fn() }),
}));

function makeJwt(payload: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

const registerToken = makeJwt({
  sub: 'maria.silva',
  perfil: 'USUARIO',
  exp: Math.floor(Date.now() / 1000) + 3600,
});

function renderRegister(initial = '/register') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/app"
              element={(
                <OrganizationAccessBoundary>
                  <span>Area tenant</span>
                </OrganizationAccessBoundary>
              )}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function fillValidForm(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    nome: 'Maria da Silva',
    login: 'maria.silva',
    email: 'maria.silva@example.com',
    senha: 'senha-segura-123',
    confirmacao: 'senha-segura-123',
    ...overrides,
  };
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: values.nome } });
  fireEvent.change(screen.getByLabelText('Login'), { target: { value: values.login } });
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: values.email } });
  fireEvent.change(screen.getByLabelText(/^Senha$/), { target: { value: values.senha } });
  fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: values.confirmacao } });
  return values;
}

function mockSuccessfulRegister(organizations: unknown[] = []) {
  vi.spyOn(api, 'post').mockResolvedValue({
    data: {
      id: 123,
      nome: 'Maria da Silva',
      login: 'maria.silva',
      email: 'maria.silva@example.com',
      token: registerToken,
      tipo: 'Bearer',
      perfil: 'USUARIO',
    },
  });
  const getSpy = vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (String(url).includes('/api/v1/me') && !String(url).includes('organizations') && !String(url).includes('permissions')) {
      return { data: { id: 123, login: 'maria.silva', perfil: 'USUARIO' } };
    }
    return { data: organizations };
  });
  return getSpy;
}

describe('RegisterPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renderiza a pagina de cadastro', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar minha conta' })).toBeInTheDocument();
  });

  it('liga login e cadastro pelos links', async () => {
    const user = userEvent.setup();
    renderRegister('/login');
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/register');
    await user.click(screen.getByRole('link', { name: 'Criar conta' }));
    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
  });

  it('exige campos obrigatorios', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));
    expect(screen.getByText('Informe o nome completo.')).toBeInTheDocument();
    expect(screen.getByText('Informe o login.')).toBeInTheDocument();
    expect(screen.getByText('Informe o e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toHaveFocus();
  });

  it('valida e-mail invalido', async () => {
    const user = userEvent.setup();
    renderRegister();
    fillValidForm({ email: 'nao-e-email' });
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
  });

  it('rejeita senha menor que 8 caracteres', async () => {
    const user = userEvent.setup();
    renderRegister();
    fillValidForm({ senha: 'curta', confirmacao: 'curta' });
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));
    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument();
  });

  it('rejeita senha maior que 72 caracteres', async () => {
    const user = userEvent.setup();
    renderRegister();
    const long = 'a'.repeat(73);
    fillValidForm({ senha: long, confirmacao: long });
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));
    expect(screen.getByText('A senha pode ter no máximo 72 caracteres.')).toBeInTheDocument();
  });

  it('rejeita confirmacao diferente', async () => {
    const user = userEvent.setup();
    renderRegister();
    fillValidForm({ confirmacao: 'outra-senha-123' });
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));
    expect(screen.getByText('A confirmação deve ser igual à senha.')).toBeInTheDocument();
  });

  it('desabilita o botao durante o envio e envia so os quatro campos', async () => {
    const user = userEvent.setup();
    let resolvePost: (value: unknown) => void = () => undefined;
    const postPromise = new Promise((resolve) => { resolvePost = resolve; });
    const postSpy = vi.spyOn(api, 'post').mockImplementation(() => postPromise as never);
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (String(url).includes('/api/v1/me') && !String(url).includes('organizations')) {
        return { data: { id: 123, login: 'maria.silva', perfil: 'USUARIO' } };
      }
      return { data: [] };
    });

    renderRegister();
    fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));

    expect(screen.getByRole('button', { name: 'Criando conta…' })).toBeDisabled();
    expect(postSpy).toHaveBeenCalledWith('/api/auth/register', {
      nome: 'Maria da Silva',
      login: 'maria.silva',
      email: 'maria.silva@example.com',
      senha: 'senha-segura-123',
    });
    expect(Object.keys(postSpy.mock.calls[0][1] as object).sort()).toEqual(['email', 'login', 'nome', 'senha']);

    resolvePost({
      data: {
        id: 123,
        nome: 'Maria da Silva',
        login: 'maria.silva',
        email: 'maria.silva@example.com',
        token: registerToken,
        tipo: 'Bearer',
        perfil: 'USUARIO',
      },
    });

    await waitFor(() => expect(localStorage.getItem('kaneko.token')).toBe(registerToken));
    expect(document.body.textContent).not.toContain(registerToken);
  });

  it('armazena a sessao apos HTTP 201, consulta organizacoes e mostra onboarding vazio', async () => {
    const user = userEvent.setup();
    const getSpy = mockSuccessfulRegister([]);

    renderRegister();
    fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));

    await waitFor(() => expect(localStorage.getItem('kaneko.token')).toBe(registerToken));
    expect(getSpy).toHaveBeenCalledWith('/api/v1/me/organizations');
    expect(await screen.findByRole('heading', { name: 'Escolha a organização' })).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma organização é ativada automaticamente/i)).toBeInTheDocument();
    expect(screen.queryByText('Area tenant')).not.toBeInTheDocument();
    expect(screen.queryByText('Operação')).not.toBeInTheDocument();
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(registerToken);
  });

  it('usa o seletor existente quando ha organizacoes acessiveis', async () => {
    const user = userEvent.setup();
    mockSuccessfulRegister([
      {
        organizationId: 10,
        legalName: 'Kaneko Eventos',
        membershipId: 20,
        membershipVersion: 0,
      },
      {
        organizationId: 11,
        legalName: 'Kaneko Operacoes',
        membershipId: 21,
        membershipVersion: 0,
      },
    ]);

    renderRegister();
    fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));

    expect(await screen.findByText('Escolha a organização')).toBeInTheDocument();
    expect(screen.getByText('Kaneko Eventos')).toBeInTheDocument();
    expect(screen.queryByText('Area tenant')).not.toBeInTheDocument();
  });

  it('associa erros HTTP 400 aos campos', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'post').mockRejectedValue({
      response: {
        status: 400,
        data: {
          title: 'Requisicao invalida',
          detail: 'Ha campos invalidos na requisicao.',
          erros: {
            login: 'Login já utilizado neste contexto.',
            email: 'E-mail inválido.',
          },
        },
      },
    });

    renderRegister();
    fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));

    expect(await screen.findByText('Login já utilizado neste contexto.')).toBeInTheDocument();
    expect(screen.getByText('E-mail inválido.')).toBeInTheDocument();
  });

  it('campo desconhecido no ProblemDetail vira erro geral com detail', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'post').mockRejectedValue({
      response: {
        status: 400,
        data: {
          title: 'Requisicao invalida',
          detail: 'Ha campos invalidos na requisicao.',
          erros: {
            perfil: 'Campo nao permitido.',
          },
        },
      },
    });

    renderRegister();
    fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));

    expect(await screen.findByText('Ha campos invalidos na requisicao.')).toBeInTheDocument();
  });

  it('apresenta mensagem neutra em HTTP 409', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'post').mockRejectedValue({
      response: {
        status: 409,
        data: { title: 'Conflito', detail: 'Login ou e-mail já cadastrado.', status: 409 },
      },
    });

    renderRegister();
    fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));

    expect(await screen.findByText('Login ou e-mail já cadastrado.')).toBeInTheDocument();
  });

  it('preserva o formulario em falha de conexao e limpa apenas a senha', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'post').mockRejectedValue(new Error('Network Error'));

    renderRegister();
    fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));

    expect(await screen.findByText('Não foi possível criar sua conta agora. Tente novamente em alguns instantes.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Maria da Silva');
    expect(screen.getByLabelText('Login')).toHaveValue('maria.silva');
    expect(screen.getByLabelText('E-mail')).toHaveValue('maria.silva@example.com');
    expect(screen.getByLabelText(/^Senha$/)).toHaveValue('');
    expect(screen.getByLabelText('Confirmar senha')).toHaveValue('');
  });

  it('preserva o formulario em HTTP 500 e limpa apenas a senha', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 500, data: { title: 'Erro interno' } },
    });

    renderRegister();
    fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));

    expect(await screen.findByText('Não foi possível criar sua conta agora. Tente novamente em alguns instantes.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Maria da Silva');
    expect(screen.getByLabelText(/^Senha$/)).toHaveValue('');
  });

  it('permite sair no estado sem organizacao e limpa a sessao', async () => {
    const user = userEvent.setup();
    mockSuccessfulRegister([]);

    renderRegister();
    fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));
    expect(await screen.findByRole('button', { name: 'Sair' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(localStorage.getItem('kaneko.token')).toBeNull());
  });

  it('apos refresh mantem conta USUARIO sem org no onboarding', async () => {
    localStorage.setItem('kaneko.token', registerToken);
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (String(url).includes('/api/v1/me') && !String(url).includes('organizations')) {
        return { data: { id: 123, login: 'maria.silva', perfil: 'USUARIO' } };
      }
      return { data: [] };
    });

    renderRegister('/app');

    expect(await screen.findByRole('heading', { name: 'Escolha a organização' })).toBeInTheDocument();
    expect(screen.queryByText('Area tenant')).not.toBeInTheDocument();
    expect(localStorage.getItem('kaneko.token')).toBe(registerToken);
  });

  it('mantem layout responsivo basico no card', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar minha conta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Requisitos da senha')).toBeInTheDocument();
  });
});
