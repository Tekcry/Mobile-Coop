status: done feature/cr-f1c d4706918

# Brief: coop-real F1c - checker follow-ups of F1a / F1b: no stale lamp round across a restart; the Course onRay chain test (Player Build)

Lead: Night Shift | Player Build, 2026-10-25. Two follow-ups from the Opus checkers of F1a / F1b. NO wire change, NO
`PROTOCOL_VERSION` change. Unit tests only. Every line number below is at the base sha.

## The two items
(i) Restart-in-flight lamp guard. A client's lamp round (`shot` at `lt-<id>`) is checked by the host in
`src/net/coopHost.ts` `onLampShot` (`:1318-1345`). A round the client fired just before a set restart (Course mode) or a
section restart (Sector Ops) can reach the host after the restart has put every lamp back, and then shoots a lamp out in
the fresh run. Where the lamps come back:
- Course mode: `src/game/modes/courseMode.ts` `onEvent` case `'bayRestart'` (`:695-719`): `this.restarts++` (`:697`)
  and `this.resetLights()` (`:712`; `resetLights` `:1014-1030` restores every shot-out lamp, `:1016`) in the same call.
  `restarts` is public (`:202-203`).
- Sector Ops: `src/game/modes/sectorMode.ts` `restartSection()` (`:1153-1202`): `this.restarts++` (`:1164`) and the
  lamps put back by `this.lastReset = this.startState.apply(g.world.level.lights, g.world.doors)` (`:1193`) in the same
  call (a restart during a cycle takes the next section's start instead, `:1190-1192`). `restarts` is public
  (`:190-191`).
- Both run inside the mode's `fixedUpdate`, and `GameState` steps the mode then the net attachment in the same fixed
  step (`src/game/gameState.ts:2086-2087`: `this.mode?.fixedUpdate(dt); this.net?.fixedUpdate(dt);`). The host already
  polls the mode's `restarts` each step in `sendLamps` (`coopHost.ts:1781-1793`, called at `:1778` from `fixedUpdate`
  `:1683`, no early return before it), but only for Sector Ops (it returns at `:1785` `if (!tx) return;`, and
  `lampTx` is null in Course mode, `:202`).
The shared clock: the host's `this.time` (`coopHost.ts:113`, `+= dt` at `:1684`) is the sim time every snapshot
carries (`snap.time`, `:1604`; `simTime()` `:1678-1681`). The client tracks it with `ClockSync` (`coopClient.ts:441`
`this.clock.observe(m.time, ...)`; `src/net/interp.ts:301-325`) and stamps the lamp round with
`rt: Math.max(0, this.renderTime)` (`coopClient.ts:709`), where `renderTime` is
`this.clock.now(...) - INTERP_DELAY` (`coopClient.ts:267-269`) and `INTERP_DELAY = CLIENT_INTERP_DELAY` 0.16
(`coopClient.ts:64`, `interp.ts:34`). So the round's shot time on the host clock is `m.rt + CLIENT_INTERP_DELAY`. A
client sees the restart at about the host time of the restart (the `course` / `sector` message and the banner) and is
moved to the checkpoint by the host's respawn at least 0.3 s later (`scheduleRespawn(..., 0.3)` `sectorMode.ts:1199`;
`0.5` in Course mode, `courseMode.ts:717`). This needs no wire change: `rt` is already on every `shot`.

(ii) A unit test that the Course mode `CoopClient` constructor puts `lampRay` first in the `g.weapons.onRay` chain:
the lamp hook `coopClient.ts:211-216`, then the pendant sway hook `:217-228` (only with `g.world.level.lights.sway`),
then the camera ricochet hook `:257-264`. Today nothing tests the order (`tests/courseLampWire.test.ts` calls `lampRay`
on a prototype stand-in and never runs the constructor). Test only: no change to `coopClient.ts`.

## Base and branch
- Base `origin/feature/cr-f1b` at `dadacd585c6e64751009d3d448fd43578176ab83` (F1b with its fix round; laptop green 6/6).
  New branch `feature/cr-f1c`; push there only. No master merge, no rebase, no other branch. `npm ci` once if needed.

