# Aba Agenda — design (2026-11-16)

## Intenção

Uma aba nova, **Agenda**, para o usuário marcar os próprios compromissos pelo app e ver de relance quais estão chegando, pela cor da linha.

## Objetivos

- Criar, editar e excluir compromissos pelo próprio app (diferente da Rotina, que é fixa no código).
- Cada compromisso tem **somente**: data (calendário do iPhone), horário (relógio do iPhone) e um texto dizendo o que é.
- Um compromisso por linha, em ordem do mais próximo (em cima) ao mais distante; mesma data → ordem pelo horário.
- Cor da linha conforme os dias que faltam (contados por dia do calendário, não por horas):
  - **Vermelho**: é hoje (o dia todo, até 23:59).
  - **Amarelo**: faltam 3, 2 ou 1 dia.
  - **Verde**: faltam 7, 6, 5 ou 4 dias ("na semana" = faltam 7 dias ou menos).
  - Sem cor: faltam 8 dias ou mais.
- Compromisso **some sozinho na virada do dia** seguinte ao dele.

## Não-objetivos

- Notificações (exigiriam servidor; mesma decisão da Rotina).
- Outros campos (local, categoria, cor escolhida, repetição), histórico de compromissos passados.
- Sincronizar com o Calendário do iPhone.

## Abordagens consideradas (para a tela de criar/editar)

- **A) Formulário ocupa a aba inteira (escolhida).** Tocar em "+ Novo" ou numa linha troca a lista por uma tela com Data, Horário, Texto e os botões Cancelar / Salvar / Excluir (Excluir só ao editar). Mais confiável no iPhone com teclado e seletores do sistema.
- B) Janela flutuante sobre a lista. Mais "nativo", mas no app instalado o teclado do iOS costuma desalinhar e esconder botões.
- C) Edição na própria linha. Linha estreita para três campos e botões; fácil tocar errado.

## Como funciona

- **Gravação:** uma chave só, `app-pessoal:agenda`, com uma lista de `{ id, date: "AAAA-MM-DD", time: "HH:MM", text }`. `id` gerado na criação e estável ao editar. Itens malformados são ignorados ao carregar.
- **Some na virada:** compromissos com `date` anterior a hoje não são mostrados e são removidos da gravação no próximo salvamento.
- **Atualização na tela:** recalcula cores e remove vencidos ao abrir/voltar ao app (`visibilitychange`, `pageshow`, `focus`) e na meia-noite, como Água e Rotina.
- **Erro ao salvar:** mesma mensagem de aviso das outras abas.

## Decisões minhas (para o usuário conferir)

- **Linha:** data e horário à esquerda, texto ao lado. Data como "Hoje", "Amanhã" ou "Qui 19/11"; ano aparece só se for outro ano ("Seg 04/01/2027"). Texto longo quebra em mais linhas, nunca é cortado.
- **Topo:** "Agenda" e o botão "+ Novo". Lista vazia: "Nenhum compromisso" com o mesmo botão.
- **Formulário:** os três campos são obrigatórios; texto sem espaços sobrando. Data anterior a hoje é recusada com aviso; hoje com horário já passado é aceito (fica vermelho até 23:59). Data já vem preenchida com hoje ao criar.
- **Excluir:** pede confirmação ("Excluir este compromisso?") antes de apagar.
- **Cores:** fundo suave + borda na cor, nos tons do modo claro e escuro do app; vermelho reaproveita o `--late` da Rotina.
- **Posição da aba:** no fim da barra: Rotina, Água, Agenda. Ícone de calendário.
- **Cópia de segurança:** não incluída agora. Risco conhecido: apagar o ícone da Tela de Início apaga os compromissos. Pode ser somada depois (ex.: exportar/importar um arquivo).
- **Testes** (`node --test`): regra de cor por dias restantes (incl. virada de mês/ano), ordenação, remoção de vencidos, leitura com dado corrompido, validação do formulário.
- **Deploy:** novos arquivos em `ASSETS` do `sw.js` e `CACHE_VERSION` para `v5`.

## Para o construtor

Seguir os padrões de `js/tabs/rotina.js`, `js/routine.js`, `js/storage.js` e `styles.css`. Usar `<input type="date">` e `<input type="time">` (abrem os seletores do iOS). Contar dias com datas locais à meia-noite, nunca por diferença de milissegundos crua (horário de verão). Nomes internos e estrutura dos testes ficam a critério de quem implementar.
