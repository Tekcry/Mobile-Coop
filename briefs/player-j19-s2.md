status: open

# Brief: player-batch-j19 S2 - Palm strike recovery (Player Build)

Lead: Night Shift | Player Build, 2026-10-26. Job J19 player-batch-j19, slice S2, row R8 (Michael Q34 / M1: "About
1.4 s"). Animation timing in `strikeBody.ts` plus one constant, unit and headless-rig tests. **Opus builder**: this is
animation code; follow the steps exactly. Every value, curve and assertion below is settled; anything this brief does
not settle is `status: blocked`, not a guess.

## Read first
- Plan: `git show origin/feature/player-batch-j19:docs/player-batch-j19/PLAN.md` ("How it works today" R8, "Design per
  row" R8, "Mixamo hand-offs", "Slices" S2, "Test plan"). Its line numbers are master 38e92f5d3's: use the lines below.
- Brief: `git show origin/feature/player-batch-j19:docs/player-batch-j19/BRIEF.md` M1 (Q34), "Limits" (Player /
  animation AT CAP: R8 is a rule fix to a shipped move, ships on, no flag).
- Mixamo context: `git show origin/master:docs/mixamo-retarget/I5-REPORT.md` ("Readings": both strike rows are off,
  a forearm 36.5 / 54.8 deg in a frame against the cap 34.1, from the take's 18 / 17 frames to contact squeezed onto
  the arc's ~4 frames before contact).
- Hard rules: `git show origin/master:CLAUDE.md` (hot paths allocate nothing; strict TS). Cloud rules:
  `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions").

## Base and branch
- Base `origin/master` at `29f03b6c004bf8dae66eea9c434160b6b1db061c`. New branch `feature/player-j19-s2` from it;
  push `origin feature/player-j19-s2` only (no force, no master merge, no rebase, no other branch). `npm ci` once.
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/player-j19-s2`.
- Open PRs, so both merge cleanly:
  - #494 (`feature/mixamo-on`, e39da5fd9, base 29f03b6c0) touches none of this slice's files.
  - #498 (`feature/mixamo-source-wire`, df214492f) has an old merge base (3f0ab7fec), so its diff re-adds I5's
    `strikeBody.ts` hunk, already on master: the `strikeBodyAt` doc comment, signature and `k` paths, master
    `src/anim/strikeBody.ts:203-216` (the `k <= 0` path is `:209`, not ~:475). It also carries
    `tests/mixamoCarryStrike.test.ts` and edits `animGraph.ts` `strikeShot`, `mixamo.ts`, `characterRig.ts`,
    `remoteAvatar.ts`. Make **no edit in `strikeBody.ts` below line 130** (lines 131-256 byte-for-byte), and do not
    touch `tests/mixamoCarryStrike.test.ts` (read and run only).

## Files (only these)
- `src/game/elbowStrike.ts`
- `src/anim/strikeBody.ts` (lines 1-130 only)
- `tests/elbowStrike.test.ts`
- `tests/animN4cStrike.test.ts`
- `tests/animN4dKill.test.ts`
- `tests/strikePops.test.ts`
- `changes/feature-player-j19-s2.md` (new)
- Read only (import in tests, never edit): `src/anim/clips/mixamo/elbow_strike.ts`, `src/anim/clips/mixamo/cross_punch.ts`.

Not: `src/game/strikeController.ts` (S3's), `src/net/**`, `src/player/**`, `src/anim/animGraph.ts`, `src/anim/mixamo.ts`
(the Mixamo lead's: the strike rows stay as they are), `src/anim/animSource.ts`, `scripts/**` (`anim-audit.mjs` is S5's),
`docs/**`, `tests/mixamoCarryStrike.test.ts`, `tests/helpers/**`, any other test. A problem in another file goes in the
report, not fixed.

## What is there now (master 29f03b6c0; re-found)
- `src/game/elbowStrike.ts`: header `:2-3` ("the 0.9 s timeline"); `STRIKE.hitAt` 0.08 `:14`; `:15-16` `recover: 0.6`
  (doc: "free about 0.6 s after contact (F1b; the footage / loco M25 had 1.4)"); `whiffRecover: 0.3` `:18`; `:34-35`
  `STRIKE_DUR = STRIKE.hitAt + STRIKE.recover` (0.68); `:37` `STRIKE_WHIFF_DUR` 0.38; `strikeStage` `:79-83`,
  `strikePhase` `:85-87` (time-linear over `STRIKE_DUR`).
- `src/anim/strikeBody.ts`: header `:1-34` (M1 paragraph `:23-29`, n4d `:30-33`); `STRIKE_ARC_CONTACT` 0.56 `:41`;
  `STRIKE_HIT_PH` `:42-43`; `STRIKE_ARM_LAG` 1/60 `:44-47`; `STRIKE_WARP_PH` `:48-49`; `strikeWarp(ph, hitPh =
  STRIKE_WARP_PH)` `:51-62` (linear either side of the arc's contact: after contact the 0.44 of arc over 0.617 s, 0.7135 /
  s); `KillBlow` doc `:64-75`; `killWarp` `:91-99`, calling `strikeWarp(..., b.hit)` at `:98`; the arc timing constants
  `:121-129` (`REC_FROM` 0.62 `:126`, `REC_LEN` 0.38 `:127`).
- Consumers of the strike's timing, read only: `strikeController.ts:63` (`ph` = `strikePhase(t + lead)`), `:197` (ends
  at `STRIKE_DUR`, a whiff at `STRIKE_WHIFF_DUR`), `:200` (`pose.melee = strikeWarp(this.ph)`); `moveState.ts:439` and
  `remoteAvatar.ts:604` (`strikeWarp` of the wire's `ph`); `coopHost.ts:1236` (a client's strike record ends at
  `STRIKE_DUR`; the hit at `:1246`): the host follows `STRIKE_DUR` by itself, no wire change.
- The arc's curves (read only): `animGraph.ts:204-206` `meleeHandW`, `:214-216` `meleeSweep`, `:220-222` `meleePoleW`,
  `:1885` the overlay's `wStrike`, and this layer's `rest` (`strikeBody.ts:223`): all hold still from the arc's contact
  (0.56) to 0.62 and return on one smoothstep over arc 0.62 -> 1. `animGraph.ts:2436-2452` `strikeShot` fits a Mixamo
  strike take to the arc (contact on 0.56, linear either side), so a Mixamo strike follows whatever timing the arc has.
- Mixamo rows: `src/anim/mixamo.ts:120` `elbow_strike: false`, `:124` `cross_punch: false` (PR #493, I5).
- Tests on the old timing: `tests/elbowStrike.test.ts:6`, `:31-40`; `tests/animN4cStrike.test.ts:222`, `:226`
  (`strikeWarp` with a second argument); `tests/animN4dKill.test.ts:37-49` (same), `:391` (`k <= 70`: a 0.68 s strike);
  `tests/strikePops.test.ts:48-105` (the rig harness, `n` from `STRIKE_DUR` at `:82`).

## Design (settled; do not change any value)
The strike frees 1.4 s after contact: `STRIKE.recover` 1.4, `STRIKE_DUR` 1.48 s. The arc (the `melee` pose input) is
timed in seconds, `t` into the strike (`t = ph * STRIKE_DUR`), in four parts:

| t (s) | arc | what shows |
| --- | --- | --- |
| 0 -> 0.0633 (`STRIKE_CONTACT_T` = hitAt - 1/60) | 0 -> 0.56, linear (as today, the same seconds) | wind-up and drive; the hand across by the hit (0.08 s, the step at 83 ms) as today |
| 0.0633 -> 0.1473 (`STRIKE_FOLLOW` 0.084) | 0.56 -> 0.62, linear (today's pace, 0.714 / s) | the follow-through: every arc curve holds its contact pose while the arm and the trunk arrive (5 frames, as today) |
| 0.1473 -> 1.48 (`s` 0..1 over 1.3327 s) | 0.62 + 0.38 x(s), x = s (2.5 - 2.6 s + 1.1 s^2) | the settle: the graph's smoothstep return on top starts at rest; the arc leaves the follow-through at its own pace (x'(0) 2.5: 0.713 / s against 0.714) and arrives at the free still moving (x'(1) 0.6) |
| >= 1.48 | 1 | free |

The cubic is the Hermite curve with end slopes 2.5 / 0.6 (`STRIKE_SETTLE = { start: 2.5, end: 0.6 }`). Measured per 60
Hz frame on the graph's hand weight `meleeHandW` (the unit tests pin these): half the overlay is back by 0.5 s, 92% by
1.0 s, within 1% of rest at 1.35 s, still moving on the last posed frame; the largest change a frame 0.0294 (today's 0.6 s
return 0.0469), the largest change of that change 0.00497 (today 0.00546), no run of frames holding still longer than
today's 4. So no pop and no freeze, with "contact as quick as today".

Settled consequences (information, not to fix here):
- The kill blows (`killWarp`: the lethal takedown blow, the grab kill) keep today's linear warp bit for bit: it is
  renamed `arcWarp(ph, hitPh)`; `strikeWarp(ph)` (one argument) becomes the elbow strike's re-timed arc.
- A whiff keeps its 0.38 s (`whiffRecover` unchanged). It ends earlier in the slower settle: its last posed frame (t
  0.367 s) leaves 72% of the hand overlay to release in one frame against 63% today (rare: F1b only whiffs when the
  guard leaves the reach in the 80 ms wind-up). A whiff's own pose clock is `strikeController.ts` (not S2's): polish list.
- Co-op: the wire carries the strike's phase as before; client, host and remotes all read `STRIKE_DUR` / `strikeWarp`
  from the same build. No wire field, no `PROTOCOL_VERSION` change.
- Mixamo (PLAN "Mixamo hand-offs"): no source read is added; the Mixamo takes follow the re-timed arc through
  `strikeShot`. Their pop is before contact (unchanged here, "contact as quick as today"), so both rows stay off and the
  hand-made strike plays on every source; S2 records the A8 readings as information (Step 4, S2-REPORT).
- Hot paths: `strikeArcAt` / `strikeWarp` are scalar maths, no allocation (a test pins it).

## Build
Step 1 - `src/game/elbowStrike.ts` (three places, nothing else):
1. Header `:2-3`: "the 0.9 s timeline" becomes "the 1.48 s timeline (J19 R8)".
2. `:15-16` become:
   ```ts
     /** (J19 R8, Michael Q34 2026-10-25 "About 1.4 s") Recovery after contact (s): free 1.4 s after contact, as the
      *  footage / loco M25 (F1b had 0.6). The pose's follow-through and settle fill it (`strikeBody.ts` `strikeArcAt`). */
     recover: 1.4,
   ```
3. `:34` becomes `/** The whole move (s): contact at 0.08 s, free at 1.48 s (J19 R8); a whiff ends at 0.38 s. */`.

Step 2 - `src/anim/strikeBody.ts` (lines 1-130 only):
1. Header: insert before the closing ` */` (`:34`), after the n4d paragraph:
   ```ts
    *
    * (J19 S2, R8; Michael Q34 2026-10-25 "About 1.4 s") The strike frees 1.4 s after contact (`STRIKE_DUR` 1.48 s). The
    * arc is timed in seconds (`strikeArcAt`): the wind-up, the drive and the contact keep their times (the arc's contact
    * at 0.063 s, the hit at 0.08 s), the follow-through keeps its 84 ms, and the extra 0.8 s goes to the settle: the arm
    * returns to the stance over the rest of the strike (`STRIKE_SETTLE`), moving every frame until the free. The kill
    * blows keep the linear warp (`arcWarp`).
   ```
2. `:42` doc: "(`STRIKE.hitAt` over `STRIKE_DUR`, ~0.118)" becomes "(`STRIKE.hitAt` over `STRIKE_DUR`, ~0.054)".
3. Replace `:48-62` (the `STRIKE_WARP_PH` doc and const, the `strikeWarp` doc and function) with exactly:
   ```ts
   /** (J19 S2, R8) Seconds into the strike of the arc's contact (~0.063 s): a frame before the hit, as before R8. */
   export const STRIKE_CONTACT_T = STRIKE.hitAt - STRIKE_ARM_LAG;
   /** The strike phase the arc's contact lands on (`STRIKE_CONTACT_T` over `STRIKE_DUR`, ~0.043). */
   export const STRIKE_WARP_PH = STRIKE_CONTACT_T / STRIKE_DUR;
   /** (J19 S2, R8) The follow-through (s): the arc from its contact (0.56) to the return's start (`REC_FROM`, 0.62) at
    *  the pace it had before R8 (84 ms, 5 frames); every arc curve holds its contact pose over it while the arm and the
    *  trunk arrive (the rig's joint rate limits, `STRIKE_BODY_RATE`). */
   export const STRIKE_FOLLOW = 0.084;
   /**
    * (J19 S2, R8) The settle: the return (arc `REC_FROM` -> 1) over the rest of the strike. Its share at `s` (0..1 of
    * its time) is the cubic with slope `start` at the follow-through's end and `end` at the free:
    * `s (start + (3 - 2 start - end) s + (start + end - 2) s^2)` = `s (2.5 - 2.6 s + 1.1 s^2)`. `start` 2.5 leaves the
    * follow-through at its own arc pace (no change of pace for the arc, or for a capture fitted to it); `end` 0.6
    * arrives at the free still moving (no held pose). The graph's smoothstep return on top starts and ends at rest; per
    * 60 Hz frame its hand weight never moves, or changes its pace, more than the 0.6 s return before R8 did.
    */
   export const STRIKE_SETTLE = { start: 2.5, end: 0.6 } as const;

   /**
    * (J19 S2, R8) The elbow strike's arc (the `melee` pose input, 0..1) at `t` seconds into the strike, in seconds rather
    * than phase so the longer recovery keeps the hit as quick as before: linear to the arc's contact at
    * `STRIKE_CONTACT_T` (as before R8), the follow-through to `REC_FROM` over `STRIKE_FOLLOW`, then the settle to rest
    * at `STRIKE_DUR` (`STRIKE_SETTLE`). Monotonic and continuous; <= 0 -> 0, `STRIKE_DUR` and on -> 1. Pure, no allocation.
    */
   export function strikeArcAt(t: number): number {
     if (t <= 0) return 0;
     if (t >= STRIKE_DUR) return 1;
     const C = STRIKE_ARC_CONTACT;
     if (t <= STRIKE_CONTACT_T) return (C * t) / STRIKE_CONTACT_T;
     const tR = STRIKE_CONTACT_T + STRIKE_FOLLOW;
     if (t <= tR) return C + ((REC_FROM - C) * (t - STRIKE_CONTACT_T)) / STRIKE_FOLLOW;
     const a = STRIKE_SETTLE.start;
     const b = STRIKE_SETTLE.end;
     const s = (t - tR) / (STRIKE_DUR - tR);
     const x = (((a + b - 2) * s + (3 - 2 * a - b)) * s + a) * s;
     return x < 1 ? REC_FROM + REC_LEN * x : 1;
   }

   /**
    * (anim-n4c M1; J19 S2, R8) The elbow strike's phase (0..1, time-linear over `STRIKE_DUR`: `strikePhase`, the
    * MoveState's `ph`; < 0 none) -> the arc's phase: `strikeArcAt` of its seconds. < 0 passes through, 1 and on -> 1. Pure.
    */
   export function strikeWarp(ph: number): number {
     if (ph < 0) return ph;
     if (ph >= 1) return 1;
     return strikeArcAt(ph * STRIKE_DUR);
   }

   /**
    * (anim-n4c M1, anim-n4d) A blow's phase (0..1, time-linear; < 0 none) -> the arc's phase with the arc's contact on
    * `hitPh`, linear on both sides (the arc's own curves ease it; they are at rest at contact, so the change of pace
    * there shows no kink). The kill blows' warp (`killWarp`); before J19 S2 also the elbow strike's (then `strikeWarp`
    * with a hit phase). Monotonic, 0 -> 0, 1 -> 1, < 0 passes through; no hit phase in (0, 1): unwarped. Pure.
    */
   export function arcWarp(ph: number, hitPh: number): number {
     if (ph < 0) return ph;
     if (ph >= 1) return 1;
     if (!(hitPh > 0 && hitPh < 1)) return ph;
     const C = STRIKE_ARC_CONTACT;
     return ph <= hitPh ? (C * ph) / hitPh : C + ((1 - C) * (ph - hitPh)) / (1 - hitPh);
   }
   ```
   (`REC_FROM` / `REC_LEN` are the module consts at `:126-127`, read only inside the function at call time: leave them
   where they are.)
4. `KillBlow` doc (`:64-69`): "the `strikeWarp` hit phase" becomes "the `arcWarp` hit phase".
5. `killWarp` doc (`:91-95`): "`strikeWarp` on the whole posed timeline" becomes "`arcWarp` on the whole posed
   timeline"; `:98` becomes `return arcWarp((u * b.dur) / (b.dur + b.tail), b.hit);`.
6. The arc timing comment `:121-122` (`/** Arc timing ... over REC_LEN. */`) becomes:
   ```ts
   /** Arc timing (phase 0..1, the `melee` input): the wind-up loads by WIND_END, the drive runs from DRIVE_FROM over
    *  DRIVE_LEN (the shoulders; the hips `lead` earlier), the recovery eases back from REC_FROM over REC_LEN.
    *  (J19 S2) `strikeArcAt` times the elbow strike's follow-through and settle on REC_FROM / REC_LEN (the graph's
    *  `meleeHandW` / `meleeSweep` return on the same 0.62 / 0.38). */
   ```
   Nothing else in the file; no edit to master lines 131-256.

Step 3 - existing tests to the new timing:
1. `tests/elbowStrike.test.ts`: `:6` `recover: 0.6` becomes `recover: 1.4`. `:31` title becomes `'timeline (F1b; J19
   R8): wind-up 0.06, contact 0.08, free at 1.48 (1.4 s after contact); a whiff is shorter'`. `:32` becomes
   `expect(STRIKE_DUR).toBe(1.48);` followed by `expect(STRIKE_DUR - STRIKE.hitAt).toBeCloseTo(1.4, 12);` and
   `expect(STRIKE_WHIFF_DUR).toBeCloseTo(0.38, 12); // the whiff unchanged`. `:39` `strikeStage(0.67)` becomes
   `strikeStage(1.47)`; `:40` `strikeStage(0.68)` becomes `strikeStage(1.48)`. After `:41` add
   `expect(strikePhase(STRIKE.hitAt)).toBeCloseTo(0.08 / 1.48, 12);`.
2. `tests/animN4cStrike.test.ts`: add `arcWarp` to the strikeBody import (`:7`); in `:217-233`, `:222`
   `strikeWarp(STRIKE_HIT_PH, STRIKE_HIT_PH)` becomes `arcWarp(STRIKE_HIT_PH, STRIKE_HIT_PH)` and `:226`
   `strikeWarp(0.3, 0)` becomes `arcWarp(0.3, 0)`. Nothing else in that test.
3. `tests/animN4dKill.test.ts`: import `arcWarp` (`:8`, keep `strikeWarp`: `:394`, `:398` use it); `:37` title
   `'strikeWarp is monotonic ...'` becomes `'arcWarp (the kill blows\' warp) is monotonic ...'` (rest of the title
   unchanged); `:42` and `:47` `strikeWarp(` become `arcWarp(`; `:391` `k <= 70` becomes
   `k <= Math.ceil(STRIKE_DUR / DT) + 30` (the 89-frame strike and the accept's catch-up). Nothing else.
4. `tests/strikePops.test.ts` harness (`:48-105`): `strikeFrames` takes the arc and the frames posed. Above it:
   ```ts
   /** (J19 S2) The arc StrikeController poses `t` s into the strike. */
   const nowArc = (t: number): number => strikeWarp(strikePhase(t));
   ```
   signature `async function strikeFrames(arcAt: (t: number) => number = nowArc, posed =
   Math.ceil(STRIKE_DUR / DT)): Promise<StrikeFrames>`; the comment `:81` becomes `// the strike (as StrikeController:
   \`posed\` frames of the arc), then 6 frames after it ends`; `:82` is deleted; the loop is `for (let k = 1; k <=
   posed + 6; k++)` with `pose.melee = k <= posed ? arcAt(k * DT) : -1;`. The existing call `strikeFrames()` (`:135`)
   and every existing assertion stay as they are.

Step 4 - new tests (exact assertions; print every measured number with `console.info`):
0. The reference used by items 1-3 below (in each of `tests/animN4cStrike.test.ts` and `tests/strikePops.test.ts`;
   `strikePops` imports `STRIKE_ARC_CONTACT, STRIKE_ARM_LAG` from strikeBody for it; `animN4cStrike` also defines
   `nowArc` exactly as Step 3 item 4):
   ```ts
   /** (J19 S2) The strike's arc before R8 (0.68 s, linear either side of the arc's contact at 0.0633 s): the reference. */
   const OLD_DUR = 0.68;
   const oldArc = (t: number): number => {
     const tc = STRIKE.hitAt - STRIKE_ARM_LAG;
     if (t >= OLD_DUR) return 1;
     return t <= tc ? (STRIKE_ARC_CONTACT * t) / tc : STRIKE_ARC_CONTACT + ((1 - STRIKE_ARC_CONTACT) * (t - tc)) / (OLD_DUR - tc);
   };
   ```
1. `tests/animN4cStrike.test.ts`, new imports: `STRIKE_CONTACT_T, STRIKE_FOLLOW, STRIKE_SETTLE, strikeArcAt, killWarp,
   KILL_TAIL_END, TAKEDOWN_BLOW, GRAB_KILL_BLOW` (strikeBody), `STRIKE_WHIFF_DUR, strikeStage` (elbowStrike),
   `meleeHandW, meleeSweep` from `'../src/anim/animGraph'`, `bytesPerCall, HEAP_NUMBER, inputs, sink` from
   `'./helpers/allocPerCall'`; `OLD_DUR` / `oldArc` / `nowArc` (item 0) at the top of the new block. New
   `describe('(J19 S2, R8) the palm strike frees 1.4 s after contact: the hit as before, the follow-through, the
   settle', ...)` at the end of the file with five `it`s:
   - (a) `'the arc in seconds: the wind-up and contact as before R8, the follow-through, the settle\'s curve, free at
     1.48 s'`: `STRIKE_CONTACT_T` toBeCloseTo(`STRIKE.hitAt - STRIKE_ARM_LAG`, 15); `STRIKE_FOLLOW` toBe(0.084);
     `STRIKE_SETTLE` toEqual(`{ start: 2.5, end: 0.6 }`). For k = 0..40, `t = (k / 40) * STRIKE_CONTACT_T`:
     `strikeWarp(strikePhase(t))` toBeCloseTo(`oldArc(t)`, 12) and toBeCloseTo(`STRIKE_ARC_CONTACT * t /
     STRIKE_CONTACT_T`, 12). `strikeWarp(strikePhase(STRIKE.hitAt))` toBeCloseTo(0.5719, 4).
     `strikeArcAt(STRIKE_CONTACT_T + STRIKE_FOLLOW)` toBeCloseTo(0.62, 12). The follow-through's pace `(0.62 -
     STRIKE_ARC_CONTACT) / STRIKE_FOLLOW` toBeCloseTo(`(1 - STRIKE_ARC_CONTACT) / (OLD_DUR - STRIKE_CONTACT_T)`, 2);
     the settle's starting pace `0.38 * STRIKE_SETTLE.start / (STRIKE_DUR - STRIKE_CONTACT_T - STRIKE_FOLLOW)`
     toBeCloseTo(`(0.62 - STRIKE_ARC_CONTACT) / STRIKE_FOLLOW`, 2). With `tR = STRIKE_CONTACT_T + STRIKE_FOLLOW`:
     `strikeArcAt(tR + q * (STRIKE_DUR - tR))` toBeCloseTo 9 digits of 0.80228125 (q 0.25), 0.90025 (q 0.5),
     0.95309375 (q 0.75). `strikeArcAt(0)` toBe(0); `strikeArcAt(STRIKE_DUR)` toBe(1); `strikeWarp(1)` toBe(1);
     `strikeWarp(-1)` toBe(-1); `strikeWarp(strikePhase(STRIKE.hitAt + STRIKE.recover))` toBe(1);
     `strikeStage(STRIKE.hitAt + STRIKE.recover)` toBe('done'); `strikeStage(STRIKE.hitAt + STRIKE.recover - 1e-6)`
     toBe('recover').
   - (b) `'per 60 Hz frame: always on the move, no freeze after the hit, never faster or jerkier than before R8,
     settling into the free'`: a helper `frames(arcAt, dur)` returns `a[0] = 0`, `a[k] = arcAt(k * DT)` for k =
     1..`Math.ceil(dur / DT)`; `hitK = Math.ceil(STRIKE.hitAt / DT - 1e-9) - 1` (4). A helper `measure(a)` over k from
     `hitK + 2` to the last: `dW = meleeHandW(a[k]) - meleeHandW(a[k - 1])`, `dS` the same with `meleeSweep`; `still`
     the longest run of consecutive k with `|dW| < 1e-3 && |dS| < 1e-3`; `maxDW` the largest `|dW|`; `maxJ` the largest
     `|dW(k) - dW(k - 1)|` for k from `hitK + 3`; `settle` the first k with `meleeHandW(a[k]) <= 0.01`. New: `a =
     frames(nowArc, STRIKE_DUR)` (89 frames); old: `frames(oldArc, OLD_DUR)` (41).
     Asserts: every `a[k] > a[k - 1]`; new `still` <= 5 (it is 4; old 4); new `maxDW` < 0.03 (0.0294) and <= old
     `maxDW` (0.0469); new `maxJ` <= old `maxJ` (0.00497 vs 0.00546); `settle * DT` >= `STRIKE_DUR - 0.2` (it is 1.35 s;
     old 0.65 s); the last frame StrikeController poses (k = 88, `Math.ceil(STRIKE_DUR / DT) - 1`) has `a[k] < 1` and
     `meleeHandW(a[k]) > 0`.
   - (c) `'the whiff (0.38 s, unchanged) ends earlier in the settle: its last posed frame (information, pinned)'`: `kW
     = Math.ceil(STRIKE_WHIFF_DUR / DT) - 1` (22: StrikeController ends a whiff on the first step at or past 0.38 s);
     `w = strikeWarp(strikePhase(kW * DT))` toBeCloseTo(0.7515, 3); `meleeHandW(w)` toBeCloseTo(0.7238, 3); print
     against `oldArc(kW * DT)` (0.7764, hand weight 0.6311).
   - (d) `'the kill blows keep the linear warp bit for bit (arcWarp is the warp before J19 S2)'`: for hit of `[0.12,
     0.3, STRIKE_ARC_CONTACT, 0.69, 0.9, TAKEDOWN_BLOW.hit, GRAB_KILL_BLOW.hit]` and k = 0..1000, `x = k / 1000`:
     `arcWarp(x, hit)` toBe(`x >= 1 ? 1 : x <= hit ? (STRIKE_ARC_CONTACT * x) / hit : STRIKE_ARC_CONTACT + ((1 -
     STRIKE_ARC_CONTACT) * (x - hit)) / (1 - hit)`). For both blows and k = 0..100, `u = (k / 100) * KILL_TAIL_END`:
     `killWarp(u, b)` toBe(`arcWarp((u * b.dur) / (b.dur + b.tail), b.hit)`).
   - (e) `'strikeWarp allocates nothing (StrikeController, MoveState and RemoteAvatar call it every frame)'`:
     `const PH = inputs(2000, (k) => k / 1999);` `const per = await bytesPerCall((n) => { for (let k = 0; k < n; k++)
     sink[0] += strikeWarp(PH[k]!); }, 0);` `expect(per).toBeLessThanOrEqual(HEAP_NUMBER);` (timeout 60_000).
2. `tests/strikePops.test.ts`, inside the first describe (its `Math.random` mock applies), after `:171`, timeout
   120_000: `it('(J19 S2, R8) the re-timed strike on the rig: the hit as before, then the follow-through and the
   settle, no pop, no freeze', ...)`:
   - `f = await strikeFrames()`; `o = await strikeFrames(oldArc, Math.ceil(OLD_DUR / DT))`; `n = Math.ceil(STRIKE_DUR /
     DT)`; contact for each as the test above (`:138-139`: the first index with `wx <= min(wx over its posed frames) +
     0.01`): `fc`, `oc`.
   - The hit as before: for index 0..7 (frames 1-8, to 133 ms: the return has not started) and each of `wrist`, `pel`,
     `sh`, `hip`: `Math.abs(f[key][i] - o[key][i])` < 1e-9 (message `${key} frame ${i + 1}`); `fc` toBe(`oc`).
   - No pop: for each run with its own contact `c` (`fc` / `oc`), over index `c + 2` to the end of its series (the
     follow-through, the return and the 6 release frames): `step` = the largest `wrist[i]`, `jerk` = the largest
     `|wrist[i] - wrist[i - 1]|` (i from `c + 3`). Assert `stepNew <= stepOld + 0.003` and `jerkNew <= jerkOld + 0.003`.
   - No freeze: over index `fc + 2` to `n - 7`, the longest run of consecutive frames with `wrist < 0.001` is <= 8.
   - Settles into the free: the sum of `f.wrist` over index `n - 18` to `n - 1` (the posed strike's last 0.3 s) > 0.003.
3. `tests/strikePops.test.ts`, same describe, timeout 120_000: `it('(J19 S2) a whiff (0.38 s) releases no harder than
   about before R8 (information)', ...)`: `kW = Math.ceil(STRIKE_WHIFF_DUR / DT) - 1` (22); `w = await
   strikeFrames(nowArc, kW)`, `wo = await strikeFrames(oldArc, kW)`; `relNew` / `relOld` = the largest `wrist` over
   index `kW` to `kW + 5` (the six frames after the release) of `w` / `wo`; assert `relNew <= relOld * 1.3 + 0.005`;
   print both.
4. `tests/strikePops.test.ts`, a new describe at the end of the file, timeout 300_000:
   `describe('(J19 S2) A8 readings: the Mixamo strikes on the re-timed strike against the hand-made one (information)')`
   with one `it('bone step, knees, knee out, elbow out, slide, wrist step, contact against the hit', ...)`:
   - Imports: `MIXAMO, MIXAMO_ON, setMixamo, WREN_STRIKE` from `'../src/anim/mixamo'`; `MOCAP_ELBOW_STRIKE` from
     `'../src/anim/clips/mixamo/elbow_strike'`; `MOCAP_CROSS_PUNCH` from `'../src/anim/clips/mixamo/cross_punch'`;
     `driveRig, plantSlide, pops, POP_DEG, type Rec` from `'./helpers/mocapMeasure'`; `CRAB, FOOT_SLIDE` from
     `'../src/anim/audit/limits'`; `elbowWing, kneeBow, kneeSeparation` from `'../src/anim/audit/metrics'`.
   - Copy verbatim from `tests/mixamoCarryStrike.test.ts`: `cm` (`:241`), `Body` / `body()` (`:243-266`), `line`
     (`:268-269`), `visiblyBroken` (`:278-283`), `wristStep` (`:308-312`).
   - `a8Run(striking: 'wristL' | 'wristR')`: `n0 = 120`, `N = Math.ceil(STRIKE_DUR / DT)`; the plan of
     `mixamoCarryStrike.test.ts:296` (`speed 0, yawRate 0, rec: t >= 1.8, pose: { armed: false, melee: k >= n0 && k <
     n0 + N ? strikeWarp(strikePhase((k - n0 + 1) * DT)) : -1 }`); `driveRig(n0 + N + 60, plan, onStep)` where
     `onStep(rig, k)` for `n0 <= k < n0 + N` keeps the k with the largest `rig[striking].computeWorldMatrix(true).m[14]!
     - rig.root.position.z` (the striking wrist furthest forward); returns `{ R, contactMs: (bestK - n0 + 1) * DT *
     1000 }`.
   - In `try`: `setMixamo(false)`, `expect(WREN_STRIKE.clip).toBeNull()`, hand-made = `a8Run('wristR')`; then
     `MIXAMO_ON.elbow_strike = true; MIXAMO_ON.cross_punch = false; setMixamo(true)`,
     `expect(WREN_STRIKE.clip).toBe(MOCAP_ELBOW_STRIKE)`, elbow = `a8Run('wristL')`; then `MIXAMO_ON.elbow_strike =
     false; MIXAMO_ON.cross_punch = true; setMixamo(true)`, `expect(WREN_STRIKE.clip).toBe(MOCAP_CROSS_PUNCH)`, cross
     = `a8Run('wristR')`. `finally`: `Object.assign(MIXAMO_ON, rows0); setMixamo(on0)` with `rows0 = { ...MIXAMO_ON }`
     and `on0 = MIXAMO.on` taken before the `try`.
   - Print, one line per run: `line(body(R))`, `wrist ${cm(wristStep(R))} cm/frame`, `contact ${contactMs} ms (the
     hit 83 ms: ${contactMs - 83} ms)`, and for the two takes `visibly broken (the I5 caps): ${visiblyBroken(take,
     hand)} (POP_DEG ${POP_DEG})`. Assert only the three `WREN_STRIKE.clip` checks above and that each take moved the
     body: `body(take).step + body(take).wing` not toBe `body(hand).step + body(hand).wing`. The rows' verdict is the
     Mixamo lead's: record it, assert nothing about it.

Step 5 - `changes/feature-player-j19-s2.md` (format `changes/README.md`):
```
# Palm strike recovery
kind: minor
- The palm strike recovers in about 1.4 s after the hit (was 0.6 s): the hit lands as fast as before, then the arm
  follows through and settles back into the stance before you are free to move on.
```

Commits (each with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), push after each:
1. "J19 S2: palm strike free 1.4 s after contact, the arc timed in seconds (R8)" - Steps 1-3 (source and the existing
   tests on the new timing).
2. "J19 S2: strike timing, rig and A8 reading tests" - Step 4.
3. "J19 S2: changelog fragment" - Step 5.

## Run (unit tests only: no e2e, no GPU, no `npm run check`, no dev server; every command with a timeout)
- `npm run typecheck:fast`
- `npx eslint src/game/elbowStrike.ts src/anim/strikeBody.ts tests/elbowStrike.test.ts tests/animN4cStrike.test.ts tests/animN4dKill.test.ts tests/strikePops.test.ts`
- `npx vitest run tests/elbowStrike.test.ts tests/animN4cStrike.test.ts tests/animN4dKill.test.ts tests/strikePops.test.ts tests/mixamoCarryStrike.test.ts tests/moveState.test.ts tests/poseParity.test.ts tests/net.test.ts tests/committedMoves.test.ts tests/tunerReach.test.ts tests/sectorSlice0.test.ts tests/animTuneBake.test.ts tests/animBakeAll.test.ts tests/changesFragments.test.ts`
  (add `--maxWorkers=2` on a small box). Run the first four files and `mixamoCarryStrike` after commit 1, the whole line
  after commit 3. `tests/mixamoCarryStrike.test.ts` is read only: it pins the default source bit-identical on the new
  timing ((a)) and gives the I5 readings ((d)); if any of its cases fails, do not edit it: `status: blocked` with the
  failing assertion and its output.
- A failing file outside this list that you did not touch: re-run it once on the base sha; if it fails there too, list
  it as pre-existing in the report and go on.
- Any Step 4 assertion that fails: do not change a value, the curve or the threshold; `status: blocked` with the
  measured numbers (old and new) under S2-REPORT.

## Done when
- `git diff --stat 29f03b6c004bf8dae66eea9c434160b6b1db061c` lists only the seven files above.
- `git diff 29f03b6c004bf8dae66eea9c434160b6b1db061c -- src/anim/strikeBody.ts`: every hunk's old-side range (`@@ -a,b`)
  ends at or before line 130 (master lines 131-256 untouched).
- `git grep -n "strikeWarp(" -- src tests` shows no call with a second argument; `git grep -n -E "mixamo|animSource" --
  src/game/elbowStrike.ts src/anim/strikeBody.ts` finds only the existing comments (no new import).
- tsc and eslint clean; every vitest file above passes.
- Three commits pushed to `origin feature/player-j19-s2`.
- Then fill in `## S2-REPORT` below and set line 1 to `status: done feature/player-j19-s2 <sha>`; commit, push
  `cloud-queue` (rebase on reject).
- A question you cannot settle from this brief: line 1 `status: blocked <one-line reason>`, evidence under
  `## S2-REPORT`, push, move on. The lead answers by editing this brief.

## Pending PC run (the lead runs these on the laptop queue; write each as "pending PC run")
- affected-e2e: GAME + `e2e-anim`, `e2e-clip`, `e2e-move`; `anim-audit`; `e2e-coop` + `e2e-netmove` requested (the
  host's strike record follows `STRIKE_DUR`). Also touch the strike: `e2e-takedown` ("palm strike: one hit"), `e2e-pad`
  (`scripts/e2e-pad.mjs:613-615`, waits up to 1.5 s for a 1.48 s strike).
- Look video: palm strikes from four sides and a whiff, each on the default source and on Mixamo (`?anim=mixamo` once
  #494 lands), for the PR body and the walk item "Palm strike: 1.4 s to free".

## S2-REPORT (fill in)
- Branch, the three commit shas.
- What changed, file:line per Step item.
- Tests: names and pass counts per file; tsc / eslint results; any pre-existing failure with its base-sha run.
- Measured (copy the console lines):
  | Reading | Re-timed strike | Before R8 |
  | --- | --- | --- |
  | pure: still run / largest hand-weight change / its change | 4 / 0.0294 / 0.00497 (expect) | 4 / 0.0469 / 0.00546 |
  | pure: within 1% of rest at | 1.35 s (expect) | 0.65 s |
  | rig: hand across (frame, ms) | | |
  | rig: largest wrist step after contact / step change | | |
  | rig: longest run under 1 mm a frame; wrist travel over the last 0.3 s | | n/a |
  | whiff: hand weight left at release (pure); rig release wrist step | 0.724 / | 0.631 / |
- A8 readings (information; PLAN "Mixamo hand-offs"; the I5 caps' verdict recorded, not acted on):
  | Clip | Bone step a frame (bone) | Knees x hips | Knee out | Elbow out | Slide | Wrist a frame | Contact (ms) vs hit 83 ms | Visibly broken |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | hand-made (re-timed) | | | | | | | | n/a |
  | elbow_strike | | | | | | | | |
  | cross_punch | | | | | | | | |
  Plus the "(mixamo I5) strike" lines `tests/mixamoCarryStrike.test.ts` (d) printed on the new timing.
- Old strike timing left in places S2 does not own (file:line, not fixed): `scripts/anim-audit.mjs:607`, `:1131`
  (balance from 0.9 s), `:1177` (settle from 1.1 s); `scripts/e2e-coop.mjs:959`; `strikeController.ts` header (0.12 s)
  and the whiff's pose clock; any line in `docs/` stating a 0.6 / 0.68 / 0.7 / 0.9 s strike recovery (grep and list).
- Deviations from this brief, each with the reason.
- Every e2e and the look video: pending PC run (list above).
