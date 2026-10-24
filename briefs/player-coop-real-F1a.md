status: open

# Brief: coop-real F1a - Course mode client applies a shot-out lamp from `lights.dead` (walk bug S2, apply half) (Player Build)

Lead: Night Shift | Player Build, 2026-10-24. Small co-op fix in one game file, no wire change, unit tests only.

## The bug (S2) and this half
In Course mode (Marlow Yard) a lamp shot out by the CLIENT never goes dark on the host and is never sent back as a lamp
change; only Sector Ops wires client lamp shots (docs/coop-real/BRIEF.md:18, STATE.md "Known before the run").
The fix has two independent halves:
- F1b (other brief, `briefs/player-coop-real-F1b.md`): the client's round through a lamp goes to the host as the
  existing `shot` at `lt-<id>`, and the host shoots it out in Course mode too.
- F1a (this brief): once the host's registry has that lamp destroyed, the host's `course` message already lists it in
  `lights.dead` (`CourseMode.wire()`, `src/game/modes/courseMode.ts:1065-1075`, sent at once because the registry
  `version` bump sets `dirty`, `:621-626` -> `:653-658`). This half makes the client side of that path explicit,
  tested and on par with Sector Ops: the dark lamp, the sparks cue for a newly shot lamp, restore on a restart.

F1a and F1b share no file and may run in parallel. Neither needs the other to build or to pass its tests.

## Base and branch
- Base `origin/feature/coop-real` at `a174b0822c7fdb0fc4f4bb87007a01632f171cea`. New branch `feature/cr-f1a`; push there
  only. No master merge, no rebase, no other branch. `npm ci` once if needed.

## Files (only these)
- `src/game/modes/courseMode.ts` (the plan says `courseMode.ts`; the real path is under `modes/`)
- `tests/courseLampShot.test.ts` (new)
- `changes/feature-cr-f1a.md` (new fragment; see `changes/README.md`)
Nothing else: not `src/net/*` (F1b and open PR #317 own those), not `scripts/e2e-coop-real/*` (the lead removes the S2
KNOWN BUG mark after the laptop run), not `PROTOCOL_VERSION`.

## What is there now (read these first)
- Client apply: `applyCourseWire`, `src/game/modes/courseMode.ts:1306-1336`. Lights at `:1324-1331`:
  restore every locally destroyed lamp not in `w.lights.dead`, `reg.kill(id)` every id in it (silent: no cue), then
  `reg.setGroup` + `g.stealth?.syncGroup` per group. Note `:1319` `mirrorOf(g)` builds the client mirror (WeakMap
  `mirrors`, `:1170`) on the first message.
