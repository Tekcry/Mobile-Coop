# section-bake check A (gameplay and co-op correctness)

**Verdict: PASS.** No must-fix. Fresh checker A, Opus, desktop agent. Reviewed head cfacf4bc (base master 95849c26); checker B's
f66400ca adds only its own check file. Focus: light parity on the gameplay paths, section changes, co-op, the cache,
gameplay vs graphics state, and test strength. Checker B covers rendering, including the `texSubImage3D` upload.

## Runs (node, `--maxWorkers=2`, slot lock sr-slot-2)
- `npx tsc --noEmit -p .`: clean.
- `tests/sectionBake.test.ts` + `tests/sectionBakeCampus.test.ts`: 14 passed, 1 skipped. The CPU sample read 100% at launch
  and the run went ahead anyway: a timing-free logic run, but it did not follow the 80% rule.
- `SECTION_BAKE_FULL=1 tests/sectionBakeCampus.test.ts` (the opt-in S5 superset parity test, never run in the build):
  **4 passed, 17.5 s.**
- Scratch mutation probes, run outside the worktree against the strip fixture with `SectionBaker`'s `masks` input and
  1500 points per live section:
  - Dropping any needed member lamp is caught: 97 to 879 points differ.
  - Membership by bare reach, and by reach minus 2 m, both give **0** differences for live sections 0, 1 and 2. See P4.
- Scratch probe of the campus geometry: S1's pavilion top reaches open ground that lies in no region. See P3.

## What holds (the brief's claims, checked in code)
1. **Parity in the live region, at every moment of play.**
   - The host plays only once the live section's lamps have landed and been flushed: `GameState.create` waits for
     `whenReady(live)`.
   - The flush (`sectionJobs.ts` :202-205) runs in the same call as the landing that completes a section, so `ready(k)`
     is never true before the listeners have run.
   - Lamps still landing in the background are non-members of the live section, so their light at any live-region point
     is 0 in the field and in the picture.
   - `result.vis` is written in one synchronous `set` per lamp, so no reader sees a half-landed lamp.
   - The bounce is correct:
     - `BounceGrid.adopt` re-sums all lit lamps on the first activation (stale `w` included, since `sync` applies the
       diff next).
     - After that it adds only fresh lamps whose previous box was empty, and the dirty box covers them.
     - The bits are rebuilt as the same OR.
     - `bounceLamp`'s empty return is a zero box, so the joined bytes equal `bakeLevelLamps`' bytes.
   - The 1.5 s fade is picture-only: `fade` is read only by `BakedLamps` and its char-shadow `lampLit`. Meter and guards
     do not see it in the live region.
   - On the host, lamps of k+1 that land while k is live are faded. The far door opens no sooner than `connectorHold` 1 s
     plus `connectorCycle` 3 s after `ready(k+1)`, longer than the fade plus a few frames of tile queue.
2. **Section change.**
   - The run moves on only through the connector cycle, and the cycle cannot start before `ready(index + 1)`
     (`sectorMode.ts:832`).
   - A restart keeps the same section, and `setLive` with the same value is a no-op.
   - A restart during a cycle only happens after the gate.
   - No dev or e2e jump to a later section exists (`SectorRun.index` starts at 0). e2e and tools that use autostart wait
     for `sections.done` (`e2e-lib.mjs:224`).
   - Warehouse Ops, the other maps and `?fullbright` keep the full path (`sectionBakeFor` returns null; the test covers
     `__proto__` and `toString`).
   - With a warm cache there is no baker and no gate.
3. **Co-op.**
   - Host and client bake the same bytes from the same key, shapes and per-lamp bake.
   - Guards are the host's and read the host field for remote players (`gameState.ts:1626`), so the client's own bake
     timing affects only the client's picture and meter, never guard perception.
   - The client's `ls` path (`coopClient.ts:945`) is correct: it ignores -1, and `setLive` with the same value is a
     no-op. No wire change.
4. **Cache.**
   - The key is unchanged. `readLampCache` behaves as before.
   - A warm load is identical to the old path.
   - A dispose saves a finished bake and drops an unfinished one (SB11).
   - A bake that finishes during the load is saved at once.
5. **Gameplay reads no graphics state.**
   - The gate and the load wait read the bake's own progress.
   - `workerCount()` depends on hardware, not on a preset.
   - Nothing in gameplay reads `fade`, `have` or the atlas.

## Must-fix
None.

