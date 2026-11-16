# Aba Rotina — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Routine tab with a fixed list of tasks that can be marked as done daily, highlighting tasks with past times as "overdue".

**Architecture:** Create a new `js/routine.js` module exporting the task list and storage functions keyed by task id (not position), then modify the `rotina.js` tab to render the list with overdue highlighting and update logic. Styling follows the Água tab pattern. Tests verify task list stability, id-based storage, and overdue calculation.

**Tech Stack:** Vanilla JS (no build), localStorage for persistence, CSS for styling.

**Spec:** `docs/superpowers/specs/2026-11-16-aba-rotina-design.md`

## Global Constraints

- App must work 100% offline after first open; all data in localStorage with `app-pessoal:` prefix.
- Task list is fixed in code; additions/reordering require code changes.
- Markings reset daily at 00:00 (midnight).
- Overdue tasks: those with a `time` (e.g., `"11:00"`, `"18:00"`), unmarked, and current time ≥ time string.
- Storage key format: `app-pessoal:rotina:YYYY-MM-DD` with object `{ id: true }` for marked tasks.
- id must be stable and unique; examples: `skincare-morning`, `topiramato-11`, `topiramato-18`.

## Review Focus

1. **Overdue calculation:** Task with `time: "11:00"` at 11:05 with no mark must show as overdue; at 10:55 unmarked must not.
2. **Storage by id:** Adding a new task at position 2 must not shift marks of tasks at positions 3+; only the new id enters the data object.
3. **Corrupted localStorage:** A stored value that is not `true` or a missing id must be treated as unmarked without crashing.
4. **Midnight boundary:** Timer must fire and recalculate at or just after 00:00; marks must clear and next day's data must load.
5. **Next-event scheduling:** Timer should schedule the next event: the next task's `time`, or the next midnight—whichever is sooner—not arbitrarily at 1-minute intervals.

---

## File Structure

- **Create:** `js/routine.js` — task list, load/save by id functions.
- **Create:** `tests/routine.test.js` — tests for task list, id-based storage, overdue logic.
- **Modify:** `js/tabs/rotina.js` — render list, overdue highlighting, update/timer logic.
- **Modify:** `styles.css` — task row, checkbox, overdue styling, counter.
- **Modify:** `sw.js` — add `js/routine.js` to `ASSETS`, increment `CACHE_VERSION`.

---

## Task 1: Core Routine Data

**Files:**
- Create: `js/routine.js`
- Test: `tests/routine.test.js` (partially)

**Interfaces:**
- Produces:
  - `TASKS`: Array of `{ id, label, time? }`. Example: `[ { id: "skincare-morning", label: "Skin care matinal" }, { id: "topiramato-11", label: "11:00 Topiramato", time: "11:00" }, … ]`
  - `loadRoutineDay(key, store?)`: `(string, Store?) -> Object<id, true>` — loads marks for a date key; returns object with marked task ids as keys, all values `true`. Missing/corrupted data returns `{}`.
  - `saveRoutineDay(key, marks, store?)`: `(string, Object, Store?) -> boolean` — saves marks object; returns success.

- [ ] **Step 1: Define TASKS constant in `js/routine.js`**

```javascript
// Order and ids exactly as specified:
export const TASKS = Object.freeze([
  { id: "skincare-morning", label: "Skin care matinal" },
  { id: "remedios-morning", label: "Remédios matinais" },
  { id: "topiramato-11", label: "11:00 Topiramato", time: "11:00" },
  { id: "topiramato-18", label: "18:00 Topiramato", time: "18:00" },
  { id: "skincare-night", label: "Skin care noturna" },
]);
```

- [ ] **Step 2: Write test for TASKS constant**

