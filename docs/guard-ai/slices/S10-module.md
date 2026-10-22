# S10 module: talking pairs (guard-ai, 2026-10-23)

Pure module only (no Babylon / DOM), not wired in yet (GA2, the `SectorGuard.pair` tag, ENGINE.md section 7). Files:
- `src/ai/pairs.ts` - `PairMeet`, `stopWindow`, `pairWindow`, `PAIRS`, `PAIR_LINES`.
- `tests/pairs.test.ts` - 13 tests (they drive two real `PatrolWalker`s on timed loops).

## API
- `stopWindow(route, stop, speed, out: LoopWindow): boolean` - the loop-time stay at a stop of a timed loop:
  `open` = previous stop's `leave` + walk (distance / speed), `close` = this stop's `leave`. False without `loop`.
- `pairWindow(routeA, stopA, routeB, stopB, speed, out): boolean` - the overlap of both stays in A's loop time (B moved
  by `t0B - t0A`; both walkers made at the same moment). False when a loop is missing, the periods differ, or no
  overlap. Load time only (allocates two small objects).
- `PairDef` = `{ id, period, t0 (A's loop.t0), open, close (A's loop time, may wrap), aPt, bPt, lines? }`.
- `new PairMeet(def)`; inputs `pm.a` / `pm.b` (`PairGuard`: `present`, `calm`, `x`, `z`, `routeX`, `routeZ`), filled
  every tick; `step(dt)` keeps its own loop clock (same formula as `PatrolWalker.loopNow`).
- States `idle -> waiting -> meeting -> done -> idle`; `interrupted` (rest of that window); `missing` (held until
  `reset()`).
  - waiting: the window opened; both at their meet points (`meetR` 1.5 m) and calm -> meeting. Window closes without
    that -> done (no talk this loop).
  - meeting: `faceA` / `faceB` (yaw, 0 = +Z, toward each other; NaN otherwise). Lines at 1.0 s and 4.2 s
    (`firstLine`, `lineGap` 3.2), done 2.5 s after the second (`linger`), or as soon as one is > `leaveR` 2.5 m from
    his point (his schedule walks him on: they split).
  - `interrupt()` or either guard present but not calm -> interrupted (no request).
  - one not present (dead, KO, held, despawned) while the other is present and calm for `grace` 6 s from the window
    opening -> missing: `requested` true on that step only, `lookFor` (0 = A, 1 = B: the one who goes), `lookX` /
    `lookZ` = the partner's last `routeX/Z` while he was present (the route point he was at or heading for). If he
    vanishes mid-talk unseen, the grace counts from then. Both down: done, nobody asks. Partner back before the
    grace: no request, they meet late.
- Outputs per step: `sayWho` (0 / 1 / -1) and `sayLine` (a table string, never built), `linesSaid`, `meetings`,
  `exchange` (index).
- No randomness (G143, A7): exchange = `(id + meetings) mod N`, the opener alternates by meeting count (A first).
  No allocation in `step`.

## Lines (`PAIR_LINES`, 8 exchanges, each line <= 90 chars, British, calm, voiceable)
Original small talk, each with something overheard a player can use. A pair may pass its own `lines` (map intel, e.g.
the real keypad code of that site, SPEC "Coffee pair ... the keypad code").

| # | Opener | Reply | Player info |
| --- | --- | --- | --- |
| 0 | Store-room door's sticking again. Have to put a shoulder to it. | Log it. Facilities might get round to it by spring. | a door that sticks (noisy) |
| 1 | They changed the keypad code on the lab wing again. | Same as before, last digit up one. Every single time. | a code habit |
| 2 | Relief was meant to be here at four. | They pushed the change to quarter past. Nobody told you? | shift change |
| 3 | Camera over the loading bay's been dead since Tuesday. | Ticket's open. Nobody touches it before the audit. | a dead camera |
| 4 | Did you hear the generator cough just now? | Does it every night round three. Lights dip, then it settles. | a timed light dip |
| 5 | Supervisor wants the north stair checked twice an hour. | Once, if he's not watching. It's a long stair. | a lax check |
| 6 | Courier's due at three. Who's signing for it? | Gate signs, we carry. Same as always. | courier time |
| 7 | Service lift is stuck on two again. | Take the back stairs, then. Nobody's fixing it tonight. | route hint |

