# Backlog (feedback inbox)

Every piece of feedback lands here with where it goes. Michael decides scope; Claude adds items, never silently drops them. When an item ships, mark it done with the phase and version.

Format: `N. Item - destination - status`.

## Open

1. **Free Roam: shoot out lights, use switches and alarms.** Must work in Free Roam for testing. Destination: Phase 1 Step 6.
2. **FPS / perf overlay is too big.** Make it a minimal bar along the top edge, critical numbers only. Destination: Phase 1 Step 7.
3. **Desktop looks blurry with screen space reflections on or off.** Check upscaling and temporal settings first. Destination: graphics fix batch after Phase 1.
4. **Weapon holstered unless aiming, no hip fire, elbow strike on the fire button.** Decided, bible 1.11 - holstered unless aiming, no hip fire, elbow strike on the fire button. Built in Phase 3.
5. **Ghost copy of the operator on Epic** (noted in `docs/progress.md`). Destination: graphics fix batch after Phase 1.
6. **Voice test after Phase 4.** Generate the Dead Line opening three ways: the browser's built-in speech, a free open-source voice model run on this PC, a paid AI voice service. Michael picks by ear. Until then the radio stays text-only. Write all radio lines short and voice-ready. Original voices only: never clone or imitate a real actor. Destination: after Phase 4.
7. **Epic misses its design targets on the RTX 4090 laptop.** Main thread about 4.3 ms against 3 ms, frame spikes. Destination: graphics fix batch after Phase 1.
8. **Epic's level material (voxMat) uses 15 of 16 texture units.** Any new texture breaks it. Plan texture atlases before Phase 6b's CC0 textures. Destination: before Phase 6b.
9. **Skin shader D3D warning X4576 (dynamically indexed array).** Makes it recompile slowly, a likely hitch when guards first appear. Destination: graphics fix batch after Phase 1.

## Pending input

- Step 4b desktop look check and phone check note: Michael pastes them, with screenshots of the issues found. No next steps until then.

## Done

(none yet)