```javascript
import { TASKS } from '../js/routine.js';
import { test } from 'node:test';
import assert from 'node:assert';

test('TASKS has exactly 5 items in correct order', () => {
  assert.equal(TASKS.length, 5);
  assert.equal(TASKS[0].id, "skincare-morning");
  assert.equal(TASKS[3].id, "topiramato-18");
});

test('Tasks with time have exactly 5-char HH:MM format', () => {
  TASKS.filter(t => t.time).forEach(t => {
    assert.match(t.time, /^\d{2}:\d{2}$/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/routine.test.js`
Expected: PASS (TASKS defined, constants match).

- [ ] **Step 4: Write test for `loadRoutineDay`**

```javascript
test('loadRoutineDay returns empty object for missing key', () => {
  const result = loadRoutineDay('2026-11-16', mockStore({}));
  assert.deepEqual(result, {});
});

test('loadRoutineDay returns marked ids with value true', () => {
  const store = mockStore({
    'app-pessoal:rotina:2026-11-16': '{"skincare-morning":true,"topiramato-11":true}'
  });
  const result = loadRoutineDay('2026-11-16', store);
  assert.deepEqual(result, { "skincare-morning": true, "topiramato-11": true });
});

test('loadRoutineDay ignores unknown ids and non-true values', () => {
  const store = mockStore({
    'app-pessoal:rotina:2026-11-16': '{"skincare-morning":true,"unknown-id":true,"topiramato-11":false}'
  });
  const result = loadRoutineDay('2026-11-16', store);
  assert.deepEqual(result, { "skincare-morning": true });
});

test('loadRoutineDay returns empty object for corrupted JSON', () => {
  const store = mockStore({
    'app-pessoal:rotina:2026-11-16': 'not json'
  });
  const result = loadRoutineDay('2026-11-16', store);
  assert.deepEqual(result, {});
});
```

- [ ] **Step 5: Implement `loadRoutineDay(key, store)` in `js/routine.js`**

Storage key: `app-pessoal:rotina:${key}`. Parse as JSON. Filter to ids that exist in `TASKS` and have value `=== true`. Return object with those ids as keys, all values `true`. On any parse error or invalid data, return `{}`.

- [ ] **Step 6: Write test for `saveRoutineDay`**

```javascript
test('saveRoutineDay stores marks by id', () => {
  const store = mockStore({});
  const result = saveRoutineDay('2026-11-16', { "skincare-morning": true, "topiramato-11": true }, store);
  assert.equal(result, true);
  const stored = store.getItem('app-pessoal:rotina:2026-11-16');
  assert.deepEqual(JSON.parse(stored), { "skincare-morning": true, "topiramato-11": true });
});

test('saveRoutineDay returns false on storage failure', () => {
  const store = mockStore({}, true); // mock that throws
  const result = saveRoutineDay('2026-11-16', { "skincare-morning": true }, store);
  assert.equal(result, false);
});
```

- [ ] **Step 7: Implement `saveRoutineDay(key, marks, store)` in `js/routine.js`**

Serialize `marks` as JSON. Write to key `app-pessoal:rotina:${key}`. Return `true` on success, `false` on any error (catch and return false).

- [ ] **Step 8: Run all routine.test.js tests to verify they pass**

Run: `node --test tests/routine.test.js`
Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add js/routine.js tests/routine.test.js
git commit -m "feat: add routine data module with task list and id-based storage"
```

---

## Task 2: Overdue Detection & Time Utilities

**Files:**
- Modify: `js/routine.js` (add functions)
- Modify: `tests/routine.test.js` (add tests)

**Interfaces:**
- Consumes: `TASKS` from Task 1, `todayKey()` from `js/date.js`.
- Produces:
  - `isOverdue(task, marks, now)`: `(Task, Object, Date?) -> boolean` — returns `true` if task has a `time`, is not in `marks`, and current time (or `now`) is >= `time`.
  - `msUntilNextEvent(marks, now)`: `(Object, Date?) -> number` — calculates ms until next task's `time` or next midnight, whichever is sooner.

- [ ] **Step 1: Write tests for `isOverdue`**

```javascript
test('isOverdue returns false for task without time', () => {
  const task = { id: "skincare-morning", label: "Skin care matinal" };
  const result = isOverdue(task, {}, new Date('2026-11-16T15:00:00'));
  assert.equal(result, false);
});

