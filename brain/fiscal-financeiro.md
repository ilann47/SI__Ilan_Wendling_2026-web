> Links: [[core]] · [[auth]] · [[estoque]] · [[conveniencia]] · [[fornecedores]] · [[pagamentos]] · [[paridade-api]] · [[listagens]]

# Fiscal e Financeiro

Com o backend V91–V95, o editor de Nota de Entrada, os títulos e as baixas de
Contas a Pagar aceitam até seis casas. Revisão, lista e detalhe não ocultam
frações menores que um centavo. O editor bloqueia perda de dígitos antes do envio.
Com a V97 de teste, Nota de Saída e Contas a Receber também aceitam e exibem
até seis casas em itens, valores, percentuais, parcelas e recebimentos.
O frontend continua enviando a quantia em reais, não em unidades escaladas.
Ordem e Nota de Serviço seguem a mesma regra de seis casas em itens, descontos,
ISS e parcelas. Despesas avulsas, seus pagamentos e o lançamento manual de
títulos usam a validação compartilhada dos campos monetários.
Na importação XML, conciliação e contagem validam o decimal digitado antes de
converter para o payload; XML e lançamentos já registrados não são regravados.

## Nota de Serviço pela Ordem de Serviço (2026-11-06)

- OS concluída prepara rascunho; o atalho **Conferir nota** abre
  `/app/notas-servico/:id`. A emissão não é mais disparada diretamente no
  painel da OS nem na lista de notas. Links antigos com `?detail=` redirecionam.
- O detalhe consulta itens, totais, ISS e parcelas salvas, pede conferência
  explícita e emite com `If-Match` da versão revisada. Resultado incerto exige
  nova leitura da mesma nota. Alterar dados do rascunho invalida a conferência.
- A lista busca por número e filtra cliente e situação no backend. A nota
  avulsa permite múltiplos serviços. Na nota de OS, cliente e serviços são
  herdados e o formulário edita apenas data, ISS, pagamento e observação.
- Contas geradas têm links com `finance:read`; o cancelamento pede motivo
  e não apaga a nota. Rascunhos anteriores devem ser salvos para registrar
  parcelas. Nenhuma etapa representa envio ou autorização externa de NFS-e.

## Fluxo de Saída e reversão fiscal interna (2026-11-05)

- Vendas → Notas de Saída usa lista paginada pelo servidor (número e situação),
  editor dedicado (`/nova`, `/:id/editar`) e documento (`/:id`). Links anteriores
  com `?detail=` continuam abrindo a nota. Toda nova nota de mercadorias é avulsa,
  sem fluxo ou seletor de Pedido de Venda.
- POST de criação aceita `Idempotency-Key`; o editor mantém chave e corpo da
  tentativa incerta por organização e login. PUT do rascunho exige `If-Match`.
  O editor não envia vínculo comercial. Para desconto por item, envia valor
  ou percentual; ao reabrir, mantém o valor registrado e não reenvia o
  percentual derivado/arredondado.
- O detalhe (`GET /api/notas-saida/{id}/detalhes`) traz nota versionada,
  cronograma salvo e os títulos e movimentos acessíveis da própria nota. Notas
  antigas sem cronograma precisam ser salvas novamente. Para confirmar,
  confira produtos, local, total e parcelas da mesma versão e envie `If-Match`.
  O financeiro permite filtrar somente as origens reconhecidas pelo contrato.
- Entrada e saída confirmadas continuam imutáveis; a ação distinta **Reverter
  nota** registra motivo (até 500 caracteres), exige `fiscal:manage`,
  `finance:manage` e `stock:manage` e envia `If-Match` em `POST /{id}/reversao`.
  A ação só aparece em confirmada elegível; o backend
  verifica integridade, baixas e estoque. Mostra motivo e data da reversão,
  lançamentos originais e compensatórios, e preserva a nota para consulta.
  Não é cancelamento fiscal externo. Sem acesso de leitura, os efeitos não
  são apresentados como listas vazias.
- Confirmação e reversão de resultado incerto consultam a mesma nota via GET,
  sem repetir a mutação. Testes: `outboundNotes.test.ts`,
  `OutboundNoteDocumentPage.test.tsx` e `InboundNoteDocumentPage.test.tsx`.

## Fluxo vigente PARK-0003 (2026-10-16)

