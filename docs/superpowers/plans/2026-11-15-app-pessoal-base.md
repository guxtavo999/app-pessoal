# App Pessoal — Base + Aba Água Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA instalável no iPhone, offline, com barra de abas (Rotina placeholder + Água com 6 botões e boneco que enche até 4 L), publicada no GitHub Pages.

**Architecture:** HTML/CSS/JS puro com ES modules, sem build. Lógica pura (datas, água, armazenamento) em módulos testados com `node --test`; telas em módulos de aba registrados numa lista única em `js/app.js`. Service worker com cache versionado para offline.

**Tech Stack:** HTML, CSS, JavaScript (ES modules), `node:test` (Node 26, sem dependências), GitHub Pages, `gh` CLI para deploy.

**Spec:** `docs/superpowers/specs/2026-11-15-app-pessoal-base-design.md`

## Global Constraints

- Zero dependências npm em runtime e em teste. `package.json` só com `"type": "module"` e script `test`.
- Todos os caminhos relativos (`./`), nunca começando com `/` — o site roda em `https://<usuario>.github.io/<repo>/`.
- Interface em pt-BR. Litros com vírgula decimal: `"2,82 / 4 L"`.
- Botões: 3 × 910 ml, 3 × 1000 ml. Meta: 4000 ml. Acima da meta: boneco cheio, número continua (`"5,73 / 4 L"`).
- Tocar num botão marcado desmarca. Marcado = mostra "X".
- Dia = data local do aparelho (`AAAA-MM-DD`); zera à meia-noite; dias anteriores ficam gravados.
- Armazenamento: `localStorage`; nunca pode quebrar o app se indisponível ou corrompido.
- Sem backup/exportação, sem notificações, sem sync (não-objetivos).
- Projeto não usava git: `git init` só no Task 6 (necessário para o GitHub Pages, aprovado pelo usuário). Sem commits antes disso.
- Temporários em `_scratch/` (gitignored).

## Review Focus

1. **App aberto/suspenso atravessando a meia-noite** → ao voltar ao app (visibilitychange) ou na virada, a aba Água mostra o dia novo zerado, sem apagar o dia anterior. (Task 2 test `loadDay de outro dia começa zerado e não altera o anterior`; Task 4 usa `msUntilMidnight` + `visibilitychange`.)
2. **`localStorage` lança exceção ou tem JSON inválido/tamanho errado** → app funciona com tudo desmarcado. (Task 2 tests com store que lança e com lixo.)
3. **Total acima da meta** → `fillRatio` = 1, texto `"5,73 / 4 L"`. (Task 1 tests.)
4. **Primeira abertura offline após instalar** → todo arquivo do app está na lista de cache do SW. (Task 5 test `todo asset existe e todo arquivo do app está no cache`.)
5. **Caminho base do GitHub Pages (`/repo/`)** → nenhum `href`/`src`/`start_url`/asset absoluto. (Task 5 test `nenhum caminho absoluto`.)

---

## File Structure

```
index.html              casca: <main id="view">, <nav id="tabbar">, metas iOS, registra SW
styles.css              tema claro/escuro, safe-area, tabbar, grade de botões, boneco
manifest.webmanifest    nome, ícones, display standalone, start_url "./"
sw.js                   cache versionado (CACHE_VERSION, ASSETS)
package.json            {"type":"module","scripts":{"test":"node --test tests/"}}
.gitignore              _scratch/
js/date.js              todayKey, msUntilMidnight
js/water.js             CUPS, GOAL_ML, totalMl, fillRatio, formatLiters, formatProgress
js/storage.js           loadDay, saveDay, getLastTab, setLastTab
js/app.js               TABS, montagem da tabbar, troca de aba, registro do SW
js/tabs/rotina.js       placeholder "Em breve"
js/tabs/agua.js         tela Água (botões + boneco SVG)
icons/icon-180.png, icon-192.png, icon-512.png
tools/make-icons.mjs    gera os PNGs (encoder PNG com node:zlib)
tools/serve.mjs         servidor estático local para verificação
tests/*.test.js
```

---

### Task 1: Lógica de datas e água

**Files:**
- Create: `package.json`, `.gitignore`, `js/date.js`, `js/water.js`
- Test: `tests/date.test.js`, `tests/water.test.js`