test('isOverdue returns false if task is marked', () => {
  const task = { id: "topiramato-11", label: "11:00 Topiramato", time: "11:00" };
  const result = isOverdue(task, { "topiramato-11": true }, new Date('2026-11-16T15:00:00'));
  assert.equal(result, false);
});

test('isOverdue returns false if current time < task time', () => {
  const task = { id: "topiramato-11", label: "11:00 Topiramato", time: "11:00" };
  const result = isOverdue(task, {}, new Date('2026-11-16T10:59:00'));
  assert.equal(result, false);
});

test('isOverdue returns true if current time >= task time and task unmarked', () => {
  const task = { id: "topiramato-11", label: "11:00 Topiramato", time: "11:00" };
  const result = isOverdue(task, {}, new Date('2026-11-16T11:00:00'));
  assert.equal(result, true);
});

test('isOverdue returns true at 18:05 for 18:00 task unmarked', () => {
  const task = { id: "topiramato-18", label: "18:00 Topiramato", time: "18:00" };
  const result = isOverdue(task, {}, new Date('2026-11-16T18:05:00'));
  assert.equal(result, true);
});
```

- [ ] **Step 2: Implement `isOverdue(task, marks, now)` in `js/routine.js`**

Check: `task.time` exists, `marks[task.id] !== true`, and `now.getHours()` and `now.getMinutes()` as "HH:MM" string is >= `task.time`. Return result.

- [ ] **Step 3: Write tests for `msUntilNextEvent`**

```javascript
test('msUntilNextEvent returns ms to next task time if before all tasks', () => {
  // At 09:00, next task is 11:00 Topiramato
  const marks = {};
  const now = new Date('2026-11-16T09:00:00');
  const result = msUntilNextEvent(marks, now);
  // Should be roughly 2 hours = 7200000 ms
  assert(result > 7199000 && result <= 7201000);
});

test('msUntilNextEvent returns ms to next task time if between tasks', () => {
  // At 12:00, next task is 18:00 Topiramato
  const marks = {};
  const now = new Date('2026-11-16T12:00:00');
  const result = msUntilNextEvent(marks, now);
  // Should be roughly 6 hours = 21600000 ms
  assert(result > 21599000 && result <= 21601000);
});

test('msUntilNextEvent returns ms to midnight if after last task', () => {
  // At 23:00, last task is 18:00, so next event is 00:00
  const marks = {};
  const now = new Date('2026-11-16T23:00:00');
  const result = msUntilNextEvent(marks, now);
  // Should be roughly 1 hour = 3600000 ms
  assert(result > 3599000 && result <= 3601000);
});

test('msUntilNextEvent skips tasks already marked (if logic uses marked status)', () => {
  // This tests that it finds the next *overdue* task, not just any task
  // At 10:00, task 11:00 is not marked (overdue in future), 18:00 also not marked
  // So next is 11:00
  const marks = {};
  const now = new Date('2026-11-16T10:00:00');
  const result = msUntilNextEvent(marks, now);
  assert(result > 3599000 && result <= 3601000);
});
```

- [ ] **Step 4: Implement `msUntilNextEvent(marks, now)` in `js/routine.js`**

Parse task times into minutes since midnight. Find the first task's time >= current time (HH:MM). Calculate ms to that time. If none found, calculate ms to next midnight. Return as number.

- [ ] **Step 5: Run all routine.test.js tests**

Run: `node --test tests/routine.test.js`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add js/routine.js tests/routine.test.js
git commit -m "feat: add overdue detection and time scheduling"
```

---

## Task 3: Styling for Routine Tab

**Files:**
- Modify: `styles.css`

