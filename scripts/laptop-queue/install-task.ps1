# Registers the laptop queue service as a scheduled task that starts every 5 minutes (the pid lock makes the starts
# no-ops while a service runs). No admin needed. Remove it with -Remove.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/laptop-queue/install-task.ps1 [-Remove]
param([switch]$Remove)
$name = 'NightShift-laptop-queue'
if ($Remove) { schtasks /delete /f /tn $name; exit $LASTEXITCODE }
$run = 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command cd C:\NightShift\Mobile-Coop-laptop-queue-svc; node scripts/laptop-queue/service.mjs'
schtasks /create /f /sc minute /mo 5 /tn $name /tr $run
exit $LASTEXITCODE
