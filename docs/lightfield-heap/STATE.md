# lightField heap check under load - state

**Now (2026-10-19 23:05):** done. The 5 loaded runs on the final code passed; PR to master open. The orchestrator
sets the version and merges.

**Verification on the final code** (8800152a = e0984128 + this STATE; laptop, BelowNormal, port 4191,
`E2E_JOBS=1`, laptop `heavy.lock`, `node scripts/run-e2e.mjs e2e-menus` running alongside from
`Mobile-Coop-testrun`):
| Run | `npm run check` | unit run | e2e-menus (load) | lightField `--silent=false`: levelAt / bodyLevel / control B a query |
| --- | --- | --- | --- | --- |
| 1 | PASS 152 s | 1780 passed, 14.7 s | ok 108 s | 32.4 / 113.2 / 273.0 |
| 2 | PASS 157 s | 1780 passed, 78.5 s | ok 118 s | 32.4 / 113.2 / 273.0 |
| 3 | PASS 173 s | 1780 passed, 84.3 s | ok 127 s | 37.2 / 122.8 / 277.8 |
| 4 | PASS 159 s | 1780 passed, 13.0 s | ok 118 s | 32.4 / 113.2 / 273.0 |
| 5 | PASS 177 s | 1780 passed, 48.4 s | ok 142 s | 32.4 / 113.2 / 273.0 |

5/5 PASS. The unit run inside `npm run check` ran under the load each time; the e2e-menus load ended before the
build finished, so the standalone lightField reading after each check ran unloaded.

**Next:** none for this job. Open: none.

## Resume prompt
```
lightField heap fix: RESUME. Folder C:/NightShift/Mobile-Coop-lightfield-heap, branch feature/lightfield-heap (pushed).
Read CLAUDE.md, then docs/lightfield-heap/BRIEF.md and docs/lightfield-heap/STATE.md, and follow STATE "Next".
Laptop rules: heavy work one at a time with C:/NightShift/heavy.lock, E2E_JOBS=1, BelowNormal priority, port 4191,
headless, no GPU or visual checks; tests only, never game code. Laptop runner requests from CT Core, then Menu Notes,
then Sector Ops come before this job. Report to "Night Shift | Orchestrator" when the PR is open or if blocked.
```

## Done
- 2026-10-19: 5/5 loaded `npm run check` runs on the final code (8800152a) PASS; PR to master.
- 2026-10-19: e0984128: the control's rounds are 2000 queries (about 0.5 MB, under the 1 MB minimum semi-space).
- 2026-10-19: d5cf34fc: every reading keeps its smallest round; the control's vector escapes into a 64-slot ring (a
  fully optimized control read 63 B and failed the relative check, 32.38 < 30.73).
- 2026-10-19: 6016e700: small rounds, up to 40 with 25 ms yields.
- 2026-10-19: branch off master fca0e267; BRIEF.