**Interfaces:**
- Consumes: existing CSS classes `.cup`, `.box`, `.label` from Água tab for styling reference.
- Produces: CSS classes for routine tab: `.task`, `.task .box`, `.task .label`, `.task[aria-pressed="true"]`, `.task[data-overdue]`, `.overdue-label`, `.routine-counter`.

- [ ] **Step 1: Add task row and checkbox styles to `styles.css`**

Add after `.cup` section:

```css
.tasks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px 16px;
}

.task {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--surface);
  border: 2px solid var(--surface-alt);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
}

.task:active { transform: scale(.98); }

.task .box {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: var(--surface-alt);
  border: 2px solid var(--border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task .box svg {
  width: 20px;
  height: 20px;
  opacity: 0;
  transform: scale(.4);
  transition: opacity .15s ease, transform .2s ease;
}

.task .label {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.task[aria-pressed="true"] {
  background: var(--routine-soft, var(--surface-alt));
  border-color: var(--routine, var(--accent));
}

.task[aria-pressed="true"] .box {
  background: var(--routine, var(--accent));
  border-color: var(--routine, var(--accent));
}

.task[aria-pressed="true"] .box svg {
  opacity: 1;
  transform: scale(1);
  color: var(--surface);
}

.task[data-overdue] {
  background: var(--error-soft, #fee);
  border-color: var(--error, #c33);
}

.task[data-overdue] .label {
  color: var(--error, #c33);
}

.overdue-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--error, #c33);
  margin-left: auto;
}

.routine-counter {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}
```

- [ ] **Step 2: Add color tokens for routine if not present in `:root`**

Check `styles.css` `:root` section. If `--routine` and `--routine-soft` are not defined, add:

```css
--routine: #6366f1;
--routine-soft: #e0e7ff;
```

