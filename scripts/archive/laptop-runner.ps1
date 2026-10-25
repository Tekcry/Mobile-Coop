# The laptop test runner (CLAUDE.md "The laptop is the test runner"): one request at a time in
# C:\NightShift\Mobile-Coop-testrun, detached at the commit, with the laptop heavy.lock (waits while another run holds
# it), port 4191, headless, BelowNormal with -Low.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/archive/laptop-runner.ps1 -Label <name> -Commit <sha> -Steps "build;e2e-coop;e2e-netmove" -Low
# Steps run in order, separated by ';': check | build | full (npm run e2e) | suite names separated by spaces (one
# run-e2e call). A failed check or build skips the rest; a failed suite does not. npm ci only when package-lock.json
# changed beyond its version lines. Env: RUN_JOBS (E2E_JOBS, default 1), RUN_TIMEOUT (E2E_SUITE_TIMEOUT s, default 900).
# Results: C:\NightShift\scratch\runs\<Label>\summary.txt (one line per step, DONE at the end) and a log per step.
param([string]$Label, [string]$Commit, [string]$Steps, [switch]$Low)
$ErrorActionPreference = 'Continue'
$out = "C:\NightShift\scratch\runs\$Label"
New-Item -ItemType Directory -Force $out | Out-Null
while (Test-Path C:\NightShift\heavy.lock) { Start-Sleep -Seconds 15 }
Set-Content -Encoding utf8 C:\NightShift\heavy.lock "Night Shift | Character Build | runner: $Label $Commit | $(Get-Date -Format s)"
function Run($name, $cmd) {
  $t = Get-Date
  $p = Start-Process cmd.exe -ArgumentList '/c',$cmd -NoNewWindow -PassThru -RedirectStandardOutput "$out\$name.log" -RedirectStandardError "$out\$name.err"
  $null = $p.Handle; if ($Low) { $p.PriorityClass = 'BelowNormal' }; $p.WaitForExit()
  "$name exit=$($p.ExitCode) $([int]((Get-Date)-$t).TotalSeconds)s" | Add-Content "$out\summary.txt"
  return $p.ExitCode
}
try {
  Set-Location C:\NightShift\Mobile-Coop-testrun
  git fetch -q origin
  git checkout -q -- .
  $before = git rev-parse HEAD
  git checkout -q --detach $Commit
  "head $(git rev-parse --short HEAD) low=$Low start=$(Get-Date -Format s)" | Set-Content "$out\summary.txt"
  if (git diff --name-only $before HEAD -- package-lock.json) {
    $lock = @(git diff -U0 $before HEAD -- package-lock.json | Select-String '^[+-]\s')
    if ($lock.Count -gt 4) { $null = Run 'npmci' 'npm ci' }
  }
  $env:E2E_PORT = '4191'; $env:E2E_SUITE_TIMEOUT = $(if ($env:RUN_TIMEOUT) { $env:RUN_TIMEOUT } else { '900' })
  $env:E2E_JOBS = $(if ($env:RUN_JOBS) { $env:RUN_JOBS } else { '1' })
  $ok = $true
  foreach ($st in $Steps.Split(';')) {
    if (-not $ok) { "$st skipped" | Add-Content "$out\summary.txt"; continue }
    switch ($st) {
      'check' { $r = Run 'check' 'npm run check' }
      'build' { $r = Run 'build' 'npm run build' }
      'full'  { $r = Run 'full' 'npm run e2e' }
      default { $r = Run ($st -replace ' ','_') "node scripts/run-e2e.mjs $st" }
    }
    if ($r -ne 0 -and $st -in @('check','build')) { $ok = $false }
  }
} finally {
  Remove-Item C:\NightShift\heavy.lock -ErrorAction SilentlyContinue
  "DONE" | Add-Content "$out\summary.txt"
}