**Interfaces:**
- Produces:
  - `todayKey(now?: Date): string` → `"AAAA-MM-DD"` em horário local.
  - `msUntilMidnight(now?: Date): number` → ms até 00:00 local seguinte (> 0).
  - `CUPS: ReadonlyArray<{ml:number,label:string}>` = `[910,910,910,1000,1000,1000]` com labels `"910 ml"`, `"1 L"`; índices 0–2 = 910, 3–5 = 1 L.
  - `GOAL_ML = 4000`
  - `totalMl(marks: boolean[]): number`
  - `fillRatio(total: number): number` → `min(total, GOAL_ML)/GOAL_ML`, entre 0 e 1.
  - `formatLiters(ml: number): string` → arredonda a 2 casas, vírgula, sem zeros à direita.
  - `formatProgress(ml: number): string` → `` `${formatLiters(ml)} / 4 L` ``

- [ ] **Step 1: Escrever testes que falham**

```js
// tests/date.test.js
test('todayKey usa data local com zero à esquerda', () =>
  assert.equal(todayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05'));
test('msUntilMidnight às 23:59:00 = 60000', () =>
  assert.equal(msUntilMidnight(new Date(2026, 0, 5, 23, 59, 0, 0)), 60000));
test('msUntilMidnight à 00:00 = 24h', () =>
  assert.equal(msUntilMidnight(new Date(2026, 0, 5, 0, 0, 0, 0)), 86400000));

// tests/water.test.js
test('CUPS tem 3×910 e 3×1000', () =>
  assert.deepEqual(CUPS.map(c => c.ml), [910,910,910,1000,1000,1000]));
test('totalMl soma marcados', () =>
  assert.equal(totalMl([true,true,false,false,false,true]), 2820));
test('todos marcados = 5730', () => assert.equal(totalMl(Array(6).fill(true)), 5730));
test('fillRatio 0, parcial, teto em 1', () => {
  assert.equal(fillRatio(0), 0);
  assert.equal(fillRatio(2000), 0.5);
  assert.equal(fillRatio(5730), 1);
});
test('formatLiters', () => {
  assert.equal(formatLiters(0), '0');
  assert.equal(formatLiters(910), '0,91');
  assert.equal(formatLiters(1000), '1');
  assert.equal(formatLiters(1910), '1,91');
  assert.equal(formatLiters(4000), '4');
});
test('formatProgress acima da meta continua contando', () => {
  assert.equal(formatProgress(2820), '2,82 / 4 L');
  assert.equal(formatProgress(5730), '5,73 / 4 L');
});
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/` → FAIL (módulos não existem).
- [ ] **Step 3: Implementar** `package.json`, `.gitignore` (`_scratch/`), `js/date.js`, `js/water.js` com as assinaturas acima. `msUntilMidnight`: `new Date(y, m, d+1) - now`.
- [ ] **Step 4: Rodar** — `node --test tests/` → todos PASS.

---

### Task 2: Armazenamento