`/app/notas-entrada` lista com número/situação/fornecedor paginados no servidor.
`/nova` e `/:id/editar` usam o mesmo editor; `/:id` mostra documento, conferência,
estoque e títulos. Rascunho PENDENTE é editável; confirmar exige salvar, consultar
prévia da revisão atual e conferir documento/quantidades físicas/local/custos e
vencimentos. O roteador de dados bloqueia links, transições programáticas e Voltar/Avançar
com alterações não salvas, além do aviso de saída da página. Alteração invalida a revisão; confirmado é imutável e não cancelável.

Contratos: POST base com Idempotency-Key; PUT /{id} com If-Match; POST /previa ou
/{id}/previa (este com If-Match); POST /{id}/confirmacao com If-Match; cancelamento/
exclusão enviam versão e só aparecem nos estados admitidos. Campo e corpo da
criação ficam fixos em sessionStorage por organização/login após falha de transporte;
reconciliação reaproveita a mesma chave e corpo. Confirmação falhada é reconciliada
por GET do mesmo ID, sem criar outro documento. Enquanto inconclusiva, bloqueia
nova confirmação até recarregar e conferir de novo.

Nota inclui transportadora e observação interna.
Condição/transportadora podem herdar o fornecedor; referências e cadastros são os
mesmos aprovados. Prévia traz itens/unidade/código fornecedor/custos, parcelas
positivas efetivas, diferença desconto geral/custo e cálculo de custo médio ponderado
por item. Sem condição, o vencimento
na emissão é explícito; total zero não promete título pagável. Efeitos invalidam
consultas do tenant para atualizar estoque, financeiro e home. Seções sem leitura
mantêm null/sem permissão, sem fabricar ausência de dados. Não há timeline por
recurso disponível nesta tela.

Observações opcionais ficam recolhidas para reduzir a altura inicial do formulário.
A barra de ações permanece visível durante a rolagem e cada item resume a mudança
de custo médio antes de abrir a memória completa do cálculo.

Nota CANCELADA sem reversão mantém composição e cronograma do rascunho apenas para consulta.
O resumo distingue esse estado
terminal de PENDENTE/CONFIRMADA e não anuncia obrigação ou movimento futuro;
não há confirmação nem novos efeitos nesse detalhe (correção F5/PARK-0003).

A regra de custo do UC401, desconto geral e cadastros financeiros foram preservados.
A reversão interna não executa pagamento ou estorno bancário.


## Objetivo
Operar notas de entrada/saída e contas a pagar/receber na organização ativa.

## Contexto
As telas legadas foram conectadas aos contratos tenant-aware da V55+.
Nota de Entrada saiu do CRUD genérico: lista, wizard guiado e detalhe próprios
no menu Estoque (processo Entradas). Saída e serviço ficam em Vendas, sem área
Fiscal separada. Contas continuam no menu Financeiro.