- Host pack: `wire()` `:1065-1075`, the dead list at `:1072-1073`.
- Registry: `src/world/lights.ts` `kill` `:428` (mirror a host shot, destructible or not, bumps `version`), `restore`
  `:388` (back on, keeps a jam), `setGroup` `:361` (skips destroyed lamps), `destroy` `:378` (what the host's
  `StealthSystems.shootLight`, `src/game/stealthSystems.ts:496`, does for its own round and for a client's checked shot).
- The Sector Ops model to match: `src/net/lampSync.ts` `applyLamps` `:91-108` (kill + `onShot` cue once per newly shot
  lamp) and the client's cue `src/net/coopClient.ts:162` (`lampSparks`: `g.vfx.sparks(new Vector3(l.x, l.y, l.z),
  Vector3.Down(), 10, '#fff1c8')`). Its tests: `tests/sectorLampSync.test.ts:102-117` (cue once, a keepalive repeats no
  cue), `:26-41` (the `level()` fixture to copy).
- Parser keeps `dead` (ints 0..1e5, cap 1024): `src/net/protocol.ts:778`; asserted in `tests/net.test.ts:796-803`.

## Build
1. Export a pure, Babylon-free, allocation-free helper in `courseMode.ts`:
   `applyCourseLights(reg: LightRegistry, lights: CourseWire['lights'], onShot?: (l: LightDef) => void): number`
   doing exactly what `:1324-1330` does on the registry (restore lamps not in `dead`, kill lamps in `dead`, `setGroup`
   per group), calling `onShot(l)` once for each lamp it newly kills (destroyed false -> true here), returning how many
   lamps it newly killed. `applyCourseWire` calls it and keeps the `g.stealth?.syncGroup(gid, on)` loop over
   `w.lights.groups` after it. Same order as today: restore, kill, groups.
2. Sparks cue: `applyCourseWire` passes an `onShot` that plays the same sparks as `coopClient.ts:162`, but NOT on the
   first `course` message this page applies (a join or rejoin must not spark every lamp already dead): take
   `const first = !mirrors.has(g)` at the top of `applyCourseWire`, before `:1319` builds the mirror, and pass
   `undefined` when `first`. Babylon (`Vector3`) only through the existing `../../core/babylon` import.
3. Host pack: export `deadLamps(reg: LightRegistry, out: number[]): number[]` (clears `out`, pushes every destroyed
   lamp's id, returns `out`) and use it in `wire()` at `:1072-1073` (behaviour identical), so the test covers the host's
   side of the path.
4. Do not change the `CourseWire` shape (`src/game/course/courseWire.ts:18`), the parser or any send rate. If the fix
   seems to need a wire change, STOP: `status: blocked <reason>`.
5. Comments in the house style: a `(coop-real F1a, S2)` tag on the helper and the cue line.

## Test `tests/courseLampShot.test.ts` (new)
Copy the `level()` fixture of `tests/sectorLampSync.test.ts:26-41` (host and client build the same registry). Cases:
- A client's shot lamp reaches the client: on the host `destroy(1)` (as `shootLight` does after F1b's check) ->
  `deadLamps(host, [])` is `[1]` -> a `course` message through `JSON` and `parseMessage` (minimal message shape of
  `tests/net.test.ts:797-802`) keeps `lights.dead` `[1]` -> `applyCourseLights(client, m.lights, cue)` -> client lamp 1
  `destroyed` and `on === false`, the cue fired once with id 1, lamp 0 still on, return value 1.
- The same message again (the 2 s keepalive): no second cue, lamp 1 still dead, return 0.
- No `onShot` (the first message after a join): lamp dark, nothing thrown.
- A course restart: a message without 1 in `dead` restores lamp 1 (on with its group).
- Groups: host group 3 off and lamp 1 dead -> client lamp 0 off, lamp 1 dead; then group 3 on again -> lamp 0 on, lamp 1
  stays dead (`setGroup` skips it).
- An id the client registry lacks (e.g. 900) in `dead` is skipped without a throw.

## Run (unit tests only: no e2e, no GPU, no `npm run check`, no dev server)
`npx tsc --noEmit -p .`;
`npx eslint src/game/modes/courseMode.ts tests/courseLampShot.test.ts`;
`npx vitest run tests/courseLampShot.test.ts tests/net.test.ts tests/courseConsole.test.ts tests/coopRejoin.test.ts tests/marlowN4Hold.test.ts tests/intelPartB.test.ts tests/changesFragments.test.ts`
(add `--maxWorkers=2` if the box is small). Every shell command with a timeout.

## Rules
- Hot paths do not allocate (CLAUDE.md:214): the helper and `deadLamps` allocate nothing; `applyCourseWire` runs per
  `course` message, not per frame: one cue closure per message is fine, the sparks `Vector3` only per newly shot lamp
  (as Sector Ops). Nothing new in `clientCourseFrame` or `fixedUpdate`. `hyp2` / `hyp3`, never `Math.hypot`.
- Babylon only through `src/core/babylon.ts`. `import type` for type-only imports (`verbatimModuleSyntax`), e.g.
  `import type { LightDef, LightRegistry } from '../../world/lights'` beside the existing value import of `groupBaseOn`.
- Strict TS (`noUncheckedIndexedAccess`). No `PROTOCOL_VERSION` change (CLAUDE.md:242: the train build bumps it).

## Done when
- tsc and eslint clean, the vitest files above pass, `git diff --stat a174b082` lists only the three files above.
- `changes/feature-cr-f1a.md`: line 1 `# Course mode: client lamp shots go dark (apply half)`, line 2 `kind: patch`,
  then one or two `- ` bullets (a lamp the host reports shot out goes dark on the co-op client with the sparks cue, not
  on a join; a restart brings it back; no wire change).
- Commit on `feature/cr-f1a` with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, push
  `origin feature/cr-f1a`. Then append a `## Report` at the end of this brief (what changed with file:line, test names
  and counts, deviations) and set line 1 to `status: done feature/cr-f1a <sha>`; commit and push `cloud-queue`.
- A cloud session cannot message back. A question you cannot settle from this brief: set line 1 to
  `status: blocked <one-line reason>`, add the evidence under `## Report`, push, and move on. The lead answers by
  editing this brief.
