# anim-studio PR 2 - fresh check (2026-10-21)

Commit `cf8e0f40` on `feature/anim-studio-2`. Read-only review against CLAUDE.md (prototype quality: block only on broken
or unplayable work), `BRIEF.md` and `REPORT-2.md`.

Ran: `npx tsc --noEmit -p .` clean; `npx eslint` on every changed `src` / `tests` file clean;
`npx vitest run tests/animStudio2.test.ts tests/animStudio.test.ts` 37 / 37 pass. e2e not run (the job lead runs it).

## Verdict: PASS

## Blockers
None.

## What was checked

**1. Real play and co-op unchanged at default.**
- **`GameState.frameUpdate` (`gameState.ts:2185-2190`)** writes `MOVE_TUNE_TEAM.group` / `.k` from `team.state`, or
  'revive' when `interactTarget.kind === 'revive' && progress > 0`.
  - A table lookup and a switch; no allocation.
  - Read only by `Player.frameUpdate`.
- **`Player.frameUpdate`:** `moveTuneSelect` + `moveTuneRoot` at `player.ts:373-374`, and `moveTuneBegin` / `moveTuneEnd`
  around `rig.animate` at `player.ts:521-525`.
  - At default every slider is 0 (`time` is 1), so `moveTuneRoot` writes nothing to the position or the yaw.
  - `moveTuneBegin` skips lean, crouch and time, and returns before touching the grips (`shifted` stays false, so
    `moveTuneEnd` restores nothing). The output is bit-identical.
  - `rp.traverseT` and `rp.tumble` are re-copied from the pose every frame, so a non-zero value cannot compound either.
  - The begin / end nesting stays LIFO (`handsBegin` -> `moveTuneBegin`; `moveTuneEnd` -> `handsEnd`).
  - The registry mutates `values[group]` in place, so the `REFS` cache stays valid through undo, A/B, presets and reset.
- **`TeamController.partT`** is a getter over the existing `t`; no behaviour change.
- **`studioTeleport` and the door hooks** can run only in the studio:
  - `studioTeleport` is private.
  - It and the door hooks are reached only through the `StudioHost` closures.
  - `StudioStage` is built only when `!opts.net && map.id === STUDIO_MAP_ID` (`gameState.ts:785-787`).
- **The `InputState` change cannot alter normal input:**
  - `tick(dt)` (an existing method) is called only on the studio's own `inp` (`studioStage.ts:134`). The app's
    `InputState` is untouched, and no `src/input` file changed.
  - The studio's `inp` is read only while `studio.drives`.
- **Nothing reaches the wire, `RemoteAvatar`, guards or the host's team sim:**
  - No `src/net` file changed.
  - `moveTune*` is called only from `player.ts` and `studioStage.ts`.
  - `Player` is built once per `GameState`; the partner is drawn by `RemoteAvatar`.
- **New sections:** the 7 new registry sections are registered at module load. `TUNE_SECTIONS` is iterated only by the
  panel, history and reset (not per frame).

**2. Co-op safety.**
- `MOVE_TUNE_TEAM` comes from the local `TeamController`, which holds the local role on both the host and the client, and
  from the local `interactTarget`.
- The revive maps to role A (the reviver) only. Role B (downed) is studio-only (A4).
- Tuned values move only the local rig. The wire carries capsule state, never the rig.

**3. The studio map.**
- It is still `DEV_MAPS` only (`world/maps/index.ts:24`).
- The anchors, doors, window, duct, rope and lamps belong to the `World` instance and go with it. The only module-level
  rig list (`LIVE_RIGS`) is spliced by `CharacterRig.dispose`, which the puppets call.
- `STUDIO_RIGS` and `STUDIO_PAIR` are reset by `studioReset`. `LEDGE_CACHE` is a pure keyed cache.
- A 28 x 28 x 8 m room with 7 lamps is small next to the real maps. It is not in the perf runs.

**4. Hard rules.**
- No per-frame allocation in `travTick`, `pairFrame` / `posePuppet`, `Ropes.set`, or the move-section select / root /
  begin / end. The one exception is in polish item 1.
- Babylon comes only through `core/babylon`; `import type` is used where required (tsc `verbatimModuleSyntax` is clean).
- No `src/net` import. The revive time is copied, not imported.

**5. Studio exit.** `dispose()`:
- drops the guard and the gdrive;
- shows Wren again;
- disposes both puppets and takes them out of `STUDIO_RIGS`;
- hides the rope;
- clears `MOVE_TUNE_TEAM.follow`; `group` and `k` are rewritten every frame by the next match;
- then calls `studioReset`.

`GameState.exit` nulls `studio`, so the synthesised input stops. Picking another entry inside the studio sends Wren back
to the middle (`away`) and shows her again.

**6. e2e-studio additions.**
- **`pair:boost`** is deterministic.
  - Seek and step freeze the clock. The boost cycle is 3.9 s = 117 frames, so the seek lands exactly on frame 60 and a
    step moves exactly 1/30 s.
  - The states and heights asserted (A `boost`, B `assist` at 0.6 s into a 0.9 s boost) sit well inside their windows.
- **`trav:ladder`** is the likely flake. It depends on the physics:
  - the walk-in stops at 1.0 m with CT stop momentum, and then the jump press has to land inside the ladder's attach
    reach;
  - a body that over- or under-shoots misses the single press, and the loop only retries after a full reset (about 9 s),
    while the check stops after 8 s (16 x 0.5 s).
  - The fix, if it flakes: allow about 24 steps, or assert `attach === 'ladder'` over two loops.
- **The "back in the middle" check** is robust: the teleport happens in `configure` on the pick.

## Polish list
1. **`studioPairs.ts:419`:** `teamGroup('revive', 'b')` builds a template string every frame during the revive's downed
   part (studio only). Hoist it to a module const.
2. **`studioStage.ts:150`:** the non-traversal input path never releases `drop`. If the entry changes on the tick right
   after a traversal loop's `drop` press, `drop` stays held on the studio input. Release it like the other buttons (or
   on `configure`).
3. **`studioStage.ts:377`:** `loadPlayLods` can settle after the puppets are disposed (leaving the studio quickly). It is
   caught by `warnLoad`, the same pattern as the remote avatar. Harmless, but it may log a warning.
4. **The hidden Wren still adds a contact blob** at the pairs' viewing spot (`gameState.ts:2246`; only without real sun
   shadows).
5. **The e2e assert `pr.tA === pr.tB` is a tautology:** `pairFrame` sets `tA = tB = t`. The one-clock property holds by
   construction.
6. **Non-identity ordering is unverified in the browser:** `moveTuneRoot` turns `root.rotation.y` before the wall block
   and the later `rp` set-up. A tuned `yaw` on a traversal group that overlaps the wall code may mix with the wall turn.
   This applies only at non-default values.
7. **The report's own polish items still stand:** the traversal input scripts are unverified in a browser (ledge shimmy,
   vent length, rappel, wall), the puppets' hang grips are simple, and there is no `e2e-times.json` entry for
   e2e-studio.
