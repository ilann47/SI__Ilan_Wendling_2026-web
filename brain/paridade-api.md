> Links: [[core]] · [[auth]] · [[administracao]] · [[instalacoes]] · [[eventos]] · [[vendas]] · [[pagamentos]] · [[clientes]] · [[logistica]] · [[fornecedores]] · [[rh]] · [[conveniencia]] · [[estoque]] · [[acesso]] · [[dashboard]] · [[bloqueios]]

# Paridade API Enterprise

## Objetivo

Demonstrar a cobertura do frontend sobre todos os comandos e consultas
enterprise executáveis expostos pelos controllers atuais.

## Contexto

A matriz foi confrontada com os controllers Java e com as chamadas Axios do
frontend. Ela cobre 46 operações: login e as 45 operações `/api/v1`. Os
controllers legados `/api/*` permanecem acessíveis no shell por compatibilidade
funcional com a aplicação anterior. Pagamentos V38, Clientes V40,
Transportadoras V41, Frota V48, Fornecedores V42, Cargos V43 e Funcionários já
carregam escopo organizacional; os demais contratos legados ainda não. A matriz
registra separadamente cobertura funcional e cobertura tenant-aware durante a
migração descrita em [[unificacao-multitenant]].

## Fluxo (camadas da arquitetura)

```text
controller + PreAuthorize -> rota/comando da UI -> cliente HTTP -> resposta real
```

## Matriz por operação

