status: done feature/cr-f1b b49f79fc

# Brief: coop-real F1b - Course mode client lamp shots reach the host (walk bug S2, wire half) (Player Build)

Lead: Night Shift | Player Build, 2026-10-24. Small co-op fix, reuses the existing `shot` message: NO wire change, NO
`PROTOCOL_VERSION` change. Unit tests only.

## The bug (S2) and this half
In Course mode (Marlow Yard) a lamp shot out by the CLIENT never goes dark on the host and is never sent as a lamp
round. Walk report: "coop shooting lights does nothing for either game" (docs/coop-real/BRIEF.md:18). Cause: client
lamp shots are wired for Sector Ops only:
- Client: `src/net/coopClient.ts:188-199`: only the `sector` block installs `g.weapons.onRay = (a, b) => this.lampRay(a, b)`
  (`:197`). A client page is a puppet (`src/game/gameState.ts:547`), so it has no `StealthSystems` and no local lamp
  shot (`gameState.ts:693` vs `:737-745`); in Course mode its rounds only feed the pendant sway (`:214-223`,
  `swayRay`) and camera ricochets (`:254-260`).
- Host: `src/net/coopHost.ts:202` `this.lampTx = mode === 'sector' ? new LampSender() : null;` and `onLampShot`
  (`:1314-1338`) returns at `:1315` `if (!this.lampTx || ...)`, so a `shot` at `lt-<id>` (routed at `:694-696`) does
  nothing outside Sector Ops.
Only Sector Ops does client lamp shots end to end today (Infiltration and sandbox have no co-op lamp sync at all; leave
them alone). Halves:
- F1b (this brief): the client sends the lamp round in Course mode, the host checks it and shoots the lamp out.
- F1a (other brief, `briefs/player-coop-real-F1a.md`, `src/game/modes/courseMode.ts` only): the client applies it from
  the `course` message. The host's `course` message already lists every destroyed lamp in `lights.dead`
  (`CourseMode.wire()`, `courseMode.ts:1072-1074`) and goes at once on a registry change (`:621-626` -> `:653-658`), so
  after F1b alone the client already sees the lamp dark within one step.
F1a and F1b share no file and may run in parallel. Neither needs the other to build or to pass its tests.

## Base and branch
- Base `origin/feature/coop-real` at `a174b0822c7fdb0fc4f4bb87007a01632f171cea`. New branch `feature/cr-f1b`; push there
  only. No master merge, no rebase, no other branch. `npm ci` once if needed.

## Files (only these)
- `src/net/coopClient.ts`
- `src/net/coopHost.ts`
- `docs/systems/coop.md` (the Sector Ops wire paragraph `:455-465` and the Training course wire bullet `:349-353`)
- `tests/courseLampWire.test.ts` (new)
- `changes/feature-cr-f1b.md` (new fragment; see `changes/README.md`)
Nothing else: not `src/net/lampSync.ts`, not `courseMode.ts` (F1a), not `scripts/*` (the lead removes the S2 KNOWN BUG
mark after the laptop run), not `PROTOCOL_VERSION`. Open PR #317 (coop4) also edits coopClient / coopHost / coop.md
(client ~203-220, host ~228-299, ~1251-1299): keep the diff small and local to the lines named here.

## Wire: none
Reuse the existing client -> host `shot` with `target: 'lt-<id>'`, `dmg: 0` (built in `lampRay`, `coopClient.ts:704`;
parsed today; read by `lampTargetId`, `src/net/lampSync.ts:130`) and the existing host -> all `course` message
(`lights.dead`). Do not add a `lamps` send in Course mode (`lampTx` / `sendLamps` `:1776-1787` stay Sector Ops only;
the course client has no `LampMirror`). No message shape changes, so no `PROTOCOL_VERSION` bump and no protocol test
change (CLAUDE.md:242: branches never touch the constant; the train build bumps it for wire changes). If the fix seems to
need a wire change, STOP: `status: blocked <reason>`.

## Build
1. Host, `src/net/coopHost.ts`:
   - New field beside `lampTx` (`:179-180`): `private readonly lampShots: boolean;` with a doc comment
     `(coop-real F1b, S2) A client's round through a lamp is checked and shot out: Sector Ops and Course mode.`
   - Constructor next to `:202`: `this.lampShots = mode === 'sector' || mode === 'course';` (leave `lampTx` as is).
   - `onLampShot` `:1315`: gate on `!this.lampShots` instead of `!this.lampTx`; every other check unchanged (draw,
     weapon, `TickLimiter` 4 a second, `lampShotOk`, reach probe, `HOST_LOS` line, `this.g.stealth.shootLight(id)`).
     Update its doc comment (`:1309-1313`): Course mode too; the client sees it dark from the next `lamps` (Sector Ops)
     or `course` (`lights.dead`, Course mode).
   - Export a tiny pure predicate for the test, e.g. `export function hostLampShots(mode: string | undefined): boolean`
     and use it for the field, so the mode rule is tested, not only the stand-in.
