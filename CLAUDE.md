# Night Shift
Owner: the orchestrator. Status: current.

Night Shift is an original 2-player co-op third-person stealth game inspired by Chaos Theory (CT): a browser game (Vite +
TypeScript + Babylon.js 9 + Havok) on GitHub Pages, heading for Steam on Windows (N32), pad first.

**Read at start:** `docs/RULES.md` first (how every session works), then the pinned GitHub issue "Night Shift -
control panel" (live state), then this file. Everything else only when the task needs it (RULES.md section 12). Read
docs from origin/master; a branch or worktree copy may be stale. Module map: `docs/INDEX.md` (on demand).

**Authority order (revised 2026-11-02, N45)** - the only copy; other docs point here. The higher source wins; report
the conflict.
1. Michael's current instruction, then `docs/RULES.md`, `docs/plan/DECISIONS-2026-11.md` and the control panel.
2. `docs/plan/VISION-DRAFT-v3.md` (provisional), `docs/plan/MASTER-PLAN.md`, `docs/plan/SCOPE.md`, `docs/story.md`,
   `docs/plan/MASTER-PLAN-PROMPT.md` section 16 (panel format, one prompt at a time, model guide).
3. `docs/plan/MISSION-TEMPLATE.md` (maps) and the job's own documents.
4. This file and `docs/systems/*.md`.
5. Code and tests.
History, not binding: `docs/DECISIONS.md` (G1-G434), `docs/design-bible.md`, `docs/level-design.md`, the scale
sheet, the map-spec template, `docs/VISION.md` (G numbers below point into the history for the reason).

## Hard rules (code)
- No runtime CDN or network dependency. All assets are bundled; Havok WASM is imported with `?url`.
- Import Babylon only through `src/core/babylon.ts`. Babylon 9 is tree-shaken and stubs methods whose side-effect
  module is missing (it warns: "requires a side-effect import"). Add the side-effect import there.
- Co-op code lives in `src/net` and is only reached through a dynamic `import()` behind `flags.coop`. Single player
  never imports from `src/net` statically.
- Strict TS (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`: use `import type`).
- Important data goes to IndexedDB (`src/save`); `localStorage` is never used for saves. Internal ids keep the old name
  (IndexedDB `shoulder-strike`, export magic `shoulder-strike-save`, the co-op app id).
- Hot paths allocate nothing (no closures, iterators or temporary vectors in AI / nav / anim loops); use `hyp2` /
  `hyp3`, never `Math.hypot` (`docs/systems/conventions.md`).
- Gameplay never reads graphics state (presets, LOD, the governor), only collision, occupancy, anchors, the light bake
  and the noise model. Light parity: the picture, the light meter and guard perception agree; one lighting system.
- IP: CT is the reference for mechanics and feel, never CT's art assets; names, characters,
  organisations, story, logos, UI art, the goggle and the score are original (G5, G69; free licensed assets: G407,
  below). No reference-game character, gear or
  organisation names anywhere: code, UI, specs, docs, research notes (G6). "Chaos Theory" / "CT" may name the
  reference; Michael's quotes stay verbatim (G114). Never trace CT animation frame by frame.
- Free assets (G407): any free animation, sound, texture, model, music sample or other asset whose licence allows
  commercial sale may be used: CC0 / public domain, CC-BY (the creator credited) and royalty-free game licences such as
  Mixamo; never non-commercial, no-derivatives, share-alike or unclear licences. Each records its source URL and
  licence in `docs/art-credits.md` or `docs/audio-credits.md` (score samples: `docs/audio/samples.md`); raw downloads
  are not committed where the licence or size says so. Motion capture (CMU, Mixamo) is retargeted onto the game's own
  rigs (G406); operator and guard meshes come from in-repo offline scripts (Blender, headless); WebAudio synthesis
  stays where it sounds better. The menu font Barlow Condensed (SIL OFL) is bundled in `src/ui/fonts/` (menu-ui MD1).
- Every new map follows `docs/plan/MISSION-TEMPLATE.md` (N46; its numbers are provisional until playtested) and the
  prototype standard in `docs/RULES.md` (textured, lit, shadowed).
- Desktop only (G12), pad first, then keyboard and mouse (loco D1, bible P7; tests run as a desktop, G13): no phone or
  touch work, except that a phone can launch the game for testing on the minimum settings and menus / HUD fit an iPad
  (G182), and menu taps and touch look in play stay (G395); the Kestrel editor keeps its phone launcher with no new work
  (G15). Removed and parked systems (`docs/plan/SCOPE.md` Parked) get no new work; nothing is drawn as voxels. Story is text radio
  and subtitles, every line written so it can be voiced later (G82).
- Unfinished work sits behind its flag in `src/core/flags.ts`, default on; `?flag=0` turns it off (Michael 2026-11-01).
  There is one build (the `/preview/`, `/ct/` and `/kestrel/` slots are retired); stage J (2026-11-02) removed the flags whose feature is permanent.
