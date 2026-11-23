> Links: [[core]] · [[auth]] · [[workspace]] · [[instalacoes]] · [[vendas]] · [[acesso]] · [[conveniencia]] · [[fiscal-financeiro]]

# Eventos e Ofertas

## Preparação guiada — 2026-11-22

Ao criar um evento, **Tipo de serviço** é uma seleção obrigatória por nome,
sem escolha automática mesmo quando só há uma opção. O seletor consulta
`GET /api/v1/events/service-options` com `events:create`, apenas serviços ativos
da organização; o POST do evento envia `serviceId`. Usa o seletor padrão de
referências: lista, pesquisa e **Cadastrar serviço** para quem tem permissão
de criar em [[conveniencia|Serviços]]. Após o cadastro, o usuário volta à lista
e seleciona explicitamente, sem perder o formulário do evento.
O detalhe mostra a seleção. Eventos antigos não são preenchidos automaticamente.
O serviço escolhido segue para a OS do pátio e o rascunho em [[fiscal-financeiro]];
o preço e momento de cobrança continuam configurados na portaria.

Novos eventos herdam o fuso da organização ativa. Início e fim representam
horários locais desse fuso e são convertidos para instantes antes do POST, sem
depender do navegador. Horários inexistentes ou ambíguos são recusados no
formulário. Início e fim são escolhas explícitas, sem preencher amanhã
automaticamente; o fim precisa ser posterior ao início. O detalhe mostra
o início previsto no fuso histórico do evento.

O caminho padrão é Portaria: Evento e Alocação. Produto, lote e disponibilidade
comercial aparecem depois de escolher “Configurar venda antecipada”.
“Voltar à lista de eventos” sai dessa visão e restaura a aba Evento.
“Voltar à portaria” abre /app/patio e só aparece para quem tem acesso ao Pátio.
Quem só consulta disponibilidade conserva esse acesso.

A subpágina usa um formulário para pátio, quantidade de carros, cobrança e
reentrada, com o local já definido no cadastro do evento. Se faltar um pátio,
o cadastro existente pode ser aberto desse ponto e retorna com o novo pátio
selecionado e os campos preservados. Uma política existente nunca é substituída
automaticamente; entrada única é a sugestão quando ainda não há regra.

O guia na [[dashboard|home]] reutiliza essa projeção e seus passos.
`/app/eventos?formulario=evento` abre o formulário existente. A listagem,
a criação concluída e o botão de continuar preparação levam à subpágina
`/app/eventos/{id}`. Links antigos com `?evento={id}` redirecionam
para a mesma subpágina. O detalhe consulta o evento no tenant ativo pela
API existente e concentra Ciclo de vida, preparação e cobrança, sem a
listagem nem outro seletor de evento. **Voltar** retorna à listagem.
Criações e transições invalidam catálogo e onboarding da organização.

A configuração aceita base de até seis casas e mostra uma prévia HALF_UP exata
em centavos e o ajuste, usando BigInt, sem alterar preços históricos. A API
continua autoritativa. Valores que resultem em cobrança zero são bloqueados.
Testes: `chargePreview.test.ts`, `EventsPage.test.tsx` e
`EventPatioOperation.test.tsx`; a execução focal do stage passou 28 casos.

Abra **Operação → Eventos → Eventos e ofertas**. O mesmo grupo contém
**Vendas e credenciais**, visível conforme as permissões de cada rota.

Ao selecionar um evento com permissão de edição, **Cobrança avulsa no pátio**
configura o valor fixo e quando receber. A configuração vale só para novas
entradas sem reserva e não altera o fluxo de credenciais.

O preço do lote permite até seis casas decimais e o catálogo de lotes mantém essa precisão na apresentação. Vagas continuam unidades inteiras.

## Objetivo

Operar o nucleo configuravel de eventos: evento, alocacao de patio, produto,
lote de preco, publicacao e disponibilidade.

## Contexto

Eventos, alocações, produtos e lotes usam os catálogos reais do servidor.
Snapshots do [[workspace]] complementam a navegação, mas não substituem a
consulta por nome. Escritas versionadas enviam `If-Match`; criações geram
chave idempotente quando exigida pelo contrato.

## Fluxo (camadas da arquitetura)

