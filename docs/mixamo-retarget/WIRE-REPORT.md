# Source wire report (feature/mixamo-source-wire)
Owner: mixamo-retarget lead. Status: built, waiting for two Opus checkers.

G400 (Michael Q39: "yes players must look exact in everyones games"): every screen draws each co-op player with that
player's own Animation source (Hand-made, CMU, Mixamo). Replaces A13 (per-viewer).

## What changed
- `PlayerState.an` (protocol.ts): the owner's source as an index (0 hand, 2 mixamo); no field = CMU (the default and
  any older sender). Parsed as an integer 0..2, anything else dropped. PROTOCOL_VERSION not bumped (the train does).
- Senders: coopHost `selfState` and coopClient `pstate` send `wireAnimSource(ANIM_SOURCE)`: the source whose tables
  match what the owner's page draws, overrides included (`?anim=`, `?mocap=0/1`, `?mixamo=0/1`, the tuner's "Mocap
  locomotion" box). The host relays every player by spread. The default page sends no field (byte-identical wire).
- `RemoteAvatar.update` hands the owner's source to its graph (`graph.animSource = animSourceOf(s.state.an)`).
- `AnimGraph.animSource` / `followPageSource()` / `sourceTables()`: a graph no one hands a source reads the page's live
  tables (`PAGE_TABLES`: LOCO, WREN_TRAV, WREN_KEYED, WREN_STANCE; the local player, Studio, menus, guards: unchanged);
  a handed graph reads `SOURCE_TABLES[s]` (that source alone). characterRig reads its graph's tables.
- Tables rewritten in place once per change (`addMixamoResolver`); a graph re-picks only when its source changes.
- mixamo.ts: `fillWrenTrav` / `fillWrenKeyed` / `fillWrenStance` split out of the resolvers (pure; page output same).

## Files
src/anim/animGraph.ts, src/anim/animSource.ts, src/anim/mixamo.ts, src/net/protocol.ts, src/net/coopHost.ts,
src/net/coopClient.ts, src/net/remoteAvatar.ts, src/player/characterRig.ts, tests/animSourceWire.test.ts,
changes/feature-mixamo-source-wire.md, docs/mixamo-retarget/STATE.md.

## Tests
- tests/animSourceWire.test.ts 9/9 (was 8; new: the sent source equals what the page draws for all 81 override
  combos, the default sends no field, `?mocap=0` on CMU sends hand-made). With tests/animSource.test.ts: 21/21.
- tests/net.test.ts, coopFix, coopCarry: 114/114. tsc (typecheck:fast) and eslint on every wire file: clean.
- Laptop e2e on faa1041ab (set mixamo-wire: e2e-coop, e2e-netmove, e2e-ctcourse and more): GREEN 7/7. Since then the
  game code changed by one expression in each sender (default output identical, no field); not re-queued.

## Hot path (no allocation a frame)
- Remote frame: `animSourceOf` is an array index and a `??` (a string constant back), the setter stores a field,
  `sourceTables()` is one compare; the table re-pick runs only on a change. No closures, arrays or objects.
- The no-allocation check now measures the page reference and the handed source on one graph and one loop. Two graphs
  read V8's tier: 1 run in 3 the handed graph read 1744 B a frame against the page's 171 B (other runs the page read
  695 B), both in Turbofan, the same code. On one graph both read the same (171 / 171 or 1744 / 1744), 4/4 runs pass.

## Assumptions (A entries, with undo)
- Override gap closed in the wire's own field: the owner's dev overrides now reach the partner (G400). The one pair no
  source holds (the Mixamo half on, mocap off: `?mocap=0` with Mixamo) sends `mixamo`, so the partner draws the CMU
  locomotion under the captures. Undo: send `ANIM_SOURCE.source` again (one line in each sender).
- The Anim Studio's single-capture pick (`MIXAMO.studio`) stays local: a tuner test tool, not a look setting.
  Undo: send it (a new field).

## Polish / follow-ups
- AnimGraph.update leaves 171 B a frame on a Wren rig in the crouched sneak (page and handed alike: not the wire) and
  sometimes 1744 B in one Turbofan state: worth a heap-asserts pass on the graph (not this job).
- Next: two Opus checkers on the head.
