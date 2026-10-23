# Guard models: brief

## The ask (Michael's words, verbatim)
- 2026-10-23 ~00:45 (marlow-final M6): guards: "normal guards. we will need to create a prototype guard avatar
  replacement eventually."
- 2026-10-23 ~11:45, on the proposal to build guards from Wren's Blender operator pipeline (bible 5.14): "after sector
  ops. i would prefer clear variety in guards. They can all be male, and larger build than Wren as she is quite small.
  Different types of guards should look different where needed (some may have armour, some without, some helmets etc),
  and also need to build additional coop player characters, but would rather fix this after all levels are completed".
- 2026-10-23 ~10:10 (stealth over shooting, relayed): "reward stealth over shooting as sections get harder". Decided
  items this job draws: (2) "no instant headshot kills later (helmet: first headshot knocks it off and staggers, second
  kills; takedowns still one move)"; (3) "riot shield enemies only in alert response teams"; (4) alarms escalate
  (armour / helmets and a response team per stage); (13) "heavier late guards: body armour, torso shots only stagger".
- ROADMAP "Next: guard-models" (orchestrator's reading): realistic guards from Wren's operator pipeline (Blender,
  skinned GLB with LODs, drawn over the CharacterRig like Wren); all male, larger build than Wren; clear variety;
  archetypes look different (armour, helmets, riot shields as modular gear); one skinned mesh per LOD instead of the
  part body; re-measure 24 guards per section against guard-render S1.

## Goal
Every human guard kind (grunt, runner, heavy, sniper, enforcer, droneOp, officer; the dog keeps its model) draws as a
realistic male figure from the offline operator pipeline, posed by the existing CharacterRig (every current clip, the
mocap set, IK and the guard tuner apply unchanged), with:
- clear variety: body base, head / skin tone, headwear, small kit and colour, chosen deterministically per guard and
  identical on both co-op screens without new wire data;
- archetypes that read apart at a glance (heavy plate, enforcer shield, officer jacket, sniper, technician);
- the stealth-over-shooting gear as attachable pieces driven by the gameplay state that already exists (guard-ai S9 /
  S12 / S13: helmet knocked off on the first head hit, body armour, the response team's riot shield);
- 24 guards per section inside the guard-render budget (one skinned draw per guard per pass, as today).

## Limits
- CLAUDE.md hard rules: no external art except the CC0 MakeHuman base body (MPFB2, already credited and already on the
  desktop, `docs/operators/MPFB2.md`); meshes generated offline by in-repo scripts (Blender 5.2.2, `-b`, headless) and
  bundled; no runtime network; Babylon only through `src/core/babylon.ts`; strict TS; hot paths do not allocate.
- Gameplay never reads graphics state: hit volumes, the head volume (guard-render S3a, from the sim), eye heights,
  perception and the light meter keep their inputs. Guard heights and builds in `src/config/enemies.json` do not
  change (they already run 1.74-1.83 m against Wren's 1.68 m).
- Light parity: guards shade the same in every pass (G-buffer, sun cascades, lamp and flashlight shadows, thermal,
  night vision); the figure is render-only.
- IP (G5, G6): original designs only. No reference-game character, gear or organisation names in code, data, file
  names or docs; no real brands, insignia, patches or product copies. Gear ids stay generic (`helmet_std`,
  `vest_soft`, `plate_heavy`, `shield_riot`, `cap`, `beanie`, `balaclava`).
- Prototype first (current goal): basic realism at gameplay distance (in-game LODs only, no hero / close-up LOD, no
  cloth sim refinement rounds). Detail polish goes on the polish list. At most 1 fix round per slice.
- Co-op parity: the client builds the same look from what it already receives (wire id, kind, the gear bits in `al`).
  No `PROTOCOL_VERSION` bump unless an assumed decision below is undone.
- Desktop only (G12). Additional co-op player characters are out of scope (after all levels, Michael ~11:45).
- Starts after sector-redesign (including campus detail art) per the ROADMAP; this file and PLAN.md are the plan only.

## Assumed decisions (logged; each undoable)
- A1 Faces: grunts, officers, snipers, droneOps and runners show a face (low-detail MakeHuman male head, baked skin
  shading, short hair in the texture, four skin tones); heavies and enforcers wear a balaclava under the helmet.
  Undo: set `faceCovered: true` for every kind in the guard kit data (balaclava on all), one data change and a rebake.
- A2 Bases: three male body bases matched to the kinds' existing (height, build) pairs: `average` (grunt 1.77,
  droneOp 1.75, officer 1.80 athletic folds into it), `broad` (heavy 1.83, enforcer 1.82), `lean` (sniper 1.78,
  runner 1.74). Each guard's figure is scaled uniformly from its base's reference height to its def height (under
  +-2%); the retarget (`OperatorPoser`) carries the rig's joint offsets, so proportions follow the rig.
  Undo: add a base per (height, build) pair in the kit data (one more bake each).
- A3 Gear in the body mesh: every gear and headwear piece is baked into its base's LOD file as part of the one skinned
  mesh, with a static per-vertex piece id; a per-guard vertex buffer hides pieces (collapsed to degenerate triangles)
  and carries tint and flash. One draw per guard per pass, as guard-render S1 today. The riot shield is the one
  separate mesh (held, enforcer only). Undo: export gear as separate meshes (`separateGear: true` in the export
  data); costs one draw per worn piece per pass (campusOps is at 589 of 600 draws at 24 alert).
- A4 Variation seed: the variant is a pure hash of (guard wire id, kind, map id). Same on host and client with no
  wire change. A section restart renumbers guards (`Enemy.num`), so a respawned guard may get a different look.
  Undo: send a variant byte in the guard snapshot (protocol bump, both sides read it).
- A5 Gameplay gear drives the visible gear: `Enemy.helmet` / `Enemy.armour` (and the wire bits `AL_HELMET` /
  `AL_ARMOUR`) show the helmet and vest; `def.plated` (heavy) always shows the heavy plate carrier; the enforcer
  always holds the shield. Random variation never adds a helmet or armour the gameplay does not have (what the player
  sees must match what stops a round). Undo: none needed (this is the light-parity / fairness reading).
- A6 Helmet knocked off: the helmet piece hides through the mask and the pooled `HelmetDrops` drops the helmet's own
  LOD1 geometry in the guard's helmet colour; the guard's own headwear (cap, beanie or bare head) shows under it.
  Undo: keep the placeholder drop box (one line in `helmetDrops.ts`).
- A7 Colour: the faction palette (`src/ai/factions.ts`: urban, desert, maritime) tints the uniform and kit through a
  tint-slot channel in the atlas; per-guard jitter stays within +-6% value so factions still read.
  Undo: jitter 0 in the variant data.
- A8 LODs: three in-game LODs per base, LOD0 < 8 m, LOD1 8-25 m, LOD2 > 25 m (Wren's distances and 10% hysteresis),
  no hero. Undo: distances live in the guard manifest.
- A9 Review: Michael's look review is a contact sheet published after the bake (G4) and does not block integration
  (unattended by default); his notes become a polish list or one fix round. Undo: make G4's sheet a stop.
- A10 Flag: `?guardmodels=0` keeps today's merged part body (guard-render S1) for comparisons and as the fallback while
  a guard's files load. Undo: delete the flag after Michael's playtest.
- A11 Runner: no separate civilian outfit in the prototype; the runner wears the work variant of the uniform (no
  faction tint on the jacket, beanie or bare head, no armour). Undo: add a civilian outfit slice later.

## Michael's answers
None yet (open questions in PLAN.md section 9).