**Files:**
- Create: `js/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Consumes: nada.
- Produces (todas aceitam `store` opcional; padrão = `globalThis.localStorage`, protegido por try/catch, inclusive o acesso ao próprio `localStorage`):
  - `loadDay(key: string, store?): boolean[]` → sempre 6 booleanos; chave `"agua:" + key`; JSON inválido, tamanho ≠ 6 ou exceção → `Array(6).fill(false)`.
  - `saveDay(key: string, marks: boolean[], store?): void` → nunca lança.
  - `getLastTab(store?): string|null` (chave `"ultimaAba"`), `setLastTab(id: string, store?): void`.

- [ ] **Step 1: Testes que falham** (store fake = objeto com `getItem/setItem` sobre um `Map`)

```js
test('loadDay sem dado = 6 false', () => assert.deepEqual(loadDay('2026-11-15', fake()), Array(6).fill(false)));
test('saveDay/loadDay ida e volta', ...)  // marks [true,false,false,false,false,true]
test('loadDay de outro dia começa zerado e não altera o anterior', () => {
  const s = fake(); saveDay('2026-11-15', [true,true,true,true,true,true], s);
  assert.deepEqual(loadDay('2026-11-16', s), Array(6).fill(false));
  assert.deepEqual(loadDay('2026-11-15', s), Array(6).fill(true));
});
test('JSON inválido ou tamanho errado = 6 false', ...)  // '{{', '[true]'
test('store que lança: loadDay = 6 false, saveDay/setLastTab não lançam, getLastTab = null', ...)
test('lastTab ida e volta', ...)  // 'agua'
```

- [ ] **Step 2:** `node --test tests/` → FAIL.
- [ ] **Step 3:** Implementar `js/storage.js`.
- [ ] **Step 4:** `node --test tests/` → PASS.

---

### Task 3: Casca do app, abas e aba Rotina

**Files:**
- Create: `index.html`, `styles.css`, `js/app.js`, `js/tabs/rotina.js`, `tools/serve.mjs`

**Interfaces:**
- Consumes: `getLastTab`, `setLastTab` (Task 2).
- Produces: contrato de aba — cada módulo em `js/tabs/` exporta default `{ id: string, label: string, icon: string /* SVG inline */, mount(el: HTMLElement): (() => void) | void }`; o retorno opcional de `mount` é chamado ao sair da aba. `js/app.js` exporta nada; contém `const TABS = [rotina, agua]` (único lugar para registrar abas novas).

- [ ] **Step 1:** `index.html`: `lang="pt-BR"`, viewport `width=device-width, initial-scale=1, viewport-fit=cover`, `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=default`, `apple-mobile-web-app-title="App Pessoal"`, `theme-color`, `<link rel="apple-touch-icon" href="./icons/icon-180.png">`, `<link rel="manifest" href="./manifest.webmanifest">`, `<main id="view">`, `<nav id="tabbar">`, `<script type="module" src="./js/app.js">`.
- [ ] **Step 2:** `styles.css`: variáveis de cor em `:root` e `@media (prefers-color-scheme: dark)`; azul de água; tabbar fixa no rodapé com `padding-bottom: env(safe-area-inset-bottom)`; topo com `env(safe-area-inset-top)`; `touch-action: manipulation` e `-webkit-tap-highlight-color: transparent`; sem rolagem horizontal; aba ativa destacada.
- [ ] **Step 3:** `js/app.js`: monta botões da tabbar a partir de `TABS`; aba inicial = `getLastTab()` se existir em `TABS`, senão `TABS[0]` (Rotina); trocar aba chama cleanup da anterior, limpa `#view`, chama `mount`, `setLastTab(id)`. Registra `./sw.js` se `'serviceWorker' in navigator` (ignora erro). Enquanto Task 4 não existir, `TABS = [rotina]`.
- [ ] **Step 4:** `js/tabs/rotina.js`: título "Rotina" e texto "Em breve".
- [ ] **Step 5:** `tools/serve.mjs`: servidor estático `node:http` na porta 8080 servindo a raiz do projeto com MIME correto (`.webmanifest` → `application/manifest+json`, `.js` → `text/javascript`).
- [ ] **Step 6: Verificar** — rodar `node tools/serve.mjs` em background; screenshot headless em largura de iPhone: `msedge --headless --disable-gpu --window-size=390,844 --screenshot=_scratch/rotina.png http://localhost:8080/` → imagem mostra "Em breve" e a tabbar no rodapé. `node --test tests/` continua PASS.

---

### Task 4: Aba Água

**Files:**
- Create: `js/tabs/agua.js`
- Modify: `js/app.js` (`TABS = [rotina, agua]`), `styles.css` (estilos da aba)

**Interfaces:**
- Consumes: `todayKey`, `msUntilMidnight` (Task 1), `CUPS`, `totalMl`, `fillRatio`, `formatProgress` (Task 1), `loadDay`, `saveDay` (Task 2), contrato de aba (Task 3).
- Produces: default export `{ id: 'agua', label: 'Água', icon, mount }`.

- [ ] **Step 1:** Layout conforme esboço do spec: cabeçalho "Água · hoje" + `formatProgress(total)` à direita; abaixo, à esquerda uma grade 2 colunas × 3 linhas (coluna esquerda = `CUPS[0..2]` 910 ml, direita = `CUPS[3..5]` 1 L), à direita o boneco. Cada botão é `<button aria-pressed>` grande (≥ 56px de altura) mostrando caixa com "X" quando marcado + label.
- [ ] **Step 2:** Boneco: SVG inline (cabeça, tronco, braços, pernas) usado como `<clipPath>`; retângulo azul dentro do clip com altura = `fillRatio(total)` × altura do boneco, ancorado embaixo, `transition` de ~400ms; contorno do boneco sempre visível.
- [ ] **Step 3:** Toque: inverte `marks[i]`, `saveDay(todayKey(), marks)`, atualiza botões, texto e preenchimento.
- [ ] **Step 4:** Virada do dia: em `mount`, guarda `currentKey = todayKey()`; `setTimeout` em `msUntilMidnight() + 1000` e listener `visibilitychange` (quando `visible`) chamam `refresh()`, que, se `todayKey() !== currentKey`, recarrega `loadDay` e re-renderiza (e reagenda o timer). O cleanup retornado por `mount` limpa timer e listener.
- [ ] **Step 5: Verificar** — `node --test tests/` PASS. Criar `_scratch/agua-check.html` (servido pelo `tools/serve.mjs`) que importa `../js/tabs/agua.js`, monta numa div e lê `?clicks=0,1,5` para simular cliques. Screenshot Edge headless 390×844 de `http://localhost:8080/_scratch/agua-check.html?clicks=0,1,5` → 3 X, "2,82 / 4 L", boneco ~70% cheio. Com `?clicks=0,1,2,3,4,5` → "5,73 / 4 L", boneco cheio.

