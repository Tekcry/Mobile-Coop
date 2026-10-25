# Campus graph conventions (Sector Ops, `campusOps`)

Moved from `graph-schema.md` (2026-10-25, doc-level). The graphs: `docs/sector-redesign/graph/campusOps-S<n>.json`.
The first run covered all five sections S1-S5.

- **Storeys.** One space per walkable surface: `storey` is its walking height (S2 `S2_FLOORS` 0 / 4.4 / 8.4 / 12.3;
  S5 G 0, L1 4.2, roof 8.4; S4 NOC mezzanine 3.6, plant deck 7.3, cable baskets 4.4). Stairs and ladders between
  them are links with `level_change`. A route surface with no section 7 class (roof walk, basket run, deck) is
  `custom` (WARN, justified) until the sheet gets classes for them.
- **Connectors C1-C4 are `spine` links, not spaces.** One `corridor` (or the narrowest door) link from the section's
  `exit` space to the next section's `entry` space; `length` = the connector's walk; `reason` names both doors. As a
  space, the connector's single near door (K1, K2 chokes) would fail the section's two-route check by design.
- **Posted choke guards (K1-K4)** count in their space's `guards`; the choke itself is the single spine link or a
  `note`.
- **Dogs count as guards** (SPEC "Dogs count"). The graphs still list `players: [2]` with one key `"2"`; Sector Ops
  now scales guards by player count (1-4, "Keep scaling", 2026-10-25), so the Sector Ops job adds the other keys.
- **Cameras, lasers, keypads, alarm panels, light circuits** are not in the graph. Devices go in the map's security
  register (`docs/level-design.md` section 13: one row per device, what it protects and why a real site has it there,
  rule 4.11); circuits go in its light plan. An `assist` may name one in its `reason`.
