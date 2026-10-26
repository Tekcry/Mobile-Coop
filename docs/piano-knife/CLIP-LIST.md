# piano-knife: clips to download
Owner: Night Shift | Player Build. Status: current. For the orchestrator (downloads need Michael's go-ahead).

**Blocked: Mixamo downloads wait until Michael signs in to Mixamo.** Nothing before S2 needs them: S1 runs on the
stand-ins already in the repo (below), S3 on S1's rows, S4b on `standing_idle` until I1 lands.

Source: Adobe Mixamo (https://www.mixamo.com/), free, royalty-free for commercial use (G407; `docs/art-credits.md`
Mixamo section). Mixamo clips are single-character, so each kill pair is two aligned clips plus hand IK (BRIEF A14).
CMU has no knife take in the subjects the pipeline reads today; S2 checks the CMU two-person interaction subjects 18-23
(two performers in one capture) for a grab-from-behind / struggle take: if one fits, it becomes the `behind` pair
(attacker and guard from one capture, retargeted, G406), and K1 + V1 stay as the fallback. No paid packs.

## Download settings (every clip; `docs/mixamo-retarget/PLAN.md:30`)
- Character: the same Mixamo character as the earlier downloads (Wren's auto-rigged hero mesh, mixamo-retarget A5).
- Format FBX Binary (.fbx); Skin: Without Skin; Frames per second: 30; Keyframe reduction: none.
- In Place: unticked (off). Mirror: off. Overdrive / Character Arm-Space: leave at the clip's defaults.
- Save as the file name below into `C:/NightShift/scratch/mixamo/clips/` itself (the dumper reads the root and `pack-*`
  folders only, `scripts/mocap/mixamo.mjs:6`; the slug comes from the file name).
- Mixamo search is fuzzy: type the search name, take the result whose title matches; if it is missing, take the
  listed alternate and note it in STATE.

## Knife kills (S2; K3 for S3's slash once downloaded)
| # | Mixamo search name | Save as | Use (pair) | Alternate if missing |
|---|---|---|---|---|
| K1 | Stabbing | Stabbing.fbx | attacker: behind (with V1), front and the crouched rise (with V2) | Standing Melee Attack Downward |
| K2 | Standing Melee Attack Downward | Standing Melee Attack Downward.fbx | attacker: corner (with V3) | Stabbing |
| K3 | Standing Melee Attack Horizontal | Standing Melee Attack Horizontal.fbx | attacker: the RT knife slash (S3 runs on `elbow_strike` until then) | Standing Melee Attack Backhand |
| V1 | Falling Forward Death | Falling Forward Death.fbx | victim: behind, falls forward | Dying |
| V2 | Dying | Dying.fbx | victim: front and crouched rise, folds to the knees and down | Standing Death Forward |
| V3 | Falling Back Death | Falling Back Death.fbx | victim: corner, pulled round, falls back | Dying Backwards |

Stand-ins already in the repo, used by S1 (no download): attacker `cross_punch`, `crouch_to_stand` (the crouched rise);
victim the Pro Rifle Pack deaths `rifle_death_from_the_back`, `_from_right`, `_the_front` (Studio-only today: S1 notes
the in-game stand-in use in the `docs/art-credits.md` "Used by" column).

## Intro pose (S4b)
| # | Mixamo search name | Save as | Use | Alternate if missing |
|---|---|---|---|---|
| I1 | Breathing Idle | Breathing Idle.fbx | the calm breathing (about a 4 s cycle) on the trunk in the close-up | Standing Idle (already on disk) |

Already on disk: pack-pistol `pistol idle.fbx` (arm reference), `Cover Idle (standing cover against object).fbx`.

Total new downloads: 7 (K1-K3, V1-V3, I1), all after Michael's sign-in. After download: S2's builder dumps and emits
them (`scripts/mocap/mixamo.mjs`, `mixamoEmit.mjs`) and adds the `mocapSources.ts` and `art-credits.md` rows.
