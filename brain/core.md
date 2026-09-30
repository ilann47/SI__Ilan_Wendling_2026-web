> Links: [[auth]] · [[acesso]] · [[administracao]] · [[workspace]] · [[listagens]] · [[instalacoes]] · [[eventos]] · [[vendas]] · [[pagamentos]] · [[clientes]] · [[logistica]] · [[fornecedores]] · [[rh]] · [[conveniencia]] · [[estoque]] · [[dashboard]] · [[bloqueios]] · [[paridade-api]] · [[compatibilidade-legada]] · [[unificacao-multitenant]]

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
    -> AppLayout (menu superior único / drawer no mobile)
         -> /app = HubHomePage (módulos e pendências) + Resumo do dia abaixo
         -> menus por processo -> telas diretamente, sem landing intermediária
         -> /app/areas/* e /app/visao-geral redirecionam para /app
         -> demais /app/* = conteúdo em largura total, sem sidebar/abas
    -> api/client -> backend /api
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

Rotas inexistentes, métodos indisponíveis, formatos não suportados e recursos
desatualizados recebem mensagens próprias para 404, 405, 415 e 428, sem expor
o texto técnico do Axios ao usuário final.

O formulário compartilhado valida números no próprio campo. Valores monetários,
quantidades e inteiros são não negativos por padrão; percentuais aceitam de 0 a
100; limites específicos usam `min`/`max`. Campos inválidos mantêm a ação Salvar
desabilitada e expoentes ou sinal positivo não são aceitos pelo input numérico.
Todo diálogo compartilhado confirma o descarte quando há alteração não salva;
formulário intacto continua fechando diretamente.

Seletores de referência oferecem criação e edição contextual quando o perfil
possui a permissão correspondente. A edição reutiliza o formulário oficial do
recurso, preserva o documento principal e mantém `ETag`/`If-Match` nos cadastros
versionados.

Todos os modais passam por `AppDialog`: o backdrop bloqueia a aplicação inteira,
as larguras `xs/sm/md/lg` voltam a representar a complexidade do fluxo, somente
o conteúdo rola e título, fechamento e ações permanecem visíveis. Operações em
andamento bloqueiam Escape/backdrop; confirmações críticas usam `alertdialog`.

O cliente HTTP possui timeout de 15 segundos, preserva `Authorization` explícita
na validação de JWT candidato e centraliza o formato estrito de `If-Match`. Chaves
de consultas enterprise começam por `['tenant', organizationId]`.

## Testes (curl ou equivalente)

Gates disponíveis: `npm run typecheck`, `npm run lint`, `npm test` e
`npm run build`. Vitest executa testes unitários/de integração em jsdom com
Testing Library; E2E contra o backend real será acrescentado no recorte próprio.

`HeaderAreaNavigation.test.tsx` cobre navegação direta, filtros na URL, RBAC,
teclado, troca/fechamento de menus e drawer mobile. `AppLayout.test.tsx` verifica
a ausência de sidebar e abas também dentro das telas. `App.test.tsx` cobre a
home integrada e os redirecionamentos de URLs antigas; `DashboardPage.test.tsx`
cobre permissões, dados consultados e ausência de atalhos duplicados.
`HubHomePage.test.tsx` cobre a ordem Hub → resumo, painel único de pendências,
deduplicação de consultas, abertura do menu pelos cartões em desktop/mobile e
falha de leitura sem exibir ausência de pendências.

Validação de 2026-09-11 após restaurar o Hub com resumo abaixo: 229 testes em 42
arquivos passaram; typecheck, lint, build e diff-check aprovados. Conferência no
navegador local cobriu a composição completa, cartão abrindo o menu existente e
drawer mobile, sem overflow; o tamanho original da prévia foi restaurado.
Permanecem mensagens XHR `AggregateError` de testes preexistentes no jsdom
(sem testes falhando) e o aviso de chunk MUI de 603 kB no build.

Regressão completa de 2026-09-29: 358 testes em 66 arquivos passaram; typecheck,
lint e build também foram aprovados. A rodada inclui autenticação/tenant, menus,
formulários compartilhados, eventos/acesso, instalações, compras, estoque,
fiscal, financeiro, vendas, serviços e CRUDs legados. O build mantém apenas o
aviso conhecido de chunks MUI/DataGrid acima de 500 kB.

`AppDialog.test.tsx` e `theme.test.ts` protegem rótulo acessível, botão fechar,
bloqueio durante submissão, largura semântica e backdrop de viewport inteiro.

Regressão focalizada de 2026-09-12: 15 testes em 3 arquivos passaram. Os testes
de layout verificam menus de conta/contexto acima do cabeçalho, e os de navegação
mantêm o menu de áreas e o drawer abaixo das sobreposições modais. A reprodução
visual confirmou o menu de conta inteiro acima da segunda linha do cabeçalho.

Validação de 2026-09-12 da home acionável e detalhes por contexto: 256 testes em
47 arquivos passaram (`npm test -- --maxWorkers=1`); typecheck, lint e build
aprovados. Regressões cobrem períodos financeiros, links para o registro exato,
isolamento por organização, permissões dos comandos e ações de compras/serviços.
Conferência visual em desktop e mobile cobriu a home compacta, troca de período
e drawer financeiro, sem overflow horizontal. A organização local está sem
registros para esses fluxos; dados preenchidos foram cobertos por testes, sem
baixas ou alterações de estoque no navegador. Permanecem as mensagens XHR do
jsdom e o aviso do chunk MUI de 603,25 kB, sem reprovação dos gates.

## Decisões Técnicas

- A navegação é filtrada pelas permissões retornadas pelo backend.
- O shell mantém a identidade Kaneko e a navegação principal no topo:
  sem sidebar ou abas abertas. `/app` preserva a home do Hub com módulos e
  pendências; o resumo do dia aparece logo abaixo, na mesma página.
- Cartões da home solicitam abertura do menu existente via contexto do `Outlet`
  (`AppLayoutContext.openArea`). Desktop abre o menu superior; mobile abre o
  mesmo drawer já expandido na área. Não são criadas páginas intermediárias.
  `HeaderAreaNavigation` reaplica RBAC antes de atender à solicitação.
- Hub e resumo compartilham as chaves de consulta `dashboard` por tenant,
  evitando duplicar chamadas de contas, estoque mínimo e ordens de compra.
  `HubHomePage.test.tsx` cobre composição, requisições compartilhadas,
  cartões desktop/mobile e falha na consulta de pendências.
- Home compacta com financeiro separado por fluxo e período; indicadores abrem
  títulos reais. `useLinkedDetail` permite acesso direto aos detalhes nas telas
  existentes, sem adicionar páginas intermediárias ou armazenar registros no navegador.
  Comandos financeiros verificam `rowActionPermissions`; ver [[listagens]] e
  [[fiscal-financeiro]]. Contadores/filtros ausentes permanecem no backlog backend.
- Áreas: Operação, Vendas, Estoque, Financeiro, Cadastros e Administração.
  `HeaderAreaNavigation` abre processos sobre a tela atual, apenas com links
  diretos. Notas de entrada ficam em Estoque/Compras; saída e serviço em Vendas.
  O identificador interno `comercial` e as URLs das telas são preservados.
  O catálogo `areaNavigation.tsx` continua usando `visibleProcessGroups` para RBAC.
  Favoritos e recentes salvos em `kaneko.ui.{org}.{login}` não são apagados;
  `rememberPath` continua registrando visitas para a busca existente.
- URLs antigas `/app/areas/{id}` e `/app/visao-geral` redirecionam para `/app`.
  Sidebar, abas e páginas de área antigas permanecem no código, fora do shell/rotas ativos,
  para não misturar uma limpeza ampla com a simplificação aprovada.
- Em `xl+`, marca, áreas, busca e conta ficam na mesma linha. Entre `md` e `xl`,
  as áreas ocupam uma segunda linha de 44px. `layoutMetrics` sincroniza o espaço
  do conteúdo. No celular, as áreas abrem em um único drawer com grupos
  expansíveis e os mesmos links. Escape devolve foco e as setas percorrem as áreas.
- Camadas seguem o tema MUI: cabeçalho em `appBar`, menu de áreas em
  `appBar + 1`, drawer na camada padrão `drawer` e menus de conta/contexto na
  camada padrão `modal`. Isso impede que a navegação encubra menus ou diálogos,
  sem aumentar arbitrariamente o z-index de cada sobreposição.
- O tema declara `modal = 1600` como fonte única da camada de diálogos. Popovers
  de calendário usam `modal + 1`, evitando que o seletor de data abra atrás do
  formulário.
- `AppDialog` é a única porta para modais MUI. Confirmações usam `xs`, formulários
  simples `sm`, formulários gerais `md` e ordens com itens `lg`; telas pequenas
  usam fullscreen apenas para tarefas que exigem espaço.
- `QuickCreateProvider` mantém um registro adicional para cadastros contextuais
  de módulos com tela própria. Isso permite criar referências ausentes sem gerar
  rotas CRUD duplicadas e sem perder o formulário principal em andamento.
- Nota de Entrada é página dedicada (lista/wizard/detalhe), fora do CRUD genérico.
- Componentes ativos do shell: `AppHeader`, `HeaderAreaNavigation`,
  `ContextSelector`, `UserAccountMenu` e métricas de layout (`layoutMetrics`).
- A tela de seleção troca o contexto emitindo novo JWT; IDs de tenant não são
  enviados por header.
- O login continua emitindo JWT global compatível com as APIs legadas.
- Usuário sem Membership recebe estado explícito de acesso não provisionado e
  não entra no shell tenant-aware. Após login ou cadastro, o JWT global exige
  escolha explícita mesmo com uma única organização. Um JWT contextual válido
  pode restaurar a organização ativa ao recarregar a aplicação.
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
- [[listagens]]
- [[dashboard]]
- [[pagamentos]]
- [[clientes]]
- [[logistica]]
- [[fornecedores]]
- [[rh]]

## Histórico

| Data | Ação |
|---|---|
| 2026-09-29 | Adiciona edição contextual aos itens dos seletores, com RBAC, formulário compartilhado, preservação do documento e suporte a ETag. |
| 2026-09-29 | Estende o cadastro rápido a recursos especializados sem criar rotas CRUD duplicadas. |
| 2026-09-29 | Amplia a Ordem de Compra com dados comerciais e logísticos sem misturar a identidade fiscal da Nota de Entrada. |
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
| 2026-08-03 | Integra Produto–Fornecedor ao contexto organizacional V53 sem ativar notas ou estoque. |
| 2026-08-03 | Integra a posição e razão de estoque V54 sem acoplar notas ou movimentações de pátio. |
| 2026-08-04 | Integra Nota de Entrada e Conta a Pagar aos contratos V55. |
| 2026-08-04 | Integra Nota de Saída e Conta a Receber aos contratos V56. |
| 2026-08-04 | Integra Nota de Serviço tenant-aware aos contratos V57. |
| 2026-09-04 | Consolida design system de listagem, detalhes, dashboard operacional, busca por teclado e preferências visuais. |
| 2026-09-04 | Aproxima login split-screen e shell (pill ativo, marca Hub) do padrão visual YES7. |
| 2026-09-04 | Porta tokens, HexMark, LoginHeroDiagram, login e shell a partir do repositório yes7one-frontend. |
| 2026-09-04 | Adota home Hub (`HubHomePage`) com grade de módulos e pendências; dashboard operacional em `/app/visao-geral`. |
| 2026-09-09 | Porta componentes de shell do Hub (`AppHeader`, `AppSidebar`, `HubLauncherButton`, `OpenModulesBar`, tema/dialogs/DataGrid). |
| 2026-09-09 | Prioriza responsividade mobile: header compacto, login form-first, launcher bottom sheet, dialogs fullscreen, safe-area. |
| 2026-09-11 | Navegação por áreas (Estoque/Fiscal/Financeiro) com mega menu, favoritos/recentes e Nota de Entrada dedicada. |
| 2026-09-11 | Mega menu completo em 7 áreas; fluxo Compras com atalhos e ContasPagarPage. |
| 2026-09-11 | Homes das sete áreas passam a destacar ações operacionais do dia respeitando RBAC. |
| 2026-09-11 | Expõe as áreas no cabeçalho com menus por processo, drawer mobile e testes de RBAC, teclado e navegação direta; preserva preferências e rotas. |
| 2026-09-11 | Simplifica a navegação conforme aprovação: remove sidebar/abas/grade de módulos do shell, reúne notas nos processos e torna o resumo do dia a home. |
| 2026-09-11 | Restaura a home do Hub com pendências e resumo do dia abaixo, conforme ajuste do usuário; cartões reutilizam o menu e as consultas são compartilhadas. |
| 2026-09-12 | Corrige menu de conta encoberto pela navegação, alinhando as camadas do cabeçalho/menus ao tema MUI e adicionando regressão de sobreposição. |
| 2026-09-12 | Torna pendências acionáveis, compacta a home e separa finanças por período; alinha detalhes de compras/serviços e permissões financeiras. |
| 2026-09-28 | Centraliza a camada real dos modais no tema e mantém calendários acima dos formulários. |
| 2026-09-28 | Adiciona validação numérica compartilhada, limites inline e bloqueio de submissão inválida nos formulários. |
| 2026-09-28 | Protege o descarte em todos os formulários compartilhados, mantém erros reais na busca por ID e traduz 405/415/428 em mensagens operacionais. |
| 2026-09-28 | Percorre 45 rotas, 22 formulários e fluxos especializados no navegador desktop/mobile; padroniza estados, detalhes e mensagens operacionais encontrados durante a execução. |
| 2026-09-29 | Centraliza todos os modais em AppDialog, restaura larguras semânticas, backdrop integral, cabeçalho/ações fixos e acessibilidade de confirmações. |
