# coop-real - H1 REPORT (harness core)

Builder: Opus, 2026-10-24. Branch `feature/cr-h1` (off feature/coop-real 436ecaf4, merged d626f05c: H2 + PLAN-CHECK).
Commits: H1a 968013f3 (boot, devices, probe, netdrop, `realBackground`), H1b c7241fdd (hash, sweep, knownBug), then the
smoke fixes and this report.

## Lifecycle probe
NOT RUN (2026-10-24 23:26 - 2026-10-25 00:06): desktop CPU stayed at 77-100% through the whole ~40 min gate window (a
Blender guard bake under heavy.lock plus the session agents), never under the 60% start gate. No pick yet: B1 / B2 stay
open. Run `e2e-coop-real:probe` (see "Smoke" for the command) the first time the desktop is under ~60%, or on the
laptop GPU slot (4189).
What the probe prints: one `PROBE {...}` line per mechanism, per flag set (`e2e-default`, `realBackground`): `vis`,
`focus`, `rafHz`, `ivHz` (100 ms setInterval), `wkHz` (100 ms worker), `bcHz` (BroadcastChannel posts from the other
page), `bgHz` (the game's bgTick worker), `simX` (sim s per wall s), `evalWhileOn`, `hostRemotes`. Mechanisms: baseline
client / host, spoofed `document.hidden`, focus emulation off + host `bringToFront`, a new window over the client
(`Target.createTarget newWindow`), CDP `frozen`, hidden + frozen, frozen 10 s past `netdrop` 8 s (then
`PROBE-AFTER-DROP`), host hidden with the pump off. Pick rule (PLAN 77-86): B1 = visibility hidden, `rafHz` ~0,
`ivHz` > 0; B2 = `frozen` with `ivHz` = `wkHz` = `bcHz` = 0. Expected, NOT measured: B1 = focus off + bringToFront under
`realBackground` (`lib.hideBehind`), B2 = CDP `frozen` (`lib.lifecycle`).

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
NOT RUN, same reason (CPU gate). Static checks pass: `node --check` on scripts/e2e-coop-real.mjs,
e2e-coop-real/{lib,sweep,probe}.mjs and e2e-lib.mjs; `npx vitest run tests/localTransport.test.ts` 3 / 3. `dist/` is
current (built 22:28, carries `netdrop`), so no build is needed before the run.
Smoke asserts (`smoke()` in scripts/e2e-coop-real.mjs): both pages boot by URL (client netsim on, webdriver false);
client `walkTo` by stick ~6 m toward A1-mid (<= 0.3 m); a `runRow` (pickRow + watchdog) on the nearest item on each page
(client pad, host kbm); `aimAt` by stick (client onto the host's head) and by mouse (host 100 deg right); one ADS shot
each (`fireOne { ads: true }`); host `pauseRestart` by keys with the client still in the match; no console errors. The
last three go past PLAN's H1 column (boot, one walkTo, one pickRow): if only they fail, H1 passes on the first three and
the failure is a note for C1.
Command (in the worktree, port 4189 freed, heavy2.lock held):
`E2E_PORT=4189 E2E_GPU=1 E2E_JOBS=1 node scripts/run-e2e.mjs e2e-coop-real:smoke --serial` (the runner adds
`E2E_NETSIM=typical E2E_NETSIM_GATE=1`; `:probe` the same way). BelowNormal: start it from a node that called
`os.setPriority(0, 10)` (children inherit the class).

## For H2 / C1 / C2 / K1
- Use only the lib / sweep names in "Harness API"; part files read pages through `read(P, fn)` only (K1 greps part files
  for `.evaluate(`). Boot is `bootPair(url, BOOT)`; the entry runs `installTaps` on both pages before `run(h)`; reinstall
  after a restart, a reload or `reopenClient`.
- Untested until a smoke or part run: co-op `pauseRestart` (focus moved by `right` until "Restart"; selector
  `.pause-screen [data-key="restart-checkpoint"]`); `fireOne(P, who, ms, { ads: true })` (waits `player.ads`, 3 s); a pad
  RT tap knockout (no helper: `hold(P, 'pad', 'fire', true)`, `until` the takedown, release); the keyboard `faceTo`
  (Alt + W nudge); `mouseAim` past the viewport edge (mouse positions are not clamped to the viewport).
- C1 sweep follow-up: rows that re-collect after a row (an "Open door" becomes "Close door") are new keys and run once
  more; a modal view `leaveModal` (crouch, then stick back, never Esc) cannot leave only logs. Check both at the first A1
  stop before trusting the sweep's counts.
- C2: B1 / B2 helpers are `hideBehind(P, front)` (returns restore) and `lifecycle(P, 'frozen' | 'active')`, pending the
  probe pick; `bootPair({ netdrop, realBackground })`; never `evaluate` on a frozen page (it blocks until resumed). A
  hidden co-op page opens its pause menu (`App.onVisibility`, src/core/app.ts:319-330), which B1's "closes by B" covers.
  `reloadClient` / `reopenClient` with `menu: true` land on the main menu for the Rejoin row by pad.
- H2: the dev parts run through the runner as `e2e-coop-real:probe` / `:smoke` (not in PARTS or e2e-times.json).
- K1: src/net/localTransport.ts:10-22 puts `LOCAL_DROP_MS` / `parseNetDrop` between `createLocalTransport`'s doc
  comment (the netsim paragraph) and the function; move the comment down the next time the file is touched (cosmetic).
