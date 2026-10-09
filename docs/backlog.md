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
10. **Night vision needs work: make it realistic and believable, and lamps do not shine in it.** Desktop Step 4b look check, 2026-10-09: in night vision the lamps and light shafts do not flare or glow; the image reads as flat green with white-blown walls. Destination: Step 4b fix pass (held until Michael's phone note and screenshots arrive).
11. **"SONAR" label in the top-left HUD (desktop screenshot 3).** Sonar is a removed Blacklist system (bible 6). Check what the label is and remove it if it is the old system. Destination: Step 4b fix pass.
12. **Benchmark at 7680x2067 (RTX 4090 Laptop, v3.5.0, 2026-10-09, `sbd-feedback-2026-10-09.html`).** Low 120 fps (1% low 79), Medium 77 (19), High 64 (29), Ultra 48 (14), Epic 45 (10, worst spike 227 ms, main thread p95 6.8 ms). Data for item 7. Destination: graphics fix batch after Phase 1.

## Pending input

- Step 4b phone screenshots and log: Michael sends them next. Desktop look check received 2026-10-09 (items 10 to 12). No next steps until the phone note arrives.

## Done

(none yet)
