# ON5 - Climb pieces, exterior features and floor finishes
Model: Opus, medium effort.
Decisions: 12

Read `ED-overnight.md` section 5 first. Then: `docs/kestrel/schema.md` `exterior` and `surfaces` rows (grep); the
toolkit map fields in `docs/systems/ct-toolkit.md` (grep `lock`, `seal`, `optic`, `cut`, `lines`; read only the map
fields section); `src/world/anchors.ts` lines 1-60 (`AnchorKind`), `src/player/moveState.ts` lines 12-45
(`MOVE_MODES`); `src/config/noise.ts` and `docs/systems/audio.md` (grep `surface`, `footstep`); `scripts/kestrel/facts.json`
groups `reach`, `lip`, `split`, `noise` (if present); `src/world/maps/kestrelCampus.ts` (how the walk test builds
pieces; grep `exterior`, `ladder`); the ON4 catalogue (`src/editor/catalogue.ts`) for its pattern.

| # | Decision |
| --- | --- |
| 1 | **Climb and exterior pieces** (Build wheel: Climb >): downpipe (vertical, on a wall face, y0 to y1), horizontal pipe (two points, height), ledge or string course (along a wall face at a height, depth 0.15-0.3), window sill (on an opening), parapet coping, vent grille (on a wall, w x h, leads to a duct), duct crawl (a drawn route between two vents with a clear section; the 1.5 m crawl rule from facts for crouch-move), fire escape stair (outside, drawn like a stair), lamp post (placed; its lamp is ON6), chain-link fence (drawn, climbable). Written to `exterior[]` (schema kinds, plus `ledge`, `vent`, `duct` if missing: add to schema.md). |
| 2 | Each piece shows what the player can do with it, worked out from facts and the engine's own lists: a move that exists as an `AnchorKind` or `MOVE_MODES` entry (cite by grep in the code comment) and whether the piece's heights meet its reach facts ("Downpipe 6.2 m: climbable, top lip 6.2 m within hang reach"). A move the engine does not have is shown as "not in the game yet" (never invented). |
| 3 | The `climbable` flag is set from those rules, and can be overridden in Properties with a reason. |
| 4 | **Walk test**: pieces whose move the engine supports build with the engine's own builders (`LevelBuilder.pipeV`, `pipeH`, `ladder`, ledges as the map builders do; grep levelBuilder exports) so the walk test can climb them; others build as plain collision. |
| 5 | **Floor finishes** (Selection wheel on a room: Floor finish >): carpet, vinyl, ceramic tile, sealed concrete, steel grating, raised access floor tile, gravel, grass, asphalt. Written to `rooms[].finish` (the field exists). |
| 6 | **Footstep loudness**: the finish maps to the game's own surface noise (grep the noise and audio code for surface kinds); the card and the plan show it ("Steel grating: loud, heard at 6 m walking"). If the game has no per-surface noise yet, show the finish only and say "footstep loudness by floor: not in the game yet" in editor.md (do not add noise rules: game tuning is out of scope). |
| 7 | **Finish view** (Hub > View, key `N`): floors tinted by finish in 3D and on the plan, with a legend. |
| 8 | Pad: Climb pieces are placed like ON4 wall-mounted objects (backs onto a wall face) or drawn (two points); RB turns where it means anything. |
| 9 | Vitest: reach rules per piece at the boundaries, `climbable` from rules and override, finish to loudness mapping (or the "not yet" path), schema round-trip byte-identical. |
| 10 | e2e: put a downpipe on Building A's west wall to the roof parapet; walk test: the player climbs it (reaches the roof height, or the anchor exists in the game's anchor list at that spot); paint a corridor steel grating and see the card words. |
| 11 | Screenshots: the Climb wheel, a downpipe with its words, the finish view. |
| 12 | editor.md: Climb pieces, floor finishes, finish view; limits. |

End per section 5. Commit id `ON5`.
