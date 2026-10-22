# S3 - Radio net module (implementer report, 2026-10-23)

Spec: `BRIEF.md` M1, M4, M5, goal 5, A6, A7; `PLAN.md` row S3; `research/tactics-design.md` sections 5 and 7.
Scope of this step: the pure module and its tests only. No existing file was edited; integration (enemy.ts,
enemyManager.ts, sectorMode) is a later step.

## Built
- `src/ai/radioNet.ts` (new, pure: imports `hyp3`, `hearing.ts` and `GV_DOWN` / `GV_HELD` + `type GuardView` from
  `incidents.ts`; no Babylon, no `Math.random`, fixed pools).
- `tests/radioNet.test.ts` (new, 19 tests).

## API
- `RADIO` table: `voice` 12, `callIn` 2.5, `report` 4, `staggerBase` 0.6, `staggerStep` 0.5, `staggerDist` 0.02,
  `staggerMax` 4.5, `queue` 64. `RADIO_CALLS` 16 (open calls per section, fixed pool).
- `CallKind` = `'contact' | 'body' | 'ko' | 'light' | 'standDown' | 'missing' | 'command'`; `CALL_KIND` (codes).
- `RadioSink { deliver(guard, inc, kind, caller); alarm(section, caller) }`: one object the manager keeps (no closure
  per tick). `guard` and `caller` are stable guard ids (`GuardView.id` = `Enemy.num`), not view indices, because the
  manager drops dead guards from its list between ticks and queued deliveries outlive a tick.
- `new RadioNet(section = 0)`, one per section. Fields: `now` (clock, advanced by `tick`), counters `completed`,
  `lost`, `refused`, `dropped`, `alarms`, `delivered`; getters `openCalls`, `queued`, `commandOpen`, `scratchCap`.
- `startCall(caller, inc, kind, holdS, now = this.now)` -> call id (> 0) or -1. Refused: a `command` call while one is
  already open in this net (one command call per section), or the call pool full. Same caller + inc + kind already
  open -> that call's id (no duplicate). Nothing is sent until `holdS` has passed.
- `cut(caller)` -> calls lost. Drops every open call of that caller (nothing sent, no alarm). Already completed calls
  are not recalled (they got through).
- `tick(dt, view, sink, reaction = null, section = null)` at 10 Hz:
  1. completes due calls (due order, ties by call id). Safety net: a caller missing from the view or flagged
     `GV_DOWN` / `GV_HELD` at completion loses the call.
  2. `command` -> `sink.alarm(net.section, caller)` once, no receivers (it goes to command). Other kinds queue every
     other live guard of the section (not `GV_DOWN`; `section[i] === net.section` when the lane is passed, else the
     whole view) by 3D distance from the caller, ties to the lower view index. Receiver of rank r at distance d hears
     `min(staggerMax, staggerBase + r * staggerStep + d * staggerDist) * reaction[i]` s after the call completed.
     The same receiver + inc + kind is queued once (earliest due kept).
  3. delivers due entries (due order, ties by queue order); a receiver gone from the view, now `GV_DOWN`, or now in
     another section is skipped.
- Lanes (proposal): `reaction: Float32Array` by view index = `diff.reaction x (buff ? ARCHETYPE.officer.reaction : 1)`
  (the old `callAlert` factor, no random term); `section: Int16Array` by view index = the guard's section. Both
  optional; the manager keeps them beside its `GuardView` and grows them with it. `GuardView` is reused unchanged.
- Helpers: `callHold(kind, reaction)` = `command` 4 s else 2.5 s, x reaction (pass the caller's reaction lane value,
  which already holds the officer factor); `staggerDelay(rank, dist, reaction)`; `hearsVoice(dist, walls, ambientDb)`
  = hearing tier >= 2 for a 12 m reach (6 m open, 2.7 m through one wall, 1.5 m by a 12 dB generator).
- Overflow: the 64-entry queue REFUSES new entries when full (the farthest receivers of the newest call miss it),
  counted in `dropped`; nothing queued is lost. Calls past 16 are refused (`refused`).
- Allocation: none per tick; the only growth is the sort scratch (doubling) when a bigger view arrives.

