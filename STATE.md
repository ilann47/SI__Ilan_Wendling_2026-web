> Links: [[brain/core]] · [[brain/dashboard]] · [[brain/operacao]] · [[brain/fiscal-financeiro]]

# Estado do Projeto

**Última atualização:** 2026-11-22
**Fase atual:** seleção explícita de serviço no cadastro de evento.

- Novos eventos exigem um serviço ativo escolhido pelo usuário no formulário;
  não há serviço selecionado ou criado automaticamente. O serviço aparece no
  detalhe e no rascunho fiscal da estadia, sem efeito na cobrança.
- O seletor de serviço do evento segue o padrão de lista e busca com cadastro
  contextual para quem tem acesso. Criar um serviço não o seleciona.

- Uma lista só mostra rascunhos do pátio e notas internas com origem e situação.
  Busca e paginação são compartilhadas, sem mudar a criação manual, a edição
  dos rascunhos ou seus efeitos financeiros e fiscais.

- A identificação fiscal opcional, informada no pagamento ou na revisão do
  rascunho, reaproveita o cliente da organização pelo CPF/CNPJ ou cria um
  cadastro básico. Não vincula veículo nem torna a estadia mensalista.
- O rascunho permanece em Notas de Serviço, vinculado à OS, sem transmissão
  fiscal ou nova cobrança. Antes de ativar contrato mensalista de cliente do
  cadastro fiscal básico, complete o cadastro com telefone ou e-mail válido.

- Placa da portaria aceita identificadores livres de até dez caracteres na
  entrada e nas ações da estadia, sem liberar campo vazio ou mudar permissões.

- O seletor de Cidade ganhou largura própria nos cadastros de local e pátio.
  A lista segue a largura do campo e a busca no servidor foi preservada.

- Novo evento escolhe pátio antes das datas e mostra dias e horários livres
  para quem já pode vincular pátios. Mostra o menor saldo do período inteiro
  e revalida no vínculo; criar o evento em rascunho não reserva vagas.

- Em Eventos e ofertas, voltar à portaria abre o Pátio quando autorizado;
  sair da venda antecipada tem uma ação separada.

- Revisados os campos de pátio/local, evento, alocação e abertura: texto,
  inteiros, moeda, seleção e coerência entre datas e capacidades.
  Novos eventos não recebem data automática; a tela distingue horário
  previsto de portaria efetivamente aberta.

- O formulário de pátio usa a capacidade física como limite da operacional
  e impede o envio se os campos ficarem incompatíveis.
- No endereço, Número aceita só algarismos e CEP exige oito dígitos. Na
  preparação da portaria, o limite vem do saldo disponível no período,
  sem substituir a validação definitiva feita ao salvar pela API.

- Pátio, capacidade, cobrança e reentrada são editados no mesmo formulário.
  Cadastrar pátio pelo evento preserva o preenchimento. Se uma etapa falha
  depois de outra ter sido gravada, o salvamento pode ser retomado.
- A abertura avulsa exige revisão e confirmação e não inicia venda antecipada.
  Ciclo de vida e gestão de equipe ficam em Opções avançadas, com permissões
  e contratos da API preservados.

- Detalhes consultáveis são subpáginas em vez de conteúdo após a lista ou
  modais. Cadastros, Financeiro e OS mantêm a regra de acesso e os atalhos
  antigos; o retorno preserva filtros disponíveis. As notas conservam suas
  rotas de documento e os vínculos fiscais/financeiros.
- Ações pontuais, como baixa, cancelamento, seleção e confirmação, permanecem
  em diálogo. A alteração é de navegação no frontend, sem migração de dados.

- Detalhe de evento ocupa subpágina com URL própria. Ciclo de vida e preparação
  não aparecem abaixo da listagem. Criação e home abrem o mesmo detalhe,
  respeitando as permissões e a consulta ao evento no contexto ativo.

- O fuso cadastrado na organização alimenta os novos eventos e locais. Os
  formulários não pedem esse campo novamente; horários de novos eventos são
  convertidos no fuso da organização, sem alterar registros existentes.

- Cadastro do veículo usa **Cliente** no vínculo opcional; a UI do Pátio
  segue a classificação da estadia para exibir **Mensalista** ou **Avulso**.

## Alternativa sem evento — 2026-11-22

Os primeiros passos oferecem configuração de pátio comum (mensalistas,
avulsos ou ambos) ou eventos. A escolha é navegação da home, não um modo
fixo da organização. O guia comum aponta para os cadastros autorizados e
o caixa do pátio; o guia de eventos mantém o mesmo checklist da API.

## Primeira portaria — 2026-11-22

Organização sem eventos vê o passo a passo e abre o formulário pelo botão
“Criar primeiro evento”. A home mostra a preparação real do único evento
e leva diretamente ao seu checklist. Com a operação aberta, quem pode operar
o caixa recebe o atalho ao Pátio. Permissões, API e pendências não mudam.

## Seletores de organização — 2026-11-22

