# Aba Agenda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nova aba Agenda onde o usuário cria, edita e exclui compromissos (data, horário, texto), listados do mais próximo ao mais distante, com a linha colorida por dias restantes e sumindo na virada do dia seguinte.

**Architecture:** Regras puras (dias restantes, cor, ordenação, filtro de vencidos, validação, formatação de data) em `js/agenda.js`, testadas com `node --test`. Leitura/gravação em `js/storage.js` numa chave única `app-pessoal:agenda`. A aba `js/tabs/agenda.js` alterna entre a lista e um formulário que ocupa a aba inteira.

**Tech Stack:** HTML/CSS/JS puro (módulos ES, sem build), `localStorage`, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-16-aba-agenda-design.md`

## Global Constraints

- Compromisso = `{ id, date: "AAAA-MM-DD", time: "HH:MM", text }`, nada mais.
- Chave de gravação: `app-pessoal:agenda` (via `read`/`write` de `storage.js`, que já põem o prefixo), valor = array JSON.
- Ordem: `date` crescente, depois `time` crescente.
- Cor por dias de calendário restantes `d`: `d === 0` vermelho; `1 ≤ d ≤ 3` amarelo; `4 ≤ d ≤ 7` verde; `d ≥ 8` sem cor.
- `d < 0` (data anterior a hoje) não aparece e é removido no próximo salvamento.
- Formulário: os três campos obrigatórios; texto com `trim()`; data anterior a hoje recusada; hoje com horário passado aceito; ao criar, data já vem com hoje.
- Excluir pede `confirm('Excluir este compromisso?')`.
- Data na linha: `Hoje`, `Amanhã`, ou `Qui 19/11`; com ano só se diferente do atual: `Seg 04/01/2027`. Dias: `Dom Seg Ter Qua Qui Sex Sáb`.
- Aba no fim da barra: `TABS = [rotina, agua, agenda]`, id `agenda`, label `Agenda`, ícone de calendário.
- Todo arquivo novo em `js/` entra em `ASSETS` do `sw.js` (o teste `tests/assets.test.js` falha se não entrar). `CACHE_VERSION` vai para `'v5'`.
- Texto do usuário sempre inserido com `textContent`/`value`, nunca dentro de `innerHTML`.

## Review Focus

1. **Texto com `<`, `&` ou aspas** (ex.: `Reunião <RH> & "café"`) deve aparecer literalmente, sem quebrar a tela → teste manual na Task 3, passo de verificação.
2. **Virada de mês/ano** (hoje 30/12, compromisso 02/01) deve dar `d = 3` (amarelo) e mostrar o ano → testes de `daysUntil` e `formatDay` na Task 1.
3. **Campo apagado no seletor do iOS** (input devolve `""`) deve dar mensagem de erro, não gravar item quebrado → teste de `validate` com strings vazias na Task 1.
4. **Gravação corrompida** (não-array, item com data `2026-13-40`, horário `25:00`, texto vazio, id faltando) é ignorada item a item sem quebrar → teste de `loadAgenda` na Task 2.
5. **Meia-noite com o formulário aberto**: a virada não pode apagar o que está sendo digitado; ao salvar, a validação usa a data do momento do salvamento → teste manual na Task 3.

---

## File Structure

- **Create** `js/agenda.js`: regras puras da Agenda.
- **Create** `tests/agenda.test.js`: testes das regras e da gravação.
- **Modify** `js/storage.js`: `loadAgenda`, `saveAgenda`.
- **Create** `js/tabs/agenda.js`: tela (lista + formulário).
- **Modify** `js/app.js`: registrar a aba.
- **Modify** `styles.css`: estilos da lista, cores e formulário.
- **Modify** `sw.js`: `ASSETS` e `CACHE_VERSION`.
- **Modify** `README.md`: citar a aba Agenda.

---

### Task 1: Regras da Agenda

**Files:**
- Create: `js/agenda.js`
- Create: `tests/agenda.test.js`
- Modify: `sw.js` (adicionar `'./js/agenda.js'` em `ASSETS`)

**Interfaces:**
- Produces (todas exportadas de `js/agenda.js`, `now` default `new Date()`):
  - `daysUntil(date: string, now?: Date): number`: dias de calendário de hoje até `date` (negativo se passou).
  - `colorFor(item, now?): 'today' | 'near' | 'week' | null`: vermelho / amarelo / verde / sem cor.
  - `upcoming(items, now?): Item[]`: novo array sem os `daysUntil < 0`, ordenado por `date` e depois `time`.
  - `validate(draft: { date, time, text }, now?): string | null`: mensagem de erro ou `null`.
  - `formatDay(date: string, now?): string`
  - `isValidItem(x): boolean`: `id` string não vazia, `date` real no formato `AAAA-MM-DD`, `time` em `00:00`–`23:59`, `text` string não vazia após `trim()`.
  - `newId(): string`: id único (ex.: `Date.now().toString(36) + Math.random().toString(36).slice(2, 6)`).

- [ ] **Step 1: Escrever os testes que falham em `tests/agenda.test.js`**

Use `const now = new Date(2026, 10, 16, 15, 0)` (segunda, 16/11/2026, 15:00) salvo indicação.

```javascript
test('daysUntil conta dias de calendário', () => {
  assert.equal(daysUntil('2026-11-16', now), 0);
  assert.equal(daysUntil('2026-11-17', now), 1);
  assert.equal(daysUntil('2026-11-15', now), -1);
  assert.equal(daysUntil('2026-11-16', new Date(2026, 10, 16, 23, 59)), 0);
  assert.equal(daysUntil('2027-01-02', new Date(2026, 11, 30, 10, 0)), 3);
  assert.equal(daysUntil('2026-12-01', new Date(2026, 10, 30, 0, 0)), 1);
});

