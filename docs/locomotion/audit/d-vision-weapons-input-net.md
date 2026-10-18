# Audit (d): sonar, vision, weapons, input, settings, net

Explore agent report, step 1. Unread: the fire path (whether firing is blocked when not aiming), controlsScreen.ts rebind flow, NightAutoGain / cinematicPost internals.

## 1. Inventory
| item | owner | trigger | duration | contacts | interrupts | net | file:line |
|---|---|---|---|---|---|---|---|
| Sonar (pulse, marks, ring) | game/vision.ts, gameState.ts | `vision` 2nd press after night | pulse 6 s, marks 2.5 s, run 18 s, cooldown 12 s | enemies in 30 m | cooldown, `sonarAllowed` | local; `events 'sonar'` | vision.ts:11-19,44-47; gameState.ts:404-406,421-429,1679-1716,1852-1854 |
| Sonar hooks | actions.ts:28; archetypes.ts:162-171 (`DifficultyDef.sonar`); sfx.ts:205-206; gameAudio.ts:67; gameEvents.ts:23-25; hud.ts:382; styles.css:949; touchControls.ts:33; loadoutScreen.ts, controlsScreen.ts (text); suit.ts:40-42,64-66,75,84-85,109-146; silhouettes.ts:16; characterRig.ts:847 + gameState.ts:1711 (lens glow); dogModel.ts:24, enemy.ts:396 (comments); coopHost.ts:128 (`sonar: 0`) | | | | | no | as listed |
| Night vision (lighting gain) | gameState.ts, vfx/nightVision.ts, nightAutoGain.ts, nightBloom.ts, cinematicPost.ts | `vision` -> night | flip blend | `post.setNightVision`, `lightRig.setVisionBoost`, `lamps.visionGain` | - | local | gameState.ts:1606,1700-1711; cinematicPost.ts:4,156 |
| Thermal / electro | none | - | - | - | - | - | gameState.ts:404 note; post host cinematicPost.ts:156 |
| Elbow strike | none | - | - | - | - | - | - |
| Holster unless aiming | partial: swap and attached stow only | swap 0.38 s holster beat | - | - | - | no drawn mode | playerWeapons.ts:67-81,190-213,283-289,352-372 |
| Committed traversals | MoveState | - | `MoveCommit.dur` | - | - | client-owned, host validates speed | moveState.ts:22-30,49,54-69; validate.ts:162-175 |
| Takedown | takedown.ts, takedownController.ts | interact in reach | client let-go 6 s | host `beginTakedown` | abort; host denies seized / taken / spotted+alert | MoveState `takedown`; `td {target, ph, lethal}`; `tdDenied`. Host-approved start, no shared start time | takedown.ts:15-30; takedownController.ts:272-278,354,438; coopHost.ts:44-47,502-533; protocol.ts:159,488 |
| Grab / hostage | MoveState `grab` | - | - | - | - | yes | moveState.ts:38-39; localMoveState.ts:46-50 |
| Dual takedown | coopHost | 2 takedowns within 1.5 s | banner 1.8 s | - | - | host banner | coopHost.ts:47,225-240 |
| PvP takedown | coopHost, pvp.ts | - | - | - | - | `ptd` | coopHost.ts:29,624-663; protocol.ts:170 |
| Team brace | teamController.ts | hold Y 0.4 s, mate 3 m, wall 1 m | until used | - | - | `brace` | movement.ts:384-390; teamMoves.ts:54-58; teamController.ts:133,335-345 |
| Team boost | teamMoves.ts | `tmove {kind:'boost'}` | 0.9 s | lip <= 4.5 m | host denies rate / dead / notMates / notBraced / far / busy / noTarget / tooHigh | `boost` / `brace`; `tmove`, `tstart {t0}`, `tdeny`, `tend` | teamMoves.ts:9,36-52; movement.ts:394-403; protocol.ts:162-168; coopHost.ts:573-604; coopClient.ts:98-106 |
| Team human ladder | same | `tmove {kind:'ladder'}` | climb 0.8 s | feet 1.45 m, grab 4.1 m | `tend` | `stacked` sub 1 top / 2 bottom | movement.ts:396-399; localMoveState.ts:34-44; coopHost.ts:583-600 |
| Missing team moves | split-jump boost, back-to-back, pull-up, rappel anchor | - | - | - | - | none | `TeamKind = 'boost' \| 'ladder'` teamMoves.ts:9 |
| Bot partner (C20) | none | - | - | - | - | - | - |
| Player capsule separation | none in src/net | - | - | - | - | - | enemy only: enemy.ts:1515 |
| Remote posing | remoteAvatar.ts | snapshot | - | `poseFromMoveState`, grips, `rd` eased 0.15 s | - | `PlayerState.mv` | remoteAvatar.ts:196-215; protocol.ts:66-73,238 |

