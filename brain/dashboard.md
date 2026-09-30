> Links: [[core]] · [[auth]] · [[workspace]] · [[listagens]] · [[eventos]] · [[acesso]]

# Dashboard Operacional

## Objetivo

Manter a home do Hub com módulos e pendências do tenant ativo no topo,
seguida do resumo do dia na mesma página, sem sidebar ou abas de módulos.

## Contexto

A rota `/app` exibe **HubHomePage**: saudação, módulos e pendências; abaixo,
**Resumo do dia** (`DashboardPage` com `embedded`). As antigas URLs
`/app/visao-geral` e `/app/areas/:areaId` redirecionam para ela sem landing
intermediária. O resumo usa apenas contratos existentes: pátio,
contas a vencer, estoque mínimo, eventos, tentativas de acesso e últimas
páginas de ordens e vendas.

## Fluxo (camadas da arquitetura)

```text
/app -> HubHomePage (saudação + módulos + pendências)
     -> DashboardPage embedded (Resumo do dia logo abaixo)
cartão de módulo -> AppLayoutContext.openArea -> menu existente / drawer mobile
/app/visao-geral ou /app/areas/* -> redirecionamento /app
permissoes -> relatorios/listagens existentes
```

## Endpoints (se houver)

- `GET /api/relatorios/patio`
- `GET /api/relatorios/contas-a-vencer`
- `GET /api/relatorios/estoque-minimo`
- `GET /api/v1/events`
- `GET /api/v1/access-attempts`
- `GET /api/v1/purchase-orders`
- `GET /api/v1/administrative-sales`
- `GET /api/v1/service-orders`
- `GET /api/v1/operational-pendencies?limit=5`

## Estrutura de Dados (DTOs, Entidades)

O dashboard usa apenas totais presentes nas respostas e decisões dos últimos 20
itens. Não estima ocupação, receita ou vendas sem contrato correspondente.
O painel de pendências do Hub agora utiliza projeção específica com totais completos por categoria, independente das páginas do resumo. Apresenta até 5 itens por categoria e informa explicitamente quando existem outros; o total não é fabricado pela contagem da página.
`dashboardContext` define períodos inclusivos e mapeia `CONTA_PAGAR`,
`CONTA_RECEBER` e `DESPESA_AVULSA` aos detalhes corretos. Origem desconhecida
não recebe um destino presumido.

## Integracoes externas (se houver)

Nenhuma.

## Tratamento de Erros

Falha de leitura usa `describeError` e permite tentar novamente. Indicadores
sem resposta usam travessão; não há zeros fictícios. Listas sem atividades e
perfil sem indicadores têm mensagens específicas, sem jargão técnico.
O painel de pendências distingue carregamento, falta de permissão e falha de
consulta; erro não é tratado como ausência de pendências. A tentativa de nova
leitura pode ser feita no resumo, usando o mesmo cache.

## Testes (curl ou equivalente)

Entrega integrada de 2026-09-12: HubHomePage.test.tsx tem 7 testes verdes (desktop/mobile, contagem completa limitada, links exatos, isolamento de permissões, erro honesto e período aplicado somente ao resumo). Gates finais do recorte financeiro/home/estoque: 19 testes/6 arquivos, typecheck, lint e build verdes. Esta rodada foi automatizada; a validação visual histórica abaixo não substitui smoke do backend atualizado.

Vitest cobre decisões consultadas, ausência de navegação duplicada, perfil sem
permissão (sem consultas indevidas), listas vazias e redirects de URLs antigas.
`HubHomePage.test.tsx` verifica Hub acima do resumo, painel único de pendências,
consultas compartilhadas, cartões abrindo o menu desktop/mobile e estado de erro.
Regressão: 229 testes passaram em 42 arquivos; typecheck/lint/build aprovados.
Composição Hub + resumo e abertura dos menus pelos cartões verificadas no
navegador local em desktop e mobile, mantendo o tenant ativo e sem overflow.

Validação posterior, em 2026-09-12: 256 testes em 47 arquivos passaram;
typecheck/lint/build aprovados. Novos casos verificam a separação pagar/receber,
intervalo inclusivo de sete dias, origens dos títulos, consulta compartilhada e
cobertura parcial de compras. A home, o seletor de período e o drawer financeiro
foram conferidos no navegador em desktop e mobile, sem overflow horizontal.
A organização local está vazia: fluxos com registros e comandos foram validados
pelos testes, sem executar baixas ou recebimentos reais. Permanecem avisos
preexistentes de XHR no jsdom e chunk MUI de 603,25 kB no build.

## Decisões Técnicas

