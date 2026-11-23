> Links: [[core]] · [[eventos]] · [[instalacoes]] · [[auth]] · [[fiscal-financeiro]] · [[listagens]] · [[clientes]]

# Operação do estacionamento

No cadastro do veículo, **Cliente** é um vínculo opcional de identificação,
inclusive para avulsos. Não cria contrato nem indica mensalidade vigente.
No Pátio, o rótulo **Mensalista** depende do tipo da estadia registrado pela
API a partir do contrato ativo na entrada comum, não do vínculo com cliente.

## Prioridade visual no celular

Na Portaria, o aviso do turno é curto e a composição em seis casas fica em
“Ver composição do valor”, expansível e acessível por teclado/toque. O total a
cobrar continua visível. Data completa do turno e conferência permanecem em
Caixa. A redução de ruído não recalcula dados nem remove as ações.

## Resultado inconclusivo de dinheiro — 2026-11-22

Suprimento/sangria grava a intenção (UUID, tipo, valor e motivo) antes do envio,
isolada por organização, operador e turno. Se a resposta se perder, fechar,
trocar aba ou recarregar não permite gerar outra chave para substituir o envio.
“Retomar movimento pendente” permite consultar o histórico ou repetir a mesma
intenção explicitamente; não há reenvio automático ao reconectar.

A consulta reconhece o UUID já persistido e libera “Novo movimento” somente
após resolver o resultado. Rejeição definitiva também é reconciliada no histórico.
Armazenamento inválido ou indisponível bloqueia novos movimentos de dinheiro
antes do POST; não bloqueia as outras funções de portaria. Tokens não fazem parte
da intenção. A chave não substitui a validação de owner/tenant/saldo da API.

`cashIntent.test.ts` e `CashManagement.test.tsx` cobrem isolamento, dados inválidos,
storage indisponível, timeout aplicado e repetição após reabrir/remontar.

## Objetivo

Concentrar a rotina da portaria no Pátio: contexto de evento/estacionamento,
entrada, conferência e saída pela placa, recebimento, comprovantes e correções
auditadas, sem criar cobrança ou documento fiscal paralelo.

## Contexto

O Pátio separa consulta geral dos veículos da organização da operação do caixa.
A busca rápida de saída usa o backend com o pátio e evento fixados, não depende
dos cartões retornados pelo relatório legado.

Em Veículos no pátio, “Cartões / Listagem” alterna apenas a apresentação da
mesma coleção filtrada. Cartões é o padrão; a escolha é lembrada por organização
e login neste navegador. A listagem usa tabela no desktop e linhas compactas
abaixo de `md`, sem espremer uma tabela larga no celular. Modelo, tipo, entrada,
permanência, evento/cobrança, OS e ações mantêm as fontes e regras anteriores.

Os contadores “no pátio / avulsos / mensalistas” são filtros clicáveis por tipo,
com indicação de seleção e alvos de toque de pelo menos 44 px. O total “no pátio”
seleciona todos os tipos sem apagar a busca por placa. Os filtros são combinados
nos cartões e na listagem; “Limpar filtros” restaura todos e limpa a placa.
Os contadores continuam refletindo os totais da organização retornados pela API,
não a quantidade filtrada. O resultado informa quantos veículos estão exibidos.
Uma estadia de evento continua sendo AVULSO, conforme o domínio existente.

## Fluxo (camadas da arquitetura)

A segunda via abre em `/app/patio/comprovantes/:detailId` com as permissões já exigidas pelo caixa, consulta somente leitura, impressão e retorno à aba Comprovantes com a busca pela placa mantida. Correções e confirmações rápidas continuam em modal.

O campo Placa da portaria aceita uma placa ou identificador de até dez
caracteres, sem máscara obrigatória. Entrada, busca da saída, comprovantes
e correção usam a mesma referência. Placas brasileiras completas com e sem
hífen continuam identificando o mesmo veículo.

1. Organização e operador selecionam o contexto; o frontend o preserva em
   armazenamento local isolado por organização/login.
2. O contexto fica visível com nome do evento, pátio, preço vigente e momento da
   cobrança. Troca exige ação explícita e confirmação.
3. Contexto indisponível bloqueia novas entradas; não há troca silenciosa para
   estacionamento comum.
4. Entrada e saída usam os comandos de caixa existentes. Para dinheiro, o
   frontend calcula o troco com BigInt em milionésimos e envia o valor recebido.
   No pagamento de estacionamento avulso de evento, **Identificar na nota**
   é opcional. A portaria envia CPF/CNPJ e nome ou razão social somente
   quando preenchidos e válidos. O backend reutiliza o cliente pelo documento
   ou cria um cadastro básico na organização, sem vincular o veículo nem
   abrir contrato mensalista. Se o carro já pagou na entrada, a saída não
   pede outro pagamento nem outra identificação.
5. Comprovantes consultam o registro persistido. Segunda via imprime somente o
   recibo e nunca cria recebimento nem NFS-e.
6. Correções exigem supervisor, motivo e confirmação; a API mantém vínculos e
   registra os ajustes, sem apagar os registros originais.

## Endpoints