| # | Método e contrato | Permissão/contexto | Superfície frontend | Situação |
|---:|---|---|---|---|
| 1 | `POST /api/auth/login` | credenciais | Login | Integrada |
| 2 | `GET /api/v1/me` | identidade autenticada | Provisionamento inicial | Integrada |
| 3 | `GET /api/v1/me/organizations` | identidade autenticada | Descoberta/seletor | Integrada |
| 4 | `POST /api/v1/me/active-organization` | Membership ativa | Seletor/troca de tenant | Integrada |
| 5 | `GET /api/v1/me/permissions` | contexto ativo | AuthContext/shell | Integrada |
| 6 | `POST /api/v1/organizations` | ADMIN de plataforma | Acesso não provisionado | Integrada |
| 7 | `GET /api/v1/organizations/{id}` | leitura da organização | Administração | Integrada |
| 8 | `PATCH /api/v1/organizations/{id}` | `organizations:admin` | Administração | Integrada com `If-Match` |
| 9 | `POST /api/v1/organizations/{id}/memberships` | provisionamento/`users:invite` | Administração | Integrada |
| 10 | `GET /api/v1/organizations/{id}/memberships/{membershipId}` | `organizations:admin` | Administração | Integrada por ID |
| 11 | `PATCH /api/v1/organizations/{id}/memberships/{membershipId}` | `organizations:admin` | Administração | Integrada com `If-Match` |
| 12 | `POST .../memberships/{membershipId}/role-assignments` | `roles:grant` | Administração | Integrada |
| 13 | `DELETE .../role-assignments/{assignmentId}` | `roles:revoke` | Administração | Integrada com `If-Match` |
| 14 | `POST /api/v1/venues` | `organizations:admin` | Instalações/Locais | Integrada |
| 15 | `POST /api/v1/parking-facilities` | `facilities:manage` | Instalações/Pátios | Integrada |
| 16 | `POST /api/v1/parking-facilities/{id}/sectors` | `facilities:manage` | Instalações/Setores | Integrada |
| 17 | `POST /api/v1/sectors/{id}/spaces:batch` | `facilities:manage` | Instalações/Vagas | Integrada, inclusive HTTP 207 |
| 18 | `POST /api/v1/events` | `events:create` | Eventos | Integrada e idempotente |
| 19 | `PATCH /api/v1/events/{id}` | `events:create` | Eventos | Integrada com `If-Match` |
| 20 | `POST /api/v1/events/{id}/publication` | `events:publish` | Eventos | Integrada com confirmação |
| 21 | `POST /api/v1/events/{id}/sales-opening` | `events:publish` | Eventos | Integrada, somente abertura suportada |
| 22 | `POST /api/v1/events/{id}/sales-closing` | `events:publish` | Eventos | Integrada com confirmação |
| 23 | `POST /api/v1/events/{id}/operation-start` | `access:operate` | Eventos | Integrada com confirmação |
| 24 | `POST /api/v1/events/{id}/operation-closing` | `access:operate` | Eventos | Integrada com ressalva financeira |
| 25 | `POST /api/v1/events/{id}/parking-allocations` | `inventory:manage` | Eventos/Alocação | Integrada |
| 26 | `PATCH /api/v1/parking-allocations/{id}` | `inventory:manage` | Eventos/Alocação | Integrada com `If-Match` |
| 27 | `POST /api/v1/events/{id}/parking-products` | `pricing:manage` | Eventos/Produto | Integrada |
| 28 | `POST /api/v1/parking-products/{id}/publication` | `pricing:manage` | Eventos/Produto | Integrada com `If-Match` |
| 29 | `POST /api/v1/parking-products/{id}/price-tiers` | `pricing:manage` | Eventos/Lote | Integrada |
| 30 | `GET /api/v1/events/{id}/availability` | contexto ativo | Eventos e Dashboard | Integrada |
| 31 | `POST /api/v1/inventory-holds` | `inventory:hold` | Vendas/Holds | Integrada e idempotente |
| 32 | `GET /api/v1/inventory-holds/{id}` | `inventory:hold` | Vendas/Holds | Integrada por ID |
| 33 | `POST /api/v1/inventory-holds/{id}/release` | `inventory:hold` | Vendas/Holds | Integrada |
| 34 | `POST /api/v1/orders` | `orders:create` | Vendas/Pedidos | Integrada e idempotente |
| 35 | `GET /api/v1/orders` | `orders:read` | Vendas/Pedidos | Integrada com cursor/filtros |
| 36 | `GET /api/v1/orders/{id}` | `orders:read` | Vendas/Pedidos | Integrada por ID |
| 37 | `POST /api/v1/orders/{id}/manual-confirmation` | `orders:manual-confirm` | Vendas/Pedidos | Integrada como confirmação manual, não gateway |
| 38 | `POST /api/v1/orders/{id}/cancellation` | `orders:cancel` | Vendas/Pedidos | Integrada com confirmação e `If-Match` |
| 39 | `POST /api/v1/orders/{id}/credentials` | `credentials:issue` | Vendas/Credenciais | Integrada e idempotente |
| 40 | `GET /api/v1/credentials/{id}` | `credentials:issue` | Vendas/Credenciais | Integrada por ID |
| 41 | `POST /api/v1/credentials/{id}/qr-code` | `credentials:issue` | Vendas/Credenciais | Integrada; token não persistido |
| 42 | `POST /api/v1/credentials/{id}/blocking` | `credentials:block` | Acesso | Integrada com confirmação |
| 43 | `POST /api/v1/access-validations` | `access:validate` | Console de acesso | Integrada e idempotente |
| 44 | `POST /api/v1/check-ins` | `access:checkin` | Console de acesso | Integrada e idempotente |
| 45 | `POST /api/v1/check-outs` | `access:checkout` | Console de acesso | Integrada e idempotente |
| 46 | `GET /api/v1/access-attempts` | `audit:read` | Tentativas e Dashboard | Integrada com cursor/filtros |

## Retrofit tenant-aware dos contratos preservados

| Contrato | Permissões | Superfície frontend | Situação |
|---|---|---|---|
| `/api/formas-pagamento` | `payments:read`, `payments:manage` | Cadastro/Formas de Pagamento | Integrada e isolada por organização |
| `/api/condicoes-pagamento` | `payments:read`, `payments:manage` | Cadastro/Condições de Pagamento | Integrada e isolada por organização |
| `/api/clientes` | `customers:read`, `customers:manage` | Cadastro/Clientes | Integrada e isolada por organização |
| `/api/transportadoras` | `logistics:read`, `logistics:manage` | Logística/Transportadoras | Integrada e isolada por organização |
| `/api/veiculos-frota` | `logistics:read`, `logistics:manage` | Logística/Veículos de Frota | Integrada e isolada por organização |
| `/api/transportadora-veiculos` | `logistics:read`, `logistics:manage` | Logística/Frota das Transportadoras | Integrada e isolada por organização |
| `/api/fornecedores` | `suppliers:read`, `suppliers:manage` | Cadastro/Fornecedores | Integrada e isolada por organização |
| `/api/cargos` | `workforce:read`, `workforce:manage` | RH/Cargos | Integrada e isolada por organização |
| `/api/funcionarios` | `workforce:read`, `workforce:manage` | RH/Funcionários | Integrada e isolada por organização |
| `/api/v1/stock-locations` | `stock:read`, `stock:manage` | Estoque/Locais | Integrada com ETag e isolada por organização |
| `/api/v1/stock-positions`, `/stock-balances`, `/stock-movements` | `stock:read` | Estoque/Posição e Razão | Integrada e isolada por organização |
| `/api/v1/stock-adjustments`, `/stock-movements/{id}/compensation` | `stock:manage` | Estoque/Ajustes | Integrada com idempotência |

