status: blocked until #255 is on master

# LR16-4 board - one untimed breaker board on campusOps: the S2 reception panel (Sonnet, data slice)

Planner: Opus 5.5, 2026-10-23. Plans only; the builder writes the code. Read `docs/systems/agent-preamble.md` first.

## Why
- CT (`docs/ct-research/levels-digest.md:229-230`, cited as LV:230 in `checks/lr16-0-ct-audit.md` row 10): the hall lights
  go off, a guard leaves his post to fix them, a player grabs him and carries him off.
- Guard AI #255 (`feature/guard-ai-relight` f08c448c) gives untimed boards the S15 breaker walk:
  `IsolatorBoards.switchBack` / `cutBoard` / `holding` / `liveGroup` (`src/game/isolators.ts:104-145` there),
  `StealthSystems` board `cut` sink (`src/game/stealthSystems.ts:102`) and `breakerHost` (`:491`). Its polish item 7:
  "No live map has an untimed breaker board, so the new path is unreachable in play".

## The pick: S2 Atrium Hall, the reception panel
- SPEC S2 "Lighting": "atrium pendants and the reception downlight (`s2-atrium`, reception panel: lure #1, who sees his
  own room go dark)". SPEC "Lighting rules" (`SPEC.md:149-151`): "Breakers and boards are switches at a real board until
  EW8 (A11)". EW8 is built, so the panel becomes the real board it stands for.