- GET /api/v1/patio/caixa: contexto autorizado, turno e opções.
- POST /api/v1/patio/entradas: admite recebido em decimal textual quando o
  meio é DINHEIRO; resposta mantém id e acrescenta recebido/troco.
- POST /api/v1/patio/movimentacoes/{id}/previa-saida: conferência autoritativa.
- POST /api/v1/patio/movimentacoes/{id}/saida: admite recebido em dinheiro.
- Os pagamentos de evento em entrada/saída aceitam `tomador` opcional,
  com `documento` e `nome`, para preparar o rascunho de [[fiscal-financeiro]].
- GET /api/v1/patio/busca-saida?placa=&patioId=&eventoId=: procura entradas
  abertas no contexto, incluindo registros fora dos cartões carregados.
- GET /api/v1/patio/comprovantes?placa=: últimos 50 comprovantes.
- GET /api/v1/patio/movimentacoes/{id}/comprovante: segunda via persistida.
- POST /api/v1/patio/movimentacoes/{id}/correcao: chave UUID, ação
  CORRIGIR_PLACA, CORRIGIR_MEIO ou CANCELAR_ESTADIA, motivo de 10–300 caracteres
  e os dados específicos.

## Estrutura de Dados

O contexto local contém IDs e nomes de pátio/evento, sem tokens ou dados de
pagamento. Chaves são independentes por organização e login.
A preferência visual contém somente `cards` ou `list` na chave
`yes7parking.patio.vehicles-view.{org}.{login codificado}`. Não contém veículos,
valores ou permissões, nem altera o contexto da operação ou o filtro de placa.

Valores trafegam em unidades de negócio, não em inteiro escalado. Apenas o
cálculo interno exato do troco usa milionésimos. O preço da saída vem da API,
nunca de uma recomposição feita pelo navegador.

## Integrações externas

Nenhuma integração de pagamento foi adicionada. Confirmar Pix/cartão declara o
recebimento conferido pelo operador; não realiza transação bancária. O recibo é
identificado como comprovante e não substitui a NFS-e.

## Tratamento de Erros

403 mantém a sessão. Entrada e saída preservam suas chaves ao repetir um comando
com resultado inconclusivo. Troco insuficiente/inválido bloqueia a confirmação.
Erros de busca, recibo e correção usam describeError, sem apresentar payloads
ou status cru. Contexto expirado precisa ser trocado explicitamente.
Armazenamento local indisponível usa cartões como padrão e permite alternar
durante a sessão; falha ao salvar a preferência não bloqueia a operação.

## Testes

- operation.test.ts: seis casas, recebido insuficiente, cache inválido,
  isolamento por organização e usuário.
- PatioTools.test.tsx: busca contextual sem mutação, ausência de placa,
  validação de dinheiro, recibo sem emissão e correção com motivo.
- PatioPage.test.tsx: regressão do turno completo, evento pré-pago, criação
  contextual de pátio, contexto obsoleto e ocultação de correções do caixa comum.
- Integração final: 521 testes Vitest em 81 arquivos, lint, typecheck, build e
  teste standalone do publicador da prévia passaram. Vitest usa APIs simuladas.
- `scripts/qa-operation.cjs` executou Chrome real na 5174 a 390 px e desktop:
  pré-pago, recebido/troco de seis casas, impressão, contexto após reload,
  saída sem duplicação, cancelamento supervisor com contrapartida no turno,
  pós-pago, mesma OS e NFS-e pendente, Caixa403 com sessão ainda válida e Gestor.
- `scripts/qa-demo.cjs` percorreu 13 telas desktop e quatro mobile na organização
  demonstrativa, sem erros HTTP nas consultas ou overflow horizontal da página.
- Quando a janela de entrada expira, novas entradas são bloqueadas; busca e
  saída continuam usando o contexto fixado, sem desviar para outro evento.
- `vehicleView.test.ts` cobre padrão seguro, valor inválido, isolamento por
  organização/login e armazenamento indisponível. Os novos casos de PatioPage
  cobrem alternância, busca preservada, restauração, ação sobre o mesmo movimento
  e perfil somente leitura sem comandos. A troca não dispara ação financeira.

Validação da escolha visual em 2026-11-20: 530 testes em 82 arquivos passaram;
os 20 testes focados do Pátio também passaram no checkout oficial (sobrepostos
à suíte completa). Tipagem, lint, build incremental e teste do publicador passaram.
`scripts/qa-patio-view.cjs` verificou Chrome desktop a 1440 px e mobile a
320/390 px: mesma coleção e busca, restauração após reload, alvos de toque de
pelo menos 44 px, sem overflow horizontal, administrador com correção e Caixa
sem correção indevida. A prévia abriu o movimento correto, sem confirmar saída,
pagamento ou correção. Prévia local atualizada na 5174; backend e schema intactos.

`PatioPage.test.tsx` também cobre os filtros por tipo combinados com placa,
preservação entre cartões/listagem, avulso de evento, zero resultados, limpeza,
singular dos contadores e consulta sem comandos/permissões adicionais.

