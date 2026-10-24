# Co-op e2e boot wait
kind: patch
- e2e: `launch` / `openPage` (`scripts/e2e-lib.mjs`) no longer wait 120 s for the match on the page that hosts a
  `?net=local&autostart=...&mode=course|sector` room: that match starts only when the second page joins, so the wait
  ends once the page hosts alone in the lobby. Saves about 2 minutes per boot in e2e-ctcourse (each of its 4 parts),
  e2e-course (the walk URL) and e2e-bunker.