Ao salvar, `EventPatioOperation` usa os endpoints existentes de alocação,
cobrança e política apenas para as partes editáveis e necessárias. A alocação
usa o período do evento, com cotas comercial e reservada zero. Se uma etapa
falhar após outra ter sido gravada, o formulário retoma sem repetir o vínculo.
Quem já pode vincular um pátio escolhe o pátio antes das datas no Novo evento.
O calendário, no fuso da organização, bloqueia dias lotados e horários
indisponíveis em dias parcialmente ocupados. Ao completar o intervalo, mostra
o menor saldo simultâneo em todo o período, sem reservar vagas.
O pátio escolhido segue para a preparação. Ao vincular, a tela revalida
o saldo do período e limita a quantidade de carros; o servidor faz a
confirmação definitiva sem depender da consulta anterior.
Salvar não abre a portaria. A revisão exige preparação confirmada pelo servidor
e a abertura usa a versão atual do evento, após confirmação. Ciclo de vida,
equipe, gestão de capacidade e venda antecipada ficam em Opções avançadas.
Rascunho não abre automaticamente: quando a configuração estiver pronta, a
tela informa o horário em que poderá ser aberta e disponibiliza a revisão
manual dentro do período. A alocação avançada valida sobreposição com o
evento e soma das cotas antes de enviar.
O calendário não cria uma nova permissão nem exige migração de dados.

O ciclo de vida fica no detalhe `/app/eventos/:eventId`. Alocações,
produtos e lotes têm páginas de formulário e de detalhe independentes:
a aba e os filtros `evento-catalogo`/`produto-catalogo` permanecem na URL
no retorno à lista. Os detalhes são consultados no catálogo do seu pai,
sem depender de seleções anteriores do navegador. Atualização de capacidade
e publicação do produto preservam as permissões e o `If-Match` da API.

Quem também possui `organizations:admin` pode cadastrar um local pelo
formulário de novo evento. O rascunho do evento é preservado e o novo local
fica selecionado ao voltar.

```text
Venue + Evento
  -> Alocacao Evento-Patio
  -> Produto de Estacionamento
  -> Lote de Preco
  -> Publicacao / abertura de vendas
  -> Disponibilidade
```

## Endpoints (se houver)

- `GET /api/v1/events/{id}/patio-operation-summary`
- `GET /api/v1/parking-facilities/{id}/availability`: `startsAt`, `endsAt` em ISO e `includeTimeline` opcional.
  A API usa as permissões existentes de consulta de inventário e gestão de instalações.
- `POST /api/v1/events/{id}/patio-operation-start` (`confirmed`, `If-Match`)
- `POST/PATCH /api/v1/events`
- `POST /api/v1/events/{id}/publication|sales-opening|sales-closing|operation-start|operation-closing`
- `POST /api/v1/events/{id}/parking-allocations`
- `PATCH /api/v1/parking-allocations/{id}`
- `POST /api/v1/events/{id}/parking-products`
- `POST /api/v1/parking-products/{id}/publication`
- `POST /api/v1/parking-products/{id}/price-tiers`
- `GET /api/v1/events/{id}/availability`

## Estrutura de Dados (DTOs, Entidades)

Formularios seguem `EventoResponse`, `AlocacaoPatioEventoResponse`,
`ProdutoEstacionamentoResponse`, `LotePrecoResponse` e
`DisponibilidadeEventoResponse`. Datas `datetime-local` sao convertidas para
instantes ISO antes do envio. A consulta de disponibilidade informa
`operationalCapacity`, `availableCapacity` e, quando solicitado,
`segments` com início, fim (exclusivo) e saldo de cada intervalo.

## Integracoes externas (se houver)

Nenhuma nesta fase.

## Tratamento de Erros

Transicoes invalidas, checklist incompleto, conflitos de capacidade e versoes
divergentes permanecem regras do backend e sao exibidos via Problem Details.

## Testes (curl ou equivalente)

Vitest cobre conversao temporal e criacao idempotente de evento.

Os testes de criação e alteração de política simulam e verificam o GET de
atualização do catálogo após a mutação. Não dependem de um backend acessível
durante o Vitest. Esta manutenção de testes não altera o comportamento da tela.

## Decisoes Tecnicas

Local e pátio usam o mesmo seletor com busca do tipo de serviço. Cadastros contextuais mantêm o rascunho; o serviço continua sendo escolhido explicitamente, sem seleção automática.

- O resumo identifica portaria avulsa; recebimentos de ingressos antecipados
  não são anunciados como incluídos. Valores e diferenças usam texto decimal,
  sem ponto flutuante. Turnos mistos possuem ressalva visível.
- Seções não autorizadas são omitidas pelo servidor. Link de OS requer
  adicionalmente `service_orders:read`; pendência NFS-e não é autorização fiscal.
- Seletores de eventos percorrem o catálogo paginado real; alocações e produtos
  usam o catálogo do evento e referências recentes confirmadas. A revisão é
  obtida do registro selecionado e não é digitada.
- Local do evento e pátio usam catálogos da organização; a alocação recebe
  o nome do pátio na resposta, sem depender de referências do navegador.

- Disponibilidade nao e apresentada como garantia; somente hold garante estoque.
- Encerramento operacional reconhece explicitamente a pendencia financeira externa.
- Direito da fase atual e somente `ESTACIONAMENTO_EVENTO`.
- A consulta de disponibilidade permanece visivel a qualquer Membership ativa;
  configuracao, publicacao, precificacao, inventario e operacao aparecem somente
  quando a permissao contextual correspondente esta presente.