Wire: `packMoveState` / `sanitizeMoveState` (moveState.ts:166,214; protocol.ts:73,238); `localMoveState` (localMoveState.ts:15); send `mvNow` / `mvSent` / `moveChanged` (coopHost.ts:773-782,975; coopClient.ts:456-486).

## 2. Weapons (src/config/weapons.json; loader weaponDefs.ts:56,99; stats weaponStats.ts)
| id | name | line | real brand / designation |
|---|---|---|---|
| pistol | P45 Compact | 3 | generic |
| smg | MP5 Kurz | 134 | yes |
| rifle | 552 Commando | 327 | yes |
| shotgun | M870 Pump | 558 | yes |
| sniper | M700 Bolt | 721 | yes |
| fiveseven | FN Five-7 | 893 | yes |
| (suppressed pistol) | 9mm SD | 1024 | generic |
| vector | Vector .45 | 1176 | yes |
| p90 | P-90 | 1369 | yes |
| ak | AK-74 | 1562 | yes |
| tavor | TAR-21 | 1760 | yes |
| (semi shotgun) | M1014 Semi | 1953 | yes |
| breacher | Breacher | 2116 | generic |
| dmr | M14 DMR | 2279 | yes |
| crossbow | Silent Crossbow | 2477 | generic |
| lmg | M249 SAW | 2661 | yes |

Also check attachments.ts and loadoutScreen.ts strings. Spread: per-weapon `spreadHip`, `spreadAds`, `spreadMove`, `spreadPerShot`, `spreadRecovery`, `maxSpread` (pistol weapons.json:19-24: hip 1.8, ADS 0.35); `spreadDeg` (weaponStats.ts:85-89); `currentSpread()` (playerWeapons.ts:310, :511); attachments.ts:17-22 (hip-fire mods); crosshair gameState.ts:2334; loadout bar loadoutScreen.ts:401.

## 3. D1 / D7 / D8 hooks
- Actions `BUTTON_ACTIONS` (actions.ts:2-48). Pad: gamepadMapping.ts (`PAD` :4-22, tuning :31-37, mapping `GAME_BINDINGS` :58-75, `TapHold` :78-95); gamepadSource.ts:30,128-137. KBM `BINDS` keyBindings.ts:44+ (mouse buttons, wheel, 1-8 fixed, :1-6). Touch touchControls.ts:26-36.
- D7 remap: KBM exists (`Settings.keys` settings.ts:91, `sanitizeBinds` :3, controlsScreen.ts). Pad remap missing (hard-coded `GAME_BINDINGS` gamepadMapping.ts:58-75). Hold / toggle partial: `adsToggle`, `crouchToggle`, `sprintHold` (settings.ts:145,268,467).
- Difficulty: `DIFFICULTY` 4 presets (src/ai/archetypes.ts:150,166-171) with damage, accuracy, hp, reward, perception, reaction, execute, sonar. Reads: enemy.ts:270,483,616,1114,1452,1462; enemyManager.ts:169,636. Lobby coopUi.ts:267,358-381; host difficulty carried by `setSettings` (coopUi.ts:365-389). No alarm-tolerance field.
- Persistence: settings in IndexedDB `kv/settings` via `SettingsStore` (app.ts:79, :308; settings.ts:491-510). Not `SaveData` (schema.ts:45-73). `SAVE_VERSION = 7` (schema.ts:10). See ASSUMED A3.
- D8: modes append-only (moveState.ts:12); mirror new modes in localMoveState.ts:15-60, `poseFromMoveState` (moveState.ts:279), remoteAvatar.ts:207, pack / sanitize. Host-approved with `t0` only for team moves (`tmove` -> `checkTeamRequest` teamMoves.ts:39 -> `tstart {t0}`). Takedowns: `td` without shared start time (coopHost.ts:502-533).
- No medkit or drawn-state fields in `PlayerState` (protocol.ts ~55-75). Health and downed / revive exist (coopHost.ts:128).

## 4. E2E suites
| suite | covers | tolerances |
|---|---|---|
| e2e-netmove (477 lines) | 2 pages `?net=local`, Proving Grounds: cover, ladder, pipes, lip hang, duct, zipline, roll, split, wall jump, rappel, fence, brace + boost, human ladder, denial, PvP head hit | joints wristL/R, ankleL/R, headNode within 0.10 m (:43,:70,:75); settle < 0.05 m/s and < 0.01 m (:52); grips 0.01 (:64) |
| e2e-coop (605 lines) | 2-3 pages `?net=local&legacy=1`: lobby, snapshots, hits, downed / revive, results, host leave, malformed, offline, takedown, grab, execute | enemy count within 1 (:86); puppet 1.5 m (:127) |
| e2e-pad (179) | fake gamepad menus, hot plug, layout editor; no remap or play | - |
| e2e-mouse (100) | pointer lock, look, fire, wheel gear, Esc pause | - |
| e2e-touch (255) | menus, floating sticks, fire button, speed buttons, cover button, stick rotation | yaw < 0.01 (:80,:89); stick 4 px (:58) |