Validação local dos filtros em 2026-11-21: 23 testes focados do Pátio passaram
no checkout oficial, além de tipagem, lint e build incremental. A suíte completa
não foi repetida neste recorte exclusivamente visual. O roteiro Chrome
`qa-patio-view.cjs` conferiu admin/Caixa, todos/avulsos/mensalistas, combinação
com placa, estado vazio e limpeza nos dois formatos, desktop e mobile 320/390 px,
sem overflow horizontal. Depois de filtrar, a prévia continuou abrindo o movimento
exato e o Caixa permaneceu sem correção indevida. Nenhuma saída, correção ou
pagamento foi confirmado; sem mudança de API, schema ou permissões. Prévia 5174 atualizada.

## Decisões Técnicas

Os seletores de evento/pátio e pátio de entrada pesquisam entre as operações autorizadas pelo caixa. A lista pode abrir o cadastro de pátio apenas para quem pode gerenciar instalações.

### Portaria e caixa (2026-11-22)

O operador abre em **Portaria**, com entrada e saída por placa em destaque, lado a
lado no desktop e empilhadas no celular. A consulta de veículos, o caixa completo,
comprovantes e supervisão ficam em abas secundárias. Os filtros por tipo/placa e
a preferência Cartões/Listagem permanecem no mesmo workspace. Contexto evento/pátio
continua persistido por organização/login; fim da janela impede entrada, não saída.

Sem conexão, a UI impede novos comandos e informa que não há fila offline. As
mutações usam `networkMode: always` com guarda explícita, evitando o reenvio
automático por reconexão do React Query. Nada altera a regra existente de 403
preservar sessão. O indicador do navegador é uma ajuda operacional, não uma prova
de que API/provedores estão saudáveis; falhas HTTP continuam visíveis e auditáveis.

Nas novas cobranças, `valorDevido` da API orienta valor cobrado e troco. O campo
`valor` da opção e `valorEsperado` representam o devido em centavos; a base de
seis casas fica em `valorCalculado`. Estado anterior à atualização, com valor
esperado divergente, recebe conflito sem registrar entrada/pagamento/OS. A
configuração de preço mantém base com seis casas. Quando presentes,
`valorCalculado`, `valorDevido` e `diferencaArredondamento` são exibidos sem cálculo
local; snapshots nulos dos históricos não são recriados nem arredondados.

Caixa permite `POST /api/v1/patio/turnos/{id}/movimentos-dinheiro` com chave,
SUPRIMENTO/SANGRIA, valor positivo e motivo de 10–300 caracteres, só no turno
próprio aberto. A API retorna resumo com suprimentos/sangrias e dinheiro esperado.
Esses movimentos não são receita de cliente nem criam NFS-e/OS. O histórico usa
GET no mesmo endpoint. Supervisão é exclusiva `operations:manage`, consulta
`GET /api/v1/patio/turnos?pagina=0&tamanho=20` e movimentos dos turnos; não transfere
caixa nem permite movimentar o turno alheio.

O histórico de comprovantes só consulta após ação do usuário. A segunda via usa
folha de impressão exclusiva; a ocultação do restante da tela só ocorre quando
o recibo está presente.

O backend continua responsável por autorização, escopo, valor, unicidade,
auditoria e integridade fiscal/financeira. A UI não cria acesso implícito:
consulta do caixa usa operations:checkout ou operations:manage; correções só
são exibidas para operations:manage.

## Módulos relacionados

- [[core]]
- [[eventos]]
- [[instalacoes]]
- [[auth]]
- [[fiscal-financeiro]]
- [[listagens]]

## Histórico

| Data | Ação |
|---|---|
| 2026-11-22 | Padroniza seletores da Portaria sem mudar entrada, saída ou cobrança. |
| 2026-11-22 | Identificação fiscal reutiliza ou cadastra cliente básico; pagamento e classificação da estadia permanecem iguais. |
| 2026-11-22 | Adiciona identificação fiscal opcional no pagamento de estadia de evento, sem duplicar a cobrança na saída. |
| 2026-11-22 | Aceita identificador livre no campo Placa da portaria e nas ações da estadia. |
| 2026-11-22 | Move o detalhe do comprovante para subpágina, sem alterar pagamento, impressão ou vínculos fiscais. |
| 2026-11-22 | Separa o rótulo genérico de Cliente no veículo da classificação de Mensalista no Pátio, sem mudar cadastro ou regra de cobrança. |
| 2026-11-22 | Portaria focada em entrada/saída, abas secundárias, conectividade sem fila, snapshots de cobrança em centavos e suprimento/sangria/supervisão mantendo RBAC e vínculos. |
| 2026-11-21 | Torna os contadores filtros por tipo, combinados com busca e visualização, mantendo contagem global e ações existentes. |
| 2026-11-20 | Adiciona escolha Cartões/Listagem com preferência isolada, tabela desktop e lista compacta mobile, mantendo dados, busca, ações e RBAC. |
| 2026-11-19 | Contexto fixo, saída rápida por placa, troco exato, segunda via e correções supervisionadas no Pátio. |
| 2026-11-19 | Integração validada no Chrome desktop/mobile e na suíte completa; saída permanece disponível após encerrar a janela de entradas. |