## Numbers in play (reaction 1)
8 receivers at 1.5-22 m: delays 0.63, 1.16, 1.72, 2.30, 2.88, 3.42, 3.98, 4.50 s after the 2.5 s call, so the
section learns over ~3.9 s, nearest first, at 10 Hz ticks never two on the same tick. A rookie (reaction 1.35) can
exceed 4.5 s (the cap is applied before the reaction factor, as specced).

## Tests (`npx vitest run tests/radioNet.test.ts`: 19 passed)
Distance order; 8 receivers within staggerMax (+ one tick) and strictly rising times, ~4 s spread; equidistant ties
to the lower index; nothing delivered or queued before completion; reaction lane scales delays; down guards not
queued and a receiver who goes down before his turn skipped; dedupe of receiver and of a repeated call; cut before
completion = nothing and no alarm; caller held at completion = lost; cut after completion does not recall; command
call -> alarm exactly once, nobody queued; second command call refused while open, allowed after; only the caller's
section hears and the other section's net stays empty; queue overflow refuses 32 of 96 and delivers 64; call pool
refuses past 16; 1000 idle ticks grow nothing (same arrays, scratch cap unchanged, nothing queued); two runs give
identical deliveries; `callHold`, `hearsVoice`.
`npx tsc --noEmit -p tsconfig.json`: clean. `eslint` on both files: clean. `npm run check` / e2e not run (by brief).

## What integration must wire (later step)
- Owner: `EnemyManager` (or `guardBrain.ts`) holds one `RadioNet` per section (Sector Ops: the live section only, one
  net with `section` = the loaded `SectorDef` index, `clear()` + set `section` on `sectorMode.loadSection` /
  `unloadSection`; other maps: net 0, or one per `MapLayout.guardAi.zones` entry, A6) and one `RadioSink` object.
  Tick it at 10 Hz from the per-step loop with the same `GuardView` the board fills, plus the `reaction` and
  `section` lanes.
- `cut(e.num)` from: `Enemy.die` (dead and KO: `knockOut` goes through `die(h, false)`), `Enemy.beginTakedown`
  (grab / choke / hostage / interrogation), `Enemy.blind` (flashbang), and `EnemyManager` despawn / remove (Sector
  unload). Simplest: one `ctx.radioCut?(this)` call at the top of each of those.
- `AiContext.callAlert(e)` (enemy.ts: the loud-alert path and the `radioT` expiry at the 2.5 s call-in) -> today it
  fans out at once with `Math.random`. New: the sighting path calls `startCall(e.num, inc, 'contact',
  callHold('contact', reaction(e)))` at the moment of the sighting (replacing `radioT` as the timer: the net owns
  it), and `sink.deliver(.., 'contact', ..)` calls `o.radio(0)` / `alert()` with the shared LKP. The loud-alert path
  (gunfire, a hit) can start the same call (still needs the caller alive for 2.5 s) or keep the immediate fan-out
  restricted to the section; decide at integration. `EnemyManager.RADIO` 22 m stops being a range (section membership
  replaces it); the 0.4 + d * 0.03 + `Math.random() * 0.3` delay goes.
- `AiContext.shout(e)` (8 m `ALERT.shout`, `Math.random` 0.3-0.6 s): replace with `hearsVoice(d, walls, ambientDb)`
  per guard (one wall ray only when `wallMatters`), delivered at once (+0.3 s fixed). Voice ignores sections.
- Command call (S6): after a contact call completes, the caller (or a live officer in voice range) starts
  `startCall(num, inc, 'command', callHold('command', reaction))`; `sink.alarm(section, caller)` ->
  `EnemyManager.raiseAlarm` path (one per section load). If refused (-1), one is already open. If the caller is cut,
  the next guard in combat tries after 3 s (S6 logic, not in this module).
- Other kinds: `body` (S4 dead report -> aware + held caution on deliver), `ko` / `light` / `standDown` (ack bark),
  `missing` (S2 escalation line). Barks: the caller's `callIn` / `deadReport` / ... bark at `startCall`, receivers'
  `ack` on deliver (`BarkVoice` limits stay).
- The incident id `inc` is the board's id (`IncidentBoard.report` return); contact calls with no incident yet can use
  a fresh board `contact` incident or -1 (dedupe then merges all -1 contact calls per receiver, which is wanted).

## Skipped / open
- No relay (kept by design). Voice delivery itself is integration (hearing.ts + rays), only `hearsVoice` is here.
- e2e: e2e-stealth-ai (radio, radio window) and e2e-sectorops change only at integration.