2. Client, `src/net/coopClient.ts`:
   - Export the same rule, e.g. `export function clientLampShots(mode: string | undefined): boolean` (sector or course).
   - Move the hook out of the sector block: keep `this.lamps = new LampMirror()` (`:196`) in the sector block, and put
     `g.weapons.onRay = (a, b) => this.lampRay(a, b); this.offs.push(() => (g.weapons.onRay = null));` (today `:197-198`)
     into one `if (clientLampShots(g.opts.mode)) { ... }` right after the sector block and before the sway block
     (`:212-223`), so the sway and ricochet hooks still chain after it (`prevRay`), in the same order as Sector Ops
     today. Comment tag `(coop-real F1b, S2)`.
   - `lampRay` (`:689-705`) itself is mode-agnostic: change only its doc comment (dark from the host's next `lamps`, or
     `course` in Course mode).
3. Docs, `docs/systems/coop.md`: replace "Course mode unchanged." (`:465`) with one sentence: Course mode takes the
   client's lamp round the same way (`lt-<id>`, same host checks) and the client sees the lamp dark from the next
   `course` message's `lights.dead` (no `lamps` message in Course mode; coop-real F1b). Add half a sentence to the
   Training course wire bullet (`:349-353`) that `lights.dead` includes lamps a client shot out.
4. Known side effect for the report, no action: `scripts/e2e-ctcourse/a3OfficeRange.mjs:247-263` calls the course
   client's `g.weapons.onRay` directly at a camera; `lampRay` now runs there too and only sends if a lamp is first on
   that segment. The lead's laptop run covers it.

## Test `tests/courseLampWire.test.ts` (new)
Copy the `level()` fixture of `tests/sectorLampSync.test.ts:26-41`. Use the prototype stand-in pattern of
`tests/coopGuardAi.test.ts:151-157` (`Object.create(CoopHost.prototype)` / `Object.create(CoopClient.prototype)`,
assign only the fields the method reads; class field initialisers do not run, so set `reachA`, `reachB`, `lampA`,
`lampB` (`new Vector3()` from `src/core/babylon`), `lampLim: new Map()`, `time`, etc.). Cases:
- Mode rule: `hostLampShots` and `clientLampShots` are true for `'course'` and `'sector'`, false for `'infiltration'`,
  `'sandbox'`, `'clear'`, `undefined`.
- Client sends: a `CoopClient` stand-in (`g.world.level.lights` a real registry, `g.ballistics.clear` -> true,
  `g.weapons.current.def.id` `'pistolSd'`, `s.toHost` a spy, whatever `renderTime` reads) calls `lampRay` with a
  segment through lamp 0 (the `o` / `d` of `tests/sectorLampSync.test.ts:245-247`): one message, `target` `'lt-0'`,
  `dmg` 0; after `JSON` + `parseMessage` it is still a `shot` with that target. A segment that misses every lamp sends
  nothing; a lamp already destroyed on the client sends nothing.
- Host shoots it out in Course mode: a `CoopHost` stand-in with `lampShots: true`, `lampTx: null` (the Course shape),
  `g.world.level.lights` a real registry, `g.stealth.shootLight` -> `reg.destroy(id)` (spy), `g.ballistics` stubs
  (`clear` -> true, `hitDistance` -> a large number), and a remote `{ id: 'C', alive: true, feet, state: { mv: { dw: 2 },
  w: 'pistolSd' }, loadout: ['pistolSd'], violations: 0 }`: `onLampShot(r, parsedMsg)` from the case above calls
  `shootLight(0)` once and the host lamp 0 is destroyed.
- Refusals unchanged: the same stand-in with `lampShots: false` does nothing; a bad origin (feet 5 m away) adds a
  violation and shoots nothing; with `time` fixed, the 5th call returns at the limiter before `lampShotOk` (restore
  the lamp between calls, or assert that `violations` stops growing: `TickLimiter`, `src/game/course/courseWire.ts:54`).

