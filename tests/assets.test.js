import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = f => readFileSync(join(root, f), 'utf8');
const sw = read('sw.js');
const ASSETS = JSON.parse(sw.match(/const ASSETS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));

const walk = dir => readdirSync(join(root, dir)).flatMap(name => {
  const rel = dir + '/' + name;
  return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel];
});

test('todo asset existe e todo arquivo do app está no cache', () => {
  assert.ok(ASSETS.includes('./'));
  for (const a of ASSETS.filter(a => a !== './')) {
    assert.ok(existsSync(join(root, a.replace(/^\.\//, ''))), `faltando no disco: ${a}`);
  }
  const appFiles = ['index.html', 'styles.css', 'manifest.webmanifest', ...walk('js'), ...walk('icons')];
  for (const f of appFiles) assert.ok(ASSETS.includes('./' + f), `fora do cache: ${f}`);
});

test('nenhum caminho absoluto', () => {
  const html = read('index.html');
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    assert.ok(url.startsWith('./'), `caminho não relativo em index.html: ${url}`);
  }
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  for (const i of m.icons) assert.ok(i.src.startsWith('./'), i.src);
  for (const a of ASSETS) assert.ok(a.startsWith('./'), a);
  for (const f of walk('js')) {
    for (const [, spec] of read(f).matchAll(/from '([^']+)'/g)) assert.ok(spec.startsWith('.'), `${f}: ${spec}`);
  }
});

test('manifest', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.name, 'App Pessoal');
  assert.equal(m.display, 'standalone');
  assert.equal(m.lang, 'pt-BR');
  const sizes = m.icons.map(i => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
});
