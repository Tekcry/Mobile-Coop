# Auto-train audit fixes
kind: patch
- Auto-train queues one laptop rerun of the failed suites when the desktop worker fails a train
  (`laptop-e2e` "desktop: ...; FAIL: a,b"): `request.mjs --train-rerun`, set `train<n>-rerun`, state `laptop-rerun`,
  one request per train head (recorded in the status JSON); a laptop pass releases as usual (audit 2026-10-24).