## Lacunas de leitura do contrato atual

Não existem endpoints enterprise de listagem ou leitura individual para Venue,
pátio de instalação, setor, vaga, evento, alocação, produto e lote de preço; nem
listagem para Membership, atribuição de papel, hold ou credencial. Nessas áreas a
UI não inventa coleções: conserva apenas respostas reais do tenant no workspace
local e aceita ID/versão conhecidos. Essa limitação impede telas de catálogo
completo, associação histórica e auditoria genérica além das tentativas de acesso.

## Estrutura de Dados (DTOs, Entidades)

Os tipos de resposta ficam próximos da superfície que os consome. ETag vira
`If-Match` estrito; comandos reexecutáveis usam `Idempotency-Key`; Problem Details
é convertido pelo cliente central.

## Integrações externas (se houver)

Nenhuma. Capacidades dependentes de provider constam em [[bloqueios]].

## Tratamento de Erros

`401` encerra contexto inválido; `403` permanece autorização negada; conflitos e
pré-condições são apresentados sem sobrescrever versão; falhas não idempotentes
não recebem retry automático.

## Testes (curl ou equivalente)

Vitest cobre autenticação, troca de tenant, guards, ETag, cache, operações
críticas e granularidade de RBAC. A validação real local complementa esta matriz.

## Decisões Técnicas

- Paridade significa interface para todo contrato enterprise executável, não
  fabricação de listagens ausentes.
- APIs legadas permanecem agrupadas separadamente na navegação e conservam seus
  contratos anteriores durante a compatibilidade. A migração para tenancy é
  obrigatória, exige trabalho de backend e não é simulada pelo frontend.
- Esta matriz deve mudar junto de qualquer novo controller `/api/v1`.
- Cada onda do retrofit deve também particionar chaves do React Query, seletores
  e autorizações pela organização ativa antes de receber status tenant-aware.

## Módulos relacionados

- [[core]]
- [[auth]]
- [[administracao]]
- [[instalacoes]]
- [[eventos]]
- [[vendas]]
- [[pagamentos]]
- [[clientes]]
- [[logistica]]
- [[fornecedores]]
- [[rh]]
- [[acesso]]
- [[dashboard]]
- [[bloqueios]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-08-03 | Registra cobertura das 46 operações enterprise executáveis. |
| 2026-08-03 | Registra a restauração das superfícies legadas sem declarar tenancy inexistente. |
| 2026-08-03 | Separa paridade funcional de paridade tenant-aware para orientar o retrofit por ondas. |
| 2026-08-03 | Registra formas e condições de pagamento como contratos tenant-aware do backend V38. |
| 2026-08-03 | Registra Clientes como contrato tenant-aware do backend V40. |
| 2026-08-03 | Registra Transportadoras como contrato tenant-aware do backend V41. |
| 2026-08-03 | Registra veículos e vínculos de frota como contratos tenant-aware V48. |
| 2026-08-03 | Registra Fornecedores como contrato tenant-aware do backend V42. |
| 2026-08-03 | Registra Cargos como contrato tenant-aware do backend V43. |
| 2026-08-03 | Registra Funcionários como contrato tenant-aware com estado `ativo` real. |
| 2026-08-03 | Registra os catálogos de conveniência V50-V52 com `catalog:*`, cache por organização e `If-Match`. |
| 2026-08-03 | Registra Produto–Fornecedor V53 com `catalog:*`, ETag e lookup condicionado a `suppliers:read`. |
