# Handoff — estado do projeto (2026-11-15)

## Onde estamos

- App publicado: https://guxtavo999.github.io/app-pessoal/ (GitHub Pages, repo público `guxtavo999/app-pessoal`).
- PWA em HTML/CSS/JS puro, sem build. Dados só no `localStorage` do iPhone (chaves com prefixo `app-pessoal:`).
- Abas: **Rotina** (placeholder "Em breve") e **Água** (6 botões: 3×910 ml, 3×1 L; boneco enche até a meta de 4 L; acima da meta o número continua contando; zera à meia-noite).
- Design: `docs/superpowers/specs/2026-11-15-app-pessoal-base-design.md`
- Plano executado: `docs/superpowers/plans/2026-11-15-app-pessoal-base.md`
- Testes: `node --test tests/` (21/21). Servidor local: `node tools/serve.mjs`.

## Próximos passos

1. Usuário instala no iPhone (Safari → Compartilhar → Adicionar à Tela de Início → abrir 1x com internet) e testa modo avião.
2. Definir o conteúdo da aba **Rotina** (brainstorming com o usuário).
3. Ajustes visuais que o usuário pedir após usar.

## Pendências menores (da revisão final, não corrigidas)

- `styles.css`: `color-mix` sem fallback (tabbar transparente no iOS 16.0–16.1) → pôr `background: var(--surface)` antes.
- `js/app.js`: `view.scrollTop = 0` não faz nada → `window.scrollTo(0, 0)`.
- `.cup:active` sem efeito no iOS → listener `touchstart` passivo no `document`.
- `storage.js`: `map(Boolean)` trata strings corrompidas como `true` → `v === true`.
- Atualizações dependem de aumentar `CACHE_VERSION` em `sw.js` a cada deploy.
- Status bar `default` pode destoar no modo escuro.
- `tools/serve.mjs`: URL malformada derruba o servidor; checagem de caminho fraca.

## Regras para continuar

- Toda aba nova: arquivo em `js/tabs/`, registrar em `TABS` (`js/app.js`) e em `ASSETS` (`sw.js`).
- Todo deploy: aumentar `CACHE_VERSION`, rodar testes, `git push` (Pages publica sozinho; `.nojekyll` precisa continuar existindo).