---

### Task 5: Offline (manifest, ícones, service worker)

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `tools/make-icons.mjs`, `icons/icon-180.png`, `icons/icon-192.png`, `icons/icon-512.png`
- Test: `tests/assets.test.js`

**Interfaces:**
- Consumes: lista de arquivos das Tasks 1–4.
- Produces: `sw.js` com `const CACHE_VERSION = 'v1'` e `const ASSETS = [...]` (literal de array de strings, parseável pelo teste); estratégia cache-first; `install` pré-cacheia `ASSETS`; `activate` apaga caches de versões antigas; navegação offline responde `./index.html`. Atualizar o app = incrementar `CACHE_VERSION`.

- [ ] **Step 1: Testes que falham** (`tests/assets.test.js`, lê arquivos com `node:fs`)

```js
test('todo asset existe e todo arquivo do app está no cache', () => {
  // extrai ASSETS de sw.js via regex; cada item (sem './') existe no disco;
  // todo arquivo em js/**, icons/**, index.html, styles.css, manifest.webmanifest está em ASSETS; './' está em ASSETS
});
test('nenhum caminho absoluto', () => {
  // index.html: nenhum href/src começando com '/' ou 'http' (exceto nada);
  // manifest: start_url === './', scope === './', ícones sem '/' inicial; ASSETS sem '/' inicial
});
test('manifest', () => {
  // name 'App Pessoal', display 'standalone', lang 'pt-BR', ícones 192 e 512 presentes
});
```

- [ ] **Step 2:** `node --test tests/` → FAIL.
- [ ] **Step 3:** `tools/make-icons.mjs`: gera PNG RGBA via `node:zlib` (chunks IHDR/IDAT/IEND + CRC32) — fundo azul de água com gota branca simples; tamanhos 180, 192, 512. Rodar `node tools/make-icons.mjs`.
- [ ] **Step 4:** Escrever `manifest.webmanifest` e `sw.js`.
- [ ] **Step 5:** `node --test tests/` → PASS.
- [ ] **Step 6: Verificar offline** — servidor local; abrir em Edge headless com DevTools não é prático, então verificação real fica no iPhone (Task 6). Aqui: `curl -I http://localhost:8080/manifest.webmanifest` → `application/manifest+json`; ver ícone gerado (`Read icons/icon-512.png`).

---

### Task 6: Publicar no GitHub Pages

**Files:**
- Create: `README.md` (como instalar no iPhone + limitações conhecidas do spec: apagar o ícone apaga os dados; dados do Safari não passam para o app instalado)

- [ ] **Step 1:** Instalar `gh` (`winget install --id GitHub.cli -e`), `gh auth login --web` — **usuário faz o login no navegador**.
- [ ] **Step 2:** `git init -b main`, commit único inicial `feat: base do App Pessoal com aba Água (PWA offline)`.
- [ ] **Step 3:** `gh repo create app-pessoal --public --source . --push`; habilitar Pages: `gh api -X POST repos/{owner}/app-pessoal/pages -f "source[branch]=main" -f "source[path]=/"`.
- [ ] **Step 4: Verificar** — aguardar build (`gh api repos/{owner}/app-pessoal/pages` → `status: built`); `curl -sI https://<owner>.github.io/app-pessoal/` → 200; `.../sw.js` → 200.
- [ ] **Step 5:** Entregar ao usuário o link e o passo a passo: Safari → Compartilhar → Adicionar à Tela de Início → abrir pelo ícone uma vez com internet → testar em modo avião.
