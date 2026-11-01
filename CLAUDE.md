# Night Shift
Owner: the orchestrator. Status: current.

Night Shift is an original third-person co-op stealth game built on pure Chaos Theory (CT): a PWA (Vite + TypeScript +
Babylon.js 9 + Havok) on GitHub Pages, desktop only, pad first.

**Read at start (from 2026-11-01):** the pinned GitHub issue "Night Shift - control panel" (live state), then
`docs/plan/MASTER-PLAN-PROMPT.md` (process: section 16; phases: section 7), `docs/plan/DECISIONS-2026-11.md` (Michael's
decisions since the refresh) and `docs/plan/CLEANUP-PLAN-2026-11-01.md` (the direction). `docs/RULES.md` and
`docs/VISION.md` are history (the old process and the old vision); new short ones come in Phase 1. Read docs from
origin/master; a branch or worktree copy may be stale. Module map and doc index: `docs/INDEX.md` (read on demand).

**Authority order (G86, revised 2026-11-01)** - the only copy; other docs point here. The higher source wins; report
the conflict.
1. Michael's current instruction, then `docs/plan/DECISIONS-2026-11.md` and the control panel's "Decided by Michael".
2. `docs/plan/MASTER-PLAN-PROMPT.md` and `docs/plan/CLEANUP-PLAN-2026-11-01.md`.
3. `docs/DECISIONS.md` (the G entries, frozen at G434): still binding where 1-2 do not replace them.
4. `docs/design-bible.md` (gameplay) and `docs/story.md` (story and in-game text), where 1-3 do not replace them.
5. Job and map docs, `docs/level-design.md` and the map's documents.
6. This file and `docs/systems/*.md`.
7. Code and tests.

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
- Unfinished work ships dark behind its flag in `src/core/flags.ts` (RULES "Walk pacing", G416). There is one build (the
  `/preview/`, `/ct/` and `/kestrel/` slots are retired, 2026-11-01): the flags that existed then all default on there
  (`?flag=0` switches one off for testing; stage J of the cleanup plan removes them). What a new unfinished flag
  defaults to is not settled yet (open question to Michael).