## Polish (in order of value)
- **P1 Unflushed landings break parity outside the live region.**
  - Where: `sectionJobs.ts:194` writes the lamp's `vis` into the shared buffer at landing, but door lists, bounce adopt
    and the picture (`have`, the tile, the fade) only arrive at the next flush. A flush comes every 8 lamps
    (`FLUSH_LAMPS`) or when a section completes.
  - Failure: in between, the field (meter and guards) reads that lamp's direct light with an empty door list, so light
    passes through shut doors and there is no bounce, while the picture shows nothing. With 2 workers this can last
    several seconds.
  - Where it is seen:
    - On the host, only outside the live region (see P3 for how a player gets there).
    - On a co-op late joiner, inside its own section while that section is still landing. This is display-only: its
      own meter and picture.
  - Fix: keep landed results pending and copy `vis` at flush, or flush on every landing.
- **P2 Fade membership is decided at landing time** (`bakedLamps.ts:738`). A lamp that landed while its section was not
  live keeps its queue slot and its 1.5 s fade after `setLive` moves to that section.
  - On the host this is never visible: the connector timing in "What holds" item 1 outlasts the fade.
  - On a late joiner it is visible for lamps that landed between play start and the first `sector` message: up to
    `SEC_SEND` 0.5 s, plus 1.5 s of fade where the meter is ahead of the picture. Display-only.
  - Fix: on a live change, snap the fade of queued and fading members of the new live section.
- **P3 S1 is not sealed** (a level-design hole that came before this job, but it is what makes "outside the live region"
  reachable).
  - Route: S1 plant roof, reached by the ladder, connects at 4.4 m to the pavilion top (x -44..-24, z -34..-30). Its west
    end at x -44 has no parapet; the plant roof's W parapet stops at x -39.85.
  - Walking off drops 4.4 m, with no fall damage (`movement.ts:167`), onto open ground at x -70..-46, z -34..18. That
    ground lies in no bake region, and no fence or wall crosses it until S5's garden wall at z 18.
  - Today the gap is closed in practice: at W4 the background bake ends about 3.6 s after play starts (about 7 s at W2),
    and the walk from spawn takes about 20 s.
  - It is still an exit from the section, for the section design as much as for the bake. Flag it to the level owner:
    add a parapet on the pavilion's west end, or a fence from x -44 to -70.
- **P4 The parity test does not check the influence pad.**
  - In the strip, membership by reach only, and even by reach minus 2 m, gives masks that pass every live-section
    comparison. The 2 m `SECTION_MARGIN` and the lamp spacing hide the pad.
  - So the strip test proves that a missing needed lamp is caught, and that landing, order, doors and bounce adopt are
    exact. It does not prove that `LAMP_INFLUENCE_PAD` (reach + `BOUNCE.reach` + cells) is large enough. Only the opt-in
    S5 test covers that, and it passed here.
  - Fix: add a strip lamp whose direct reach stops short of a neighbouring region but whose bounce enters it (e.g. x 26.5,
    r 4), so a reach-only mask fails.
  - The S5 superset test took 17.5 s, cheap enough to run by default.
  - The campus random check (`sectionBakeCampus.test.ts:98-121`) repeats the masks' own formula with a smaller pad, so it
    can only catch a bug in `lampSectionMasks`.
- **P5 SB14 loses the cache on a reload.**
  - A bake that finishes during S1 play is cached only at the first connector or at `GameState.dispose`.
  - A page reload (a dev reload included), tab close or crash during S1 never saves it, so the next load is cold again.
    Before this job it was saved at load.
  - Fix: also save on `pagehide` / `visibilitychange` hidden, or when the pause menu opens.
- **P6 A failed bake can be cached dark.** When the inline retry itself throws (`sectionJobs.ts:181-185`), a zero-`vis`
  lamp lands and the joined result is still cached under the full key. That lamp stays dark on every later load until
  `LAMP_VERSION` is bumped. Fix: skip the save when any lamp failed.
- **P7 Report risk 1, severity.** A late joiner into section k ≥ 1:
  - Sees its own section, and reads its own meter, without k's not-yet-landed lamps for the rest of k's bake. That is
    about 14% of the total work after S1 on its pool: seconds.
  - It is never a guard-side error (the host field is right).
  - The player's mistake runs one way: they think they are darker than they are, so they may be spotted. It is not an
    exploit.
  - Severity: low. P1 and P2 make that window slightly worse on the client.
  - The joiner's load also waits for S1, which it never plays (the start-section hint the report names would fix both).
- **P8** If `World.create` throws after `bakeLevelLight`, the baker's worker pool keeps running: there is no GameState to
  dispose it. Minor.
