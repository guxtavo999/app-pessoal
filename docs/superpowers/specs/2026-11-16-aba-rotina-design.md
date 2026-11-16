# Aba Rotina — design (2026-11-16)

## Intenção

Trocar o placeholder "Em breve" da aba **Rotina** por uma lista de tarefas do dia para marcar. O motivo principal: **não esquecer de tomar o Topiramato** às 11:00 e às 18:00.

## Objetivos

- Uma tarefa por linha: quadrado de marcar (mesmo modelo dos copos da aba Água: vazio → preenchido com X) e o texto da tarefa ao lado.
- Tarefas fixas, nesta ordem:
  1. Skin care matinal
  2. Remédios matinais
  3. 11:00 Topiramato
  4. 18:00 Topiramato
  5. Skin care noturna
- Tudo zera à meia-noite (00:00), igual à Água.
- Tarefa com horário que passou da hora sem ser marcada aparece destacada como **atrasada**.

## Não-objetivos

- Notificações enviadas pelo app (exigiriam servidor; ficou para depois, se o usuário quiser).
- Adicionar, editar ou reordenar tarefas pelo app: mudanças na lista são pedidas e feitas no código.
- Histórico de dias anteriores.

## Abordagens consideradas

- **A) Aviso pelo próprio iPhone + destaque de atrasado no app (escolhida pelo usuário).** O app Saúde → Medicamentos (ou um alarme) avisa às 11h e às 18h; o app mostra o que ficou atrasado. Confiável, offline, sem servidor.
- B) Notificação push do próprio app. Precisa de servidor gratuito, internet na hora e quebra a regra "sem servidor". Descartada por agora; pode ser somada depois sem refazer a aba.
- C) Só destaque no app. Não resolve: depende de lembrar de abrir o app.

## Como funciona

- **Lista:** `js/routine.js` exporta `TASKS`, cada tarefa com `id` estável (ex.: `topiramato-11`), `label` exatamente como acima e, opcionalmente, `time` (`"11:00"`, `"18:00"`).
- **Gravação:** chave `app-pessoal:rotina:AAAA-MM-DD` com um objeto `{ id: true }` das tarefas marcadas. Marcações são guardadas **pelo id, não pela posição**, para que incluir ou reordenar tarefas no futuro não troque as marcações de lugar. Ids desconhecidos ou valores que não sejam `true` são ignorados.
- **Atrasada:** tarefa com `time`, não marcada e com hora atual ≥ `time`. Ao marcar, o destaque some. Tarefas sem horário nunca ficam atrasadas.
- **Atualização na tela:** recalcula ao abrir/voltar ao app (mesmos eventos da Água: `visibilitychange`, `pageshow`, `focus`), na virada do dia e num timer até o próximo horário de tarefa.
- **Erro ao salvar:** mesma mensagem de aviso da Água.

## Decisões minhas (para o usuário conferir)

- Topo da aba: "Rotina" com "Hoje" e um contador "2 de 5 feitas".
- Visual do atrasado: borda e fundo avermelhados na linha + a palavra "atrasado" à direita. Marcada: mesmo comportamento visual da Água (quadrado preenchido com X, linha com fundo suave), usando a cor de destaque do app.
- O horário faz parte do texto da tarefa, como o usuário escreveu ("11:00 Topiramato").
- Testes em `node --test` para: lista/ordem, gravação por id (incl. dado corrompido), regra de atrasado.
- Deploy: aumentar `CACHE_VERSION`, incluir `js/routine.js` em `ASSETS` do `sw.js`.

## Fora do app (passo do usuário)

Cadastrar no iPhone: **Saúde → Navegar → Medicamentos → Adicionar Medicamento** → Topiramato, horários 11:00 e 18:00. (Ou dois alarmes no Relógio.)

## Para o construtor

Estilos exatos, nomes internos e estrutura dos testes ficam a critério de quem implementar, seguindo os padrões de `js/tabs/agua.js`, `js/storage.js` e `styles.css`.