Moeda, Região, Plano e Fuso horário deixam de exigir códigos digitados e oferecem
seletores com nomes legíveis. Padrões, payload, CNPJ, permissões e fluxo de
ativação explícita permanecem. Região lista estados/DF do Brasil; planos usam
os códigos Standard/Enterprise já existentes, sem ampliar acesso.
No checkout oficial, 22 testes de seis arquivos passaram, assim como tipagem,
lint e build incremental. As 162 moedas e 419 fusos foram validados pelas mesmas
classes Currency/ZoneId do Java 25 da API. Chrome conferiu trocas, rascunho
preservado e ausência de overflow em 320, 390 e 1440 px. Nenhuma organização foi
criada pelo roteiro; sem alteração de backend, schema, permissões, commit ou push.

## Sessão 2026-11-22

- Caixa abre diretamente no Pátio depois da escolha explícita da organização;
  logo/home e deep links autorizados continuam disponíveis.
- Portaria prioriza entrada e saída. Veículos/filtros/Cartões/Listagem, Caixa,
  Comprovantes e Supervisão ficam separados sem remover dados ou permissões.
- Eventos priorizam a portaria; venda antecipada é opcional. Checklist indica
  próxima etapa e encaminha às configurações permitidas. Não inventa equipe
  por evento nem exige produto/lote para entrada sem reserva.
- Composição da nova cobrança mostra base de seis casas, devido em centavos e
  ajuste, sem recalcular histórico. Detalhes expansíveis reduzem ruído no celular.
- Offline bloqueia comandos sem fila automática; intenção de dinheiro é salva
  antes do POST e retomada com a mesma UUID após resultado inconclusivo/reload.
  Erros 403 continuam sem encerrar a sessão. Catálogo técnico saiu da navegação.
- Suíte completa da fonte final: 572 testes em 89 arquivos passaram, sem falhas.
  Tipagem, lint, build incremental e teste do publicador aprovados.
- Chrome passou fluxo financeiro real de teste e 13 telas desktop + 4 mobile;
  layout do Pátio conferido também em 320/390/1440 px. Não houve transação externa.
- Prévia 5174 atualizada por publicação incremental; sem commit/push/deploy.
- Chrome confirmou a mesma sessão contextual após reinício da API e novo build,
  com assets anteriores disponíveis e autorização HTTP 200. O launcher deixou de
  gerar uma assinatura nova a cada execução; a adoção exige um novo login uma vez.

## O que foi feito nesta sessão

- Contadores de todos, avulsos e mensalistas filtram a coleção em cartões/listagem,
  combinam com placa, indicam a seleção e preservam os totais globais da API.
- “Limpar filtros” restaura todos e limpa a placa. Estado vazio distingue filtro
  sem resultado de estacionamento vazio; rótulos no singular foram corrigidos.
- Passaram 23 testes focados no checkout oficial, tipagem, lint e build. Chrome
  validou admin/Caixa e mobile 320/390 px, sem confirmar pagamentos ou saídas.
  Suíte completa não repetida neste recorte; backend/schema/permissões intactos.
- Prévia 5174 atualizada, sem commit/push ou deploy de produção.

## Entregas anteriores

- Pátio permite escolher Cartões/Listagem e lembra a preferência por usuário e
  organização neste navegador. Cartões continuam como padrão; listagem é tabela
  no desktop e linhas compactas no celular, com os mesmos dados, busca e ações.
- 530 testes em 82 arquivos passaram; 20 testes focados do Pátio passaram também
  no checkout oficial (sobrepostos). Tipagem, lint, build e publicador aprovados.
- Chrome real validou admin/Caixa, reload, busca, prévia do movimento exato e
  mobile 320/390 px sem confirmar saída ou correção. Sem alterações de API/schema.
- Entrega anterior — painel de pendências:
- Home em largura disponível, categorias responsivas, valor/data separados,
  itens de altura natural e expansão explícita; sem sobreposição ou rolagem interna.
- Mesmas consultas, permissões e links individuais. A listagem geral continua
  disponível para consultar o restante além da amostra carregada.
- Na entrega anterior, 524 testes frontend, lint, typecheck, build e diff-check passaram. O checkout
  oficial passou também 56 testes focados (sobrepostos à suíte completa).
- Chrome real validou claro/escuro, de 320 a 1440 px, expansão, registro exato
  de destino e ausência de categorias indevidas para Caixa. Prévia 5174 atualizada.

## Decisões tomadas

- Tipo e placa são filtros locais combinados; os totais do cabeçalho continuam
  globais. A seleção inicia em Todos e não muda o contexto da operação do caixa.
- Preferência do Pátio armazena somente `cards/list`, isolada por organização/login.
  Não guarda registros, não altera o contexto e não concede acesso adicional.
- Busca e handlers de saída/correção são compartilhados pelos dois formatos.
- Três registros iniciais por categoria, sem esconder o total da API; “Ver mais”
  expande somente os registros já carregados. Não criar uma paginação fictícia.
- Grupos só aparecem com permissão e pendência. Estoque conserva o atalho para
  a posição consolidada. Nenhuma alteração na API ou nos vínculos financeiros/fiscais.
- Publicação incremental mantém os arquivos de abas abertas e a sessão existente.

## Próximos passos

1. Avaliação visual pelo usuário em `/app/patio` na 5174 após recarregar a página.

## Bloqueios / Dívidas técnicas

- Nenhum bloqueio neste recorte. Aviso preexistente de chunk MUI >500 kB.
- Esta entrega é local; sem commit, push ou deploy de produção.
