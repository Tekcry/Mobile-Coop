# anim-natural N0: the full animation audit (docs and scripts only)
kind: patch
- `docs/anim-natural/AUDIT.md`: every animation scored against the realism standard (pass 1 and pass 2), with the fix
  list that N1-N4 build from; `PASS2.md`: the pass 2 reruns and the N0 leftovers (rows 29 / 39 / 49: script problems,
  no game bug); GPU contact sheets and `metrics.json` in `docs/anim-natural/audit/`.
- `scripts/anim-natural/audit.mjs`: the audit driver (studio loops, proving rows, pass 2 rows, per-row metrics and
  `ev` move summary; `NAT_PORT` for a software-GL logic check). Stage lights never include shared part bases, which lit
  every instance in the scene. No game change.