- Refetch somente para consultas operacionais ativas.
- O financeiro separa valores a pagar e a receber, sem somar fluxos opostos.
  Hoje consulta uma data; próximos sete dias inclui hoje até hoje + 6; mês
  corrente consulta primeiro/último dia. Vencidas são somente as do período.
- Pendências financeiras abrem a conta exata por `?detail=ID`, compras abrem a
  OC exata e estoque abre `/app/relatorios?tab=estoque`. Indicadores financeiros
  abrem a lista real de títulos retornados no relatório, sem filtros fictícios.
- Home compacta: módulos e pendências lado a lado a partir de `md`, cartões e
  banner menores, resumo abaixo com seletor financeiro alinhado ao título.
  Nenhuma pendência carregada é silenciosamente cortada; o painel permite rolagem.
- Consultas paginadas incompletas são identificadas também quando não há
  pendências na amostra. Contadores globais dependem do backend registrado no backlog.
- Consultas seguem permissões efetivas e cache por organização.
- Pendências incluem compras aguardando recebimento, vendas confirmadas sem nota, OS concluídas sem nota e contas vencidas de todo o histórico. Período financeiro filtra somente os indicadores do resumo. Cada item abre o registro exato, e grupos sem permissão são removidos também na apresentação.
- Indicadores são informativos; a navegação principal fica no menu superior.
  Os cartões de módulo da home abrem esse mesmo menu, não páginas intermediárias.
- Hold continua sendo a unica garantia de inventario.
- `HubHomePage` volta à rota inicial com o painel de pendências alinhado à direita
  em telas largas e empilhado no celular. O resumo ocupa a largura disponível abaixo.
- `DashboardPage embedded` usa título h2, preserva os indicadores e omite uma
  segunda lista de pendências/atividades e a consulta exclusiva de vendas recentes.
- Contas, estoque e compras compartilham chave por tenant, filtros e `staleTime`
  entre Hub e resumo, sem novas APIs ou chamadas duplicadas na montagem.
- Totais parciais de ordens são identificados como consultas das últimas 20
  ordens; ausência de resposta não é exibida como `0+`.
- Área Estoque: mega menu Compras (OC, Nota de Entrada, Fornecedores,
  Recebimentos) + Estoque (posição, razão, locais, produtos, ajustes).
- Tabs de `/app/estoque` aceitam `?tab=posicao|razao|locais|ajustes`.
- As seis áreas estão disponíveis diretamente no cabeçalho em qualquer tela.
  Os menus abrem sobre o conteúdo, com colunas por processo e links reais;
  não é necessário passar pela home da área para consultar uma nota ou conta.
- No mobile, `HeaderAreaNavigation` oferece os mesmos grupos em um único drawer.
  Não existe sidebar, aba de módulo ou link “Ver área”. Favoritos e recentes
  persistidos são preservados. A marca Kaneko continua levando ao início.
- O fechamento por clique externo usa o início do gesto, evitando que o clique
  no cartão da home feche imediatamente o menu que acabou de abrir.

## Modulos relacionados

- [[workspace]]
- [[listagens]]
- [[eventos]]
- [[acesso]]
- [[auth]]
- [[core]]
- [[fiscal-financeiro]]

## Historico (data + acao)

| Data | Acao |
|---|---|
| 2026-08-03 | Substitui landing estatica por painel operacional com dados reais. |
| 2026-09-04 | Amplia o painel com pátio, vencimentos, estoque mínimo e pendências comerciais reais. |
| 2026-09-04 | Separa Hub home (`/app`) do dashboard operacional (`/app/visao-geral`). |
| 2026-09-11 | Alinha painel Pendências à direita em telas `lg+` (`ml: auto`). |
| 2026-09-11 | Empty state de Pendências sem jargão técnico (“API”). |
| 2026-09-11 | Navegação por área Estoque + mega menu por processo. |
| 2026-09-11 | Navegação direta por áreas no topo, inspirada nas referências visuais fornecidas; cabeçalho responsivo e abertura por teclado sem alterar autenticação ou contratos. |
| 2026-09-11 | Unifica a home no resumo do dia e elimina launcher, atalhos repetidos e páginas intermediárias; mantém leituras reais e permissões. |
| 2026-09-11 | Recupera o Hub inicial com módulos e pendências e coloca o resumo abaixo; cartões abrem a navegação existente e consultas são deduplicadas. |
| 2026-09-12 | Compacta a home, separa pagar/receber, explicita períodos e cobertura, e conecta pendências aos detalhes reais sem novos endpoints. |
| 2026-09-12 | Integra operational-pendencies com totais completos e links exatos de compras/vendas/OS/financeiro; preserva Hub e resumo e não esconde vencidas anteriores ao período. |
