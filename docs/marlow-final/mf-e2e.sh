#!/usr/bin/env bash
# marlow-final e2e in the clean run worktree: mf-e2e.sh <ref> <suites...>
# Detaches the run worktree at <ref>, takes heavy.lock (noclobber), builds, runs the suites with E2E_GPU=1 on 4189.
set -u
REF="$1"; shift
RUN=/c/NightShift/Mobile-Coop-marlow-final-run
LOCK=/c/NightShift/heavy.lock
ME="Menu Notes Build | marlow-final e2e $* | $(date +%H:%M)"
LOG=/c/NightShift/scratch/runs/mf-$(date +%H%M).log
mkdir -p /c/NightShift/scratch/runs
until ( set -o noclobber; echo "$ME" > "$LOCK" ) 2>/dev/null; do echo "lock held: $(cat $LOCK 2>/dev/null)"; sleep 60; done
release() { grep -qF "Menu Notes Build | marlow-final e2e" "$LOCK" 2>/dev/null && rm -f "$LOCK"; }
trap release EXIT
freeport() { powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4189 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }" >/dev/null 2>&1; }
cd "$RUN" || exit 2
git fetch -q origin && git checkout -q --detach "$REF" || exit 2
echo "run at $(git log -1 --oneline) suites $*" | tee "$LOG"
timeout 900 npm run build >>"$LOG" 2>&1 || { echo "BUILD FAIL (see $LOG)"; exit 1; }
freeport
E2E_GPU=1 E2E_PORT=4189 E2E_JOBS=1 timeout 3000 node scripts/run-e2e.mjs "$@" >>"$LOG" 2>&1
CODE=$?
freeport
sed -n '/^times (/,$p' "$LOG"
grep -E "FAIL|AssertionError|Error:" "$LOG" | head -20
echo "exit $CODE log $LOG"
exit $CODE
