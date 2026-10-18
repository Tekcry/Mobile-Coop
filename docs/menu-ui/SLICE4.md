# Menu UI - slice 4 (missions, briefing, issued kit)

Branch `feature/menu`, 2026-10-18. Prototype first (G87). Desktop only (G12). Covers steps 07 (missions, briefing, free
roam) and 08 (loadout, reduced to the issued-kit view per D-11 / Michael 2026-10-18).

## Built
- **Missions** (`src/ui/screens/missionsScreen.ts`, ghost SELECT / MISSION, class `missions-screen`): a list item per
  mission from `missions.json` (`data-key` `m-<id>`, `data-mission`), counter = best stars or `--`; the context panel shows
  name, map, brief and best result (stars, wins / plays). No unlock data exists, so every mission is open.
- **Briefing** (`briefingScreen.ts`, MISSION / BRIEFING, class `briefing-screen`): name and map, brief, objectives (G108),
  rules and best result; rows Insertion, Difficulty (the four fixed levels, no Custom, G106; `data-diff="choice"`,
  `data-key="difficulty"`), Weather when the map offers it, Start mission (`data-key="deploy"`, focused first). Y opens the
  kit for that mission. The Difficulty pick carries to the next briefing (module value).
- **Free roam** (`FreeRoamScreen`, FREE / ROAM, class `freeroam-screen`): every map with a sandbox mode (`data-key`
  `map-<id>`); a map opens the same briefing screen in free-roam form (Weather and Start only; sandbox ignores guards).
- **Issued kit** (`kitScreen.ts`, ISSUED / KIT, class `kit-screen`): read only. Primary, Sidearm (`data-key` `secondary`
  kept), Gadget; the counter is the item name; the context panel shows the weapon (fire mode, magazine), fitted attachments
  (the issued suppressor, A62) and Power / Accuracy / Range / Handling bars; the gadget shows its description. Confirm does
  nothing. No per-mission kit data exists, so every mission shows the default campaign kit (`campaignKit` of the save's
  loadout, the preset's gadget); a line says per-mission kits arrive with co-op. The main-menu Loadout item opens it.
- **Legacy** (`?legacy=1`): Loadout opens the old `LoadoutScreen` (customisation, economy); the Legacy entry still opens the
  old Play hub (Hunter / Mission). `PlayScreen` is unchanged and still owns that deploy path.
- `main.ts`: Missions -> `MissionsScreen`, Free roam -> `FreeRoamScreen`, Loadout -> `KitScreen` (or legacy).
- Styles: a "Menu UI (menu-ui slice 4)" block at the end of `src/styles.css`.
- Training stays a locked item on the main menu only (the Fallow course is not rebuilt, G79).

## Tests changed
- `scripts/e2e-park.mjs` (Missions / Free roam lists, kit view, read-only click; import check no longer depends on a
  chosen attachment), `scripts/e2e-pad.mjs` (kit by pad, Missions -> briefing -> Realistic by d-pad, Free roam -> Start),
  `scripts/e2e-mouse.mjs` (difficulty click on the briefing, kit read only), `scripts/e2e-clear.mjs` (the mode / map list
  check runs under `?legacy=1` via Legacy), `scripts/e2e-menus.mjs` (new slice 4 block: Missions, briefing difficulty,
  B / legend / Esc back, Free roam, kit context; the hold-right check now holds 3.2 s so slow software-GL polls pass).
- `e2e-missions`, `e2e-levels` needed no change (autostart paths).

## Skipped
- Locked mission cards and "Complete <previous> to unlock" (no unlock data), dev / greybox missions under `?dev=1`.
- Continue, the match-loading variant, the Custom difficulty removal is already in force, the Play hub class removal
  (kept for legacy), step 08 lists with equip, attachments page, camera framings `setFraming` (3D untouched).
- Revive syringe (not modelled), per-mission kits (no data).
- Training list screen; unit test for card text; docs the steps list (LOG, STATE, CHANGELOG, TESTING, systems docs).

## Open items
- Michael: look at `docs/menu-ui/shots/slice4-*.png` (missions, briefing, kit, free roam; layout only, software GL).
- The kit context panel sits over the operator on the stage (as every context panel does).
- GPU check on the PC: pending PC run.

## Results (software GL, `E2E_JOBS=1`, port 4191)
- `npm run check`: lint 0 errors, tests and build pass.
- Pass: smoke, e2e-menus (after the hold-right timing change; it failed twice before at 1.8 s under load), e2e-park,
  e2e-missions, e2e-levels, e2e-mouse, e2e-pad (known flaky; failed once in a combined run, passes alone).
- Legacy (`--legacy`): e2e-progression, e2e-cosmetics pass; e2e-clear passes after its play-screen check moved to `?legacy=1`.
