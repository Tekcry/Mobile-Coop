# Step 08 - loadout (Block B)
Loadout on the template over the 3D stage: root, weapon / sidearm / gadget lists with stat comparison, attachments, the
legend in place of the action bar. Deps: 06. Model: Opus 5.5 / Opus 5.5. Local only.

## Read
- SPEC.md 7.10, 4.3 (locked, touch); DECISIONS MD16, MD19; FINDINGS.md campaign arsenal; locomotion A28, A33, A59.
- `src/ui/screens/loadoutScreen.ts` (page stack, rows, `act` / `alt`, preview on focus, `.lo-acts`, touch rule),
  `src/ui/hud/statBars.ts`, `src/ui/screens/operator.ts`, `src/world/menuScene.ts` `setFraming`, `previewYaw`.
- Prototype `SCR.loadout`, `weaponList()`, `statsHtml()`.

## Task
1. Root KIT / LOADOUT: Preset cycler (Silent / Flash / Loud), WEAPONS Primary / Sidearm, GEAR Gadget; counters show
   the equipped names. Legacy groups stay, restyled by the template only.
2. Lists SELECT / PRIMARY, SIDEARM, GADGET: campaign items; focus previews on the operator (as today); "Equipped"
   counter; context = description + Power / Accuracy / Range / Handling bars against the equipped item (gain green,
   loss red, the rest `--text`). Parked items locked with the reason.
3. Attachments (Y Customise on a weapon): rows grouped Optic / Barrel / Underbarrel / Magazine as cyclers; the
   issued suppressor (A62) shows as the default.
4. Legend: Back, Select / Equip, Y Customise. Remove `.lo-acts`, `.lo-top` economy, breadcrumbs (the ghost title
   carries the place).
5. Right stick / drag on the stage still turns the operator; it never moves focus.
6. Camera framings: list screens keep the operator right of the list (`setFraming('loadout')`); weapon lists use
   `weapon`.

## Tests
- e2e-menus: loadout root and lists on keyboard, mouse, pad; equip and Back focus memory; locked drone reason.
- e2e-progression, e2e-cosmetics, e2e-park, e2e-pad (campaign loadout): new `data-key`s; touch: one tap equips.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-menus e2e-park e2e-pad
  e2e-touch e2e-progression e2e-cosmetics`.
- GPU (PC): `E2E_GPU=1` shot of a weapon list over the stage (contrast of the context panel).

## Commit
"menu-ui 08: loadout on the menu template with stat comparison and attachments"
Then LOG, STATE, CHANGELOG, TESTING, docs/systems/ui.md.