test('colorFor segue 0 / 1–3 / 4–7 / 8+', () => {
  const c = date => colorFor({ date, time: '09:00' }, now);
  assert.equal(c('2026-11-16'), 'today');
  assert.equal(c('2026-11-17'), 'near');
  assert.equal(c('2026-11-19'), 'near');
  assert.equal(c('2026-11-20'), 'week');
  assert.equal(c('2026-11-23'), 'week');
  assert.equal(c('2026-11-24'), null);
});

test('hoje com horário já passado continua vermelho', () => {
  assert.equal(colorFor({ date: '2026-11-16', time: '08:00' }, now), 'today');
});

test('upcoming tira vencidos e ordena por data e horário', () => {
  const items = [
    { id: 'a', date: '2026-11-20', time: '10:00', text: 'A' },
    { id: 'b', date: '2026-11-15', time: '23:59', text: 'B' },
    { id: 'c', date: '2026-11-16', time: '18:00', text: 'C' },
    { id: 'd', date: '2026-11-16', time: '09:00', text: 'D' },
  ];
  assert.deepEqual(upcoming(items, now).map(i => i.id), ['d', 'c', 'a']);
  assert.equal(items.length, 4); // não altera o original
});

test('validate', () => {
  const ok = { date: '2026-11-16', time: '08:00', text: 'Dentista' };
  assert.equal(validate(ok, now), null);
  assert.equal(validate({ ...ok, date: '' }, now), 'Escolha a data.');
  assert.equal(validate({ ...ok, time: '' }, now), 'Escolha o horário.');
  assert.equal(validate({ ...ok, text: '   ' }, now), 'Escreva o que é o compromisso.');
  assert.equal(validate({ ...ok, date: '2026-11-15' }, now), 'Essa data já passou.');
});

test('formatDay', () => {
  assert.equal(formatDay('2026-11-16', now), 'Hoje');
  assert.equal(formatDay('2026-11-17', now), 'Amanhã');
  assert.equal(formatDay('2026-11-19', now), 'Qui 19/11');
  assert.equal(formatDay('2026-11-22', now), 'Dom 22/11');
  assert.equal(formatDay('2027-01-04', now), 'Seg 04/01/2027');
});

test('isValidItem', () => {
  const ok = { id: 'x', date: '2026-11-16', time: '09:00', text: 'A' };
  assert.equal(isValidItem(ok), true);
  for (const bad of [null, 'x', [], { ...ok, id: '' }, { ...ok, date: '2026-13-40' },
    { ...ok, date: '2026-02-30' }, { ...ok, time: '25:00' }, { ...ok, time: '9:00' },
    { ...ok, text: '  ' }, { ...ok, text: 5 }]) {
    assert.equal(isValidItem(bad), false, JSON.stringify(bad));
  }
});

