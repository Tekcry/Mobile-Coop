## Wren is the player character (both players)

Michael, 2026-10-18 (G123, replaces G70's "after the prototype, behind a dev switch"): "I want wren in to replace the
existing character anyway; before the prototype is done" and, until Moth is finished, "Both play as Wren".

Do not merge without Michael. Prototype quality; polish is listed under "Open items" (Michael: "I want wren in the game
first. We will clean up changes later while the game is built.").

### What changes for players
- Wren (the operator built offline in Blender by the operators run, steps 05-11b) replaces the voxel player body for
  the solo player, the local co-op player and the remote partner. Guards keep their bodies (G68).
- Gameplay is unchanged (G38, G176): same capsule, collision, speeds, perception, noise and camera height; ledges,
  climbs and wall-jumps use the fixed 1.75 m gameplay height, Wren is drawn 7.6 cm higher on a hang so her hands meet
  the lip (Michael: "Keep gameplay fixed").
- Hit volumes, light-meter and exposure samples follow her 1.68 m body (G166); light parity holds.
- Each player's goggle glow has its own colour (G135): host green, partner cyan (A112: green / amber fails common
  colour blindness and amber is the HUD's exposure warning). Nothing new is sent over the network.
- Main menu and photo mode show the hero model (Michael: "Yes use hero for menu"), loaded lazily; play uses LOD0-2.
- Offline play keeps Wren after one online start (service worker runtime cache, A109).
- The goggle stays over the eyes in both states for now (stowed export is cleanup, D33).

### Download size and load time (ART-10's limit is decided on this branch)
| | Size | Load (RTX 4090, local, empty cache) |
|---|---|---|
| Game LODs (LOD0 18.4, LOD1 5.1, LOD2 2.5 MB) | 26 MB | solo match ready 4.4 s |
| Hero (menus, photo mode) | 55.5 MB (GitHub's 50 MB warning; under the 100 MB limit) | menu shows the hero at 1.45 s |
KTX2 (UASTC + Zstd), decoded locally (no CDN); KTX2 transcode about 0.2 s for the hero, under 0.1 s per game LOD.

### Merge with master
- 4.0.0 (#3, merge a804c48): 10 conflicts (.gitignore, eslint.config.js, package.json, scripts/perf.mjs, TESTING.md,
  docs/systems/performance.md, docs/story.md, CLAUDE.md, docs/design-bible.md, docs/systems/session-method.md), resolved
  keeping master's deletions and decisions plus the operators work (ktx2decoder dependency, operators scripts, CC0
  base-body art exception, docs/operators index row). Nothing master deleted came back.
- CT research (#4, merge 6ecd4e3): docs/DECISIONS.md and bible 5.14. Master's G124-G160 kept verbatim; this branch's
  decisions renumbered G161-G176 (G123 kept).

### Tests
- `npm run check`: lint 0 errors / 41 warnings; Vitest 138 files, 1572 tests; build ok; precache 44 entries (15.5 MB,
  no GLB precached).
- Full `npm run e2e` (port 4191): failures under load were all page-load / wait timeouts; every non-flaky failure passed
  on a solo rerun ("all e2e suites passed"). Known flaky this run: e2e-netmove, e2e-coop, e2e-pad, e2e-bunker,
  e2e-foley. Pre-existing master failures: e2e-kestrel, e2e-camera-bounds (and e2e-editor).
- Named suites: e2e-move, e2e-traverse, e2e-anchors, e2e-wall, e2e-anim, e2e-netmove, e2e-coop, e2e-bunker, e2e-course,
  e2e-clip, e2e-ct, e2e-offline, e2e-desktop, e2e-darkness and the stealth / perception suites pass (flaky ones on a solo
  rerun).
- GPU (RTX 4090, gfx=epic, Warehouse, 12 guards): every desktop budget passes with Wren; Wren adds +8 draws,
  +0.22 M triangles, +0.015 ms anim per character; her per-frame code allocates nothing (A108; allocations are 4 % under
  the budget, the rest is JIT warm-up). Data: docs/operators/mockups/wren/ingame/perf-*.txt.
- Independent Opus checks: steps 11c, 11d + 11e (round 2 PASS). Records: docs/operators/LOG.md.

### Screenshots (GPU)
docs/operators/mockups/wren/ingame/: menu-hero, solo-front, solo-shoulder, solo-side-rifle-aim, solo-crouch,
solo-pistol, coop-host-sees-partner, coop-client-sees-partner, coop-goggle-colours-host / -client (-crop, -full-crop),
anim-walk / crouch / sprint / vault / reload / swap.

### Open items for Michael
- Kit that depended on deleted systems (D32, recorded): hip pod kept as a utility pouch, medkit pouch as a plain pouch,
  holster left as is, sling socket re-pointed to the rifle sling; the labels still need the relabel pass (cleanup).
- Moth's goggle colour: bible 5.14 says "Wren green, Moth amber", which fails the colour-blindness rule; decide before
  Moth is playable.
- G153 complementary kits: with both players as Wren, the body cannot show which kit each player was issued.
- The partner's goggle shows dim in play (the partner's vision mode is not sent).
- Cleanup: stowed goggle export (G73), carry offsets measured from Wren's own kit (the slung rifle stands off her back),
  hero stays in VRAM after photo mode, old part meshes still built (disabled) for carry offsets, bible roadmap lines
  953 / 977 still name G70, LOD bake notes (docs/operators/LOG.md).
- Next jobs after the merge: Blender placeholder weapons (original rifle with launcher tube and suppressor, suppressed
  pistol with jammer emitter, knife) with this pipeline, then Moth.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
