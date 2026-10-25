# Route-run harness core (one robot)
kind: patch
- Route-runs (J13 R4a, test tooling only): `node scripts/route-run.mjs <url> --graph <files>` walks a robot through every
  planned route of a map against its live guards, headless, with the pad, in game time, and writes the run log,
  `route-run.json` and a plain `REPORT.md` (detections and notices with their inferred cause, dead stops with a
  screenshot, stubbed links). `--dry-run` prints the plan without a browser, `--routes code` walks the map's own Sector
  Ops routes, `--selftest` checks a fixture's expected outcomes, `--publish` / `--merge` carry laptop results to the
  desktop through the `route-run-results` branch. Caller query params such as `?campusv2=2` stay on every page. One robot
  for now; the pair, course drill gates and real link moves follow (R4b, R4c, R5).
