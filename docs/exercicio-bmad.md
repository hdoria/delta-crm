# Exercício BMAD: aviso de negócio parado

Aula de 09/09/2026, das 10h às 12h. Repositório da demonstração: `delta-crm`.
Esta é a proposta da feature. A implementação acontece durante a aula.

## O que vamos construir

Um negócio fica na mesma etapa e ninguém percebe. Quero enxergar esse atraso na tabela de negócios.

O exercício acrescenta um aviso textual aos negócios abertos há pelo menos 7 dias completos na mesma etapa.
O aviso informa a quantidade de dias. A tabela já existe e o modelo já registra a última mudança de etapa.

O recorte cabe na leitura do código, numa regra de negócio e na apresentação do resultado.
A aula mostra como o BMAD leva um pedido até a implementação, os testes e a revisão, com critérios explícitos.

Entram a regra, o contrato da API e o aviso na tabela. Ficam fora migrations, cron, notificações externas, filtros e autenticação.
A preparação do ambiente e do login está em [Base CRM](base-crm.md).

## Prompt inicial pra copiar

Cole o pedido no fluxo indicado pelo BMAD. O texto descreve o comportamento esperado e deixa a solução técnica pra investigação.

```text
Quero identificar, na tabela de negócios do Base CRM, os negócios abertos que estão há 7 dias completos ou mais na mesma etapa.

Mostre um aviso textual com a quantidade de dias completos nessa etapa. Por exemplo: “Parado há 9 dias”.

Antes de completar 7 dias, não mostre o aviso. Conte períodos completos de 24 horas desde a última mudança de etapa.

Quando o negócio mudar de etapa, reinicie a contagem e atualize o aviso na tabela. Registrar uma atividade sem mudar a etapa preserva a contagem.

Negócios ganhos, perdidos ou desqualificados não recebem o aviso, independentemente do tempo na etapa.

Mantenha o restante da tabela funcionando. O pedido termina nesse aviso, sem filtros novos ou notificações externas.
```

## Critérios de aceite

| Situação | Resultado esperado |
| --- | --- |
| Aberto há 6 dias, 23 horas e 59 minutos na etapa | Sem aviso |
| Aberto há exatamente 7 dias completos na etapa | `Parado há 7 dias` |
| Aberto há 9 dias completos e algumas horas na etapa | `Parado há 9 dias` |
| Ganho, perdido ou desqualificado, mesmo após 7 dias | Sem aviso |
| Negócio com aviso muda pra outra etapa aberta | Contagem reiniciada e aviso removido |
| Negócio recebe uma atividade, mas permanece na mesma etapa | Contagem preservada |

O exercício termina com os critérios verificados, testes passando, diff revisado e comportamento demonstrado na tabela.
Um teste que passou não substitui a demonstração no navegador.

## Preparação antes da aula

Abra o repositório `delta-crm`, confirme o Supabase local ativo e teste o login autorizado.
Confira empresas, contatos e negócios na interface. Deixe a tabela de negócios aberta.
Use os dados fictícios da base. Guarde senhas e chaves fora da tela compartilhada e dos prompts.

Separe um negócio aberto com mais de 7 dias na etapa, um recente e um encerrado antigo.
Registre os nomes desses exemplos nas suas anotações locais. O teste automatizado confere o instante exato do limite.
A demonstração manual usa os exemplos da base e uma mudança de etapa feita pela interface.
O seed preserva registros existentes. Rodá-lo novamente não recupera datas ou etapas já alteradas.

Prepare também o banco de testes antes da aula, com `bun run db:test`.
Os testes de integração usam `TEST_DATABASE_URL`, com nome de banco terminado em `_test`.

Instale o BMAD durante a aula, na raiz do repositório:

```sh
npx bmad-method install
```

Selecione o módulo BMM e o cliente usado na demonstração. O core vem junto.
Conclua as instruções do instalador.
Reserve **8 minutos como orçamento pra instalação**, fora dos 35 minutos da feature.

