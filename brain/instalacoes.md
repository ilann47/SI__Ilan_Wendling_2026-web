> Links: [[core]] · [[auth]] · [[workspace]] · [[eventos]]

# Instalacoes

## Objetivo

Cadastrar locais, patios, setores e vagas que suportam a operacao fisica dos eventos.

## Contexto

A tela abre em **Operação → Estacionamento → Instalações**, ao lado de Pátio.
A URL `/app/instalacoes` continua exigindo `facilities:manage`.

Locais novos recebem o fuso da organização ativa, sem campo duplicado. Ao
editar um local existente, o fuso gravado é preservado.

Os seletores consultam catálogos reais por nome e funcionam também em outro
navegador. As respostas de cadastro ainda podem alimentar o [[workspace]]
para outros fluxos, mas não são pré-requisito para selecionar instalações.

## Fluxo (camadas da arquitetura)

```text
Evento -> Local (cadastro no formulário do evento)
Instalações -> Pátio -> Setor -> Vagas (individual ou em lote)
Caixa -> cadastrar pátio ausente -> voltar ao turno e atualizar o catálogo
```

O pátio mostra os seus setores; ao abrir um setor, a página exclusiva de
vagas substitui a lista de setores. Voltar restaura o pátio e a página da
listagem. Cadastro individual e importação de vagas em lote abrem em página;
apenas as confirmações de mudança de situação continuam em modal.

No formulário compartilhado de pátio, a capacidade física define o máximo
da operacional. Reduzir a capacidade física revalida a operacional sem
alterá-la automaticamente. O formulário bloqueia valores inválidos antes
do POST/PUT; a mesma restrição permanece na API.

O endereço compartilhado de local e pátio aceita apenas algarismos para
novo Número (opcional e enviado como texto). Números legados não são
reescritos automaticamente. O CEP usa a máscara brasileira e o formulário
exige oito dígitos antes do envio.
Nome, endereço e bairro não aceitam só espaços; os limites de texto seguem o
contrato do cadastro. Cidade deve ser uma seleção válida. Capacidade não
aceita frações, e observações vazias não entram na gravação.
O seletor de Cidade reserva uma coluna mais larga no desktop e ocupa a
largura da linha em telas menores. A lista acompanha o campo de busca
e continua exibindo município e estado.

## Endpoints (se houver)

- `POST /api/v1/venues`
- `POST /api/v1/parking-facilities`
- `POST /api/v1/parking-facilities/{id}/sectors`
- `POST /api/v1/sectors/{id}/spaces:batch`
- `POST /api/v1/sectors/{id}/spaces` cadastra uma vaga; o formulário consulta
  `GET /api/v1/sectors/{id}` para restringir as categorias às permitidas.
- `GET /api/v1/spaces` combina busca por `code` com filtro por `sectorId` e
  paginação. `GET` e `PUT /api/v1/spaces/{id}` leem e editam a vaga com
  controle de versão.
- `PATCH /api/v1/spaces/{id}/status` usa a versão da própria linha para
  bloquear, colocar em manutenção ou liberar a vaga.
- `GET /api/v1/venues`, `GET /api/v1/parking-facilities` e `GET /api/v1/sectors`
  consultam opções ativas da organização. `GET /api/v1/installation-cities`
  fornece a cidade para o cadastro sem usar a rota legada.
- As três coleções de gestão (`/management`) paginam a busca por nome e
  exibem situação, inclusive registros inativos. `GET`/ `PUT` com `/{id}`
  carregam e editam o cadastro; a gravação usa a versão lida.

## Estrutura de Dados (DTOs, Entidades)

Os formularios refletem os DTOs de Venue, PatioInstalacao, Setor e Vaga. Cidade
é escolhida por autocomplete pesquisável na consulta contextual, sem digitação de
ID técnico. O lote
de vagas usa o formato por linha `codigo;categoria;acessivel;posicao` e converte
para `spaces[]` antes da chamada.

## Integracoes externas (se houver)

Nenhuma. `cityId` referencia o cadastro geografico legado existente.

## Tratamento de Erros

Problem Details sao exibidos no painel. Resultado HTTP 207 apresenta os totais
criados, existentes e conflitantes sem declarar o lote inteiro como sucesso.

## Testes (curl ou equivalente)

Vitest cobre conversao do lote e rejeicao de categorias fora do catalogo.
`FacilitiesPage.test.tsx` cobre busca no servidor, abertura em página,
dados preenchidos, gravação versionada e retorno com a busca preservada.
Na aba Vagas cobre a busca por código e o filtro por setor em conjunto, a
edição em página e a conservação dos dois filtros no retorno.
Também cobre cadastro individual em página sem usar a importação em lote.

## Decisoes Tecnicas

