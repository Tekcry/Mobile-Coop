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
10. **Night vision needs work: make it realistic and believable, and lamps do not shine in it.** Desktop Step 4b look check, 2026-10-09: in night vision the lamps and light shafts do not flare or glow; the image reads as flat green with white-blown walls. Phone confirms the same (2026-10-09): no lamp glare in night vision, flat green image. Target look (Michael's reference from a Chaos Theory gameplay video, 2026-10-09; screenshots not committed): pale, desaturated grey-green rather than saturated green; lamps and lit windows bloom into a large soft white glare that washes the area around them; dark areas stay readable but murky, with soft grain; a dark circular tube vignette at the frame edges. Copy the optical look only: no HUD frames, icons or UI art from the reference (no Splinter Cell IP). Destination: Step 4b fix pass. **Built 2026-10-09 (Step 4b fix pass); waiting for Michael's look check.**
11. **"SONAR" label in the top-left HUD (desktop screenshot 3).** Sonar is a removed Blacklist system (bible 6); thermal replaces it (bible 6, roadmap row 3). Michael, 2026-10-09: "thermal instead of sonar". Remove the sonar mode and label. Destination: Step 4b fix pass (label); the sonar system removal is Phase 3. **Built 2026-10-09 (Step 4b fix pass): sonar is off the goggles button, so the label cannot appear; the code goes in Phase 3.**
12. **Benchmark at 7680x2067 (RTX 4090 Laptop, v3.5.0, 2026-10-09, `sbd-feedback-2026-10-09.html`).** Low 120 fps (1% low 79), Medium 77 (19), High 64 (29), Ultra 48 (14), Epic 45 (10, worst spike 227 ms, main thread p95 6.8 ms). Data for item 7. Destination: graphics fix batch after Phase 1.
13. **Thermal vision.** Michael, 2026-10-09: replicate the reference look. Target: cold background in deep blue to purple; heat as a false-colour ramp (blue, green, yellow, orange to red at the hottest, the torso); soft, blurred edges, no fine texture; a tube vignette like night vision. Already decided in the bible (5.x vision modes, roadmap row 3). Optical look only, no reference UI art. Destination: Phase 3 unless Michael moves it.
14. **iPhone session ended at the menu (crash report, 2026-10-09 02:55, 2042 s in).** The phone was set to platform=desktop with the Epic preset (gfx.reflections=ssr, gfx.lights=32, volumetrics, GI), not the phone look. Likely out of memory or killed by Safari. Check memory with desktop Epic on the iPhone; consider blocking or warning on platform=desktop + Epic on phones. Destination: graphics fix batch after Phase 1.
15. **Strip lamps light from the whole fitting (Michael, 2026-10-09).** Today a lamp's light on surfaces falls off from the fitting's centre (`world/lampMath.ts`), so a long strip lights like a point. Real linear fittings are line sources (`docs/research/night-vision-and-lamps.md`). Proposal: the one lamp formula measures from the nearest point on the strip's glowing length. Changes gameplay light (lit areas grow along strips), the bake, the phone's lamp volume, the desktop path and an engine fact (`docs/level-design.md` Section 12). Destination: Step 4c, before Step 5's parity test, if Michael approves. The night vision glare already comes from the whole fitting (Step 4b fix round 2).
16. **Night vision realism proposals** (`docs/research/night-vision-and-lamps.md` section 4): a guard's flashlight whites out the goggles; muzzle flashes and flashbangs flash brighter in night vision; total darkness shows scintillation unless an IR illuminator is on; gain lag stepping from dark into light; no colour in night vision as a puzzle rule. Destination: Michael decides; Phase 3 with thermal unless moved.
17. **Light shafts not seen; lamps blinding in night vision; desktop smear moving in night vision** (Michael, 2026-10-09). **Built 2026-10-09 (Step 4b fix round 2)**: the cone meshes are gone, the glare is larger and washes the view out, and the smear (the glare read the camera before the render, so TAA saw a moving camera as still) is fixed with an e2e check. Waiting for Michael's look check.
18. **Night vision fades in and out; glare blinds half the screen** (Michael, 2026-10-09). **Built 2026-10-09 (Step 4b fix round 3)**: the goggles flip across the view in 0.2 s with no fade; the halo is a fixed angle like a real tube (about 1.8 deg, the same near and far) and the blinding comes from the auto-gain darkening the room near a lamp. Waiting for Michael's look check.

## Pending input

- Night vision and thermal reference images received 2026-10-09 (items 10, 13).
- Phone note received 2026-10-09 (item 10). Phone log received 2026-10-09 (Phone check passes at the line; results in `docs/progress.md`, Step 4b).
- Step 4b fix pass (items 10, 11) built 2026-10-09: Michael's look check on the iPhone and desktop, and a Phone check with night vision.

## Done

(none yet)