Humour stays dry and only in calm (story.md: none while alert; the talk only runs while both are calm).

## Tests (`npx vitest run tests/pairs.test.ts`: 13 / 13 pass)
- Table: 6-10 exchanges, two lines each, every line 1-90 chars.
- `stopWindow` / `pairWindow`: walk + leave maths, t0 shift, period mismatch refused.
- A pair meets, faces each other (A +X, B -X), says its two lines in order 3.2 s apart inside the window, splits, back
  to idle.
- Deterministic: same inputs same lines; another pair id picks another exchange.
- Three loop periods: one meeting each, exchanges id, id+1, id+2, opener alternates.
- `interrupt()` after the first line: no second line, interrupted; they meet again next loop.
- A guard leaving calm mid-talk: interrupted, no missing request.
- B taken out on his way: no lines; missing with `lookFor` 0 at B's meet stop, fired at window open + 6 s (+-0.3).
- The request is a one-step edge; `reset()` lets the pair meet again.
- Partner down briefly (< grace): no request, they still talk.
- Both down: no request. A window that wraps past the period opens each loop.
- `npx tsc --noEmit -p tsconfig.json`: clean. `eslint` on both files: clean.

## What integration must wire (later, not done here)
- **Build the pairs at fill** (`sectorMode.fill` or a guard-ai hook): for each `SectorGuard` with `pair` (index into the
  section's `guards`), one `PairMeet` per pair (skip the mirror entry), id = section x 100 + the lower index. The
  meeting stop per guard: the route point nearest the partner's route (or a new optional data field if Course Ready
  prefers explicit stops; agree by message). `pairWindow(routeA, stopA, routeB, stopB, walkSpeed x patrol pace 1.1)`;
  no window (no `loop`, period mismatch, no overlap) -> no pair, log it in `checkSectorGuards`.
- **Each tick** (`EnemyManager`, after the guards move): fill `a` / `b` (`present` = alive and not KO / held;
  `calm` = alert state calm and no board task; `routeX/Z` = `route.points[walker.idx]`), `step(dt)`.
- **Facing**: while `state === 'meeting'` override the paused guard's `lookYaw` with `faceA` / `faceB` (the walker
  holds them at the stop until `leave`; the design keeps `faces` in the route data as the fallback, A16).
- **Barks**: `sayLine` through the existing callback `ctx.onBark(enemy, line, false)` (spoken, not radio; same path
  as `Enemy.bark`, which only takes `BarkEvent`s): add `Enemy.sayLine(text)` that skips the voice table. The speaker is
  `sayWho`. Subtitles for overheard lines only within earshot of a player if the bark layer has a range.
- **Disturbance**: call `interrupt()` when either guard perceives anything (incident board ack, suspicious) - the calm
  check already catches state changes; `interrupt()` covers a look that does not change state.
- **Missing**: on `requested`, `board.report('missing', lookX, lookZ, y, key, who, 1)` (`key` = a dedupe key, e.g.
  the missing guard's `Enemy.num`, or -1 = by place) with `who[0]` = the present guard's id, so the board sends him (and the nearest calm second guard, G11 pair) to look; his
  `Enemy.bark('missing')` already runs from the board command. Then hold the pair until the partner is up again
  (`reset()` after a KO wake), or drop it.
- **Takedown beat (G190)**: the meeting is the double-takedown window (co-op: one each); the e2e (e2e-sectorops) plan
  row S10: a pair meets, talks, splits; take one before the meeting and the other searches.
- Out of scope here: no wire change (host-only state; clients see the barks and facing through the existing bark and
  pose sync).
