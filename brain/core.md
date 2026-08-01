> Links: [[auth]] · [[acesso]]

# Frontend Kaneko

## Objetivo

Fornecer a interface React do Estacionamento Kaneko, preservando os cadastros
legados e adicionando superfícies enterprise somente quando os contratos do
backend estiverem disponíveis.

## Contexto

Aplicação React 18 + TypeScript + Vite, com Material UI, React Router, Axios e
TanStack Query. A autenticação usa JWT e exige seleção de organização antes de
abrir rotas tenant-aware. O frontend é um repositório Git próprio dentro do
projeto Java e preserva as telas legadas durante a adoção gradual de `/api/v1`.

## Fluxo (camadas da arquitetura)

```text
App -> ProtectedRoute -> AuthContext -> organização ativa
    -> AppLayout/navegação filtrada por permissões
    -> páginas -> api/client -> backend /api
```

## Endpoints (se houver)

Os contratos são consumidos pelas páginas; o frontend não publica endpoints.

## Estrutura de Dados (DTOs, Entidades)

Tipos de transporte ficam próximos das páginas ou em `src/types.ts`. O estado
de autenticação mantém usuário, organizações acessíveis, contexto ativo e
permissões efetivas.

## Integrações externas (se houver)

Somente o backend configurado por `VITE_API_URL` ou `/api` no mesmo host.

## Tratamento de Erros

O interceptor Axios preserva o token contextual e `describeError` converte
Problem Details em mensagens operacionais.

## Testes (curl ou equivalente)

Validação atual: `npm run typecheck` e `npm run build`. Não há runner de testes
automatizados configurado no repositório.

## Decisões Técnicas

- A navegação é filtrada pelas permissões retornadas pelo backend.
- A tela de seleção troca o contexto emitindo novo JWT; IDs de tenant não são
  enviados por header.
- O login continua emitindo JWT global compatível com as APIs legadas.
- Usuário sem Membership conserva o fluxo legado. Uma única organização é
  selecionada automaticamente; múltiplas exigem escolha explícita.
- O bundle ainda é único e gera aviso acima de 500 kB; lazy loading permanece
  dívida técnica.

## Módulos relacionados

- [[auth]]
- [[acesso]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-01 | Inicializa o brain do frontend e registra o contexto multiempresa. |
| 2026-08-01 | Adiciona console operacional QR mobile-first para eventos. |
| 2026-08-01 | Registra bloqueio operacional de credencial e dívida de bundle. |
