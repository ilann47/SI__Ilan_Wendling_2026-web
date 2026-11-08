> Links: [[core]] · [[auth]] · [[workspace]] · [[listagens]] · [[eventos]] · [[acesso]]

# Dashboard Operacional

## Objetivo

Manter na home a saudação e as pendências da organização ativa. O acesso às áreas fica no menu superior, sem atalhos repetidos na home.

## Contexto

A rota `/app` exibe **HubHomePage**: saudação e pendências. As antigas URLs
`/app/visao-geral` e `/app/areas/:areaId` redirecionam para a home, sem página intermediária.
A home não monta o Resumo do dia nem executa as consultas exclusivas dos indicadores.

## Fluxo (camadas da arquitetura)

```text
/app -> HubHomePage (saudação + pendências)
menu superior / drawer mobile -> áreas e processos
/app/visao-geral ou /app/areas/* -> redirecionamento /app
permissoes -> relatorios/listagens existentes
```

## Endpoints (se houver)

- `GET /api/relatorios/estoque-minimo`
- `GET /api/v1/operational-pendencies?limit=5`

## Estrutura de Dados (DTOs, Entidades)

O painel usa a projeção de pendências com totais completos por categoria e o relatório de estoque mínimo. A projeção mostra até cinco itens por categoria, informa quando há outros e fornece os caminhos para abrir os registros.

## Integracoes externas (se houver)

Nenhuma.

## Tratamento de Erros

O painel de pendências distingue carregamento, falta de permissão e falha de
consulta; erro não é tratado como ausência de pendências. A ação “Tentar novamente”
refaz apenas as consultas que falharam.

## Testes (curl ou equivalente)

O teste da home cobre ausência do bloco de atalhos, do Resumo do dia e do seletor de período,
navegação pelo cabeçalho no desktop/mobile e preservação das consultas de pendências.

### Evidências históricas anteriores à remoção do resumo

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
- Pendências financeiras abrem a conta exata por `?detail=ID`, notas abrem seu
  detalhe e estoque abre `/app/relatorios?tab=estoque`.
- Home compacta: saudação à esquerda e pendências à direita a partir de `md`;
  empilhadas em telas menores.
  Nenhuma pendência carregada é silenciosamente cortada; o painel permite rolagem.
- Consultas paginadas incompletas são identificadas também quando não há
  pendências na amostra. Contadores globais dependem do backend registrado no backlog.
- Consultas seguem permissões efetivas e cache por organização.
- Pendências incluem notas de entrada em rascunho, OS concluídas sem nota e contas
  vencidas de todo o histórico. O frontend também ignora pendências residuais de
  Pedido de Venda.
  Cada item abre o registro exato; grupos sem permissão são removidos na apresentação.
- As áreas permitidas ficam no menu superior, sem grade de atalhos na home.
- Hold continua sendo a unica garantia de inventario.
- `HubHomePage` volta à rota inicial com o painel de pendências alinhado à direita
  em telas largas e empilhado no celular.
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
| 2026-11-08 | Relatórios e indicadores exibem valores monetários e saldos fracionários até a sexta casa. |
| 2026-11-06 | Retira o bloco de atalhos de áreas e o cartão informativo da home, mantendo saudação, pendências e cabeçalho. |
| 2026-11-06 | Remove o Resumo do dia e o seletor financeiro da home; mantém pendências, atalhos e compatibilidade das rotas de início. |
| 2026-11-05 | Remove consulta de vendas administrativas e pendências do fluxo desativado; mantém pendências de OS e indicadores existentes. |
| 2026-10-30 | Substitui indicadores e pendências de compras por Notas de Entrada e remove a permissão purchases. |
| 2026-10-30 | Amplia a presença visual da home com cartões de áreas maiores, ícones em gradiente, elevação e contraste compatíveis com o novo shell global. |
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
| 2026-10-30 | Reduz a escolha inicial para até quatro áreas prioritárias sem esconder perfis restritos; áreas secundárias permanecem no menu superior. |
