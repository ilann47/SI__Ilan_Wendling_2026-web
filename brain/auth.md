# Autenticacao

## Objetivo

Autenticar o usuario, criar conta autoatendida, selecionar a organizacao ativa e
manter a sessao alinhada ao JWT contextual emitido pelo backend.

## Contexto

O frontend nao inventa Membership. Login e cadastro produzem um JWT global;
operacoes de negocio exigem token contextual com `org_id`. Contas novas nascem
com perfil `USUARIO` e sem organizacao ate receberem Membership.

## Fluxo

1. Login em `POST /api/auth/login` ou cadastro em `POST /api/auth/register`.
2. Persistencia do JWT em `localStorage` (`kaneko.token`) e hidratacao do
   AuthContext.
3. Consulta de organizacoes acessiveis em `GET /api/v1/me/organizations`.
4. Zero organizacoes: estado vazio de onboarding (sem menus operacionais).
5. Uma ou mais organizacoes sem `org_id` no JWT: tela de escolha (sem
   auto-selecao).
6. Usuario autenticado com tenant pode reabrir a escolha via
   “Escolher ou criar organização”.
7. Troca/ativacao: `POST /api/v1/me/active-organization`.
8. Permissoes efetivas em `GET /api/v1/me/permissions`.
9. Logout limpa token, cache React Query e estado local.

Cadastro (`/register`) envia somente `{ nome, login, email, senha }`. Confirmacao
de senha e exclusiva do frontend. Apos HTTP 201, o fluxo de sessao e o mesmo do
login.

Criacao de organizacao:
- USUARIO: `POST /api/v1/me/organizations` (atomico).
- ADMIN: `POST /api/v1/organizations` + membership.
- OPERADOR: sem criacao.
Entrada na organizacao e sempre explicita.
## Endpoints

| Metodo | Caminho | Uso |
|---|---|---|
| POST | `/api/auth/login` | Autenticacao |
| POST | `/api/auth/register` | Criacao de conta |
| GET | `/api/v1/me/organizations` | Organizacoes acessiveis |
| POST | `/api/v1/me/active-organization` | JWT contextual |
| POST | `/api/v1/me/organizations` | Self-service USUARIO |
| POST | `/api/v1/organizations` | Criacao ADMIN |
| POST | `/api/v1/organizations/{id}/memberships` | Vinculo ADMIN |
| GET | `/api/v1/me/permissions` | Permissoes efetivas |
| GET | `/api/v1/me` | Perfil global autenticado |

## Estrutura de Dados

`RegisterRequest`: `nome`, `login`, `email`, `senha`.
`RegisterResponse`: `id`, `nome`, `login`, `email`, `token`, `tipo`, `perfil`
(`USUARIO`).

`AuthUser.perfil` inclui `ADMIN`, `OPERADOR` e `USUARIO`.

## Integracoes externas

Backend Spring Boot via `VITE_BACKEND_URL` (proxy Vite `/api`).

## Tratamento de Erros

- Cadastro 400: ProblemDetail com `erros` mapeados aos campos; campos
  desconhecidos usam `detail` como erro geral.
- Cadastro 409: mensagem neutra fixa “Login ou e-mail já cadastrado.”
- Cadastro 500/indisponibilidade: feedback generico; formulario preservado
  (senhas limpas).
- Sessao 401: limpa autenticacao apos uso de token (exceto login/cadastro).
- Troca de tenant falha: preserva JWT anterior.
- `describeError` nunca expoe mensagens tecnicas do Axios; prioriza ProblemDetail,
  depois status amigavel, timeout e servidor inacessivel.
## Testes

`RegisterPage.test.tsx`, `AuthContext.test.tsx`, `NoOrganizationAccessPage.test.tsx`,
`LoginPage.test.tsx` e suites existentes via `npm test`.

Os testes do seletor simulam também o GET de perfil para OPERADOR. O teste de
falha ao ativar contexto aguarda a consulta de permissões antes de verificar
que o JWT anterior foi preservado; os mocks não são restaurados enquanto essa
chamada ainda estiver pendente. Nenhuma alteração de autenticação em produção.

## Decisoes Tecnicas

- O cliente envia somente `organizationId` na troca de contexto.
- Conta neutra / sem Membership cai no seletor unificado (lista vazia).
- Criacao USUARIO: `POST /api/v1/me/organizations` (atomico); sem auto-ativacao.
- Criacao ADMIN: `POST /api/v1/organizations` + membership; sem auto-ativacao;
  permite repetir so o vinculo se a org ja foi criada.
- OPERADOR nao ve criacao.
- Entrada na org e sempre explicita (“Entrar” / “Entrar nesta organização”).
- Login e cadastro compartilham `establishSession` no AuthContext.
- Nao se registra senha ou token em console, telemetria ou UI.

## Modulos relacionados

- [[core]]
- [[acesso]]

## Historico

| Data | Acao |
|---|---|
| 2026-08-01 | Implementa descoberta e selecao de organizacao com JWT contextual. |
| 2026-08-02 | Isola o cache remoto no logout e na troca de organizacao. |
| 2026-08-02 | Torna a troca de tenant atomica e fecha rotas por permissao efetiva. |
| 2026-08-03 | Adiciona pesquisa, preferencia recente e controle acessivel de senha. |
| 2026-09-04 | Consolida a identidade do Hub no login sem promessas ou controles sem comportamento real. |
| 2026-09-10 | Adiciona cadastro via `POST /api/auth/register`, perfil `USUARIO` e onboarding sem organizacao. |
| 2026-09-10 | Alinha mensagem 409, foco no primeiro erro e copy de “Criar organização” indisponível. |
| 2026-09-10 | Remove auto-selecao de org unica; permite reabrir escolha e criar org (ADMIN). |
| 2026-09-10 | Self-service USUARIO via `/api/v1/me/organizations`; seletor unificado sem auto-ativar. |
| 2026-09-11 | Centraliza mensagens amigaveis em `describeError` e isenta login/cadastro do logout 401. |
| 2026-09-12 | Estabiliza testes de perfil OPERADOR e falha de ativação contextual, cobrindo consultas e evitando requisições não simuladas ao encerrar o teste. |
