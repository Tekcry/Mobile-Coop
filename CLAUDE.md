# Night Shift

Night Shift is an original third-person co-op stealth game built on pure Chaos Theory (CT): a PWA (Vite + TypeScript +
Babylon.js 9 + Havok) on GitHub Pages, desktop only, pad first.

**Read at start:** `git show origin/master:docs/RULES.md` (process: sessions, jobs, tests, machines, merges) and
`git show origin/master:docs/VISION.md` (the game). Any CLAUDE.md, RULES.md or VISION.md in a branch or worktree may be
stale; origin/master wins. Module map and doc index: `docs/INDEX.md` (read on demand).

**Authority order (G86):** Michael > `docs/DECISIONS.md` > `docs/design-bible.md` > job and map docs
(`docs/level-design.md`, the map's documents) > `docs/RULES.md` > code. Every decision is also written into the bible.
docs/VISION.md summarises DECISIONS and the bible; where it differs, DECISIONS wins and the orchestrator fixes VISION.

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
- Gameplay never reads graphics state (presets, LOD, the governor). It reads collision, occupancy, anchors, the light
  bake and the noise model only.
- Light parity: what the player sees, the light meter and guard perception agree. One lighting system only.
- IP: CT's mechanics, visual style and HUD layout are copied closely; names, characters, organisations, story, logos,
  UI art, art assets, the goggle and the music are original (G5, G69). No reference-game character, gear or
  organisation names anywhere: code, UI, specs, docs, research notes (G6). "Chaos Theory" / "CT" may name the
  reference; Michael's quotes stay verbatim (G114). Never trace CT animation frame by frame.
- No external art, except CC0 textures for detail, the CC0 base body of the operator pipeline (bible 5.14) and CMU
  motion-capture takes (converted clips bundled, raw files not committed, credited in `docs/art-credits.md`); operator
  and guard meshes come from in-repo offline scripts (Blender, headless). CC0 recordings may be used for any sound
  (G58), bundled and credited in `docs/audio-credits.md` (score samples: `docs/audio/samples.md`). The menu font Barlow
  Condensed (SIL OFL) is bundled in `src/ui/fonts/` (menu-ui MD1).
- Every new map follows `docs/level-design.md` and its spec starts from `docs/templates/map-spec.md`; a spec may
  tighten the standard, never loosen it without Michael's written approval; the standard and the template change only
  with his approval. A change to an engine fact in
  `docs/level-design.md` Section 12 updates that section and lists the map decisions that relied on the old fact.
- Desktop only (G12): no phone or touch work, except that a phone can launch the game for testing on the minimum
  settings and menus / HUD fit an iPad (G182). Removed and parked systems (bible Section 6) get no new work; nothing is
  drawn as voxels. Story is text radio and subtitles, every line written so it can be voiced later (G82).
- Unfinished work ships dark behind its flag in `src/core/flags.ts`.