O guia atual de instalação exige `uv`. O preflight local desta preparação não encontrou esse comando.
**Pendência antes da aula:** preparar `uv` e conferir sua disponibilidade no terminal do cliente.
Esta preparação documental não instala esse pré-requisito. Consulte o [guia oficial de instalação](https://docs.bmad-method.org/start/install-bmad/).

No cliente, chame `bmad-help` e confira os comandos disponíveis na instalação.
No Claude Code, use o prefixo `/`, como `/bmad-help`. No Codex, use `$`, como `$bmad-help`.
Use `bmad-spec` quando quiser mostrar uma SPEC curta antes da execução.
Use `bmad-build` pra investigar a base, implementar, testar e revisar o pedido.
O Build direto também define uma spec mínima. A chamada separada a `bmad-spec` é uma escolha didática.
Siga a forma de invocação apresentada pelo cliente e pelo `bmad-help`.

Este exercício usa uma mudança pequena numa base existente. Uma SPEC curta basta pra discutir a decisão e o aceite.
PRD completo e arquitetura completa ficam fora desse recorte.

## Orçamento da demonstração: 35 minutos

Os tempos abaixo orientam a condução da aula. Não são uma previsão de duração do agente.

| Minutos | Condução | O que mostrar |
| --- | --- | --- |
| 0 a 5 | Apresentar a intenção e conferir o aceite | A tabela atual, a regra de 7 dias e as etapas finais |
| 5 a 25 | Executar `bmad-build`, com implementação e testes | A investigação, a mudança e o limite verificado. `bmad-spec` separado é opcional |
| 25 a 35 | Revisar o diff e demonstrar no navegador | O resultado dos checks, o aviso e seu reinício após mudar etapa |

Pra manter o ritmo, faça a revisão do requisito com a turma: “São 7 dias desde o quê?”.
A resposta é a última mudança de etapa. Criar uma atividade não reinicia esse prazo.

## Saídas do BMAD pra deixar visíveis

Mostre o pedido original e o registro dos critérios antes de abrir o diff.
Com `bmad-spec`, abra a SPEC gerada. Confira o caminho que a instalação informou.

No `bmad-build`, mostre os arquivos que o agente encontrou, a implementação e os resultados dos testes.
Abra também o resultado da revisão e as correções feitas depois dela.
Use os nomes e caminhos produzidos pela instalação, sem prometer um arquivo com nome fixo.

No encerramento, a turma deve conseguir ligar cada comportamento da tabela a um critério de aceite.
Guarde a SPEC, quando criada, e os registros do fluxo junto dos artefatos da aula.

## Mapa técnico pro instrutor

Este mapa orienta a preparação. Deixe o agente encontrar o caminho durante a demonstração.

| Arquivo | O que já existe e o ponto da mudança |
| --- | --- |
| `apps/app/app/(app)/[slug]/deals/page.tsx` | Renderiza `DealsTable`, a tela usada na aula |
| `packages/db/prisma/schema.prisma` | `Deal.stageChangedAt` obrigatório, com valor inicial `now()`. Não precisa alterar o schema |
| `apps/api/src/deals/deals.service.ts` | A listagem tem seleção explícita de campos. Incluir `stageChangedAt` nessa seleção e calcular `stalledDays` |
| `apps/api/src/deals/deals.contracts.ts` | Acrescentar `stalledDays: number \| null` em `dealListRowOutput` |
| `packages/db/src/deal-stage.ts` | Concentra etapas abertas, etapas encerradas e `isClosedStage` |
| `apps/app/app/(app)/[slug]/deals/deals-table.tsx` | Recebe o tipo inferido da API. Exibir o aviso na célula do nome |
| `packages/ui/src/components/status-indicator.tsx` | Já oferece `tone="warning"` e rótulo textual |
| `apps/api/test/agent-events.spec.ts` | Já testa transições e reabertura. Acrescentar as verificações da data e do aviso |

A API entrega o número de dias completos quando o negócio está aberto e alcança o limite. Nos demais casos, entrega `null`.
Use uma leitura do relógio do servidor por consulta. A tabela só apresenta o resultado.
O aviso reflete o instante da consulta. Recarregar os dados atualiza o cálculo, sem timer ou atualização contínua na aba parada.

A regra calcula períodos completos de 24 horas a partir de `stageChangedAt`.
Centralize o limite numa configuração da área e isole o cálculo pra testar com um horário fixo.
Arquivos sugeridos: `apps/api/src/deals/deals-config.ts`, `apps/api/src/deals/deal-staleness.ts` e `apps/api/test/deal-staleness.spec.ts`.

O serviço já altera `stageChangedAt` numa troca real de etapa. Selecionar a mesma etapa preserva a data.
A reabertura reinicia a contagem. A mudança em lote reutiliza a mesma operação.
A interface já invalida os dados do negócio e da listagem após salvar a etapa. Reutilize esse fluxo.

`apps/api/src/generated/server.ts` importa o contrato da listagem. Não precisa editar o arquivo gerado manualmente.
O detalhe do negócio já recebe `stageChangedAt`, mas a listagem ainda não calcula esse aviso.

## Checks focados

Peça testes determinísticos com um horário fixo. Confira estes pontos na revisão:

- 1 milissegundo antes de completar 7 dias não gera aviso. Exatamente 7 dias gera o número 7.
- Horas incompletas não arredondam o número pra cima. Uma data futura não gera aviso.
- As 4 etapas abertas seguem a regra. `CLOSED_WON`, `CLOSED_LOST` e `UNQUALIFIED_TO_BUY` retornam `null`.
- Uma troca real de etapa reinicia a data e remove o aviso da próxima listagem.
- Repetir a etapa preserva a data. Reabrir um negócio começa uma nova contagem.
- A resposta da listagem inclui o campo calculado, e a validação do contrato preserva esse campo.

Depois da implementação, rode os testes alterados e confira os tipos de API e app.
Os comandos abaixo usam o nome sugerido pro teste novo. Ajuste esse caminho ao arquivo criado pelo fluxo.

```sh
bun run --filter=api test ./test/deal-staleness.spec.ts ./test/agent-events.spec.ts
bun run --filter=api check-types
bun run --filter=app check-types
```

Rode o Biome nos arquivos alterados e revise `git diff --check` e `git diff`.
Os resultados dos testes pertencem à implementação feita na aula. Este roteiro não declara esses checks como executados.

## Validação no navegador

Na tabela de negócios, confira o aviso num negócio aberto antigo e a ausência dele num aberto recente.
Confira também negócios ganhos, perdidos e desqualificados.
Mude o negócio com aviso pra outra etapa aberta. Aguarde salvar e confirme a remoção do aviso na tabela.
Confira que abrir o detalhe e os controles existentes continuam funcionando.

Estes registros saem assim de um seed novo. As datas da base atual precisam de conferência antes da aula:

| Negócio fictício | Condição no seed novo | Uso na demonstração |
| --- | --- | --- |
| Aurora Demo - Base CRM | Aberto há 15 dias completos na etapa | Mostrar aviso e depois mudar etapa |
| Horizonte Demo - Base CRM | Aberto há 3 dias completos na etapa | Mostrar ausência de aviso |
| Aurora Demo - Base CRM expansion | Desqualificado há 60 dias completos | Mostrar exclusão de encerrados |
| Cedro Demo - Base CRM expansion | Perdido há 41 dias completos | Mostrar exclusão de encerrados |
| Jardim Demo - Base CRM | Ganho há 57 dias completos | Mostrar exclusão de encerrados |

Os timestamps do seed incluem uma variação de até 6 horas. Use os testes pra comprovar o limite exato de 7 dias.

## Plano B quando o tempo apertar

No minuto 25, confira o que já funciona e reserve o restante pra revisão e demonstração.
Corte ajustes cosméticos e mantenha o aviso textual com os critérios originais.

Se a implementação ainda falhar, mostre o teste que falhou e o ponto exato do diff.
Registre o próximo passo na SPEC ou no resultado do fluxo. Termine como implementação pendente.

Se o navegador ou o ambiente parar, mostre os testes e o diff disponíveis.
Marque a validação manual como pendente. Não apresente uma tela simulada como resultado da implementação.

## Referências

Documentação oficial consultada na preparação de 09/09/2026:

- [Instalar BMAD](https://docs.bmad-method.org/start/install-bmad/): pré-requisitos, incluindo `uv`, módulos e clientes.
- [Build de uma mudança](https://docs.bmad-method.org/build/build-a-change/): execução direta, spec mínima, implementação, testes e revisão.
- [Escolher o caminho de planejamento](https://docs.bmad-method.org/plan/choose-a-planning-path/): escolher o recorte conforme a necessidade da mudança.
- [Definir requisitos e especificação](https://docs.bmad-method.org/plan/define-requirements-and-a-specification/): definição da spec antes de executar.
- [Tirar dúvidas sobre BMAD](https://docs.bmad-method.org/start/get-answers-about-bmad/): orientação pelos comandos disponíveis na instalação.

O mapa técnico registra a inspeção do repositório. A tabela de exemplos registra uma simulação do seed, sem consulta ao banco atual.
