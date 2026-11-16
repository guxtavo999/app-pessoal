# App Pessoal

Organizador pessoal para iPhone que funciona offline: abas Rotina, Água e Agenda.

## Instalar no iPhone

1. Abra o link do app no **Safari**.
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. Abra pelo ícone uma vez com internet. Depois disso funciona sem internet.

## Limitações conhecidas

- Os dados ficam só no iPhone. **Apagar o ícone da Tela de Início apaga os dados.**
- O que for marcado no Safari antes de instalar não passa para o app instalado — use sempre pelo ícone.

## Desenvolvimento

- Testes: `node --test tests/`
- Servidor local: `node tools/serve.mjs` → http://localhost:8080/
- Ícones: `node tools/make-icons.mjs`
- Nova aba: criar `js/tabs/<nome>.js` (exporta `{ id, label, icon, mount }`), registrar em `TABS` em `js/app.js` e adicionar o arquivo em `ASSETS` no `sw.js`.
- Publicar atualização: aumentar `CACHE_VERSION` no `sw.js` e enviar ao GitHub. O iPhone aplica na próxima abertura.
