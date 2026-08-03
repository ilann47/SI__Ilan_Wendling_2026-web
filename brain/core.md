> Links: [[auth]] · [[acesso]] · [[administracao]] · [[workspace]] · [[instalacoes]] · [[eventos]] · [[vendas]]

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

O cliente HTTP possui timeout de 15 segundos, preserva `Authorization` explícita
na validação de JWT candidato e centraliza o formato estrito de `If-Match`. Chaves
de consultas enterprise começam por `['tenant', organizationId]`.

## Testes (curl ou equivalente)

Gates disponíveis: `npm run typecheck`, `npm run lint`, `npm test` e
`npm run build`. Vitest executa testes unitários/de integração em jsdom com
Testing Library; E2E contra o backend real será acrescentado no recorte próprio.

## Decisões Técnicas

- A navegação é filtrada pelas permissões retornadas pelo backend.
- A tela de seleção troca o contexto emitindo novo JWT; IDs de tenant não são
  enviados por header.
- O login continua emitindo JWT global compatível com as APIs legadas.
- Usuário sem Membership conserva o fluxo legado. Uma única organização é
  selecionada automaticamente; múltiplas exigem escolha explícita.
- O vendor compartilhado ainda gera aviso acima de 500 kB; páginas operacionais
  agora são carregadas em chunks independentes.
- Ferramentas de teste e lint são somente `devDependencies`; Vite 7 e Vitest 4
  substituem versões vulneráveis sem alterar React, MUI ou o runtime do produto.
- O shell contextual registra somente o fluxo enterprise de eventos. Módulos
  legados continuam no código para compatibilidade, mas não são roteados dentro
  de um tenant porque suas APIs não garantem isolamento organizacional.

## Módulos relacionados

- [[auth]]
- [[acesso]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-01 | Inicializa o brain do frontend e registra o contexto multiempresa. |
| 2026-08-01 | Adiciona console operacional QR mobile-first para eventos. |
| 2026-08-01 | Registra bloqueio operacional de credencial e dívida de bundle. |
| 2026-08-02 | Adiciona gates de lint, testes jsdom e build sobre a linha segura do Vite. |
| 2026-08-02 | Separa o shell enterprise dos cadastros legados e ativa lazy loading por página. |
| 2026-08-02 | Padroniza timeout, ETag e chaves de cache tenant-aware no cliente HTTP. |
| 2026-08-03 | Adiciona workspace de referencias reais e administracao enterprise. |
| 2026-08-03 | Adiciona cadastro encadeado de locais, patios, setores e vagas. |
| 2026-08-03 | Adiciona configuracao e ciclo operacional completo de eventos e ofertas. |
| 2026-08-03 | Adiciona funil de holds, pedidos, cancelamento e credenciais. |
