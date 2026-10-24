# lrpolish build - LR13 / LR14 / LR15 checker polish (correctness and hard-rule items)

Branch `feature/sector-redesign-lrpolish`, cut from LR15 head e60730c4. No PROTOCOL change (stays 38), no save change.
Toggle off (Classic) is unchanged except the LR14 fixes, which are always-on correctness fixes in the character-shadow path.

## Done

| Item | Change | Where |
| --- | --- | --- |
| lr-check 1 | Guard test: `LAMP_GLSL` and `MIX_GLSL` hold `LAMP_MATH_GLSL` and the photometric `.replace` takes (both now exported) | `src/world/bakedLamps.ts:450`, `:663`; `tests/lampFalloff.test.ts:158` |
| lr-check 2 | `RejoinRecord.lf` (optional): `CoopController.start` keeps the match's `lampFalloff`, `record()` stores it, "Resume hosting" passes it as the host override (`matchLampFalloff(.., lf)`). The record is `sessionStorage`, not IndexedDB and not the wire, so no SAVE_VERSION / PROTOCOL change. An older record (no `lf`) or junk: the host's setting, as before | `src/core/rejoin.ts:29`, parse `:68`; `src/net/coopUi.ts:74`, `:185`, `:811`; `tests/rejoin.test.ts:239` |
| lr-check 3 | Docs: the locked row shows for host and client (`lr13-build.md` Co-op line, `lighting.md` LR13 line). `ui.md` already said "the row" | `docs/sector-redesign/checks/lr13-build.md:24`, `docs/systems/lighting.md:42` |
| lr-check 4 | Test name "now 35" -> "now 38" | `tests/sectorStep3.test.ts:53` |
| lr14-check 1 | Context restore: `engine.onContextRestoredObservable` -> every slot `ready = -1`, `kReady = 0`, `params[s*4+3] = 0`, `lampSlot` cleared; observer removed in `disposeSlots` | `src/world/charShadows.ts:128`, `configure` / `invalidate` |
| lr14-check 2 | `NO_MESH_LAYER` 0x20000000 (grep: no other layer mask uses it; PROXY_LAYER stays 0x10000000) | `src/world/charShadows.ts:17` |
| lr14-check 3 | `copy()` binds without `applyEffectWrapper` (no `{}` per call): `setState`, depth / stencil off, `enableEffect(w.drawWrapper)`, `r.bindBuffers(w.effect)` | `src/world/charShadows.ts:336` |
| lr14-check 4, 5, 6 | `covers()` drops a capsule only for a caster the copied map was fitted around: each slot keeps its gathered spheres (`sp`, `k`) and, at copy, the fitted ones (`fittedSpheres` -> `spReady`, `kReady`); `covers` first needs `spheresHold` (capsule midpoint inside a fitted sphere + `sphereMargin`). A caster skipped by `fitCone` (lamp inside), past `MAX_SPHERES`, or newly in reach since the copy keeps its capsule. Buffers preallocated per slot; no per-frame allocation (alloc test) | `src/world/charShadowSet.ts:288`, `:306`; `src/world/charShadows.ts:59`, `:367`; `tests/charShadowSet.test.ts:184` |
| lr15-check 3 | The drawn torch is scaled by `vLightingIntensity.x / PI`, as Babylon's lights were: 1 on the PI-intensity materials (unchanged), 1 / PI on the `levelBuilder.ts:400` glass (directIntensity 1). Only under `LAMP_TORCH` (toggle on) | `src/world/bakedLamps.ts:1068` |
| lr15-check 5 | Rig test on NullEngine: 1 shadow slot + 3 torches -> 2 drawn, 2 slots filled; fixes off -> 0 drawn. (`BakedLamps` data-layout test not added: needs the lamp atlas textures) | `tests/shadowAccuracy.test.ts:308` |
| lr15-check 6 | `torchDrawTerm` uses `hyp3` | `src/world/shadowAccuracy.ts:138` |

## Skipped (features / measurements, for Michael)
lr-check 5 (protocol merge order), 6 (Realistic atlas size / bake time); lr14-check 7 (`BAKED_SHADOWS` fallback);
lr15-check 1 (fences / ropes / decals lose unshadowed torch light), 2 (no torch specular), 4 (drawn torch closed-door test).

## Tests
`tsc --noEmit` clean; eslint on the changed files clean. Vitest single files: shadowAccuracy, charShadowSet,
lampFalloff, rejoin, sectorStep3 (56 + 13), lightField, lights, coopTorches, lampPluginClone, lampPluginGap (39): all pass.
No e2e run.

## GPU checks needed (laptop, port 4189)
- LR14: a guard under a picked lamp still gets its silhouette shadow and no extra capsule shadow (the capsule midpoint
  must sit inside the body mesh's bounding sphere; a double shadow there means `spheresHold` misses it).
- LR14: a guard within ~0.5 m of a lamp (fit skipped) keeps a capsule shadow; a lost-context restore (`WEBGL_lose_context`)
  shows no dark cone before the next copy.
- LR15, `?falloff=photo`: a torch through the levelBuilder glass reads as before (no PI x jump); a torch on Wren / a
  weapon unchanged.
- e2e-coop / e2e-netmove: "Resume hosting" after a Realistic match resumes Realistic.