## Fluxo (camadas da arquitetura)
```text
Menu superior Estoque -> Entradas (sem página intermediária)
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

## Estrutura de Dados (DTOs, Entidades)
Nota usa `fornecedorId`, `numero`, `serie` e `modelo` como chave fiscal e envia
`localEstoqueId`.
Resposta de listagem inclui fornecedor, local, totais, itens e situação.
O detalhe integrado inclui contas a pagar e movimentos de estoque. Histórico de ações permanece indisponível
(ver `src/backlog/backend-dependencies.md`).

## Integrações externas (se houver)
Nenhuma.

## Tratamento de Erros
Menus e ações respeitam `fiscal:*` e `finance:*`.
Wizard exige também `suppliers:read`, `catalog:read` e `stock:read` para criar.
Duplicidade de número/série/modelo/fornecedor retorna conflito legível e mantém
os dados preenchidos para correção. Na Nota, os quatro campos da chave liberam
o restante do formulário e ficam bloqueados depois do primeiro produto.

## Testes (curl ou equivalente)
Vitest cobre payload (`inboundNotes.test.ts`), navegação de áreas e gates.
O teste de recuperação da confirmação simula timeout no transporte real da ação
(`api.request`), verifica um único POST e reconciliação por GET, sem acesso à rede.

## Decisões Técnicas
- Editor de Nota usa seletores pesquisáveis; sem digitar IDs.
- O wizard impede chegada anterior à emissão, quantidade não positiva, valor
  unitário ou despesas negativos e descontos maiores que o valor correspondente;
  a revisão final reaplica todas as validações antes de gravar ou confirmar.
- Salvar rascunho = POST create; Confirmar = create + confirmacao (ou ação na lista/detalhe).
- Saída tem lista, editor e detalhe dedicados no menu Vendas; serviço mantém o
  CRUD com suas URLs e permissões.
- A listagem de notas de entrada mantém somente a ação principal, busca, filtros e registros.
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
- Na conferência, cada item separa custo unitário de aquisição de custo médio do
  estoque. A tela mostra saldo/custo atuais e resultado estimado; após confirmação,
  mostra o snapshot registrado pelo backend.
- O documento confirmado evita repetir fornecedor e chave fiscal no corpo. O
  cabeçalho resume situação, datas, local, condição e total; a composição usa
  linhas tabulares e custo médio expansível. Os totais seguem imediatamente os
  itens, sem painel lateral, e estoque e contas a pagar aparecem juntos como
  `Lançamentos gerados`, preservando links e permissões existentes. Origem e
  observações ficam recolhidas para reduzir ruído na consulta.
- Em `Lançamentos gerados`, o efeito de estoque preserva a rastreabilidade do
  backend e mostra saldo anterior, quantidade de entrada e saldo posterior.
- Criação reutiliza `ResourceFormDialog` e seus seletores; falhas preservam valores.
  Baixa/cancelamento exigem `finance:manage`. Cancelamento é ocultado após baixa parcial.

## Módulos relacionados
[[estoque]], [[conveniencia]], [[fornecedores]], [[pagamentos]], [[paridade-api]], [[listagens]], [[importacao-xml]].

## Histórico (data + ação)
| Data | Ação |
|---|---|
| 2026-11-08 | Exibe seis casas na Nota e preserva precisão de quantidade, valor e percentual ao enviar o formulário. |
| 2026-11-08 | Exibe e valida seis casas da Nota de Saída ao recebimento, reaproveitando a validação decimal da Nota de Entrada. |
| 2026-11-08 | Leva seis casas à Ordem e à Nota de Serviço, ao ISS, às despesas avulsas e às consultas; valida conciliação e contagem antes de gravar. |
| 2026-11-06 | A emissão da Nota de Entrada não aceita datas futuras no calendário nem na validação do formulário antes de salvar ou conferir; a API aplica a mesma regra na entrada manual e no XML. |
| 2026-11-05 | Integra lista, rascunho versionado e conferência dedicados na Nota de Saída; diferencia efeitos próprios e da venda e expõe reversão interna auditável para Entrada e Saída avulsa elegíveis. |
| 2026-11-05 | Desativa a criação e navegação por Pedidos de Venda; mantém venda histórica nas notas, títulos e razão sem vínculo navegável. |
| 2026-11-05 | Remove da Nota de Saída e do financeiro os campos, filtros e estados de compatibilidade com Pedido de Venda. |
| 2026-10-30 | Remove vínculos históricos de compra; Nota de Entrada passa a ser o único fluxo manual/XML de entrada. |
| 2026-10-30 | Exibe no documento confirmado a cadeia real do movimento de estoque: saldo anterior, entrada e saldo posterior. |
| 2026-10-30 | Reorganiza o detalhe da Nota de Entrada como documento ERP plano, elimina identidade duplicada, põe totais abaixo dos itens e agrupa os lançamentos gerados com responsividade validada. |
| 2026-10-24 | Reduz a densidade do editor: observações recolhidas, ações persistentes e custo médio resumido com detalhamento expansível por item; valida o fluxo no navegador com backend e banco locais isolados. |
| 2026-10-23 | Acrescenta à conferência e ao documento da Nota o custo médio ponderado estimado/registrado por item. |
| 2026-09-29 | Alinha compra e Nota de Entrada pela chave fornecedor/número/série/modelo, herda os dados no fluxo vinculado e valida o contrato na suíte completa. |
| 2026-09-25 | Mantém identidade e datas fiscais na Nota de Entrada e documenta a separação em relação à Ordem de Compra. |
| 2026-09-12 | Corrige mock de timeout da confirmação de entrada para api.request e verifica tentativa única seguida de GET, eliminando HTTP real no teste sem alterar produção. |
| 2026-09-12 | Acrescenta importação operacional de XML com conciliação e contagem física persistidas; seleção explícita de recebimento evita repetir entrada; confirmar não representa emissão fiscal externa. |
| 2026-08-04 | Integração frontend V55 concluída. |
| 2026-08-04 | Integração frontend V56 concluída. |
| 2026-08-04 | Integração frontend de Nota de Serviço V57 concluída. |
| 2026-11-06 | Abre conferência dedicada da Nota de Serviço a partir da OS, lista com filtros, avulsa com itens e cancelamento justificado. |
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
| 2026-10-30 | Remove mensagens, ações e contratos de regularização histórica; a interface trata somente Notas de Entrada próprias. |
