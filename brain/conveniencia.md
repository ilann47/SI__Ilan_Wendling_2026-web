> Links: [[core]] · [[auth]] · [[unificacao-multitenant]] · [[compatibilidade-legada]] · [[paridade-api]] · [[fornecedores]] · [[estoque]]

# Conveniência

## Objetivo

Administrar Categoria, Marca, Unidade de Medida, Produto e Serviço no contexto
da organização ativa, preservando as URLs históricas.

## Contexto

Os catálogos base foram isolados pelas V50/V51, Produto e Serviço pela V52 e o
vínculo Produto–Fornecedor pela V53. As seis telas usam JWT contextual,
`catalog:read` para leitura e `catalog:manage` para manutenção. O tenant é
resolvido no servidor e não integra URL, query string nem payload.

## Fluxo (camadas da arquitetura)

```text
rota/menu autorizado -> CrudResourcePage -> ResourceConfig tenant-aware
  -> cache por organizationId -> endpoint /api/*
  -> ETag/version -> If-Match em PUT/DELETE
```

## Endpoints (se houver)

O módulo preserva `/api/categorias`, `/api/marcas`, `/api/unidades-medida`,
`/api/produtos`, `/api/servicos` e `/api/produto-fornecedores`. GET exige
`catalog:read`; POST, PUT e DELETE exigem `catalog:manage`.

## Estrutura de Dados (DTOs, Entidades)

Os formulários enviam somente campos editáveis declarados. Em Produto,
`valorCompra`, `custo`, `percentualLucro` e `quantidade` são somente resposta e
ficam fora do payload; `false`, `0` e `null` válidos são preservados. Tenant e
versão não são enviados como campos editáveis.

Produto–Fornecedor envia somente `produtoId`, `fornecedorId`, `codigoProd`,
`custo` e `ativo`. As duas identidades são selecionáveis na criação e imutáveis
na edição; nomes, ID, versão e tenant presentes na resposta nunca entram no
payload. A listagem aceita filtro `produtoId`.

## Integrações externas (se houver)

Não há integração externa. Marca, Unidade de Medida e Categoria alimentam os
seletores de Produto com cache particionado pela organização ativa.

## Tratamento de Erros

Os seis CRUDs habilitam locking otimista explicitamente. Detalhe, criação e
alteração validam ETag forte contra `version`; PUT e DELETE enviam `If-Match`.
Respostas 428/412 mantêm o conflito recuperável: edição oferece recarga e
exclusão recarrega a versão antes de nova confirmação.

## Testes (curl ou equivalente)

Há testes do contrato HTTP, payload, permissões, query keys, rotas, menu e
conflito. Gates: `npm run typecheck`, `npm run lint`,
`npm test -- --maxWorkers=1` e `npm run build`.

## Decisões Técnicas

- Locking otimista é opt-in em `ResourceConfig`; CRUDs antigos não mudam.
- Quick Create valida o ETag de criação quando o recurso opta pelo locking.
- Produto–Fornecedor lista com `catalog:read` usando os nomes da própria resposta.
  Criar e editar exigem cumulativamente `catalog:manage` e `suppliers:read`, pois
  o seletor de Fornecedor consulta a API tenant-aware de fornecedores. O frontend
  não amplia a autorização do backend para `suppliers:manage`.
- Notas fiscais, relatórios e estoque não foram ativados nesta onda.

## Módulos relacionados

- [[core]]
- [[auth]]
- [[unificacao-multitenant]]
- [[compatibilidade-legada]]
- [[paridade-api]]
- [[fornecedores]]
- [[estoque]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-08-03 | Integra os cinco catálogos V50-V52 com tenancy, RBAC e concorrência por ETag. |
| 2026-08-03 | Integra Produto–Fornecedor V53 com pontas imutáveis, filtro por produto e permissão cruzada de leitura. |
| 2026-08-03 | Direciona saldo e movimentos para a razão V54 em [[estoque]]. |
