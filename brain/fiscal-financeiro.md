> Links: [[core]] · [[auth]] · [[estoque]] · [[conveniencia]] · [[fornecedores]] · [[pagamentos]] · [[paridade-api]] · [[listagens]]

# Fiscal e Financeiro de Entrada

## Objetivo
Operar notas de entrada/saída e contas a pagar/receber na organização ativa.

## Contexto
As telas legadas foram conectadas aos contratos tenant-aware da V55+.
Nota de Entrada saiu do CRUD genérico: lista, wizard guiado e detalhe próprios
no menu Estoque (processo Compras). Saída e serviço ficam em Vendas, sem área
Fiscal separada. Contas continuam no menu Financeiro.

## Fluxo (camadas da arquitetura)
```text
Menu superior Estoque -> Compras (sem página intermediária)
  -> /app/notas-entrada (lista)
  -> /app/notas-entrada/nova (wizard)
  -> /app/notas-entrada/:id (detalhe)
Confirmar: POST /api/notas-entrada/{id}/confirmacao
```

## Endpoints (se houver)
- `/api/notas-entrada`
- `/api/notas-entrada/{id}/confirmacao`
- `/api/notas-entrada/{id}/cancelamento`
- `/api/notas-entrada/{id}/detalhes` (nota + origem + contas + movimentos)
- `/api/contas-pagar`
- `/api/contas-receber`
- `/api/contas-{pagar|receber}/resumo` (mesmos filtros da página, totais completos)
- `/api/contas-{pagar|receber}/{id}/baixas` (histórico imutável)
- `/api/contas-{pagar|receber}/{id}/baixa` (`Idempotency-Key` + valor/data)
- `/api/v1/stock-locations`
- `/api/v1/purchase-orders/{id}/receipts` (origem do wizard)

## Estrutura de Dados (DTOs, Entidades)
Compra e Nota vinculada compartilham `fornecedorId`, `numero`, `serie` e `modelo`
como chave fiscal. Nota envia `localEstoqueId` e opcionalmente
`recebimentoCompraId`.
Resposta de listagem inclui fornecedor, local, totais, itens e situação.
O detalhe integrado inclui a referência da OC, recebimento, contas a pagar e
movimentos de estoque. Histórico de ações permanece indisponível
(ver `src/backlog/backend-dependencies.md`).

## Integrações externas (se houver)
Nenhuma.

## Tratamento de Erros
Menus e ações respeitam `fiscal:*` e `finance:*`.
Wizard exige também `suppliers:read`, `catalog:read` e `stock:read` para criar.
Duplicidade de número/série/modelo/fornecedor retorna conflito legível e mantém
os dados preenchidos para correção. Na compra, os quatro campos da chave liberam
o restante do formulário e ficam bloqueados depois do primeiro produto.

## Testes (curl ou equivalente)
Vitest cobre payload (`inboundNotes.test.ts`), navegação de áreas e gates.
O teste de recuperação da confirmação simula timeout no transporte real da ação
(`api.request`), verifica um único POST e reconciliação por GET, sem acesso à rede.

## Decisões Técnicas
- Wizard: origem manual ou recebimento de OC; sem digitar IDs.
- Ao partir de uma compra recebida, o wizard herda número, série e modelo e não
  permite divergir da chave fiscal registrada na compra.
- O wizard impede chegada anterior à emissão, quantidade não positiva, valor
  unitário ou despesas negativos e descontos maiores que o valor correspondente;
  a revisão final reaplica todas as validações antes de gravar ou confirmar.
- Salvar rascunho = POST create; Confirmar = create + confirmacao (ou ação na lista/detalhe).
- Saída e serviço permanecem em CRUD genérico no menu Vendas, com URLs e RBAC preservados.
- A listagem de notas de entrada mantém a trilha de compras, sem uma segunda
  linha de botões repetindo OC, recebimentos e contas a pagar.
- O detalhe usa o contrato composto para manter a listagem leve e apresentar o
  encadeamento operacional sem consultas por IDs digitados.
