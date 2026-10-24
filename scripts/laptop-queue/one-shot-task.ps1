# Registers ONE ad-hoc headless run as a scheduled task that expires and deletes itself (Michael 2026-10-24 07:13, after
# 87 hand-made NightShift-chain-* one-shots fired again at 2026-10-23 23:59 and held the slot locks for hours). The only
# way to schedule an ad-hoc run; e2e runs go through the queue (request.mjs), never a hand-made chain.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/laptop-queue/one-shot-task.ps1 -Name NightShift-run-<what> `
#     -Command "<powershell command line>" [-At <datetime>] [-ExpireMinutes 240] [-WorkingDirectory <dir>] [-WhatIf]
# Trigger -Once at -At (default now + 15 s; StartWhenAvailable runs a just-missed start) with EndBoundary = At +
# ExpireMinutes; ExecutionTimeLimit = ExpireMinutes; DeleteExpiredTaskAfter PT0S (deleted once expired). Headless
# (-WindowStyle Hidden, -NoProfile), Normal priority (5), runs on battery, same principal as install-task.ps1 (current
# user). The service's task guard leaves a NightShift-run-* task with an EndBoundary alone. -WhatIf prints, registers nothing.
param([string]$Name = '', [string]$Command = '', [datetime]$At = (Get-Date).AddSeconds(15),
  [ValidateRange(1, 1440)][int]$ExpireMinutes = 240, [string]$WorkingDirectory = (Get-Location).Path, [switch]$WhatIf)
$ErrorActionPreference = 'Stop'
if ($Name -notmatch '^NightShift-run-[A-Za-z0-9._-]+$') { throw "-Name must be NightShift-run-<letters, digits, . _ ->: '$Name'" }
if (-not $Command.Trim()) { throw '-Command is empty' }
$end = $At.AddMinutes($ExpireMinutes)
$endText = $end.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$arg = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$($Command -replace '"', '\"')`""
if ($WhatIf) {
  Write-Output "what-if: would register $Name (nothing registered)"
  Write-Output "  at      $($At.ToString('s')) local, expires $($end.ToString('s')) local ($endText), then deleted (PT0S)"
  Write-Output "  limit   $ExpireMinutes min (ExecutionTimeLimit), priority 5, IgnoreNew, on battery, StartWhenAvailable"
  Write-Output "  run     powershell.exe $arg"
  Write-Output "  in      $WorkingDirectory"
  exit 0
}
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg -WorkingDirectory $WorkingDirectory
$trigger = New-ScheduledTaskTrigger -Once -At $At
$trigger.EndBoundary = $endText
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes $ExpireMinutes) -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -Priority 5 -StartWhenAvailable -DeleteExpiredTaskAfter ([TimeSpan]::Zero)
# no -Force: an existing task of the same name is an error, never overwritten
Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger -Settings $settings `
  -Description "Night Shift one-shot run, expires $endText (scripts/laptop-queue/one-shot-task.ps1)" | Out-Null
Write-Output "registered $Name (at $($At.ToString('s')), expires $($end.ToString('s')), then deleted)"
exit 0