test('newId não repete', () => {
  assert.equal(new Set(Array.from({ length: 200 }, newId)).size, 200);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/`
Expected: FAIL em `agenda.test.js` (módulo `../js/agenda.js` não existe).

- [ ] **Step 3: Implementar `js/agenda.js` e incluir `'./js/agenda.js'` em `ASSETS` do `sw.js`**

`daysUntil` compara datas em UTC para não sofrer com horário de verão:

```javascript
const [y, m, d] = date.split('-').map(Number);
return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
```

`isValidItem` confere que a data existe (ex.: reconstruir com `new Date(Date.UTC(y, m - 1, d))` e comparar dia/mês/ano). `validate` checa na ordem data → horário → texto → data passada e retorna exatamente as mensagens dos testes.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test tests/`
Expected: todos PASS (incluindo `assets.test.js`).

- [ ] **Step 5: Commit**

```bash
git add js/agenda.js tests/agenda.test.js sw.js
git commit -m "feat: regras da Agenda (dias restantes, cor, ordem, validação)"
```

---

### Task 2: Gravação da Agenda

**Files:**
- Modify: `js/storage.js`
- Modify: `tests/agenda.test.js`

**Interfaces:**
- Consumes: `isValidItem` de `js/agenda.js`.
- Produces:
  - `loadAgenda(store?): Item[]`: lê `app-pessoal:agenda`; devolve só itens com `isValidItem`, cada um copiado só com `{ id, date, time, text }`. Não-array/JSON inválido/store que lança → `[]`. Não filtra vencidos (isso é `upcoming`).
  - `saveAgenda(items, store?): boolean`: grava só os válidos, só os quatro campos; `true` se gravou.

- [ ] **Step 1: Escrever os testes que falham** (mesmos `fake()`/`throwing` de `tests/routine.test.js`)

```javascript
test('saveAgenda/loadAgenda ida e volta', () => {
  const s = fake();
  const items = [{ id: 'a', date: '2026-11-20', time: '10:00', text: 'Dentista' }];
  assert.equal(saveAgenda(items, s), true);
  assert.deepEqual(loadAgenda(s), items);
  assert.notEqual(s.getItem('app-pessoal:agenda'), null);
});

test('loadAgenda ignora dado corrompido item a item', () => {
  for (const raw of ['{{', 'null', '"x"', '{"a":1}']) {
    const s = fake(); s.setItem('app-pessoal:agenda', raw);
    assert.deepEqual(loadAgenda(s), []);
  }
  const s = fake();
  s.setItem('app-pessoal:agenda', JSON.stringify([
    { id: 'ok', date: '2026-11-20', time: '10:00', text: 'A', extra: 1 },
    { id: 'm', date: '2026-13-40', time: '10:00', text: 'B' },
    { id: 'h', date: '2026-11-20', time: '25:00', text: 'C' },
    { date: '2026-11-20', time: '10:00', text: 'D' },
    7,
  ]));
  assert.deepEqual(loadAgenda(s), [{ id: 'ok', date: '2026-11-20', time: '10:00', text: 'A' }]);
});

test('store que lança ou ausente: nada quebra', () => {
  assert.deepEqual(loadAgenda(throwing), []);
  assert.equal(saveAgenda([], throwing), false);
  assert.deepEqual(loadAgenda(), []);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/`
Expected: FAIL (`loadAgenda`/`saveAgenda` não exportados).

- [ ] **Step 3: Implementar `loadAgenda`/`saveAgenda` em `js/storage.js`** usando os `read`/`write` existentes com a chave `'agenda'`.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test tests/`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add js/storage.js tests/agenda.test.js
git commit -m "feat: gravação da Agenda com descarte de itens inválidos"
```

---

### Task 3: Tela da Agenda, registro e publicação

**Files:**
- Create: `js/tabs/agenda.js`
- Modify: `js/app.js` (`import agenda from './tabs/agenda.js'`; `TABS = [rotina, agua, agenda]`)
- Modify: `styles.css`
- Modify: `sw.js` (`'./js/tabs/agenda.js'` em `ASSETS`; `CACHE_VERSION = 'v5'`)
- Modify: `README.md` (linha de abertura: "abas Rotina, Água e Agenda")

**Interfaces:**
- Consumes: tudo da Task 1; `loadAgenda`, `saveAgenda` (Task 2); `todayKey`, `msUntilMidnight` de `js/date.js`.
- Produces: export default `{ id: 'agenda', label: 'Agenda', icon, mount(el) }`; `mount` devolve função de limpeza (mesmo contrato de `js/tabs/rotina.js`).

Comportamento (seguir a estrutura de `js/tabs/rotina.js`):

- **Estado:** `items = upcoming(loadAgenda())`; `mode = 'list' | 'form'`; `editingId` (null ao criar).
- **Lista:** cabeçalho `.page-head` com `<h1>Agenda</h1>` e botão `+ Novo`; `.save-error` com o texto `Não foi possível salvar neste aparelho. O compromisso pode se perder ao fechar o app.`; lista vazia → `.empty` com título `Nenhum compromisso` e texto `Toque em + Novo para marcar um.`. Cada compromisso é um `<button class="appt">` com `data-id`, contendo `.when` (`formatDay(date) · time`) e `.text` (texto, via `textContent`); classe extra conforme `colorFor`: `today`, `near` ou `week`.
- **Formulário** (substitui a lista na aba): título `Novo compromisso` ou `Editar compromisso`; `<input type="date">` (com `min = todayKey()`), `<input type="time">`, `<textarea>` para o texto, todos com `<label>`; `.form-error` (`role="alert"`); botões `Cancelar`, `Salvar` e, só ao editar, `Excluir`. Ao criar: data = `todayKey()`, horário e texto vazios.
- **Salvar:** `validate(draft, new Date())`; com erro → mostrar em `.form-error` e ficar no formulário. Sem erro → criar com `newId()` ou substituir pelo `editingId`; `items = upcoming(items)`; `saveError.hidden = saveAgenda(items)`; voltar à lista.
- **Excluir:** só se `confirm('Excluir este compromisso?')`; remover, gravar, voltar à lista.
- **Atualização:** `visibilitychange`/`pageshow`/`focus` e timer `msUntilMidnight() + 1000` → `items = upcoming(items)` e, **só se `mode === 'list'`**, redesenhar. Reagendar o timer a cada chamada. Limpar timer e listeners no retorno de `mount`.
- **Estilos:** reaproveitar o visual de `.task` (borda 1.5px, raio 16px, `min-height: 64px`); `.text` com `overflow-wrap: anywhere` (nunca cortar). Novos tokens em `:root` e no bloco escuro: `--week`/`--week-soft` (verde) e `--near`/`--near-soft` (amarelo). `.appt.today` usa `--late`/`--late-soft`. Campos do formulário com `font-size: 16px` (evita zoom do iOS) e largura total.

- [ ] **Step 1: Implementar `js/tabs/agenda.js`, estilos, registro em `app.js`, `ASSETS`/`CACHE_VERSION` em `sw.js` e linha do `README.md`**

- [ ] **Step 2: Rodar os testes**

Run: `node --test tests/`
Expected: todos PASS (o `assets.test.js` confirma `js/tabs/agenda.js` no cache).

- [ ] **Step 3: Verificar no navegador**

Run: `node tools/serve.mjs` e abrir http://localhost:8080/ em largura de celular (≈390px), aba Agenda. Conferir:
- Lista vazia mostra `Nenhum compromisso`.
- Criar 4 compromissos: hoje 08:00, daqui a 2 dias, daqui a 5 dias, daqui a 10 dias → ordem certa e cores vermelho / amarelo / verde / sem cor, no modo claro e escuro.
- Texto `Reunião <RH> & "café"` aparece literalmente.
- Salvar com texto vazio e com data de ontem mostra a mensagem e não grava.
- Editar troca a data e reordena; Excluir pede confirmação e Cancelar na confirmação mantém o item.
- Recarregar a página mantém tudo; no `localStorage`, editar um item para data de ontem e recarregar → ele some e, após o próximo salvamento, sai da gravação.
- Com o formulário aberto, trocar de aba do navegador e voltar → o que foi digitado continua.

- [ ] **Step 4: Commit**

```bash
git add js/tabs/agenda.js js/app.js styles.css sw.js README.md
git commit -m "feat: aba Agenda com criar, editar, excluir e cores por proximidade"
```
