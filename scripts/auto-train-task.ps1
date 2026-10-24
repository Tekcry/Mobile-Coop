# Registers (or with -Unregister removes) the Windows scheduled task "NightShift auto-train" that runs
# `node scripts/auto-train.mjs tick` every 5 minutes (docs/systems/auto-train.md). Headless: the task starts
# wscript.exe on a small generated .vbs that runs node with a hidden window, so no console window ever appears.
# Run it from Windows PowerShell on the desktop (no admin needed; the task runs as the current user, only while
# logged on, so gh and git keep their credentials):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\auto-train-task.ps1 [-RepoDir <checkout>] [-Worktree <dir>] [-Minutes 5] [-TickArgs "--min-interval 60"]
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\auto-train-task.ps1 -Unregister
# -RepoDir: the checkout whose scripts\auto-train.mjs and scripts\merge-train.mjs run (default: this file's repo);
# pick one that does not change branch under the task (not the train worktree).
# -Worktree: where merge-train runs (passed as --worktree; default C:\NightShift\Mobile-Coop-train).
param(
  [switch]$Unregister,
  [string]$RepoDir = (Split-Path -Parent $PSScriptRoot),
  [string]$Worktree = 'C:\NightShift\Mobile-Coop-train',
  [int]$Minutes = 5,
  [string]$TickArgs = '',
  [string]$TaskName = 'NightShift auto-train',
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

$script = Join-Path $RepoDir 'scripts\auto-train.mjs'
if (-not (Test-Path $script)) { throw "not found: $script" }
if (-not (Test-Path $Worktree)) { throw "train worktree not found: $Worktree" }
$node = (Get-Command node -ErrorAction Stop).Source
New-Item -ItemType Directory -Force -Path (Join-Path $Scratch 'runs') | Out-Null

# The hidden launcher: node's own output goes to the tick's log next to auto-train.log.
$out = Join-Path $Scratch 'runs\auto-train-task.out'
$cmd = "cmd /c `"`"$node`" `"$script`" tick --worktree `"$Worktree`" $TickArgs >> `"$out`" 2>&1`""
$vbs = Join-Path $Scratch 'auto-train-task.vbs'
$vbsText = @(
  'Set sh = CreateObject("WScript.Shell")',
  ('sh.CurrentDirectory = "' + $RepoDir + '"'),
  ('sh.Run "' + ($cmd -replace '"', '""') + '", 0, True')
) -join "`r`n"
Set-Content -Path $vbs -Value $vbsText -Encoding ASCII

$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "//B //NoLogo `"$vbs`"" -WorkingDirectory $RepoDir
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $Minutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2) -Hidden
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force `
  -Description 'Night Shift rolling merge train: node scripts/auto-train.mjs tick (docs/systems/auto-train.md)' | Out-Null
Write-Output "registered '$TaskName': every $Minutes min, $script tick --worktree $Worktree $TickArgs (hidden via $vbs)"