- Capacidades fisica e operacional permanecem campos distintos.
- Categorias seguem exatamente o enum do backend.
- Pátio e setor são pesquisados por nome no servidor, sem digitar códigos.
  O setor inclui o nome do pátio para distinguir opções semelhantes.
- A lista principal abre em Pátios. O detalhe consulta setores ativos pelo ID
  do pátio e vagas pelo ID do setor, com os vínculos já preenchidos nos
  formulários. A consulta geral de setores permanece para manutenção.
- O atalho no caixa exige uma consulta bem-sucedida sem pátios ativos e
  `facilities:manage`, além da permissão existente de operação do caixa.
- A rota e a navegacao exigem exclusivamente `facilities:manage`, conforme o
  contrato do backend; administracao organizacional nao concede acesso implicito.
- Dentro da rota, o cadastro de Venue exige adicionalmente `organizations:admin`,
  enquanto patios, setores e vagas usam `facilities:manage`.
- Capacidades fisica, operacional e de setor usam o campo numerico compartilhado,
  respeitando os minimos do dominio e removendo zeros a esquerda.
- Locais, pátios e setores usam a ação primária da aba e abrem formulário
  em página. A importação pontual de vagas (setor e lista) permanece em diálogo.
  Fechar um formulário alterado pede confirmação.
- As três abas exibem tabela em desktop e cartões no celular, com ação
  direta **Editar**. Aba, busca e página são mantidas ao voltar. A edição não
  muda a situação do cadastro nem transfere o setor de pátio.
- Vagas usa a mesma listagem. O filtro pesquisa setores pelo nome, distingue
  setores de pátios diferentes e inclui inativos para permitir consulta de
  registros existentes. A importação continua como ação rápida e atualiza a
  lista; **Editar** abre a página para código, categoria, posição e acessibilidade.
- **Nova vaga** abre o cadastro individual em página e aproveita o setor
  filtrado, quando ativo. **Importar vagas** permanece disponível como ação
  secundária. Ambos atualizam a listagem após salvar.
- O menu de situação em cada vaga oferece apenas estados diferentes do atual.
  A ação pede confirmação, atualiza a situação após a resposta da API e
  preserva busca, filtro e página. Em conflito de versão, a lista é atualizada.

## Modulos relacionados

- [[workspace]]
- [[eventos]]
- [[auth]]
- [[core]]

## Historico (data + acao)


| Data | Acao |
|---|---|
| 2026-11-22 | Revisa validação de todos os campos do cadastro compartilhado de pátio e local. |
| 2026-11-22 | Padroniza a largura da busca e da lista de cidades nos formulários de local e pátio. |
| 2026-11-22 | Valida Número e CEP no endereço compartilhado de locais e pátios. |
| 2026-11-22 | Aplica o limite de capacidade física no formulário de pátio, também nos atalhos da portaria e do caixa. |
| 2026-11-22 | Vagas do setor em subpágina e importação em formulário exclusivo, mantendo o contexto de origem. |
| 2026-11-13 | Navegação por pátio, cadastro contextual de local no evento e de pátio no caixa. |
| 2026-11-10 | Move o atalho para Operação → Estacionamento e preserva URL e acesso. |
| 2026-11-08 | Adiciona ações de situação diretamente na listagem de vagas em desktop e celular. |
| 2026-11-08 | Adiciona Nova vaga em página, mantendo a importação em lote na mesma aba. |
| 2026-11-08 | Completa a aba Vagas com busca por código, filtro por setor e edição em página. |
| 2026-11-08 | Adiciona listagem pesquisável e edição em página para locais, pátios e setores. |
| 2026-11-08 | Conecta os seletores aos catálogos reais de instalações e cidades; elimina a dependência de referências do navegador. |
| 2026-11-08 | Substitui código manual por seleção pesquisável de pátio e setor; documenta a ausência de catálogo de instalações. |
| 2026-11-08 | Move os cadastros de local, pátio e setor para página, mantendo a importação de vagas como ação rápida. |
| 2026-08-03 | Implementa fluxo completo de criacao da estrutura fisica. |
| 2026-08-03 | Alinha acesso da interface a permissao `facilities:manage`. |
| 2026-08-03 | Separa a permissao de Venue das demais instalacoes. |
| 2026-09-28 | Substitui IDs manuais de cidade por seleção pesquisável em Venue e Pátio. |
| 2026-09-28 | Expõe honestamente a ausência das listagens de Venue/instalações no contrato atual, sem criar dados ou endpoints fictícios. |
| 2026-09-29 | Padroniza validação e digitação das capacidades de pátios e setores. |
| 2026-10-30 | Move os quatro cadastros de instalações para o diálogo operacional compartilhado e preserva permissões, contratos e referências recentes. |