## Files (only these)
- `src/net/validate.ts`
- `src/net/coopHost.ts`
- `tests/courseLampWire.test.ts`
- `tests/courseLampHook.test.ts` (new)
- `docs/systems/coop.md` (the F1b lamp-shot bullet in "Training course wire", `:354-357`, only)
- `changes/feature-cr-f1c.md` (new fragment; `changes/README.md`)
Nothing else: not `src/net/coopClient.ts`, not `courseMode.ts`, not `sectorMode.ts`, not `src/net/protocol.ts`, not
`PROTOCOL_VERSION`. Open PR #317 (`feature/coop4`) also edits `coopHost.ts` (imports `:15-25`, fields after `lampB`
`:190`, the constructor `:198-215`, `fixedUpdate` `:1683-1686`, `onRespawn` `:1874-1900`) and `coop.md` (its Sector Ops
wire paragraph `:463-470`); it does not touch `validate.ts`, `sendLamps` or `onLampShot`. So in `coopHost.ts` edit only:
the one `./validate` import line (`:24`, already changed by F1b), one new field directly under `lampRestarts`
(`:186`), the body and doc of `sendLamps` (`:1781-1793`) and `onLampShot` (`:1311-1345`). The new helper goes in
`validate.ts` directly under `hostLampShots` (`:263-267`). Do not touch `fixedUpdate`, the constructor or anything else.

## Wire: none
No message shape changes (the `shot` already carries `rt`, `protocol.ts:276`), no `PROTOCOL_VERSION` bump, no protocol
test change (CLAUDE.md:279: the train build bumps it for wire changes). If (i) seems to need a wire change, STOP:
`status: blocked <reason>`.

## Build
1. `src/net/validate.ts`:
   - Add `import { CLIENT_INTERP_DELAY } from './interp';` after the last import (`:20`). (`interp.ts` has no imports:
     `validate.ts` stays pure and Babylon-free.)
   - Directly under `hostLampShots` (`:263-267`), add exactly:
     ```ts
     /** (coop-real F1c) Seconds past a restart in which a client's lamp round still counts as fired before it: covers
      *  the client clock's jitter, and stays under the shortest respawn delay (Sector Ops 0.3 s), so a round fired after
      *  the client's respawn at the checkpoint is never dropped. */
     export const LAMP_RESTART_SLACK = 0.2;

     /** (coop-real F1c) A client's lamp round (`shot` at `lt-<id>`) fired before the mode's last set or section restart
      *  (which put every lamp back) is stale: the host drops it with no violation. `rt` is the round's render time on
      *  the host clock (the client's `renderTime`: its estimate of the host sim time less `CLIENT_INTERP_DELAY`), so it
      *  was fired at `rt + CLIENT_INTERP_DELAY`; `restartAt` is the host sim time of the last restart (-Infinity
      *  before any). */
     export function lampShotStale(rt: number, restartAt: number): boolean {
       return rt + CLIENT_INTERP_DELAY < restartAt + LAMP_RESTART_SLACK;
     }
     ```
