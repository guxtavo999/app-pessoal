# Cria (ou recria) a tarefa agendada que sincroniza este repositorio a cada N minutos.
# Uso:    powershell -ExecutionPolicy Bypass -File tools\install-sync.ps1
# Remover: powershell -ExecutionPolicy Bypass -File tools\install-sync.ps1 -Uninstall
param(
    [int]$Minutes = 5,
    [switch]$Uninstall
)
$taskName = 'app-pessoal-auto-sync'

if ($Uninstall) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tarefa '$taskName' removida."
    exit 0
}

$script = Join-Path $PSScriptRoot 'sync.ps1'
# conhost --headless evita que uma janela pisque na tela a cada execucao
$action = New-ScheduledTaskAction -Execute 'conhost.exe' `
    -Argument "--headless powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$script`""
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$triggerLoop  = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes $Minutes)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($triggerLogon, $triggerLoop) `
    -Settings $settings -Description 'Baixa atualizacoes do app-pessoal do GitHub' -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Write-Host "Pronto! O repositorio sera atualizado a cada $Minutes minutos."
Write-Host "Log: $(Join-Path (Split-Path -Parent $PSScriptRoot) '.git\auto-sync.log')"
