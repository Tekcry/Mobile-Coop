# piano-knife: clips to download
Owner: Night Shift | Player Build. Status: current. For the orchestrator (downloads need Michael's go-ahead).

Source: Adobe Mixamo (https://www.mixamo.com/), free, royalty-free for commercial use (G407; `docs/art-credits.md`
Mixamo section). CMU has no knife, fight or takedown take in the subjects the pipeline reads (120 fps AMC,
`docs/mocap-trial/SOURCES.md`), so every new clip is Mixamo. No paid packs.

## Download settings (every clip; `docs/mixamo-retarget/PLAN.md:30`)
- Character: the same Mixamo character as the earlier downloads (Wren's auto-rigged hero mesh, mixamo-retarget A5).
- Format FBX Binary (.fbx); Skin: Without Skin; Frames per second: 30; Keyframe reduction: none.
- In Place: unticked (off). Mirror: off. Overdrive / Character Arm-Space: leave at the clip's defaults.
- Save as the file name below into `C:/NightShift/scratch/mixamo/clips/` itself (the dumper reads the root and `pack-*`
  folders only, `scripts/mocap/mixamo.mjs:6`; the slug comes from the file name).
- Mixamo search is fuzzy: type the search name, take the result whose title matches; if it is missing, take the
  listed alternate and note it in STATE.

## Knife kills (S2; S5 for K2 / K3)
| # | Mixamo search name | Save as | Use | Alternate if missing |
|---|---|---|---|---|
| K1 | Stabbing | Stabbing.fbx | attacker: the close stab, behind / front / corner rows | Standing Melee Attack Downward |
| K2 | Standing Melee Attack Downward | Standing Melee Attack Downward.fbx | attacker: downward stab, from above / drop / corner (S5) | Stabbing |
| K3 | Standing Melee Attack Horizontal | Standing Melee Attack Horizontal.fbx | attacker: the RT knife slash (S5) | Standing Melee Attack Backhand |
| V1 | Falling Forward Death | Falling Forward Death.fbx | victim: killed from behind, falls forward | Dying |
| V2 | Dying | Dying.fbx | victim: front / side, folds to the knees and down | Standing Death Forward |
| V3 | Falling Back Death | Falling Back Death.fbx | victim: corner kill, falls back against the wall | Dying Backwards |

Already on disk and emitted (no download): Cross Punch (S1 placeholder stab), Crouch To Stand (the crouched approach),
the Pro Rifle Pack deaths (S1 placeholder victims: death from the back / front / right).

## Intro pose (S4b)
| # | Mixamo search name | Save as | Use | Alternate if missing |
|---|---|---|---|---|
| I1 | Breathing Idle | Breathing Idle.fbx | the calm breathing on the trunk in the close-up | Standing Idle (already on disk) |

Already on disk: pack-pistol `pistol idle.fbx` (arm reference), `Cover Idle (standing cover against object).fbx`.

Total new downloads: 7 (K1-K3, V1-V3, I1). After download: S2's builder dumps and emits them (`scripts/mocap/mixamo.mjs`,
`mixamoEmit.mjs`) and adds the `mocapSources.ts` and `art-credits.md` rows.
