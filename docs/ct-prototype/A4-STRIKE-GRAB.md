# A4 - Palm strike and grab (CT core feel job)

Branch `feature/ct-prototype`, nothing committed. Prototype only (G4): every number is a starting value (G10). G42, G155 (palm strike drops every guard), G23, G43, G162. No wire change (protocol stays 15).

## Built

**Palm strike** (`src/game/elbowStrike.ts`, `strikeController.ts`; files keep the old elbow names)
- One hit knocks out any guard from any side, aware or not, heavy or not: `resolveStrike` always returns `'ko'`, `applyHit` has no stagger branch (`strikeStagger` and the stagger timer on `Enemy` are left in place, now unused).
- Numbers (footage doc I1 / I2): wind-up `anticipation` 0.10 s, contact `hitAt` 0.12 s (footage 0.10-0.15), `recover` 1.4 s after contact (loco M25, footage 1.2-1.4), whole move 1.52 s; `lunge` cap 0.4 m (footage 0.3-0.5); reach 1.2 m and 90 deg cone unchanged. A whiff (no target) ends 0.5 s after contact time (`whiffRecover`) so a miss is not a 1.4 s lockout. Host `lagSlack` 0.6 -> 0.8 m because contact is now 0.12 s after the press.
- Button: unchanged, the holstered fire press (pad RT, mouse LMB). A3's table lists LT as "secondary / knockout", but LT is aim and draws the weapon (holstered `ads` draws), so moving the strike there would break aiming. Not moved; Michael decides.

**Grab first** (`takedownController.ts`, new `src/game/grabMenu.ts`, `gameState.ts` `grabMenuStep`, `hud.ts`)
- The takedown button (A / E) from behind grabs (silent). While holding, the grab menu (HUD, same panel as the door menu, title "Held") lists: Knock out, Kill, Carry, Force to device (not yet), Interrogate (later). Select with the stick up / down or arrows, A picks, B (crouch) lets the guard go. The operator stands still while it is open.
- Knock out / Kill: the existing 0.5 s finishing move, lethal or not. Carry: knock out, then the body is shouldered through the existing body-carry (`StealthSystems.pickUpBody`, a thin public wrapper). Force to device: stub (feed "not built yet"; there is no scanner hook). Interrogate: stub ("later"). A stub leaves the menu open.
- Removed: the tap / hold deciding press on the grab (`grabDecides` no longer called, `gameplay.grabToggle` is now dead; its row is in `src/ui/screens/settingsScreen.ts`, which I may not edit), the B shove (B is now "let go", same stagger-then-alert result, `GRAB.shoveStagger`), the "Knock out (hold: kill)" prompt, the walking-with-hostage and sidearm-over-the-shoulder play (the menu blanks the input, so the hostage no longer walks or aims; `GRAB.maxGear` / `hesitate` / `spreadMul` and the guard hostage-shield code are left, unreachable from play).
- Kept: drop, ledge, window, pipe, inverted, front, side and corner takedowns keep tap / hold.

**Heavy / dog exception (G155):** removed from the strike (no heavy branch) and from the takedown (`tryVictim` no longer applies `grabRule` to heavies, so heavies can be grabbed from any side). Left: `ARCHETYPE.heavy`, `grabRule` (still used for the enforcer), the dog `quadruped` guard in `start()` (a dog is not grabbed), heavy armour damage in `damage` / `archetypes`.

**Co-op:** the committed-move rail is untouched (client predicts, host resolves, `cmove` / `cstart` / `cdeny`); remotes still see `strike` and `grab` modes from MoveState. A client grab opens the same menu on the client; the pick goes through the existing puppet `knockOut` / `applyDamage`.
- "Client strike denied" (known open failure): passed in this run of e2e-coop (not touched). Likely timing under software GL (it waits on the host's `strikes` record, which now ends 1.52 s of host time after t0); I did not change that wait.

## Files
Edited: `src/game/{elbowStrike,strikeController,takedownController,gameState,stealthSystems}.ts`, `src/ui/hud/hud.ts` (`setDoorMenu` title arg). New: `src/game/grabMenu.ts`, `tests/grabMenu.test.ts`. Not touched: `src/ui/screens/**`, `docs/DECISIONS.md`.

## Tests changed
- Unit: `elbowStrike.test.ts` rewritten (new numbers, one-hit table, whiff duration), `committedMoves.test.ts` (lag slack 0.8), new `grabMenu.test.ts`.
- E2E: `e2e-takedown` (grab via menu, new `grab` and `grab-kill-carry-letgo` scenarios, shove / walk / sidearm / hostage-shot checks deleted, heavy "never knocked out" replaced by "palm strike: one hit"), `e2e-pad` (palm strike section, grab rumble picks Knock out), `e2e-coop` (client grab uses the menu). `e2e-netmove` strike section runs unchanged (freeze phase 0.4 still works).

## Results (port 4193, one at a time)
- `npm run lint` 0 errors; `npx vitest run` 132 files / 1458 tests pass; `npm run build` ok.
- E2E pass: smoke, e2e-takedown, e2e-coop (full, including the client strike denied step), e2e-stealth-ai, e2e-pad (one run failed the rumble-on-takedown assert before I updated it for the menu; passes after).
- e2e-stealth fails at "camera: free orbit" (undefined `x`): the listed pre-existing failure (camera-bounds), not from this slice.
- Not run: e2e-netmove, e2e-enemies (enforcer / heavy checks untouched by the code change).

## What Michael should try (`?autostart=warehouse&mode=clear`)
1. Holstered, walk up to any guard (calm or alert, front, side or back; also a heavy if you spawn one) and press RT / LMB: contact about 0.12 s in, he drops, you are slow for about 1.4 s. Whiff: 0.6 s.
2. Walk up behind a guard and press A / E: the grab, then the "Held" menu. Knock out, Kill, Carry (body on the shoulder, A to put down) work; Force to device / Interrogate say not yet. B lets him go.
3. Tune `STRIKE` in `src/game/elbowStrike.ts` (`hitAt`, `recover`, `whiffRecover`, `lunge`, `lagSlack`), `GRAB_STRIKE` in `takedownController.ts`, menu entries in `src/game/grabMenu.ts`.
