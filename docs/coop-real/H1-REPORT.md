# coop-real - H1 REPORT (harness core)

Builder: Opus, 2026-10-24. Branch `feature/cr-h1` (off feature/coop-real 436ecaf4, merged d626f05c: H2 + PLAN-CHECK).
Commits: H1a 968013f3 (boot, devices, probe, netdrop, `realBackground`), H1b c7241fdd (hash, sweep, knownBug), then the
smoke fixes and this report.

## Lifecycle probe
PROBE_RESULT

## Files
| File | Lines | What |
| --- | --- | --- |
| scripts/e2e-coop-real.mjs | ~125 | entry: `--part=N` runs `e2e-coop-real/partN.mjs` (exports `NAME`, `BOOT`, `run(h)`), no part = every part file present; dev parts `--part=probe`, `--part=smoke` |
| scripts/e2e-coop-real/lib.mjs | ~660 | H1a: boot, pump, `read`, devices, poll driver, walk / aim / fire, `pickRow`, menus, page life |
| scripts/e2e-coop-real/sweep.mjs | ~370 | H1b: hash, taps, prompts, expected-change table, control window, watchdog, sweep, KNOWN BUG |
| scripts/e2e-coop-real/probe.mjs | ~170 | the lifecycle probe (both flag sets) |
| scripts/e2e-lib.mjs | +12 | `BACKGROUND_FLAGS`, `launch({ realBackground })` (also `ignoreDefaultArgs`: Playwright adds the same three switches by default) |
| src/net/localTransport.ts | +15 | A6 `&netdrop=<s>` (1-60 s, else 60 s): `parseNetDrop`, `LOCAL_DROP_MS` |
| tests/localTransport.test.ts | +12 | `parseNetDrop` cases |

## Harness API (one line each)
lib.mjs
- `Q`, `PROMPT_S` (3), `BTN`, `sleep`, `until` / `waitSim` / `waitHostSim` / `LOAD_MS` (re-exported from e2e-net-lib).
- `run` / `fail(msg)` / `assert(cond, msg)`: the verdict; `assert` throws whatever E2E_NETSIM says.
- `read(P, fn, arg)`: the only page read a part file uses (PLAN-CHECK 11; K1 greps part files for `.evaluate(`).
- `bootPair(url, { netdrop, hideAutomation = true, realBackground, args })` -> `h` { browser, ctx, A, B, eA, eB, url, q, pump, close }.
- `startPump(P)` -> { pause, resume, stop }: `stepHeadless` only while P's rAF is idle (the visible host window).
- `inMatch(P, tag)`, `padReady(P)`, `gameErrors(h)`.
- Reads: `me(P)` (pos, cam yaw / pitch, speed, sim t, alive), `point(P, id)`, `pointIds(P)`, `ctxRows(P)`, `shotCount(P)`, `hostSession(A)`.
- Devices (`who` = 'pad' | 'kbm'): `hold(P, who, action, on)`, `holdUntil(P, who, action, cond, arg, what, ms)`, `tap(P, who, action)`;
  actions interact, crouch, jump, holster, coop, wheel, pause, up / down / left / right, confirm, back, fire, ads (+ kbm reload, swap).
- `drive(P, fn, arg, ms, what)`: a page-side controller run before each `input.poll` (pass-through wrapper), writing only `__pad`.
- `walkTo(P, who, [x, z], { tol, maxS, creep })`, `walkPath(P, who, pts, opts)`: closed loop (pad stick per poll / WASD + Alt).
- `aimAt(P, who, [x, y, z], { tol, maxS })`: camera ray onto a point (right stick per poll / mouse with measured gain).
- `fireOne(P, who)`: trigger / left button held until `shotCount` steps.
- `pickRow(P, who, re)`: A / E down, highlight stepped by D-pad / arrows, released (hold rows held until they run).
- `menuFocus(P, who, css)`, `pauseRestart(P, who)`: the pause menu's "Restart at checkpoint" and its confirm by input.
- Page life: `cdp(P)`, `lifecycle(P, 'frozen' | 'active')`, `hideBehind(P, front)` -> restore, `spoofHidden(P, bool)`,
  `reloadClient(h, { menu })`, `reopenClient(h, { menu })` (`menu`: the URL without autostart, for Michael's Rejoin / Join path).

sweep.mjs
- `knownBug(id, slice, { expect }, fn)`, `knownBugSummary()`: only a failed assert matching `expect` is the mark (PLAN-CHECK 9).
- `pageHash` / `hashState(P)` / `diffKeys(a, b, all)` / `VOLATILE` (`.pos`, `.alert`).
- `installTaps(P)` (again after a restart, reload or new page), `events(P, from)` (no bark / remoteShot), `tapMark(P)`, `audioLog(P, from)`.
- `prompts(P)`: context rows + world prompts (`hud.world.label`) + team prompt; `WORLD_PROMPT_INPUT`; `expectPrompt(P, re, what)` (presence).
- `expected(row)`: the expected-change table; `controlWindow(h)`: keys that move with no input; `runRow(h, P, who, re, { noise })`: the watchdog.
- `faceTo(P, who, yaw)`, `sweepStop(h, stop, { pages, variant, headings: 8, skip, done })`, `sweepVariants(h, stop, variants)`.

## Smoke
SMOKE_RESULT

## For H2 / C1 / C2 / K1
NOTES
