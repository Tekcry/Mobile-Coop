# hostage-gait fresh check (spare #10) - c581a9c4

**Verdict: PASS**

Scope read in full: diff `origin/master...c581a9c4` (6 files), `src/net/holdFeed.ts`, the coopHost seized loop (1170-1220) and `frameUpdate`, `tests/hostageGait.test.ts`, REPORT.md, CLAUDE.md Hard rules, `Enemy.holdAt` (enemy.ts:407), `GameLoop.frame` / `stepHeadless` (loop.ts), `RemoteAvatar.update`.
Run in a `git archive` scratch copy (C:/NightShift/scratch/hgc, node_modules junctioned).

## 1. holdFeed.ts correctness - OK
- Order matches the engine: `loop.frame()` runs fixed steps then `frameUpdate` once; `RemoteAvatar.pos/yaw` are only written in `update()` (frame), never in `RemotePlayer.update` (fixed). So all steps in a frame see one pose, and `holdClock.t` (set in `frameUpdate` with the same `now` the bodies are drawn at) is the right timestamp for it.
- First packet / hold start: `start()` feeds the raw point, returns false - same first placement as master. Clock not ready -> lead 0.
- Velocity: dx / (render time between distinct poses), guarded `el > 1e-4`, capped 9 m/s (`Math.sqrt` only when v2 > 81, so no /0).
- Still frame -> velocity 0 at once; `HOLD_STALE` 0.15 s fallback; lead clamped [-0.05, 0.1] s.
- Teleport (> 1 m): `start()` + return true; coopHost sets `e.pos` first so `holdAt` sees no move (no spike).
- Release / grab flicker / non-hostage seized step: `s.hfOn = false` -> next hostage step restarts at the raw point. Release deletes the record; re-seize spreads a fresh `holdFeed()`.
- Partner disconnect: existing `release` loop (coopHost.ts:398) unchanged.
- Host vs client: host only (`coopHost.ts`); client `remoteHeld` and host's own `takedownController` untouched.
- Pause / hitch / 4-step backlog drop: `HoldClock` re-anchors when the offset moves > 0.1 s.
- NaN: no path produces NaN from finite inputs.

## 2. Wire - OK
`src/net/protocol.ts` not in the diff; `PROTOCOL_VERSION = 31`. No message shape touched.

## 3. Hot-path allocation - OK
`stepHoldFeed` and `HoldClock.frame/at` allocate nothing (scalar fields on the seized record). The only allocation is `{ ...holdFeed() }` at seize time (event, once per takedown). The `enemies.find((x) => ...)` closure in the seized loop is pre-existing, not added here.

## 4. Static-import rule - OK
`grep -rn "holdFeed|HoldClock" src tests`: only `src/net/coopHost.ts:21` and `tests/hostageGait.test.ts:2`.

## 5. Numbers and test strength - OK
`timeout 900 npx vitest run tests/hostageGait.test.ts`: 10/10 pass. Printed table matches REPORT.md exactly:
- 30 fps jitter: gait CV 0.146 -> 0.004, mean 1.118 -> 1.401, max frame-to-frame 0.838 -> 0.011.
- 30 fps exact: mean 1.103 -> 1.400. 45 j: CV 0.154 -> 0.003. 60 j: CV 0.090 -> 0.010.
- Stop latency after 0.067 / 0.089 / 0.100 s; jump peak 41.9 -> 1.445 (30 fps), 1 snap each.

Proof it encodes the bug: ran a scratch copy of the test with `stepHoldFeed` replaced by a pass-through (master behaviour: feed = drawn point). Result: 6 failed / 4 passed - all 30 / 45 fps cases, 60 fps jitter, and the jump test fail (e.g. `expected 1.006 to be less than 0.06`, `expected 0 to be 1` snaps). The 4 that pass are 60 fps exact (no bug there), stop, small step, print. After-asserts are tight (gait CV < 0.03 jitter / < 0.01 exact, |mean - 1.4| < 0.03, lag < 6 cm), master values (CV 0.146, mean 1.118) would fail them on their own.

## 6. Static checks and neighbouring tests - OK
- `timeout 900 npx tsc --noEmit -p .`: exit 0.
- `npx eslint src/net/holdFeed.ts src/net/coopHost.ts tests/hostageGait.test.ts`: exit 0.
- `tests/coopFix.test.ts` 13/13, `tests/coopTorches.test.ts` 12/12, `tests/committedMoves.test.ts` 7/7 (single files).

## Required fixes
None.

## Polish list
1. The test replays coopHost's call order with holdFeed and a copied `Held` (holdAt ease); nothing exercises `coopHost.fixedUpdate` itself. A drift in either copy would not be caught (REPORT open item notes the holdAt copy).
2. The steady tests assert `before.fedCv > 0.4` but not `before.gaitCv` high in the jitter cases; adding `expect(before.gaitCv).toBeGreaterThan(0.08)` for jitter rows would pin the "before" half of the claimed spread.
3. When sim time and render time run at different rates (`loop.timeScale` slow-mo beat, gameState.ts:2941; `stepHeadless` in bots / e2e, which advances sim faster than `performance.now()`), the 0.05 smoothing lags and `HoldClock` re-anchors every few frames. Error is bounded by the lead clamp (<= ~0.1 s x speed, ~14 cm at walk, then eased), so not a blocker; worth a one-line note or an e2e-netmove look on the laptop.
4. A fast in-place turn that swings the GRAB offset point > 1 m in one frame snaps instead of easing (same visual as master's spike case, minus the spike); fine, just undocumented.
5. changes/ line says "within 1%" - 60 fps jitter after is CV 0.010 (exactly 1%), the fed CV there is 1.2%.
