# Registers the laptop queue service as a scheduled task that starts every minute, indefinitely (IgnoreNew: no start at
# all while the service runs; the pid lock covers a manual start). 1 min, was 5: a self-update exit waited up to 5 min
# for the next trigger (desktop 4 min, Orchestrator audit 2026-10-24). Re-run this script to apply a change. Headless, Normal priority
# (5), no time limit, keeps running on battery. No admin needed. Remove it with -Remove.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/laptop-queue/install-task.ps1 [-Worker desktop [-DesktopCpu 80] [-DesktopBacklog 0] [-DesktopCpuMode normal]] [-Follow origin/master] [-Remove]
# -Follow: the ref the service fast-forwards its checkout to when idle (env LQ_FOLLOW), default origin/master.
# -Worker desktop: the desktop overflow lane (env LQ_WORKER=desktop, task NightShift-desktop-queue; see service.mjs).
# -DesktopCpu / -DesktopBacklog (desktop only): env LQ_DESKTOP_CPU (max CPU % at a 4191 start) and LQ_DESKTOP_BACKLOG
# (requests waiting before the desktop takes one), defaults 80 and 0; a re-register used to drop them (Orchestrator
# 2026-10-24 ~21:10, after the desktop fell back to the service default backlog 3). -DesktopCpuMode: env LQ_DESKTOP_CPU_MODE
# (normal: Normal+ priority load, a BelowNormal bake does not count; total: the whole machine), default normal.
param([switch]$Remove, [string]$Follow = 'origin/master', [ValidateSet('laptop', 'desktop')][string]$Worker = 'laptop',
  [ValidateRange(1, 100)][int]$DesktopCpu = 80, [ValidateRange(0, 1000)][int]$DesktopBacklog = 0,
  [ValidateSet('normal', 'total')][string]$DesktopCpuMode = 'normal')
$ErrorActionPreference = 'Stop'
$name = if ($Worker -eq 'desktop') { 'NightShift-desktop-queue' } else { 'NightShift-laptop-queue' }
if ($Remove) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false
  exit 0
}
$dir = 'C:\NightShift\Mobile-Coop-laptop-queue-svc'
if ($Follow -notmatch '^[A-Za-z0-9._/-]+$') { throw "bad -Follow ref: $Follow" }
$desktopEnv = if ($Worker -eq 'desktop') { "`$env:LQ_DESKTOP_CPU = '$DesktopCpu'; `$env:LQ_DESKTOP_BACKLOG = '$DesktopBacklog'; `$env:LQ_DESKTOP_CPU_MODE = '$DesktopCpuMode'; " } else { '' }
$cmd = "`$env:LQ_FOLLOW = '$Follow'; `$env:LQ_WORKER = '$Worker'; $desktopEnv" + 'node scripts/laptop-queue/service.mjs'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$cmd`"" `
  -WorkingDirectory $dir
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 1)
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -Priority 5
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings `
  -Description "Night Shift $Worker e2e queue (scripts/laptop-queue/service.mjs)" -Force | Out-Null
$extra = if ($Worker -eq 'desktop') { ", cpu ($DesktopCpuMode) < $DesktopCpu %, backlog > $DesktopBacklog" } else { '' }
Write-Output "registered $name (every 1 min, worker $Worker, follow $Follow$extra, in $dir)"
exit 0