## Run (unit tests only: no e2e, no GPU, no `npm run check`, no dev server)
`npx tsc --noEmit -p .`;
`npx eslint src/net/coopClient.ts src/net/coopHost.ts tests/courseLampWire.test.ts`;
`npx vitest run tests/courseLampWire.test.ts tests/sectorLampSync.test.ts tests/lampSway.test.ts tests/shotOrigin.test.ts tests/coopGuardAi.test.ts tests/coopCarry.test.ts tests/coopFix.test.ts tests/net.test.ts tests/changesFragments.test.ts`
(add `--maxWorkers=2` if the box is small). Every shell command with a timeout.

## Rules
- Hot paths do not allocate (CLAUDE.md:214): the `onRay` closure is made once in the constructor (as today); `lampRay`
  allocates only the message on a send (as Sector Ops); nothing new per frame or per fixed step. `hyp2` / `hyp3`, never
  `Math.hypot`.
- Babylon only through `src/core/babylon.ts`. `import type` for type-only imports (`verbatimModuleSyntax`). Strict TS
  (`noUncheckedIndexedAccess`). `src/net` is never imported by single player.

## Done when
- tsc and eslint clean, the vitest files above pass, `git diff --stat a174b082` lists only the five files above.
- `changes/feature-cr-f1b.md`: line 1 `# Course mode: client lamp shots reach the host`, line 2 `kind: patch`, then one
  or two `- ` bullets (in Marlow Yard co-op the client's round through a lamp now shoots it out on the host with the
  same checks as Sector Ops, and both pages see it dark; no wire change).
- Commit on `feature/cr-f1b` with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, push
  `origin feature/cr-f1b`. Then append a `## Report` at the end of this brief (what changed with file:line, test names
  and counts, deviations) and set line 1 to `status: done feature/cr-f1b <sha>`; commit and push `cloud-queue`.
- A cloud session cannot message back. A question you cannot settle from this brief: set line 1 to
  `status: blocked <one-line reason>`, add the evidence under `## Report`, push, and move on. The lead answers by
  editing this brief.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
Branch `feature/cr-f1b` @ b49f79fc (one commit on a174b082). `git diff --stat a174b082`: the five named files only.
- `src/net/coopHost.ts`: :99-102 `export hostLampShots(mode)` (sector / course); :186-187 field `lampShots` with the
  briefed doc comment; :210 `this.lampShots = hostLampShots(mode)` (`lampTx` unchanged, Sector Ops only: no `lamps` in
  Course mode); `onLampShot` :1324 gates on `!this.lampShots`, every other check unchanged; doc :1316-1322 updated.
- `src/net/coopClient.ts`: :66-70 `export clientLampShots(mode)`; `LampMirror` stays in the sector block (:201-202);
  the `onRay = lampRay` hook + cleanup moved to `if (clientLampShots(g.opts.mode))` at :217-222, after the sector block
  and before the sway block, so lampRay heads the chain and sway / ricochet chain after it via `prevRay` (same order as
  Sector Ops before; a puppet page sets no `onRay` of its own). `lampRay` doc :699-701 updated.
- `docs/systems/coop.md`: Training course wire bullet (:351) says `lights.dead` includes client-shot lamps; "Course mode
  unchanged." replaced with the briefed sentence (:466-468).
- `tests/courseLampWire.test.ts` (new, 5 tests): mode rule (both predicates, six modes); client sends `shot` `lt-0`
  dmg 0 surviving JSON + parseMessage; no send on a miss or an already-dead lamp; host Course shape (`lampShots` true,
  `lampTx` null) calls `shootLight(0)` once and lamp 0 is destroyed; refusals (lampShots false: nothing; feet 5 m away:
  1 violation, no shot; fixed time: violations stop at 4 after 5 calls, the limiter blocks the 5th).
- `changes/feature-cr-f1b.md` (patch, title as briefed).
- Checks: tsc clean; eslint on the three files clean; vitest 9 files 170/170 (courseLampWire 5, sectorLampSync 13,
  lampSway 13, shotOrigin 9, coopGuardAi 15, coopCarry 17, coopFix 13, net 84, changesFragments 1).
- Deviations: the brief's host stand-in list names `reachA` / `reachB`, which are client fields: the client stand-in
  has them, the host stand-in has `lampA` / `lampB`. In Sector Ops the lampRay cleanup is now pushed after the
  `ct.dispose` cleanup (both independent; still before the sway cleanup). No wire or `PROTOCOL_VERSION` change.
- Known side effect (item 4, no action): `scripts/e2e-ctcourse/a3OfficeRange.mjs:247-263` calls the course client's
  `g.weapons.onRay` directly; lampRay now heads that chain and sends `lt-<id>` only if a destructible lamp is first on
  the segment. Covered by the lead's laptop run.
