> Links: [[auth]] · [[acesso]] · [[administracao]] · [[workspace]] · [[instalacoes]] · [[eventos]] · [[vendas]] · [[pagamentos]] · [[clientes]] · [[logistica]] · [[fornecedores]] · [[rh]] · [[conveniencia]] · [[dashboard]] · [[bloqueios]] · [[paridade-api]] · [[compatibilidade-legada]] · [[unificacao-multitenant]]

# Frontend Kaneko

## Objetivo

Fornecer uma única interface React para toda a plataforma Estacionamento Kaneko.
Os módulos operacionais, administrativos, fiscais, financeiros, de conveniência
e de eventos são capacidades permanentes do mesmo produto e devem convergir para
o mesmo contexto multiempresa.

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
- Usuário sem Membership recebe estado explícito de acesso não provisionado e
  não entra no shell tenant-aware. Uma única organização é selecionada
  automaticamente; múltiplas exigem escolha explícita e podem ser pesquisadas.
- O vendor compartilhado ainda gera aviso acima de 500 kB; páginas operacionais
  agora são carregadas em chunks independentes.
- Ferramentas de teste e lint são somente `devDependencies`; Vite 7 e Vitest 4
  substituem versões vulneráveis sem alterar React, MUI ou o runtime do produto.
- O shell contextual reúne o fluxo enterprise de eventos e as superfícies
  legadas preservadas. As rotas antigas são identificadas como compatibilidade;
  suas APIs ainda não garantem isolamento organizacional, exceto Pagamentos V38,
  Clientes V40, Transportadoras V41, Frota V48, Fornecedores V42, Cargos V43 e
  Funcionários documentados em [[pagamentos]], [[clientes]], [[logistica]],
  [[fornecedores]] e [[rh]].
- O shell possui skip link, foco visível, rótulos acessíveis e respeita redução
  de movimento. A fonte externa foi removida para não depender de rede na operação.
- A cobertura controller por controller está registrada em [[paridade-api]].
- A restauração das telas antigas concluiu a paridade funcional, mas não a
  paridade de isolamento. Cada módulo legado só será declarado tenant-aware após
  o respectivo contrato do backend validar o JWT contextual e particionar cache,
  referências e permissões pela organização ativa.

## Módulos relacionados

- [[auth]]
- [[acesso]]
- [[pagamentos]]
- [[clientes]]
- [[logistica]]
- [[fornecedores]]
- [[rh]]

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
| 2026-08-03 | Adiciona dashboard de disponibilidade e decisoes de acesso reais. |
| 2026-08-03 | Reforça acessibilidade, seleção de tenant e permissões por ação. |
| 2026-08-03 | Consolida a matriz de paridade das APIs enterprise. |
| 2026-08-03 | Restaura no shell as rotas legadas removidas durante a adoção multiempresa. |
| 2026-08-03 | Consolida a meta de unificação: nenhum módulo legado será descartado e todos migrarão para tenancy real. |
| 2026-08-03 | Integra formas e condições de pagamento ao contexto organizacional do backend V38. |
| 2026-08-03 | Integra Clientes ao contexto organizacional do backend V40. |
| 2026-08-03 | Integra Transportadoras ao contexto organizacional do backend V41. |
| 2026-08-03 | Integra veículos e vínculos de frota ao contexto organizacional V48. |
| 2026-08-03 | Integra Fornecedores ao contexto organizacional do backend V42. |
| 2026-08-03 | Integra Cargos ao contexto organizacional do backend V43. |
| 2026-08-03 | Integra Funcionários ao contexto organizacional preservando `/api/funcionarios`. |
| 2026-08-03 | Integra Categoria, Marca, Unidade de Medida, Produto e Serviço aos contratos V50-V52. |
