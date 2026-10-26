# Registers (or with -Unregister removes) the Windows scheduled task "NightShift prune-merged" that runs
# `node scripts/prune-merged.mjs --apply` once a week (doc-guard; Michael 2026-10-25, merged branches: "Yes, weekly").
# It removes clean, idle worktrees whose HEAD is in origin/master and deletes branches merged into master whose tip is
# older than 7 days (never unmerged, protected or open-PR branches); log: C:\NightShift\scratch\prune-log\<date>.txt.
# Headless like auto-train-task.ps1: wscript.exe runs a small generated .vbs that starts node with a hidden window.
# The orchestrator installs it from Windows PowerShell on the desktop (no admin; runs as the current user, only while
# logged on, so gh and git keep their credentials):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prune-task.ps1 [-RepoDir <checkout>] [-Clone <main clone>] [-Day Sunday] [-At 04:00] [-DryRun]
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prune-task.ps1 -Unregister
# -RepoDir: the checkout whose scripts\prune-merged.mjs runs (default: this file's repo; one that stays on master).
# -Clone: the main clone that owns the worktrees (passed as --clone; default C:\NightShift\Mobile-Coop).
# -DryRun: register the task without --apply (it only writes the log).
param(
  [switch]$Unregister,
  [switch]$DryRun,
  [string]$RepoDir = (Split-Path -Parent $PSScriptRoot),
  [string]$Clone = 'C:\NightShift\Mobile-Coop',
  [ValidateSet('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')]
  [string]$Day = 'Sunday',
  [string]$At = '04:00',
  [string]$TaskName = 'NightShift prune-merged',
  [string]$Scratch = 'C:\NightShift\scratch'
)
$ErrorActionPreference = 'Stop'

if ($Unregister) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Output "removed scheduled task '$TaskName'"
  } else {
    Write-Output "no scheduled task '$TaskName'"
  }
  return
}

$script = Join-Path $RepoDir 'scripts\prune-merged.mjs'
if (-not (Test-Path $script)) { throw "not found: $script" }
if (-not (Test-Path $Clone)) { throw "clone not found: $Clone" }
$node = (Get-Command node -ErrorAction Stop).Source
$logDir = Join-Path $Scratch 'prune-log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$apply = if ($DryRun) { '' } else { '--apply' }
$out = Join-Path $logDir 'prune-task.out'
$cmd = "cmd /c `"`"$node`" `"$script`" $apply --clone `"$Clone`" --log-dir `"$logDir`" >> `"$out`" 2>&1`""
$vbs = Join-Path $Scratch 'prune-task.vbs'
$vbsText = @(
  'Set sh = CreateObject("WScript.Shell")',
  ('sh.CurrentDirectory = "' + $RepoDir + '"'),
  ('sh.Run "' + ($cmd -replace '"', '""') + '", 0, True')
) -join "`r`n"
Set-Content -Path $vbs -Value $vbsText -Encoding ASCII

$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "//B //NoLogo `"$vbs`"" -WorkingDirectory $RepoDir
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Day -At $At
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1) -Hidden
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force `
  -Description 'Night Shift weekly prune: node scripts/prune-merged.mjs (merged worktrees and branches; docs/RULES.md "Docs")' | Out-Null
Write-Output "registered '$TaskName': weekly on $Day at $At, $script $apply --clone $Clone (hidden via $vbs; log $logDir)"
