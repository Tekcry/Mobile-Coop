# Manual test checklist

Desktop only (G12): pad first, then keyboard and mouse. One current checklist plus the release checklist (G92). Run it
on the build under test: the live game, the one chosen preview (G85) or a local `npm run dev`. F3 (or `?debug=1`) shows
the debug overlay. Tick each item; note anything off in Pause > Report feedback.

Items marked (CT prototype) describe today's movement, which the CT prototype replaces; the prototype job rewrites them.
Default buttons: `docs/systems/input-and-loop.md`, "Binding table". Older per-version lists:
[docs/archive/testing-history.md](docs/archive/testing-history.md) (3.0.0 to the consolidation) and
[docs/archive/TESTING-pre-3.0.md](docs/archive/TESTING-pre-3.0.md).

## Desktop checklist

### Boot and menus (controller)
- [ ] The game boots to the Night Shift title; the menu theme starts after the first button press.
- [ ] Every menu works by pad alone: the stick and d-pad move the focus ring, A selects, B goes back, LB / RB switch
  tabs, sliders and choices change with left / right. Prompts show the pad's glyphs (Xbox letters or PlayStation shapes).
- [ ] Play lists Infiltration and Free Roam only (Hunter and Mission appear only with `?legacy=1`). The Difficulty row
  offers Rookie, Normal, Realistic and Perfectionist, with no sliders.
- [ ] Loadout: primary (Heron Carbine) and sidearm (Hush 9 SD), attachments, gadget, presets; nothing to buy.
- [ ] Settings > Controller: vibration on / off and strength; Settings > Accessibility > Controls: rebind a verb (A),
  clear a slot (Y), a conflict shows a warning, reset restores the defaults.
- [ ] Unplug the pad mid-match: no stuck movement or firing, keyboard and mouse take over; plug it back in and press a
  button: the pad works again without a reload.

### In a match (controller; Free Roam on Proving Grounds, then Infiltration on the Warehouse at night)
- [ ] Moving: the stick sets the pace up to the speed gear (d-pad up / down); B crouches; a stop holds the stride, then
  settles (CT prototype). A part-pushed stick is a silent walk; a full stick at the default gear is audible.
- [ ] A at a wall puts your back to it; slide along it, stop at the edge, A to leave (CT prototype).
- [ ] Y climbs and uses: ladders, drainpipes, ledges (shimmy, climb up), pipes, ducts, windows, the split jump, wall jump,
  rappel and fences on the Proving CT course.
- [ ] Light: a lit pool on the light meter is lit on screen and guards there see you; a dark corner keeps you hidden
  (light parity). Shooting a lamp or a switch darkens it for the meter and the guards at once.
- [ ] View tap switches the goggles; a guard's footsteps and your own sound right with the music in every alert state.
- [ ] The rifle hangs flat on Wren's back (stud on the back plate), the pistol sits in her thigh holster; aiming, her
  fingers wrap the grips, the support hand is under the launcher (rifle) or cups the trigger hand (pistol, arms out).
- [ ] Draw and holster: the current gun goes away (rifle over the right shoulder onto the back stud, pistol into the thigh
  holster) before the next comes out; no gun passes through the head, chest or legs.
- [ ] Reload (X): the magazine comes out in the support hand, goes to its pouch (rifle chest, pistol left hip) and a fresh
  one goes in; on an empty gun she works the charging handle / racks the slide. Swapping mid-reload leaves no magazine in
  the hand.
- [ ] Swap shoulders while aiming: the gun moves to the other hand and shoulder; a partner sees the same.
- [ ] Ladders, drainpipes, pipes, ledges, the zipline, rappel rope and fences: palms sit on the rung / pipe / lip / cable /
  rope / rail with the fingers round it, no hand sunk in or floating.
- [ ] LT draws and aims, RT fires (no hip fire); RT while holstered strikes. X reloads, RB / LB swap between the two
  guns. The suppressed pistol and the issued rifle suppressor sound muffled and guards hear them less.
