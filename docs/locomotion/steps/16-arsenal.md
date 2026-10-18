# Step 16 - arsenal (Block C)

Curate the campaign arsenal (bible 5.6) and give every real-brand gun an original name in data and UI; the rest of
the 16 weapons stay in code, unused by the campaign. Deps: 09. Model: implementer opus; checker opus. (all subagents opus from step 06, Michael 2026-10-13)
No network or save-shape change (weapon ids are unchanged). Line numbers verified 2026-10-13.

## Read
- docs/design-bible.md 467-510 (5.6: slots, arsenal table, original names); CLAUDE.md hard rule "No Splinter Cell IP"
- src/config/weapons.json: each `"name"` line (3, 134, 327, 558, 721, 893, 1024, 1176, 1369, 1562, 1760, 1953, 2116,
  2279, 2477, 2661) with its `class` / `slot` (+1, +2 lines) and `muzzle` lists (117, 310, 541, 704, 876 ...)
- src/weapons/weaponDefs.ts 50-105 (loader :56, :99); src/progression/attachments.ts 1-70 (suppressor :19)
- src/ui/screens/loadoutScreen.ts 20-40 (`WEAPON_ORDER` :27), 395-410, 515-540
- src/save/schema.ts 55-60, 90-100, 140-150, 215-225 (loadout fields and sanitize: read only, no change)
- grep the old names across src, docs/systems, TESTING.md and scripts/e2e-*.mjs before renaming

## Task
1. Rename (data `name` and every UI / doc string; ids stay, ASSUMED, logged). Proposed original names:

| id | old name | new name | campaign role |
|---|---|---|---|
| rifle | 552 Commando | Heron Carbine | primary, suppressed rifle (default) |
| smg | MP5 Kurz | Marten 9 SMG | primary, suppressed SMG |
| shotgun | M870 Pump | Mason 12 Pump | primary, shotgun (close, loud) |
| dmr | M14 DMR | Spotter 7.62 Marksman | primary, marksman (zoom, hold breath) |
| pistolSd | 9mm SD | Hush 9 SD | sidearm, suppressed pistol (default, light disruptor) |
| pistol | P45 Compact | Warden .45 | sidearm, heavy pistol (louder, stops armour) |
| fiveseven | FN Five-7 | Kite 5.7 | unused by the campaign |
| vector | Vector .45 | Ferret .45 SMG | unused |
| p90 | P-90 | Swift 5.7 PDW | unused |
| ak | AK-74 | Steppe 5.45 Rifle | unused |
| tavor | TAR-21 | Ibex Bullpup | unused |
| semiShotgun | M1014 Semi | Talon 12 Semi | unused |
| sniper | M700 Bolt | Ridgeline Bolt | unused |
| lmg | M249 SAW | Anvil 5.56 LMG | unused |
| breacher, crossbow | Breacher, Silent Crossbow | unchanged (generic) | unused |

2. Before committing, grep each new name against the repo and docs/story.md for clashes with operator, place or
   mission names (Kestrel is taken; avoid it). No real brands, model designations or SC terms.
3. New src/config/arsenal.ts (pure): `CAMPAIGN_ARSENAL = { primary: ['rifle', 'smg', 'shotgun', 'dmr'],
   sidearm: ['pistolSd', 'pistol'], defaults: { primary: 'rifle', sidearm: 'pistolSd' } }` plus `campaignLoadout(lo)`
   that replaces an id outside the set with its slot default (applied at use, so no SAVE_VERSION bump).
4. The non-lethal dart sidearm (bible 5.6) does not exist in data: reserved as a named slot in `CAMPAIGN_ARSENAL`
   comments, not built (ASSUMED, logged; it needs a knockout hit kind).
5. Suppressible where it makes sense: rifle, smg, dmr, pistolSd, pistol accept the suppressor (attachments.ts
   `weapons` lists); the shotgun does not. pistolSd ships suppressed.
6. Loadout UI: the campaign (Infiltration, mission briefing) lists only `CAMPAIGN_ARSENAL` in that order; sandbox and
   `?legacy=1` screens keep `WEAPON_ORDER` (all 16, new names). Co-op lobby loadout validation is unchanged.
7. Marksman rifle: `dmr` keeps zoom and gains hold-breath only if it already exists in the scope code; otherwise note
   it for Phase 6 in REVIEW.md (no new system in this step).
8. Docs: docs/systems/combat.md weapon list with the new names; TESTING.md manual check of names in the loadout.

## Tests
- tests/arsenal.test.ts: the set matches bible 5.6 (4 primaries, 2 built sidearms), defaults, `campaignLoadout`
  replaces an off-set id, every id exists in weapons.json.
- tests/weaponNames.test.ts: no weapon `name` matches a banned-pattern list (MP5, Kurz, Commando, M870, M700, FN,
  Five-7, Vector, P-90, P90, AK, TAR, Tavor, M1014, M14, M249, SAW, Glock, Beretta, Colt, SIG, H&K, Remington, Benelli,
  the reference game's gear names and similar).
- e2e-pad: the campaign loadout screen shows only the 6 curated guns, navigable by pad; play starts with the
  defaults. e2e-mouse: the same with mouse clicks.
- e2e-weapons-carry still green with the new names.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-weapons-carry e2e-missions`;
  `npm run e2e:legacy` (report only: legacy loadout still lists 16)
- Grep proofs: `grep -rn -i "mp5\|kurz\|m870\|m700\|five-7\|vector \.45\|p-90\|ak-74\|tar-21\|m1014\|m14 dmr\|m249"
  src docs/systems TESTING.md` empty (Vector3 excluded).

## Commit
"locomotion 16: curated campaign arsenal, original weapon names"
Then LOG, STATE, AUDIT (W12), CHANGELOG, TESTING, docs/systems/combat.md.