- Pendências e indicadores abrem a conta real via `?detail=ID`; despesas avulsas
  seguem rota própria. Baixa/cancelamento exigem `finance:manage` na interface,
  inclusive quando o detalhe é aberto por URL. Somente leitura não exibe comandos.
- O relatório financeiro é delimitado por vencimento; a home mostra pagar e
  receber separados, com as datas explícitas. Filtros globais/histórico completo
  de contas a pagar/receber agora são consumidos de contratos reais; o relatório
  da home segue seu contrato próprio, sem atribuir totais novos a consultas antigas.
- `FinancialAccountsPage` atende pagar e receber, com lista/card mobile, busca,
  filtros URL, ordenação, paginação e resumo SQL de todo o conjunto filtrado.
  `?detail=ID` abre o título exato e seu histórico, independente da página atual.
- Origem, parcela, valor original, descontos/acréscimos, baixado e saldo vêm do
  backend. Links para documentos exigem também permissão de leitura do módulo.
- A baixa explica que somente registra o movimento interno, sem pagamento bancário.
  A tentativa é persistida em `sessionStorage` por organização/login/tipo/título
  antes da requisição; timeout/reload conservam chave e corpo para reexecução segura.
  O histórico legado sinaliza saldo acumulado sem inventar pagamentos individuais.
- O valor da baixa usa o campo monetario padronizado, bloqueia zero/negativo,
  remove zeros a esquerda e continua validando teto pelo saldo antes do envio.
- Criação reutiliza `ResourceFormDialog` e seus seletores; falhas preservam valores.
  Baixa/cancelamento exigem `finance:manage`. Cancelamento é ocultado após baixa parcial.

## Módulos relacionados
[[estoque]], [[conveniencia]], [[fornecedores]], [[pagamentos]], [[paridade-api]], [[listagens]], [[importacao-xml]].

## Histórico (data + ação)
| Data | Ação |
|---|---|
| 2026-09-29 | Alinha compra e Nota de Entrada pela chave fornecedor/número/série/modelo, herda os dados no fluxo vinculado e valida o contrato na suíte completa. |
| 2026-09-25 | Mantém identidade e datas fiscais na Nota de Entrada e documenta a separação em relação à Ordem de Compra. |
| 2026-09-12 | Corrige mock de timeout da confirmação de entrada para api.request e verifica tentativa única seguida de GET, eliminando HTTP real no teste sem alterar produção. |
| 2026-09-12 | Acrescenta importação operacional de XML com conciliação e contagem física persistidas; seleção explícita de recebimento evita repetir entrada; confirmar não representa emissão fiscal externa. |
| 2026-08-04 | Integração frontend V55 concluída. |
| 2026-08-04 | Integração frontend V56 concluída. |
| 2026-08-04 | Integração frontend de Nota de Serviço V57 concluída. |
| 2026-09-11 | Nota de Entrada dedicada (lista/wizard/detalhe) + área Estoque. |
| 2026-09-11 | Trilha Compras (OC→Receber→Nota→Pagar) + mega menus em todas as áreas. |
| 2026-09-11 | Detalhe integrado da nota, resumo sticky e revisão operacional do wizard. |
| 2026-09-11 | Reúne documentos nos menus de Compras/Vendas e remove atalhos duplicados da listagem de entrada. |
| 2026-09-12 | Conecta títulos do resumo a detalhes por ID e restringe comandos a finance:manage; separa fluxos financeiros por período. |
| 2026-09-12 | Introduz contas operacionais com filtros/totais reais, origem, saldo, histórico e baixa recuperável por chave idempotente; testes de URL/RBAC/retry e persistência da tentativa. |
| 2026-09-28 | Reforça as validações do wizard de entrada para datas, itens, despesas e descontos, inclusive na confirmação final. |
| 2026-09-28 | Verifica no navegador notas e contas relacionadas, padroniza situações financeiras e mantém links de origem sem expor jargão técnico. |
| 2026-09-29 | Migra preparação de notas, baixas e cancelamentos para o shell modal compartilhado, preservando idempotência e regras existentes. |
| 2026-09-29 | Padroniza a entrada monetária da baixa sem alterar idempotência ou limite pelo saldo. |
