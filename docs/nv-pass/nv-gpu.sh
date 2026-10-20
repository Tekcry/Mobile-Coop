#!/usr/bin/env bash
# nv-pass GPU window: waits for the desktop heavy.lock, takes it; before shots (master cf73f8b5, skipped if already
# done), after shots (feature/nv-pass working tree), e2e-darkness on the GPU; releases.
# Usage: bash docs/nv-pass/nv-gpu.sh <after-suffix>   (touch C:/NightShift/Mobile-Coop-nv-pass/.nv-ready first when the tree is ready)
set -u
SUF=${1:-s1}
LOCK=/c/NightShift/heavy.lock
B=/c/NightShift/Mobile-Coop-nv-pass-before
A=/c/NightShift/Mobile-Coop-nv-pass
OUT=$A/docs/nv-pass/shots
freeport() { powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4189 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }" >/dev/null 2>&1; }
mine() { grep -q "^Night Shift | Menu Notes Build | nv-pass" "$LOCK" 2>/dev/null; }
while [ -f "$LOCK" ] && ! mine; do sleep 30; done
echo "Night Shift | Menu Notes Build | nv-pass GPU shots + e2e-darkness | $(date '+%Y-%m-%d %H:%M')" > "$LOCK"
trap 'rm -f "$LOCK"; freeport' EXIT
echo "lock taken $(date '+%H:%M')"
freeport
if [ ! -f "$OUT/sheet-before-epic.png" ]; then
  (cd "$B" && timeout 600 npm run build >/dev/null 2>&1) || { echo "before build failed"; exit 1; }
  (cd "$B" && E2E_GPU=1 E2E_PORT=4189 timeout 1500 node scripts/nv-shots.mjs "$OUT" before epic,medium,min 2>&1 | grep -iv "\.png$" | tail -10)
  echo "before done $(date '+%H:%M')"; freeport
fi
while [ ! -f "$A/.nv-ready" ]; do echo "waiting for .nv-ready $(date +%H:%M)"; rm -f "$LOCK"; sleep 60; while [ -f "$LOCK" ]; do sleep 30; done; echo "Night Shift | Menu Notes Build | nv-pass GPU after shots | $(date "+%Y-%m-%d %H:%M")" > "$LOCK"; done
(cd "$A" && timeout 600 npm run build 2>&1 | grep -i "error" | head -10) ; [ -f "$A/dist/index.html" ] || { echo "after build failed"; exit 1; }
(cd "$A" && E2E_GPU=1 E2E_PORT=4189 timeout 1500 node scripts/nv-shots.mjs "$OUT" "$SUF" epic,medium,min 2>&1 | grep -iv "\.png$" | tail -10)
echo "after done $(date '+%H:%M')"; freeport
(cd "$A" && E2E_GPU=1 E2E_PORT=4189 E2E_SUITE_TIMEOUT=600 timeout 900 node scripts/run-e2e.mjs e2e-darkness --jobs=1 2>&1 | tail -25)
echo "all done $(date '+%H:%M')"
ls "$OUT"/sheet-* 2>&1