- [ ] D-pad right throws the gadget (hold aims); holding d-pad left opens the wheel (time slows).
- [ ] Takedowns: Y behind an unaware guard; a drop takedown from a pipe or ledge; a body can be carried and hidden.
- [ ] The wall medkit station on Proving Grounds (Free Roam): hurt, then hold to heal +40; it shows spent; at full
  health it is refused ("Health full"). No other way heals.
- [ ] An Infiltration mission on the Warehouse runs to its results screen (rating shown, no rewards panel).

### Keyboard and mouse
- [ ] A click captures the mouse (it never fires); W A S D move, the mouse looks, the wheel or = / - change the gear.
- [ ] RMB aims, LMB fires, C crouches, Space backs to a wall, E traverses, F uses, R reloads, X / Q swap, G gadget, Tab
  wheel, N goggles, Z ping, V shoulder swap; Esc pauses and Resume re-captures.
- [ ] Settings > Mouse & Keyboard: rebind a key, a conflict warns, Esc cancels a capture.

### Co-op (two browser tabs)
- [ ] Two tabs with `?net=local` (or two PCs with a room code): Co-op > Host in one, Join in the other. The lobby shows
  both players and the host's difficulty read-only on the client.
- [ ] Infiltration on the Warehouse: both see the same guards, doors and bodies; a client takedown, door and objective
  register on the host; pings show on both; a downed partner is revived; results on both pages.
- [ ] Free Roam on Proving Grounds: brace and boost onto the 4.2 m block, the human ladder, a dual takedown; partners
  block each other (no walking through).
- [ ] The Fallow bunker: open `?net=local&autostart=bunker&mode=course` in both tabs. The objective list shows for both;
  one player on an airlock pad shows "Waiting for partner"; both seal it; the rear door stays locked.
- [ ] Close the host tab: the client is told and returns to the menu.

## Release checklist (before a job merges)

### Checks
- [ ] `npm run check` passes; `npm run e2e` passes once on the PR head (the PR tier, CLAUDE.md "Sessions"; known-flaky
  suites excepted; `E2E_SUITE_TIMEOUT=900` on the 8-thread desktop); a job that touches visuals or rendering runs
  `npm run e2e:gpu` and the perf checks on Michael's PC, or lists them as "pending PC run".

### Offline and install
- [ ] First visit online; wait for the "Ready to play offline" toast. Go offline, close the tab, reopen: the game boots,
  menus work, a Free Roam and an Infiltration match play.
- [ ] Installed app (desktop Chrome / Edge install) offline: the same; Co-op shows the offline notice and nothing else
  is blocked.
- [ ] Deploy a new version while the app is closed; the next online launch picks it up, progress intact.
- [ ] Switch to another window mid-match: on return a solo match is paused, sound was silent while away, progress saved.

### Save migration
- [ ] Settings > Data > Import an export from an older build (v1 onwards): loadout and look carry over; a deleted gun
  becomes the kept gun of its slot.
- [ ] A save from a newer build opened in an older one: Settings > Data says it was left untouched; playing does not
  overwrite it.
- [ ] Private browsing or blocked storage: the game still plays; the Data tab warns that progress will not be kept.

### Controller (Xbox and PlayStation layouts)
- [ ] Connect and hot-plug: "Controller connected" toast, prompts switch to the pad's glyphs; disconnect mid-match:
  "Controller disconnected", no stuck input; reconnect works without a reload.
- [ ] Every screen is fully usable without the mouse: main menu, Play, Loadout, Settings, Co-op (Host / Join, the code
  keypad, Ready / Start / Leave), pause (Menu closes it), dialogs (A confirms, B cancels), results.
- [ ] Rumble on firing, hits, explosions and damage (where the pad supports it); off when Vibration is off.

### Final pass
- [ ] A 10-minute soak on the Warehouse (`node scripts/soak.mjs`, debug overlay): steady frame time, no heap growth, no
  audio crackle.
- [ ] Two PCs in co-op through an Infiltration mission, then Play again, then the host leaves.