- Today it is a wall switch, `src/world/maps/campusS2.ts:176-177` at (-8.4, 0, -28.5), yaw -PI/2, group
  `S2_GROUPS.atrium` (50: 3 pendants + the reception downlight). Guard #1 (`campusSectors.ts:74-75`, reception officer
  at (-20, -24.9), no `post`, so not `secure`) sees the downlight in his room (`tests/campusS2.test.ts:575-603`) and
  walks > 9 m to the panel (`scripts/e2e-sectorops.mjs:1882-1920`, leg (d)); the player waits in the dark east plant
  room (hide spot `S2_HIDESPOTS[0]` (2.5, 0, -24), the carry target). With #255 a takedown at the board before the
  flip leaves the atrium dark (#255 polish 1): the lure ambush.
- Not picked: S3 switch bank (`campusS3.ts:210-212`; #16 sweeps at it: no walk), S4 hall panel (`campusS4.ts:198-200`;
  in the service corridor 7 m from #4, three per-row lures already in e2e), S5 hall (`campusS5.ts:264`; cam-hall, the
  door officer and the gallery overlook it). S1's feeder pillar is outdoors (two breakers, `campusS1.ts:129-130`).
- Timed boards stay exactly as they are: `S4_BOARDS` `campusS4.ts:164` (group 75 yard, `window: 20`) and `S5_BOARDS`
  `campusS5.ts:221` (group 84 garden, `window: 20`).

## Base
The sector-redesign branch the lead names, after master (with #255) is merged into it, and after LR16g has landed:
LR16g edits `campusS2.ts:565` and `tests/campusS2.test.ts` (never two agents on one file). Line numbers below are
master 41204e30; re-find them by the quoted text.

## Data change (exact)
1. `src/world/maps/campusS2.ts:176-177`: delete the reception panel's comment and switch entry from `S2_SWITCHES`
   (the six balcony / kitchen / L1 corridor switches stay).
2. `src/world/maps/campusS2.ts`, after the `S2_SWITCHES` closing `];` (`:185`); add `import type { BoardDef } from
   '../../game/isolators';` beside the imports (`:1-6`, as `campusS4.ts:7`):
   ```ts
   /**
    * (LR16-4) The reception panel: an untimed breaker board (EW8, no `window`) on `s2-atrium` (the three pendants and the
    * reception downlight), on the foyer's east wall. Lure #1: he sees his own room go dark, walks to the board and
    * switches it back (guard-ai LR16-4, #255); taken down at the board, the atrium stays dark.
    */
   export const S2_BOARDS: BoardDef[] = [{ pos: new Vector3(-8.4, 0, -28.5), yaw: -PI / 2, groups: [S2_GROUPS.atrium] }];
   ```
3. `src/world/maps/campusOps.ts:5`: import `S2_BOARDS`. `:127`:
   `boards: [...inSection(S4_BOARDS, 3), ...inSection(S5_BOARDS, 4), ...inSection(S2_BOARDS, 1)],`
   Appended last on purpose: `board-0` (S4 yard) and `board-1` (S5 garden, `e2e-sectorops.mjs:3178`) keep their ids;
   the panel is `board-2`. The item total stays 196 (one switch out, one board in; `tests/sectorItemScope.test.ts`).
4. Switch ids after S2's first shift by one; every switch lookup in `e2e-sectorops.mjs` is by group (`findIndex`), and
   `switch-0` is S1's: grep `switch-` in `scripts/` and `tests/` and confirm none uses a fixed index past S1.

## Tests
- `tests/campusS2.test.ts` (only the asserts naming the atrium switch; grep `S2_GROUPS.atrium` and `switches`):
  - `:545-556` "the switches: ...": atrium switches 0; one board in `lay.boards` with `groups` `[S2_GROUPS.atrium]`, no
    `window`, `section` 1, in the foyer (x -30..-8, z < -23); rename the test to "the reception panel is a board ...".
  - `:601-602`: `panel` from `lay.boards` (same room as #1).
  - Add: the board is within 1.1 m of a nav cell on its floor (copy `nearNav` from `tests/campusS4.test.ts:285`).
- New `tests/campusS2Board.test.ts` (harness: copy `systems()`, `guard()`, `manager()`, `ctxOf` from #255's
  `tests/guardRelight.test.ts:40-110`, with `layout = { switches: lay.switches, boards: lay.boards }` and the
  registry `b.lights` of `campusOps.build(new LevelBuilder(), 0)`, as `campusS2.test.ts:30-31`):
  1. "(LR16-4) cutting the reception panel reports a breaker fault on s2-atrium at the board": `use('board-<k>')`
     (k = `lay.boards.findIndex((q) => q.groups.includes(50))`): the 4 atrium lamps off, `em.lightsOut` called with
     (-8.4, -28.5, 2.5, -1, 50); `h.isOff(50)` true; `h.switchOf(50, -20, -24.9, p)` gives the board's position.
  2. "(LR16-4) a guard sent to the cut board relights the atrium": a stand-in guard at #1's post (-20, -24.9) facing
     the desk's way; replay the cut into `manager(...)`.lightsOut: exactly he gets `resetBreaker` to the board, kind
     `breaker`, circuit 50; `ctxOf(em).breakerReset!(him, 50)` -> `ss.boards.cut[k]` 0, 4 lamps on, the item label
     `Breaker off`, `lightSwitch` `{ on: true }` emitted.
  3. "(LR16-4) a shot pendant stays dark after the switch-back": `reg.destroy(<a pendant id>)` after the cut, reset:
     3 on, the shot one off.
  4. "(LR16-4) the timed boards keep their windows": the 75 and 84 boards have `window` 20, `ss.boards.timed(i)` true,
     `h.isOff(75)` false while one runs.
- Run: `npx tsc --noEmit`; `npx vitest run tests/campusS2.test.ts tests/campusS2Board.test.ts tests/campusS4.test.ts
  tests/campusS5.test.ts tests/sectorItemScope.test.ts tests/sectorIsolator.test.ts tests/guardRelight.test.ts
  tests/sectorDesk.test.ts --maxWorkers=2` (slot lock `C:/NightShift/scratch/sr-slot-{1..4}.lock`).

## e2e leg (scripts/e2e-sectorops.mjs, campus S2 part, leg (d) at `:1882-1920`)
Rewrite (d) for the board, same flow and timings:
- `pn`: `k = g.world.layout.boards.findIndex((q) => q.groups.includes(50) && !q.window)`; assert `k >= 0`, no switch
  on group 50, 4 atrium lamps on, #1 > 9 m off the board.
- Use `board-${k}`; over 25 s of sim in 0.5 s steps: `e.breakerGroup === 50` at 0.5 s, #1 comes within 2 m of the
  board, the 4 lamps come back, `g.stealth.boards.cut[k] === 0`.
- Optional (d2), only if the S2 part already has a takedown helper (grep `takedown` in the file): cut again after
  `BREAKER.repeatT`, take #1 down within 2.5 m of the board before his reset ends: the atrium stays dark 10 s, no alert
  stage. Else list it for the lead.
The run is the Test Runner's (laptop, `E2E_GPU=1`, `node scripts/run-e2e.mjs e2e-sectorops`); the builder only checks
`node --check scripts/e2e-sectorops.mjs`.

## Docs (one line each)
- `TESTING.md`: #255's "(An untimed Sector Ops breaker board uses the same walk; no map defines one yet.)" -> "Campus
  S2: cut the reception panel board; #1 walks over and switches the atrium back on; take him at the board and it stays
  dark."
- `docs/sector-redesign/SPEC.md:149-151` "Lighting rules": boards are real boards since EW8; guards relight cut
  breakers and boards (guard-ai S15, LR16-4); timed isolators stay the player's.
- The job's changes fragment (the lead names it): one entry.
- Report `docs/sector-redesign/checks/lr16-4-board-build.md`.

## Files (only these)
`src/world/maps/campusS2.ts` (`:1-6` import, `:175-185` only), `src/world/maps/campusOps.ts` (`:5`, `:127`),
`tests/campusS2.test.ts` (the asserts above), `tests/campusS2Board.test.ts` (new), `scripts/e2e-sectorops.mjs`
(leg (d) only), `TESTING.md`, `docs/sector-redesign/SPEC.md` (`:149-151`), the fragment, the report.
Never: `src/game/*`, `src/ai/*`, `src/net/*`, other maps' data, S4 / S5 boards.

## Acceptance
1. `npx tsc --noEmit` clean; the vitest list above passes.
2. campusOps has exactly one untimed board (S2, group 50) and no switch on group 50; S4 (75) and S5 (84) boards
   unchanged (`window` 20, ids `board-0`, `board-1`).
3. Unit: the cut reports a breaker fault at the board; the guard sent relights all 4 atrium lamps through
   `switchBack`; a shot pendant stays dark; timed boards refuse the guard.
4. Item total 196, per-section cap test green; no wire, save or `PROTOCOL_VERSION` change.
5. e2e-sectorops leg (d) passes on the laptop run the lead queues.

## Model
Sonnet 5.5 builds; Sonnet 5.5 checks (data + test; no `src/ai` / `src/net` change). ~0.25 window.