(Adjust color to match your app's design system.)

- [ ] **Step 3: Add dark mode overrides**

Under `@media (prefers-color-scheme: dark)`, add:

```css
.task[data-overdue] {
  background: #5c2424;
  border-color: #d32f2f;
}

.task[data-overdue] .label {
  color: #ff6b6b;
}

.overdue-label {
  color: #ff6b6b;
}
```

- [ ] **Step 4: Commit**

```bash
git add styles.css
git commit -m "style: add routine tab task row styling"
```

---

## Task 4: Routine Tab Mount Logic

**Files:**
- Modify: `js/tabs/rotina.js`
- Modify: `js/routine.js` (no interface change)

**Interfaces:**
- Consumes: `TASKS`, `loadRoutineDay`, `saveRoutineDay`, `isOverdue`, `msUntilNextEvent` from `js/routine.js`; `todayKey`, `msUntilMidnight` from `js/date.js`.
- Produces: updated export default tab object with `mount(el)` that renders the list and handles interactions.

- [ ] **Step 1: Replace rotina.js tab mount with full implementation**

The `mount` function must:
- Render header with title "Rotina", subtitle "Hoje", and counter "X de 5 feitas".
- Render task list with button for each task: `<button class="task" data-id="${task.id}" aria-pressed="false"><span class="box">X_ICON</span><span class="label">${task.label}</span></button>`.
- For overdue tasks (not marked and time passed), add `data-overdue` attribute and append `<span class="overdue-label">atrasado</span>`.
- Attach click handler: toggle `marks[task.id]`, save, re-render.
- Attach events for refresh: `visibilitychange`, `pageshow`, `focus` (same as Água).
- Schedule timer: call `msUntilNextEvent(marks, now)` to find next event, set timeout.
- At midnight and at each task time, recalculate marks and re-render.
- Show save error same as Água.

Code structure (pseudocode):
```javascript
mount(el) {
  let key = todayKey();
  let marks = loadRoutineDay(key);
  let timer = null;

  el.innerHTML = `
    <header class="page-head">
      <h1>Rotina</h1>
      <span class="sub">Hoje</span>
    </header>
    <p class="routine-counter" aria-live="polite"></p>
    <p class="save-error" role="alert" hidden>...</p>
    <section class="routine">
      <div class="tasks">${renderTasks()}</div>
    </section>`;

  const buttons = [...el.querySelectorAll('.task')];
  const counter = el.querySelector('.routine-counter');
  const saveError = el.querySelector('.save-error');

  function renderTasks() { return TASKS.map(task => { ... }).join(''); }
  function render() { 
    // update aria-pressed, counter, overdue attributes
  }
  function schedule() { 
    // set timer to msUntilNextEvent
  }
  function refresh() { 
    // check if day changed, reload marks, render
  }

  // listeners...
  return () => { /* cleanup */ };
}
```

Write the full implementation using the patterns from `js/tabs/agua.js`.

- [ ] **Step 2: Run the app locally to verify rendering**

Run: `node tools/serve.mjs` (or your local server).
Open browser, navigate to Routine tab.
Expected: List of 5 tasks appears, all unmarked.

- [ ] **Step 3: Test click interaction**

Click a task. Expected: quadrado fills with X, background changes, counter updates.
Reload page. Expected: mark persists.

- [ ] **Step 4: Test overdue highlighting**

Change system time (or mock `new Date()` in dev tools) to 11:05.
Reload or wait for timer.
Expected: "11:00 Topiramato" row shows red border/background, "atrasado" label appears.
Click to mark it. Expected: red styling disappears.

- [ ] **Step 5: Test midnight reset**

Mark several tasks.
Manually set timer to fire at next midnight (or advance system clock).
Expected: marks clear, counter resets to 0.

- [ ] **Step 6: Commit**

```bash
git add js/tabs/rotina.js
git commit -m "feat: implement routine tab with overdue highlighting"
```

---

## Task 5: Integration & Service Worker

**Files:**
- Modify: `sw.js`
- Modify: `js/app.js` (verify no changes needed)

**Interfaces:**
- Consumes: new file `js/routine.js`.
- Produces: updated `ASSETS` list and `CACHE_VERSION`.

- [ ] **Step 1: Update `CACHE_VERSION` in `sw.js`**

Increment by 1. Example: `const CACHE_VERSION = 2;` → `const CACHE_VERSION = 3;`.

- [ ] **Step 2: Add `js/routine.js` to `ASSETS` array in `sw.js`**

Locate the `ASSETS` array. Add `'js/routine.js'` in alphabetical or logical order. Example:

```javascript
const ASSETS = [
  'index.html',
  'manifest.webmanifest',
  'styles.css',
  'js/app.js',
  'js/date.js',
  'js/routine.js',
  'js/storage.js',
  'js/tabs/agua.js',
  'js/tabs/rotina.js',
  'js/water.js',
  'js/sw.js',
  // icons...
];
```

- [ ] **Step 3: Verify `js/app.js` registration**

Check that `rotina` tab is registered in `TABS` in `js/app.js`. Expected: already exists from base implementation.

- [ ] **Step 4: Run full test suite**

Run: `node --test tests/`
Expected: all 21+ tests PASS (existing + new routine tests).

- [ ] **Step 5: Build and test locally**

Run: `node tools/serve.mjs`
Open app, navigate Routine tab.
Mark several tasks, refresh, verify persistence.
Advance mock time, verify overdue appearance.
Expected: no console errors, marks persist, styling correct.

- [ ] **Step 6: Commit**

```bash
git add sw.js
git commit -m "chore: add routine.js to service worker cache"
```

---

## Final Verification

- [ ] All tests pass: `node --test tests/`
- [ ] App runs locally without errors.
- [ ] Routine tab renders all 5 tasks.
- [ ] Marking works (click, save, reload, persist).
- [ ] Overdue highlighting at/after task time.
- [ ] Midnight reset.
- [ ] Timer schedules correctly.
- [ ] Save error message appears if localStorage fails.
- [ ] CACHE_VERSION incremented, service worker updated.
