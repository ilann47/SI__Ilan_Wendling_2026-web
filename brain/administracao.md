> Links: [[core]] · [[auth]] · [[workspace]]

# Administracao Enterprise

## Objetivo

Operar organizacao, Memberships e RBAC contextual usando exclusivamente os
contratos `/api/v1` existentes.

## Contexto

O perfil empresarial e carregado pelo ID do tenant presente no JWT. Usuario sem
Membership pode criar sua organização pelo fluxo self-service quando possui
perfil global `USUARIO` ou `ADMIN`. A API nao lista Memberships, papeis ou
atribuicoes; por isso a UI mantém referências recentes para essas relações e
deixa a limitação explícita.

O seletor de papéis inclui **Caixa do pátio**, destinado a quem registra
entradas, pagamentos e fechamento sem administrar tarifas e cadastros.

## Fluxo (camadas da arquitetura)

```text
AdministrationPage -> cliente HTTP -> controllers organization/membership/rbac
                  -> If-Match com version -> PostgreSQL
```

## Endpoints (se houver)

A consulta e a alteração de estado de um vínculo abrem
`/app/administracao/vinculos/:membershipId` só para quem já possui
`organizations:admin`. O retorno leva a **Usuários e vínculos**, sem exigir
listagem nova na API. Adicionar usuário continua em um diálogo de ação rápida.

- `POST/GET/PATCH /api/v1/organizations`
- `POST/GET/PATCH /api/v1/organizations/{id}/memberships`
- `POST/DELETE .../role-assignments`
- `GET /api/v1/me`

## Estrutura de Dados (DTOs, Entidades)

Os formularios espelham `OrganizacaoResponse`, `MembershipResponse` e
`AtribuicaoAcessoResponse`. Documento, estado e versao da organizacao sao
somente leitura. Alteracoes concorrentes enviam `If-Match` estrito.
Ao criar Membership, o usuário é escolhido por autocomplete pesquisável sobre
`/api/usuarios`; o operador não precisa descobrir ou digitar o ID global.
O botão exige tanto `users:invite` quanto o perfil global ADMIN exigido pelo
seletor legado. A administração contextual de vínculos e papéis não concede
leitura do cadastro global. O fluxo de primeiro vínculo no provisionamento
continua separado.

## Integracoes externas (se houver)

Nenhuma.

## Tratamento de Erros

Problem Details e erros de validacao sao exibidos no painel da operacao. A UI
exige consulta da Membership antes de transicionar seu estado.
O cancelamento do autocadastro com campos alterados usa o `ConfirmDialog` do
sistema e permite continuar editando ou descartar conscientemente, sem confirmação
nativa do navegador.

## Testes (curl ou equivalente)

Vitest cobre provisionamento da primeira organizacao e atualizacao concorrente
com a versao carregada.

## Decisoes Tecnicas

Vínculos são pesquisados pelo nome do usuário dentro da organização. Adicionar usuário continua exigindo o acesso de convite e usa o mesmo formulário, disponível também isoladamente para quem só convida.

- Nenhuma listagem e simulada quando o backend nao a oferece.
- Os papeis selecionaveis sao o catalogo de sistema definido nas migrations.
- Encerramento de Membership permanece terminal.
- `users:invite` monta somente a criação; consulta e transição de Membership
  exigem `organizations:admin`. Concessão e revogação respeitam permissões distintas.
- As areas administrativas permanecem em abas rolaveis no mobile, com botoes
  de navegacao visiveis e rotulo acessivel do conjunto.
- Identificadores e versoes informados nos comandos legados usam limites
  numericos consistentes e removem zeros a esquerda.
- Dados empresariais apresentam documento e situação, mas ocultam ID e versão.
  Moeda e fuso horário usam rótulos operacionais com exemplos.
- A inclusão curta de usuário abre em `OperationalFormDialog`; consulta e
  transição de vínculo permanecem na página porque dependem do contexto já
  carregado e formam uma operação administrativa contínua.

## Modulos relacionados

- [[auth]]
- [[workspace]]
- [[core]]

## Historico (data + acao)

| Data | Acao |
|---|---|
| 2026-11-22 | Introduz busca por nome nos seletores de vínculos. |
| 2026-11-22 | Abre o vínculo organizacional em subpágina e preserva a autorização e o controle de versão existentes. |
| 2026-11-09 | Separados acesso à Administração, convite, consulta de vínculos e seletor global. |
| 2026-11-09 | Menu e rotas diretas passam a exigir o perfil legado da API para usuários/geografia e `events:read` para eventos. O caixa sem essas autorizações não vê Administração. |
| 2026-10-24 | QA reduz metadados técnicos no perfil empresarial e padroniza moeda, fuso horário e revisão de atribuição. |
| 2026-09-29 | Padroniza a confirmação de descarte do formulário de organização e cobre o fluxo por teste. |
| 2026-08-03 | Implementa provisionamento, perfil empresarial, Memberships e RBAC contextual. |
| 2026-08-03 | Alinha cada comando administrativo à permissão do controller. |
| 2026-09-28 | Substitui o ID manual de usuário por seleção pesquisável na criação de Membership. |
| 2026-09-28 | Revisa no navegador organização, vínculos e permissões; apresenta negação de acesso contextual com mensagem operacional. |
| 2026-09-29 | Corrige a navegacao das abas administrativas em telas estreitas. |
| 2026-09-29 | Padroniza identificadores e versoes numericas dos comandos administrativos. |
| 2026-10-30 | Padroniza a inclusão de usuário em diálogo responsivo com descarte protegido e mantém gestão do vínculo na página. |
