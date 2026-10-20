# Slice 4d: the glow above Wren's goggle (M4)

Michael (M4): "there is also a random glow above wren on her forehead, it doesn't look right."

## Source: the menu's goggle spill light (light 2), reflected on her goggle and helmet

The third glow is not an emissive part. It is the specular highlight of the menu's green "goggle spill" spot light
(each shot's light 2, `glowLight: 2`, colour `NV`) on the glossy goggle housing and the helmet's metal mount, then
bloomed. It is menu-only: the game has no such light.

Evidence (no GPU run; this is from the code and the assets):
- **Wren's glb has exactly two emissive lens patches.** The only emissive material is `wren-<lod>-glow`
  (emissive 0.30 / 0.85 / 0.16). Parsing `src/operators/assets/wren/wren-hero.glb` and `wren-lod0.glb`, its 642
  vertices form two clusters of 321, at x -0.042..-0.022 and 0.022..0.042, y 1.563..1.584, z 0.152..0.155: the two
  lenses, nothing above. Neither file has a `_GOGGLE` attribute, so no stowed / in-use swap adds geometry.
- **The procedural rig's tri-lens glows are not drawn.** `CharacterRig` (`src/player/characterRig.ts` ~1038-1058)
  builds a third lens glow above the two (`lens(0, 0.058)`) plus a battery LED, through `addGlow`
  (`src/player/goggleGlow.ts`). But `operatorRig` (`src/operators/runtime/playerFigure.ts` 68-71) disables every
  mesh under the rig root after building it, glows included, and nothing re-enables them (`setHeadVisible` only sets
  `isVisible`). And the observed glow is not where that sphere would be (see the next point).
- **The glow moves across the goggle as the camera moves, so it is a reflection.** On `sheet-s4-title.png`, measured
  from the left lens with the lens spacing about 55 px: flicker-1 +14 px, flicker-2 +13 px, flicker-4 +1 px,
  lights-rising +3 px, menu-first -3 px. A glow fixed to the head at x 0 (the rig's third lens) would sit near +27 px
  in every frame. A highlight slides with the view angle, as this one does.
- **It shows exactly when the spill light is on.** `menuScene.ts` 805 sets light 2's intensity to
  `intensity * glow` (the goggle level), while the key and rim follow `lit`. In the flicker frames `lit` is 0, so the
  only light in the scene is the spill spot, and the blob flickers with it.
- **The light sits right in front of her face.** `FACE` (`menuSets.ts` ~117-121) and X5 (`menuSets.ts` 243) put it at
  (0, 1.57, -0.3) aimed at (0, 1.53, 0): at lens height, about 15 cm in front of the lenses. The glossy parts nearby
  are the goggle housing (kit, front up to z 0.159) and a metal plate on the helmet front (hardware material, x ±0.03,
  y 1.644..1.650, z 0.083..0.090). A light that close makes a small, very bright specular dot on such parts. The dot
  on the helmet top in the X5 aim pose is the same reflection with her head pitched forward under the light.
- **`SpotLight.specular` cannot turn it off.** `menuScene.light()` sets `specular` to 0.3 x the colour, but Babylon's PBR
  shader takes a light's specular from its diffuse colour (`lightFragment`: `computeSpecularLighting(..., diffuse{X})`),
  so on Wren's PBR materials the full green light makes a highlight.

## Change: none made (the source is in menu files this agent may not edit)

The fix belongs to the menu implementer (`src/world/menuScene.ts` / `menuSets.ts`). Recommended, smallest:

- `src/world/menuScene.ts` line 805, drop the goggle spill spot (the lens's own emissive and the bloom already give
  the goggle glow):
  ```ts
  for (let i = 0; i < 3; i++) this.spots[i]!.intensity = i === set.glowLight ? 0 : set.lights[i]!.intensity * lit;
  ```
  (Or, the same in data: remove `glowLight` and set light 2's `intensity` to 0 in `FACE` and the 9 sets that name
  `glowLight: 2` in `menuSets.ts`.)

If the green tint on the brow and cheeks is wanted, keep the spot but move it so it cannot reflect towards the camera:
far enough away that its highlight is no longer a hot dot (for example 0.8-1 m in front, intensity scaled up by the
distance squared). That needs a GPU look, so it is the second choice.

Verify on the PC (GPU): freeze the title flicker (the slice 4a debug pause hook) with the change and check the blob
above the lenses is gone in `sheet-s4-title.png`'s flicker frames and on X5's helmet top.

## Files

- Changed: none in code. Added this report, `docs/menu-notes/GLOW.md`.
- Shared code: not changed. `src/player/goggleGlow.ts`, `src/player/characterRig.ts`,
  `src/operators/runtime/goggle.ts` and `figure.ts` are not the source.

## In-game impact

None. The spill spot exists only in the menu's hero shots. In the game Wren's goggle glow is the glb's two lens
patches (emissive, `OperatorFigure`), and the rig's tri-lens glow spheres stay disabled under `operatorRig`.
Polish note, not part of this fix: those disabled glow instances (three front, one battery LED) are still built and
updated on every Wren rig; CT Core could stop building them for operator rigs when it next works in
`characterRig.ts`.
