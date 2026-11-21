# Baixa as atualizacoes do GitHub (somente fast-forward, nunca sobrescreve trabalho local).
# Executado automaticamente pela tarefa agendada criada por install-sync.ps1.
$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
$log  = Join-Path $repo '.git\auto-sync.log'

function Write-Log($msg) {
    $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Add-Content -Path $log -Value $line -Encoding utf8
    # Mantem o log pequeno (ultimas 500 linhas)
    $all = Get-Content $log
    if ($all.Count -gt 500) { $all | Select-Object -Last 500 | Set-Content $log -Encoding utf8 }
}

Set-Location $repo
$before = (git rev-parse HEAD).Trim()

git fetch --all --prune --quiet
if ($LASTEXITCODE -ne 0) { Write-Log 'ERRO: git fetch falhou (sem internet?)'; exit 1 }

$upstream = git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null
if (-not $upstream) { Write-Log 'Branch atual sem upstream; nada a fazer.'; exit 0 }

$behind = [int](git rev-list --count "HEAD..$upstream")
$ahead  = [int](git rev-list --count "$upstream..HEAD")
if ($behind -eq 0) { exit 0 }  # ja atualizado; nao polui o log

if ($ahead -gt 0) {
    Write-Log "AVISO: $ahead commit(s) local(is) nao enviados e $behind novo(s) no GitHub. Resolva manualmente com 'git pull'."
    exit 1
}

git merge --ff-only --quiet $upstream
if ($LASTEXITCODE -ne 0) {
    Write-Log 'AVISO: alteracoes locais nao commitadas impedem a atualizacao. Faca commit ou descarte e rode git pull.'
    exit 1
}
$after = (git rev-parse HEAD).Trim()
Write-Log ("Atualizado {0} -> {1} ({2} commit(s))" -f $before.Substring(0,7), $after.Substring(0,7), $behind)