2. `src/net/coopHost.ts`:
   - Import line `:24`: add `lampShotStale` to the `./validate` list (after `hostShotWeapon`, keep the rest as is).
   - New field directly under `private lampRestarts = 0;` (`:186`):
     ```ts
     /** (coop-real F1c) The host sim time (`time`) of the mode's last set / section restart (Course mode, Sector Ops):
      *  a client's lamp round fired before it is stale (`lampShotStale`). */
     private lampRestartAt = -Infinity;
     ```
   - `sendLamps` (`:1781-1793`): move the restart poll above the `lampTx` gate so it runs in every mode, and record the
     time. The body becomes exactly:
     ```ts
     const rs = (this.g.mode as { restarts?: number } | null)?.restarts ?? 0;
     if (rs !== this.lampRestarts) {
       this.lampRestarts = rs;
       this.lampForce = true;
       this.lampRestartAt = this.time;
     }
     const tx = this.lampTx;
     if (!tx) return;
     const w = tx.step(this.g.world.level.lights, dt, this.lampForce);
     this.lampForce = false;
     if (w) this.s.send({ t: 'lamps', n: w.n, of: w.of, sh: w.sh });
     ```
     Doc comment (`:1781-1782`): append "(coop-real F1c) In every mode it first notes the time of the mode's last
     restart (`lampRestartAt`, the stale lamp round rule)." Still allocation-free (CLAUDE.md:254). `lampForce` set in
     Course mode is harmless (only `tx.step` reads it).
   - `onLampShot`: insert, directly after the `if (id < 0 || !hostShotAllowed(...) || !hostShotWeapon(...)) return;`
     line (`:1321`) and before the F1b repeat-round comment (`:1322`):
     ```ts
     // (coop-real F1c) a round fired before the last set / section restart (in flight across it): the restart put the
     // lamps back, so it would shoot one out in the fresh run; dropped with no violation, before the rate limit
     if (lampShotStale(m.rt, this.lampRestartAt)) return;
     ```
     Every other check unchanged and in the same order. In the doc comment (`:1311-1317`) add one sentence after the
     checks list: "A round fired before the mode's last restart is dropped quietly (`lampShotStale`, coop-real F1c)."
3. `docs/systems/coop.md`: at the end of the F1b lamp-shot bullet (`:354-357`, after "...after a join or rejoin."),
   add, wrapped at 120 characters with the bullet's 2-space indent: "(coop-real F1c) A lamp round fired before the last
   set or section restart (`rt + CLIENT_INTERP_DELAY` earlier than the restart's host time + `LAMP_RESTART_SLACK`
   0.2 s; `lampShotStale`) is dropped with no violation, so a round in flight across a restart never puts out a lamp
   the restart brought back (Sector Ops alike)." Do not edit the Sector Ops wire paragraph (`:463-470`, coop4 edits it).
4. `changes/feature-cr-f1c.md`: line 1 `# Co-op lamp shots: no stale round after a restart`, line 2 `kind: patch`, then
   one `- ` bullet: in co-op (Marlow Yard and Sector Ops) a client's round at a lamp fired just before a set or section
   restart no longer shoots that lamp out in the fresh run; no wire change.

## Tests
### `tests/courseLampWire.test.ts` (extend; keep every existing case unchanged and passing)
- Import `lampShotStale`, `LAMP_RESTART_SLACK` from `../src/net/validate` and `CLIENT_INTERP_DELAY` from
  `../src/net/interp`.
- `host()` helper: add a third parameter `restartAt = -Infinity` and put `lampRestartAt: restartAt`, `lampRestarts: 0`,
  `lampForce: false` and `mode: { restarts: 0 }` on `g` (`g.mode`) in the stand-in. Return `h` too (for `sendLamps`).
- New `describe('coop-real F1c: no stale lamp round across a restart', ...)` with:
  - The rule: `lampShotStale(0, -Infinity)` false. With `R = 12`: `lampShotStale(R - CLIENT_INTERP_DELAY - 0.5, R)` true
    (fired 0.5 s before); `lampShotStale(R - CLIENT_INTERP_DELAY + 0.1, R)` true (inside the slack);
    `lampShotStale(R - CLIENT_INTERP_DELAY + 0.3, R)` false (fired at the Sector Ops respawn, 0.3 s after);
    `expect(LAMP_RESTART_SLACK).toBeLessThan(0.3)`.
  - The host notes the restart time in every mode: a Course-shape stand-in (`lampTx: null`) with `time: 12`; set
    `g.mode.restarts = 1`; call the private `sendLamps(1 / 60)` (cast as `onLampShot` is); expect `lampRestartAt` 12 and
    `lampRestarts` 1. Set `time` 13 and call again with `restarts` unchanged: `lampRestartAt` stays 12.
  - A stale round is dropped quietly: `clientShot()` (its `rt` is 5 - `CLIENT_INTERP_DELAY`: the client stand-in's
    `clock.now` is 5) at a host stand-in with `restartAt` 6: `shootLight` not called, lamp 0 not destroyed,
    `violations` 0, and the stand-in's `lampLim` has no entry for `'C'` (returned before the limiter).
  - A round fired after the restart still lands: the same shot at a stand-in with `restartAt` 4: `shootLight` called
    once with 0, lamp 0 destroyed, `violations` 0.

