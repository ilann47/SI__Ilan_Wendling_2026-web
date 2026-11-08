> Links: [[core]] · [[fiscal-financeiro]] · [[estoque]] · [[fornecedores]] · [[conveniencia]] · [[pagamentos]] · [[auth]]

# Importação operacional de XML

## Fluxo vigente PARK-0003 (2026-10-16)

XML novo cria e confere somente Nota de Entrada. A conciliação continua persistida,
com produto/unidade/fator, local/fornecedor/condição e contagem física. Não existe
seleção, regularização ou reaproveitamento de Ordem/Recebimento anterior.
Fator, preço conciliado e contagem física aceitam até seis casas.

Após CONFERIDA, GET /api/notas-entrada/importacoes/{id}/previa fornece a mesma
composição de Nota/custo/obrigação/parcelas do fluxo manual, usando datas do XML e
da conferência persistida. Só depois da prévia é liberada a confirmação versionada.
Falha incerta bloqueia repetição até recarregar o mesmo registro. Confirmação
invalida estoque/financeiro/home do tenant, sem usar o preview existente ou DB real.
Upload mantém bytes/limite de 2MB e validações do backend. Importação não afirma
autorização/assinatura fiscal nem efetua transmissão ou pagamento externo.
As descrições históricas anteriores de OC foram substituídas por este fluxo.


## Objetivo
Registrar documentos de fornecedores e conferir mercadoria sem redigitar produtos nem duplicar estoque ou contas.

## Contexto
A página `/app/notas-entrada/importar?importacao=ID` concentra upload, importações anteriores, conciliação, contagem física e confirmação. A lista de notas oferece acesso direto. A tela não apresenta o XML como autorizado nem afirma validar assinatura digital.

## Fluxo (camadas da arquitetura)
`XmlInboundImportPage` → `inboundImportsApi` → importação persistida do backend. A importação salva somente o documento; conciliação relaciona cadastros; contagem física verifica as quantidades; confirmação final efetiva nota, estoque e títulos conforme origem. Depois da confirmação, um link abre a nota e seus documentos relacionados.

## Endpoints
- `GET/POST /api/notas-entrada/importacoes`: lista resumida paginada e upload binário XML.
- `GET /api/notas-entrada/importacoes/{id}`: documento e dados conciliados completos.
- `PUT .../{id}/conciliacao`: todos os itens relacionados e referências, com `If-Match`.
- `POST .../{id}/conferencia`: contagem física por sequência, com `If-Match`.
- `POST .../{id}/confirmacao`: confirmação transacional, com `If-Match`.

## Estrutura de Dados (DTOs, Entidades)
`InboundImportSummary` mantém somente identificação, emitente, total, situação e nota vinculada. `InboundImport` inclui documento original estruturado, itens conciliados, unidades, fatores, valores, contagem física e divergências. O request de conciliação é fechado e não envia organização, versão no corpo ou atributos do XML como campos mutáveis.

## Integrações externas
Nenhuma integração externa é executada nesta tela. O arquivo é enviado como `File/Blob` com `application/xml`, preservando bytes e codificação, sem parser XML no navegador. O backend aplica validação estrutural e proteção contra entidades externas.

## Tratamento de Erros
- Frontend bloqueia arquivo vazio, extensão diferente de XML ou tamanho maior que 2 MB; backend continua sendo a defesa definitiva.
- `describeError` converte erros em mensagens úteis. Falhas de conciliação/conferência preservam formulário; atualização concorrente oferece recarga explícita.
- Após timeout na confirmação, a interface consulta a importação. Só aceita conclusão quando o backend devolve `CONFIRMADA`; não emite novo POST automático.
- Divergências retornadas pelo servidor ficam visíveis e contagens diferentes não são apresentadas como concluídas.

## Testes
Vitest cobre upload e limites, preservação de bytes, `If-Match`, recuperação após timeout, consulta com perfil somente leitura, conciliação com erro e preservação de campos, e bloqueio da confirmação quando a contagem local mudou e ainda não foi salva. Em 2026-09-12, a navegação e a lista persistida vazia foram verificadas no navegador local, com resposta real do backend em 8086 via proxy 5173. Upload até confirmação foi validado por testes de API no PostgreSQL e de interface no Vitest, não por uma transação completa no navegador sobre os dados demo.

## Decisões Técnicas
- Cache começa por tenant; GET detalhado somente para a importação selecionada. A lista não carrega XMLs completos.
- Fornecedor, produto, local, condição e itens usam seletores pesquisáveis existentes. Nenhum ID é digitado.
- `fiscal:read` permite consulta; `fiscal:manage` permite gravações. Conciliação exige consultas de fornecedores/catálogo/estoque. Referências de pagamento respeitam suas permissões.
- O usuário informa o fator de conversão e confere a unidade do cadastro antes de salvar. Não inferimos conversão pelo nome do produto.
- O backend aceita NF-e 4.00, modelo 55, de saída normal do fornecedor; devolução, complemento, ajuste e totais não representáveis no domínio atual são bloqueados. A interface apresenta a divergência retornada, sem alterar valores para forçar confirmação.
- A importação cria somente Nota de Entrada; não aceita vínculos de Ordem ou Recebimento de Compra.
- Campos editados da conciliação bloqueiam a contagem/confirmar até salvar; alterar uma contagem já conferida também bloqueia confirmação até registrar a nova contagem. O retorno bem-sucedido limpa esse bloqueio mesmo quando reenviar a mesma contagem não altera a versão do registro.
- Fator de conversão, valor unitário e contagem física usam o campo numérico compartilhado, com bloqueio de negativos e mensagens consistentes.

## Módulos relacionados
[[fiscal-financeiro]], [[estoque]], [[fornecedores]], [[conveniencia]], [[pagamentos]], [[auth]].

## Histórico
| Data | Ação |
|---|---|
| 2026-11-08 | Entrada com XML preserva o total do fornecedor e exibe até seis casas na conciliação e na conferência. |
| 2026-10-30 | Remove os vínculos de Ordem/Recebimento; XML confirma somente Nota de Entrada direta. |
| 2026-10-24 | QA padroniza os campos numéricos da conciliação e conferência com o componente compartilhado. |
| 2026-09-12 | Implementa importação, conciliação, conferência e confirmação em página única com RBAC e recuperação segura. |
| 2026-09-12 | Registra validação real da consulta local e distingue cobertura automatizada completa da navegação sem lançamentos nos dados demo. |
