# Weapons job - brief (feature/weapons)

Michael's overnight brief (2026-10-19, run on the laptop while he sleeps), in short:

- Goal: placeholder guns that look realistic at a glance in game: correct real-world proportions, plausible parts,
  simple PBR, built quickly. No detail polish before Michael's playtest (CLAUDE.md "Current goal", PR #6).
- Purity: the kit follows Chaos Theory as reworked by the research (`docs/ct-research`, G76, G152): the rifle's
  underbarrel launcher (fitted on both players), the pistol's held jammer (replaces the thrown EMP), the knife's CT role
  (the close lethal option, always carried, not an inventory slot). Original designs, no reference-game IP (G5, G6).
- Build with the same offline pipeline as Wren (Blender 5.2.2 headless, in-repo scripts, KTX2): a rifle with an
  underbarrel launcher tube and a suppressor, a suppressed pistol with a jammer emitter, a knife. One game LOD each
  with textures, wired into the existing weapon carry and hands so the grip works and nothing clips badly.
- Out of scope: Wren's carry fit, the other clean-up items, Moth, hand-pose fine tuning.
- Rules: an independent check that blocks only on broken, wrong scale or unrealistic at a glance (cosmetic notes go on
  `POLISH.md`), at most 1 fix round. This laptop is not the GPU PC: `npm run check` and software-GL e2e only; in-game
  GPU screenshots are "pending PC run". Commit and push after each weapon; a PR to master when all three are in and green.
- Stop at about 09:00 Sydney: no new Blender export after 08:00; push; morning report (`MORNING-REPORT.md`).
