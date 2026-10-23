# Registers the laptop queue service as a scheduled task that starts every 5 minutes, indefinitely (the pid lock makes
# the starts no-ops while a service runs; IgnoreNew keeps a second instance from starting). Headless, Normal priority
# (5), no time limit, keeps running on battery. No admin needed. Remove it with -Remove.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/laptop-queue/install-task.ps1 [-Worker desktop] [-Follow origin/master] [-Remove]
# -Follow: the ref the service fast-forwards its checkout to when idle (env LQ_FOLLOW), default origin/master.
# -Worker desktop: the desktop overflow lane (env LQ_WORKER=desktop, task NightShift-desktop-queue; see service.mjs).
param([switch]$Remove, [string]$Follow = 'origin/master', [ValidateSet('laptop', 'desktop')][string]$Worker = 'laptop')
$ErrorActionPreference = 'Stop'
$name = if ($Worker -eq 'desktop') { 'NightShift-desktop-queue' } else { 'NightShift-laptop-queue' }
if ($Remove) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false
  exit 0
}
$dir = 'C:\NightShift\Mobile-Coop-laptop-queue-svc'
if ($Follow -notmatch '^[A-Za-z0-9._/-]+$') { throw "bad -Follow ref: $Follow" }
$cmd = "`$env:LQ_FOLLOW = '$Follow'; `$env:LQ_WORKER = '$Worker'; node scripts/laptop-queue/service.mjs"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$cmd`"" `
  -WorkingDirectory $dir
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -Priority 5
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings `
  -Description "Night Shift $Worker e2e queue (scripts/laptop-queue/service.mjs)" -Force | Out-Null
Write-Output "registered $name (every 5 min, worker $Worker, follow $Follow, in $dir)"
exit 0
