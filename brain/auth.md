> Links: [[core]] · [[acesso]] · [[dashboard]]

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
- Resposta 403 não encerra a sessão; em chamadas de negócio, revalida as
  permissões do tenant sem repetir a operação. O foco da janela também
  revalida. Ao mudar o conjunto efetivo, o cache é limpo e o conteúdo remontado.
- Se a carga inicial do contexto falhar, nenhuma tela operacional é montada.
  É possível trocar de organização ou repetir a carga sem fazer login novamente.
- Troca de tenant falha: preserva JWT anterior.
- `describeError` nunca expoe mensagens tecnicas do Axios; prioriza ProblemDetail,
  depois status amigavel, timeout e servidor inacessivel.
- Login vazio sinaliza cada campo junto ao controle e move o foco para o primeiro
  problema. Durante a autenticacao, o botao informa progresso e bloqueia reenvio.
- Espacos externos do login sao normalizados antes do envio; a senha permanece
  literal. Caps Lock recebe aviso local sem bloquear a digitacao.
## Testes

`RegisterPage.test.tsx`, `AuthContext.test.tsx`, `NoOrganizationAccessPage.test.tsx`,
`LoginPage.test.tsx` e suites existentes via `npm test`.

Os testes do seletor simulam também o GET de perfil para OPERADOR. O teste de
falha ao ativar contexto aguarda a consulta de permissões antes de verificar
que o JWT anterior foi preservado; os mocks não são restaurados enquanto essa
chamada ainda estiver pendente. Nenhuma alteração de autenticação em produção.

## Decisoes Tecnicas

### Seletores da nova organização — 2026-11-22

Moeda, Região, Plano e Fuso horário usam seletores nativos estilizados pelo
mesmo TextField, mantendo posição, nomes de payload e valores padrão. Regiões
são os 27 estados/DF brasileiros em ISO 3166-2. Standard e Enterprise preservam
os dois códigos já usados no projeto, sem contratar plano ou ampliar Membership.

Moedas e fusos são enumerados pelo Intl do navegador e exibem nomes legíveis,
com Brasil destacado nos fusos. Clientes sem supportedValuesOf usam BRL/USD/EUR,
os 16 fusos brasileiros e UTC. A lista atual foi conferida contra Currency e
ZoneId do mesmo Java 25 da API (162 moedas e 419 fusos aceitos); o servidor
continua validando os dados independentemente da interface.

Seleções ficam desabilitadas durante o envio. Erros 400 seguem no campo com foco,
sem limpar CNPJ/razão social. Não há mudança de endpoint, regra de CNPJ, banco,
permissões ou ativação automática da organização.

O contêiner do seletor de organização usa trilha de grid `minmax(0,1fr)` e
`minWidth:0` para não expandir a página pela largura intrínseca das opções
nativas. Campos continuam na mesma ordem, empilhados no celular.

- O cliente envia somente `organizationId` na troca de contexto.
- Conta neutra / sem Membership cai no seletor unificado (lista vazia).
- Criacao USUARIO: `POST /api/v1/me/organizations` (atomico); sem auto-ativacao.
- O formulário de organização confere os dígitos verificadores do CNPJ antes do envio. A API também pode rejeitar o campo com `400` e `erros.document`; `409` continua sinalizando duplicidade.
- Criacao ADMIN: `POST /api/v1/organizations` + membership; sem auto-ativacao;
  permite repetir so o vinculo se a org ja foi criada.
- OPERADOR nao ve criacao.
- Entrada na org e sempre explicita (“Entrar” / “Entrar nesta organização”).
- Login e cadastro compartilham `establishSession` no AuthContext.
- Os formulários de acesso usam o mesmo tema MUI das telas internas. O painel
  de marca mantém a composição Kaneko e o HexMark original.
- Nao se registra senha ou token em console, telemetria ou UI.
- A validacao do login e apresentada junto ao campo, sem depender de alerta geral.
- Nao existe recuperacao publica de senha no contrato atual; a interface nao cria
  um atalho sem comportamento real.

## Modulos relacionados

- [[core]]
- [[acesso]]

## Historico

Após escolha **explícita** de organização, um perfil com `operations:checkout`
sem `operations:manage` inicia em `/app/patio`. Deep link permitido mantém caminho,
query e fragmento. Destino sem autorização cai na entrada permitida; a regra não
ativa organização automaticamente nem é executada em cada navegação. O logo
continua abrindo `/app`. Falha na seleção cancela esse redirecionamento; 403 não
derruba sessão. Boundary fora do Router mantém comportamento anterior para testes.

O catálogo técnico `/app/bloqueios` sai dos menus, favoritos/recentes operacionais
e resultados de busca visíveis, sem alterar autorização da rota técnica. Bloqueios
de veículos/credenciais/vagas e suas permissões não são removidos.

| Data | Acao |
|---|---|
| 2026-11-22 | Substitui moeda/região/plano/fuso digitáveis por seletores com nomes legíveis, valores padrão e contrato preservados. |
| 2026-11-22 | Landing do caixa após seleção explícita de organização, preservação de deep links e logo; remove navegação/busca do catálogo técnico de bloqueios. |
| 2026-11-09 | Atualiza a marca visível no login e cadastro para yes7parking; mantém chaves locais e autenticação. |
| 2026-11-09 | Separados sessão expirada, negativa de acesso e falha de carga do contexto. |
| 2026-11-08 | Redesenha a superfície de entrada e o atalho entre login/cadastro sem alterar o formulário, as rotas ou o fluxo de acesso. |
| 2026-11-08 | Aplica Montserrat e botões em cápsula aos formulários de login e cadastro, preservando os elementos e a autenticação. |
| 2026-11-08 | Login e cadastro adotam as cores e estados dos componentes do tema Seven Tickets Web, sem mudar formulário, autenticação ou seleção de organização. |
| 2026-10-30 | Redesenha o login com painel de identidade Kaneko, hierarquia editorial, cartão destacado e experiência mobile com cabeçalho de marca, sem alterar o contrato de autenticação. |
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
| 2026-10-30 | Aplica validacao local por campo, foco no primeiro erro, normalizacao do login, aviso de Caps Lock e progresso acessivel no envio. |
| 2026-11-10 | Bloqueia CNPJ inválido no formulário de organização e posiciona o foco no campo. |
