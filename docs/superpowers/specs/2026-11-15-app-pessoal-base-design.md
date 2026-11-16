# App Pessoal — Base + Aba Água (design)

Data: 2026-11-15

## Intenção

Organizador pessoal de tarefas diárias para usar no iPhone, com ou sem internet, sem custo nenhum de hospedagem e com dados guardados no próprio aparelho. O app é organizado em abas (barra inferior). Esta etapa constrói **a base** (estrutura de abas, instalação, offline, armazenamento) e a **aba Água**. A aba **Rotina** existe só como espaço reservado; seu conteúdo será definido depois. Outras abas virão depois.

## Objetivos

- Instalável no iPhone via Safari → "Adicionar à Tela de Início", abrindo em tela cheia como app.
- Funciona 100% offline depois da primeira abertura.
- Dados ficam só no iPhone (sem conta, sem servidor).
- Adicionar uma aba nova no futuro = criar um arquivo e registrá-lo em um lugar só.
- Aba Água conforme especificado abaixo.

## Não-objetivos (agora)

- Sincronizar entre aparelhos, login, backup na nuvem.
- Notificações/lembretes.
- Exportar/importar backup (decidido pelo usuário: não por agora; reavaliar quando houver dados de Rotina/histórico).
- Tela de histórico de água (mas o histórico por dia é **gravado** para permitir isso depois).
- Editar quantidades dos botões ou a meta pela interface.
- Conteúdo da aba Rotina.

## Anti-objetivos (seria fracasso mesmo funcionando)

- Depender de internet para abrir ou registrar.
- Exigir qualquer pagamento (Apple Developer, hospedagem, serviço).
- Perder os registros do dia (ex.: ao fechar o app ou após atualização).

## Restrições

- Usuário está no Windows, sem Mac → app nativo iOS inviável sem custo. Por isso: PWA.
- Hospedagem: **GitHub Pages** (gratuito), decidido pelo usuário. No plano gratuito o repositório precisa ser público; o código não contém dados pessoais (os dados vivem só no iPhone).
- iOS Safari: offline exige HTTPS + service worker (GitHub Pages atende). Apps na Tela de Início não sofrem a remoção de dados por 7 dias de inatividade do Safari.
- Idioma da interface: português (Brasil). Números com vírgula decimal ("2,82 / 4 L").

## Abordagens consideradas

1. **HTML/CSS/JS puro, sem build — escolhida.** GitHub Pages publica os arquivos como estão; zero dependências; leve offline; aba nova = um arquivo. Contra: menos estrutura se o app crescer muito.
2. React + Vite + plugin PWA. Melhor para apps grandes, mas exige build, deploy automatizado e muitas dependências; peso sem retorno para poucas abas.
3. Flutter/Capacitor nativo. Descartada: precisa de Mac e/ou conta paga Apple.

Escolha feita por Claude (usuário delegou a parte técnica).

## O que o usuário decidiu

### Aba Água

- **6 botões**: 3 de **910 ml** e 3 de **1 L**.
- Tocar num botão marca com um **"X"** (selecionado).
- Do **lado direito**, um **boneco simulando um corpo humano** que se **preenche de água** conforme os botões são marcados.
- **Meta diária: 4 L.** O boneco fica cheio ao atingir 4 L.
- Acima da meta (máximo possível 5,73 L): boneco permanece cheio e o **número continua contando** (ex.: "5,73 / 4 L"). (Opção "a", escolhida pelo usuário.)

Esboço:

```
┌─────────────────────────────┐
│  Água · hoje      2,82/4 L  │
│                             │
│  [X] 910ml  [ ] 1L     ◯    │
│  [X] 910ml  [ ] 1L    /█\   │
│  [ ] 910ml  [X] 1L    ▓▓▓   │
│                       ░ ░   │
├─────────────────────────────┤
│   Rotina    │    Água       │
└─────────────────────────────┘
```

### Hospedagem

GitHub Pages.

## Decisões de Claude (propostas, usuário pode mudar)

- Tocar de novo num botão marcado **desmarca** (corrigir toque acidental).
- Tudo **zera à meia-noite** (horário local do aparelho). Se o app ficar aberto virando o dia, ao voltar para ele (ou na virada) mostra o dia novo.
- Total em números no topo da aba.
- Preenchimento do boneco: proporcional a `min(total, 4000) / 4000`, de baixo para cima, com transição suave. Boneco em SVG desenhado no próprio app.
- Layout dos botões: coluna 910 ml à esquerda, coluna 1 L à direita, boneco à direita dos botões (como no esboço). Botões grandes para toque com o polegar.
- Abas na barra inferior. O app abre na **última aba usada**; na primeira vez, na primeira aba (Rotina).
- Limitações conhecidas do iOS (documentar no app/README): dados somem se o ícone da Tela de Início for apagado; dados marcados no Safari antes de instalar não passam para o app instalado.
- Aba Rotina: tela simples "Em breve".
- Visual: limpo, segue tema claro/escuro do sistema, azul para água. Respeita a área segura do iPhone (notch / barra inferior).
- Armazenamento: `localStorage`, chave por data (`AAAA-MM-DD`) com o estado dos 6 botões. Histórico de dias anteriores fica guardado (sem tela por enquanto). Pede `navigator.storage.persist()` quando disponível.
- Atualizações: service worker com cache versionado; nova versão publicada é baixada em segundo plano e passa a valer na próxima abertura do app.
- Ícone do app e nome na Tela de Início: "App Pessoal" (provisório) com ícone simples gerado.

## Deixado para quem constrói

- Estrutura de pastas/arquivos, nomes internos, forma exata do boneco SVG.
- Como verificar localmente (servidor local + emulação mobile) antes do deploy.
- Criação do repositório e configuração do GitHub Pages (usuário só faz login no GitHub quando necessário).
