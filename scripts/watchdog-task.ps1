# Registers (or with -Unregister removes) the Windows scheduled task "NightShift watchdog" that runs
# `node scripts/watchdog.mjs tick` every 2 minutes (docs/systems/watchdog.md). Modelled on scripts/auto-train-task.ps1:
# headless (wscript.exe runs a small generated .vbs that starts node with a hidden window), current user, only while
# logged on (gh and git keep their credentials), IgnoreNew (a long tick is never doubled).
# The task runs from a DEDICATED checkout that no agent uses (default C:\NightShift\Mobile-Coop-watchdog-live, detached
# at origin/master; created here when missing). The watchdog self-updates that checkout to origin/master at each tick
# start when no fix is mid-way.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\watchdog-task.ps1 [-RepoDir <checkout>] [-Minutes 2] [-Fix "locks,labels"] [-TickArgs "..."]
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\watchdog-task.ps1 -Unregister
# -Fix: the opt-in fixes (comma list of locks, orphans, prs, labels, release, cloud); empty = alerts only. Re-run the
# installer with a longer list to enable the next one (it replaces the task).
param(
  [switch]$Unregister,
  [string]$RepoDir = 'C:\NightShift\Mobile-Coop-watchdog-live',
  [string]$SourceRepo = 'C:\NightShift\Mobile-Coop',
  [int]$Minutes = 2,
  [string]$Fix = '',
  [string]$TickArgs = '',
  [string]$TaskName = 'NightShift watchdog',
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

if (-not (Test-Path $RepoDir)) {
  # the dedicated checkout: a detached worktree of origin/master, never a work branch
  & git -C $SourceRepo fetch -q origin
  if ($LASTEXITCODE -ne 0) { throw "git fetch failed in $SourceRepo" }
  & git -C $SourceRepo worktree add --detach $RepoDir origin/master
  if ($LASTEXITCODE -ne 0) { throw "could not create the checkout $RepoDir" }
}
$script = Join-Path $RepoDir 'scripts\watchdog.mjs'
if (-not (Test-Path $script)) { throw "not found: $script (is $RepoDir on a master that has the watchdog?)" }
$node = (Get-Command node -ErrorAction Stop).Source
New-Item -ItemType Directory -Force -Path (Join-Path $Scratch 'runs') | Out-Null

$fixArg = ''
if ($Fix.Trim() -ne '') { $fixArg = "--fix $($Fix.Trim())" }
# The hidden launcher: node's own output goes next to watchdog.log.
$out = Join-Path $Scratch 'runs\watchdog-task.out'
$cmd = "cmd /c `"`"$node`" `"$script`" tick $fixArg $TickArgs >> `"$out`" 2>&1`""
$vbs = Join-Path $Scratch 'watchdog-task.vbs'
$vbsText = @(
  'Set sh = CreateObject("WScript.Shell")',
  ('sh.CurrentDirectory = "' + $RepoDir + '"'),
  ('sh.Run "' + ($cmd -replace '"', '""') + '", 0, True')
) -join "`r`n"
Set-Content -Path $vbs -Value $vbsText -Encoding ASCII

$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "//B //NoLogo `"$vbs`"" -WorkingDirectory $RepoDir
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $Minutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -Hidden
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force `
  -Description 'Night Shift watchdog: node scripts/watchdog.mjs tick (docs/systems/watchdog.md)' | Out-Null
Write-Output "registered '$TaskName': every $Minutes min, $script tick $fixArg $TickArgs (hidden via $vbs)"