- Selecionar uma alocacao real preenche evento, janela de acesso e quota vendavel
  do produto a partir da resposta da API, evitando divergencia temporal local.
- Evento legado sem politica explicita e carregado com `ENTRADA_UNICA` como
  proposta visivel; o valor somente passa a valer depois do PATCH confirmado.
- Eventos, alocacoes, produtos e lotes usam cards operacionais no mobile e
  preservam tabelas no desktop; as abas permitem rolagem e botoes de navegacao
  em telas estreitas sem esconder etapas.
- Capacidade, cota, preco, quantidade, prioridade e versao usam a validacao
  numerica compartilhada, sem negativos indevidos ou zeros a esquerda.
- Referências recentes são escolhidas pelo nome. O código interno aparece
  somente como alternativa quando o contrato não oferece catálogo.
- Tabelas e resultados não expõem ID/versão como conteúdo principal; fuso,
  referência externa, situação e revisão usam linguagem operacional.
- O cadastro curto de Evento abre em `OperationalFormDialog`; catálogo e ciclo
  de vida permanecem na página por serem consulta e operação contínua. Essa
  separação evita misturar criação modal com transições encadeadas.

## Modulos relacionados

- [[instalacoes]]
- [[workspace]]
- [[vendas]]
- [[acesso]]
- [[auth]]

## Historico (data + acao)


| Data | Acao |
|---|---|
| 2026-11-22 | Move o cadastro contextual de local e pátio para dentro da lista. |
| 2026-11-22 | Usa a lista padrão na seleção de serviço do evento, com cadastro contextual autorizado e escolha manual. |
| 2026-11-22 | Exige a seleção de serviço ativo em novos eventos, sem preenchimento automático, e exibe a seleção no detalhe. |
| 2026-11-22 | Separa o retorno ao Pátio da volta da venda antecipada à lista de eventos. |
| 2026-11-22 | Exige datas explícitas, valida o período e orienta a abertura manual de eventos em rascunho. |
| 2026-11-22 | Limita a quantidade de carros ao pátio selecionado na preparação da portaria. |
| 2026-11-22 | Seleciona pátio antes das datas, desativa dias e horários lotados e usa o menor saldo do período até o vínculo. |
| 2026-11-22 | Unifica a configuração de portaria, preserva o rascunho ao cadastrar pátio e confirma a abertura avulsa separadamente. |
| 2026-11-22 | Separa criação e detalhes de Alocação, Produto e Lote da listagem, mantendo filtros e escopo. |
| 2026-11-22 | Prioriza preparo da portaria, separa venda antecipada e explica total/ajuste de novas cobranças em centavos. |
| 2026-11-19 | Preparação avulsa e resumo de movimento, recebimentos líquidos e pendências com RBAC. |
| 2026-11-13 | Cadastro de local pelo formulário de novo evento. |
| 2026-11-09 | Posiciona Eventos e ofertas e Vendas e credenciais em Operação → Eventos. |
| 2026-11-09 | Eventos e ofertas passou para Vendas; abas de alocação/preço exigem suas leituras e formulário de produto só consulta alocações se autorizado. |
| 2026-11-09 | Adiciona configuração de cobrança avulsa para Eventos e seleção no Pátio. |
| 2026-11-08 | Consulta locais e pátios no servidor e usa o nome retornado na alocação. |
| 2026-11-08 | Padroniza a seleção por nome e usa a revisão do registro nas ações de Eventos. |
| 2026-11-08 | Abre o cadastro de evento em página responsiva, sem mudar os campos nem as transições do ciclo de vida. |
| 2026-11-08 | Preço de lote valida até seis casas antes do envio e é apresentado sem ocultar milionésimos. |
| 2026-10-24 | QA ponta a ponta simplifica seletores, tabela, ciclo de vida e resultados e remove metadados técnicos da leitura principal. |
| 2026-08-03 | Implementa configuracao, ciclo de vida, oferta e disponibilidade. |
| 2026-08-03 | Alinha abas e acoes as permissoes contextuais do backend. |
| 2026-08-03 | Herda periodo e quota da alocacao ao configurar produto. |
| 2026-08-03 | Impede envio nulo ao definir politica em evento legado. |
| 2026-09-12 | Completa mocks e assertivas da atualização do catálogo após criar/alterar evento, evitando rede real durante os testes. |
| 2026-09-28 | Valida evento, alocação, produto, lote e disponibilidade no navegador e apresenta categoria, preço e estados em linguagem operacional. |
| 2026-09-29 | Adapta catalogos e etapas de eventos ao mobile com cards, rotulos acessiveis e abas rolaveis. |
| 2026-09-29 | Unifica a validacao dos campos numericos do ciclo de eventos. |
| 2026-10-30 | Move a criação de evento para o diálogo compartilhado sem alterar catálogo, idempotência ou ciclo de vida. |
