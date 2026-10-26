# Night Shift
Owner: the orchestrator. Status: current.

Night Shift is an original third-person co-op stealth game built on pure Chaos Theory (CT): a PWA (Vite + TypeScript +
Babylon.js 9 + Havok) on GitHub Pages, desktop only, pad first.

**Read at start:** `git show origin/master:docs/RULES.md` (process: sessions, jobs, tests, machines, merges) and
`git show origin/master:docs/VISION.md` (the game). Any CLAUDE.md, RULES.md or VISION.md in a branch or worktree may be
stale; origin/master wins. Module map and doc index: `docs/INDEX.md` (read on demand).

**Authority order (G86)** - the only copy; other docs point here. The higher source wins; report the conflict.
1. Michael's current instruction, then his recorded words in `docs/ROADMAP.md` "Decided" (on origin/feature/menu) that
   are not yet folded into DECISIONS.
2. `docs/DECISIONS.md` (the G entries).
3. `docs/design-bible.md` (gameplay) and `docs/story.md` (story and in-game text).
4. Job and map docs: the job's BRIEF and PLAN, `docs/level-design.md` and the map's documents.
5. `docs/RULES.md`, this file and `docs/systems/*.md`.
6. Code and tests.

Every decision is also written into the bible. `docs/VISION.md` summarises 1-3; where it differs, the higher source wins
and the orchestrator fixes VISION.

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
- IP: CT's mechanics, visual style and HUD layout are copied closely, never CT's art assets; names, characters,
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
- Every new map follows `docs/level-design.md`; its spec starts from `docs/templates/map-spec.md` and may tighten the
  standard, never loosen it without Michael's written approval; the standard and template change only with his
  approval. An engine-fact change in level-design Section 12 updates it and lists the map decisions that relied on it.
- Desktop only (G12), pad first, then keyboard and mouse (loco D1, bible P7; tests run as a desktop, G13): no phone or
  touch work, except that a phone can launch the game for testing on the minimum settings and menus / HUD fit an iPad
  (G182), and menu taps and touch look in play stay (G395); the Kestrel editor keeps its phone launcher with no new work
  (G15). Removed and parked systems (bible Section 6) get no new work; nothing is drawn as voxels. Story is text radio
  and subtitles, every line written so it can be voiced later (G82).
- Unfinished work ships dark behind its flag in `src/core/flags.ts` (every dark flag defaults on in `/preview/`, G416).