### `tests/courseLampHook.test.ts` (new): the real constructor, heavy parts mocked
Runs the real `CoopClient` constructor on a plain fake `g` / `s`, with the constructor's heavy collaborators replaced by
`vi.mock` (pattern: `tests/guardLook.test.ts:39`, `async (orig) => ({ ...(await orig<object>()), X: ... })`) and two
private methods stubbed on the prototype with `vi.spyOn`. Mock exactly these (each keeps the module's other exports):
- `../src/net/torchMirror`: `TorchMirror` -> `class { clear(): void {} }` (constructor `coopClient.ts:169`).
- `../src/net/clientCarry`: `ClientCarry` -> `class { dispose(): void {} }` (`:172`).
- `../src/game/course/courseFeed`: `CourseFeed` -> `class { dispose(): void {} }` (`:181`).
- `../src/game/interactables`: `Interactables` -> `class { items: unknown[] = []; dispose(): void {} remove(): void {} }`
  (`:247`).
- `../src/net/bgTicks`: `keepSimInBackground` -> `() => () => undefined` (`:256`).
In `beforeEach`, on `CoopClient.prototype` (cast to
`{ placeStart(): void; recolour(): void; lampRay(a: Vector3, b: Vector3): void; swayRay(a: Vector3, b: Vector3): void }`):
`placeStart` and `recolour` -> no-op (`:179`, `:174`; `:402`, `:414`); `lampRay` -> pushes `'lamp'` to an `order: string[]`;
`swayRay` -> pushes `'sway'`. `afterEach`: `vi.restoreAllMocks()`.
Fake `g` (only what the constructor and `dispose` read; cast `as unknown as GameState`):
`opts: { mode }`, `world: { level: { lights: { sway } }, parts: null }`, `ballistics: { hitDistance: () => 1e9, clear: () => true }`,
`weapons: { onRay: null, markCheckpoint() {} }`, `events: { on: () => () => undefined }`, `explosions: { onLocalBlast: null }`,
`strike: { authority: true }`, `gadgets: { onLocal: null }`, `takedownVictims: null`, `bodyStamp: null`,
`interactables: null`, `scene: null`, `hud: { setObjective() {} }`, `ctDev: null`. Fake `s`:
`{ events: { on: () => () => undefined }, toHost: vi.fn(), selfId: 'C', players: new Map() }`.
After `new CoopClient(g, s)`, set `g.ctDev = { ricochetRay: () => order.push('ricochet') }` and call
`g.weapons.onRay!(a, b)` with two `new Vector3(...)` points. Cases:
- Course mode, no pendants (`sway: null`): `order` is `['lamp', 'ricochet']`, and the `lampRay` spy got the same `a`, `b`.
- Course mode with pendants (`sway: { n: 2 }`): `order` is `['lamp', 'sway', 'ricochet']`.
- Infiltration (`mode: 'infiltration'`, `sway: { n: 2 }`): `order` is `['sway', 'ricochet']` (no lamp hook outside
  Sector Ops and Course mode; `clientLampShots`).
- Course mode, then `client.dispose()`: `g.weapons.onRay` is null (the real `disposeClientCourse` returns at once: no
  mirror for this `g`, `courseMode.ts:1205-1207`).
Sector Ops is left out (its block builds `CtDevices` and `RatingCard`). If the constructor needs anything not listed
above (a throw naming a missing field), add the smallest plain field to the fake and say so under Deviations; if it
needs a further module mock or a source change, STOP: `status: blocked <what it needs>`.

## Run (unit tests only: no e2e, no GPU, no `npm run check`, no dev server)
`npx tsc --noEmit -p .`;
`npx eslint src/net/validate.ts src/net/coopHost.ts tests/courseLampWire.test.ts tests/courseLampHook.test.ts`;
`npx vitest run tests/courseLampWire.test.ts tests/courseLampHook.test.ts tests/sectorLampSync.test.ts tests/lampSway.test.ts tests/shotOrigin.test.ts tests/coopGuardAi.test.ts tests/coopCarry.test.ts tests/coopFix.test.ts tests/net.test.ts tests/changesFragments.test.ts`
(add `--maxWorkers=2` if the box is small). Every shell command with a timeout.

## Rules
- Hot paths do not allocate (CLAUDE.md:254): the poll and the check add no allocation per step or per message.
- Babylon only through `src/core/babylon.ts`. `import type` for type-only imports (`verbatimModuleSyntax`). Strict TS
  (`noUncheckedIndexedAccess`). `src/net` is never imported by single player.
- Rules from `git show origin/master:CLAUDE.md` ("Hard rules", "Definition of done") and
  `docs/systems/agent-preamble.md` (git add only your files, never `-A`; never stash, reset, rebase, force-push).

## Stop conditions (`status: blocked <one-line reason>`, evidence under `## Report`, push, move on)
- The fix needs a wire or `PROTOCOL_VERSION` change, or a file outside the list.
- At the base, `m.rt` is not on the host clock as described (`coopClient.ts:267-269`, `:709`), or either mode has no
  public `restarts` incremented in the same call that puts the lamps back.
- `courseLampHook.test.ts` cannot run the real constructor with the mocks above plus plain fake fields.
- Any listed vitest file fails at the base before your change (report which).

## Done when
- tsc and eslint clean, the vitest files above pass, `git diff --stat dadacd58` lists only the six files above.
- Commit on `feature/cr-f1c` with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, push
  `origin feature/cr-f1c`. No master merge, no PR. Then append a `## Report` at the end of this brief and set line 1 to
  `status: done feature/cr-f1c <sha>`; commit and push `cloud-queue`.
- Report format: branch @ sha and `git diff --stat dadacd58`; per file what changed with file:line; test names and counts
  per vitest file; tsc / eslint results; Deviations (or "none"); "No wire or PROTOCOL_VERSION change."
- A cloud session cannot message back. A question you cannot settle from this brief: `status: blocked <reason>`.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
- `feature/cr-f1c` @ d4706918. `git diff --stat dadacd58`: 6 files, +208 -9 (changes/feature-cr-f1c.md +4, docs/systems/coop.md +3, src/net/coopHost.ts 17, src/net/validate.ts +15, tests/courseLampHook.test.ts +116 new, tests/courseLampWire.test.ts 62). No stop condition: the listed files passed at the base (171/171).
- validate.ts: import CLIENT_INTERP_DELAY :21; LAMP_RESTART_SLACK = 0.2 :273; lampShotStale(rt, restartAt) :280, under hostLampShots.
- coopHost.ts: import :24 (+lampShotStale); field lampRestartAt = -Infinity :189; sendLamps polls restarts above the lampTx gate in every mode and records lampRestartAt = time :1796 (doc :1789-1790); onLampShot drops a stale round before the F1b repeat check and the limiter, no violation :1328 (doc :1320).
- coop.md: F1c sentence at the end of the F1b lamp-shot bullet :358-360. changes/feature-cr-f1c.md: kind: patch, one bullet.
- Tests (vitest, --maxWorkers=2): 10 files, 179/179. courseLampWire 10 (6 old + 4 new: the rule, the restart time noted in Course mode, a stale round dropped quietly before the limiter, a round after the restart lands); courseLampHook 4 (course no pendants [lamp, ricochet]; course with pendants [lamp, sway, ricochet]; infiltration [sway, ricochet]; dispose clears onRay); the other 8 files 165, unchanged. Rerun by the builder session: the two lamp files 14/14.
- typecheck:fast clean; eslint clean on the 4 changed code files. Deviations: none. No wire or PROTOCOL_VERSION change.
