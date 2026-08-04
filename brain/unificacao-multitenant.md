> Links: [[core]] · [[auth]] · [[compatibilidade-legada]] · [[paridade-api]] · [[workspace]] · [[pagamentos]] · [[clientes]] · [[logistica]] · [[fornecedores]] · [[rh]] · [[conveniencia]] · [[estoque]]

# Unificação Multi-Tenant

## Objetivo

Conduzir todas as superfícies do Kaneko ao contexto organizacional real sem
remover capacidades históricas nem criar um segundo produto para eventos.

## Contexto

O frontend já reuniu as rotas enterprise e legadas no mesmo shell. A paridade
funcional foi restaurada. Pagamentos V38, Clientes V40, Transportadoras V41,
Frota V48, Fornecedores V42, Cargos V43 e Funcionários são as primeiras fatias
antigas adaptadas ao backend tenant-aware; os demais CRUDs ainda consomem
endpoints globais. A migração continuará incremental por módulo.

## Fluxo (camadas da arquitetura)

```text
login global -> seleção de organização -> JWT contextual
  -> rota autorizada -> chave de cache tenant-aware
  -> endpoint contextual -> resposta isolada da organização ativa
```

## Endpoints (se houver)

O frontend preservará as URLs `/api/*` quando o backend mantiver compatibilidade.
Nenhum `organizationId` será enviado por query, payload ou header para escolher
tenant. O contexto vem exclusivamente do JWT emitido pelo servidor.

## Estrutura de Dados (DTOs, Entidades)

Cada configuração de recurso deverá declarar permissões por ação e estratégia de
chave de consulta contextual. Referências carregadas por formulários não podem
misturar resultados de organizações distintas.

## Integrações externas (se houver)

Não há integração externa nesta fundação. Gateways fiscais, financeiros e de
pagamento permanecem subordinados aos contratos do backend.

## Tratamento de Erros

JWT contextual inválido ou Membership desatualizada produz `401`; ausência de
permissão produz `403`; recurso inexistente ou pertencente a outro tenant produz
`404`. A troca de organização limpa dados e referências sensíveis em memória.

## Testes (curl ou equivalente)

- troca de organização invalida consultas da anterior;
- rota exige permissão específica do módulo;
- referências e DataGrid não reaproveitam cache entre tenants;
- requisições não enviam seletor de tenant fora do token;
- módulos preservados continuam acessíveis enquanto recebem tenancy por ondas.

## Decisões Técnicas

- Um único shell e um único catálogo de módulos.
- Paridade funcional não implica isolamento multiempresa.
- Nenhuma associação automática de dados históricos pelo frontend.
- Migração vertical por módulo: contrato, cache, permissão, tela e teste na mesma onda.
- Ordem inicial: fundação de testes, cadastros compartilhados, pessoas/logística,
  operação, estoque/conveniência, fiscal/financeiro e relatórios.

## Módulos relacionados

- [[core]]
- [[clientes]]
- [[auth]]
- [[compatibilidade-legada]]
- [[paridade-api]]
- [[workspace]]
- [[pagamentos]]
- [[clientes]]
- [[logistica]]
- [[fornecedores]]
- [[rh]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-08-04 | Integra Despesas Avulsas e baixas financeiras tenant-aware V62. |
| 2026-08-04 | Integra Movimentacoes e fechamento operacional tenant-aware V61. |
| 2026-08-04 | Integra Mensalistas e referencias tenant-aware do contrato V60. |
| 2026-08-04 | Integra Tarifas da operacao ao contexto V59 com `operations:*`. |
| 2026-08-04 | Integra Veiculos da operacao ao contexto V58 com cache e acoes protegidos por `operations:*`. |
| 2026-08-03 | Registra a estratégia de convergência multi-tenant de todas as superfícies. |
| 2026-08-03 | Registra pagamentos como primeira onda concluída do retrofit multiempresa. |
| 2026-08-03 | Registra Clientes como segunda onda concluída do retrofit multiempresa. |
| 2026-08-03 | Registra Transportadoras como terceira onda concluída do retrofit multiempresa. |
| 2026-08-03 | Amplia a onda de Logística com veículos e vínculos de frota V48. |
| 2026-08-03 | Registra Fornecedores como quarta onda concluída do retrofit multiempresa. |
| 2026-08-03 | Registra Cargos como quinta onda concluída do retrofit multiempresa. |
| 2026-08-03 | Amplia a onda de RH com Funcionários tenant-aware. |
| 2026-08-03 | Integra os catálogos de conveniência V50-V52 e mantém consumers globais desativados. |
| 2026-08-03 | Amplia Conveniência com Produto–Fornecedor V53 e mantém notas e estoque fora da onda. |
| 2026-08-03 | Conclui a fatia V54 de razão de estoque, mantendo notas e relatórios nas ondas próprias. |
