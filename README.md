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

## Sincronizar vários computadores

Cada computador baixa sozinho as atualizações do GitHub a cada 5 minutos (tarefa agendada do Windows).

- Ativar (uma vez por computador): `powershell -ExecutionPolicy Bypass -File tools\install-sync.ps1`
- Desativar: `powershell -ExecutionPolicy Bypass -File tools\install-sync.ps1 -Uninstall`
- Histórico: `.git\auto-sync.log`
- Enviar continua manual: `git add .` → `git commit -m "..."` → `git push`.
- Se houver alterações locais não enviadas, a atualização automática é pulada (nada é sobrescrito) e o motivo aparece no log.
