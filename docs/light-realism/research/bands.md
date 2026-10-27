# light-realism - band table research

Owner: Night Shift | Sector Ops Build. Status: draft for Michael's click (the S1 decision pack, PLAN L1). Feeds scale
sheet section 9 (`docs/design/scale-sheet.md:168-190`) after his approval, never before (BRIEF A4, A10).

Values are typical maintained illuminance (lux, lx) from the standards' published category tables, written as short
facts with the standard and the part or table they come from. No standard text was downloaded or bought; every value
not confirmed against a copy is marked **to verify**. The job buys or downloads nothing without asking Michael.

## 1. The standards
| Standard | Covers | Used for |
| --- | --- | --- |
| AS/NZS 1158.3.1 (Lighting for roads and public spaces, Part 3.1: pedestrian area (Category P) lighting) | Local roads, pathways, public activity areas, outdoor car parks; average and point-minimum horizontal illuminance per category, vertical illuminance for some | Car parks, roads and lanes, forecourts, paths |
| AS/NZS 1680.1 (Interior and workplace lighting, general principles and recommendations) | The recommended maintained illuminance steps 40 / 80 / 160 / 240 / 320 / 400 / 600 lx by task difficulty | Every interior row |
| AS/NZS 1680.2.1 (circulation spaces and other general areas), 1680.2.2 (office and screen-based tasks), 1680.2.4 (industrial tasks and processes), 1680.5 (outdoor workplace lighting) | Space-by-space recommendations | Corridors, stairs, lobbies; offices, security rooms; plant rooms, warehouses, docks; yards |
| EN 12464-1 (2021): indoor work places; EN 12464-2 (2014): outdoor work places | Maintained illuminance and uniformity per activity | Cross-check for every row; car parks (EN 12464-2 "parking areas") |
| AS/NZS 2293 (emergency escape lighting) | Minimum floor illuminance on escape routes when the normal supply fails | The level a cut circuit falls to (section 4) |

## 2. The calibration curve (BRIEF A2, PLAN L0)
The engine's light level (the field the meter and guards read, 0-1) maps to lux by one curve:
`level = 0.28 + 0.32 x log10(lux)`, clamped 0-1. Anchors: 1 lx = 0.28 (`LIGHT.shadow`, the meter's dark line) and 10 lx
= 0.60 (`LIGHT.lit`). Back the other way: `lux = 10 ^ ((level - 0.28) / 0.32)`. Level 1.0 = 178 lx; anything brighter
reads fully lit. The "Level" columns below use it.

Why a log curve and not one lux-per-level constant: the bands span 0.3 lx (a lane's point minimum) to 500 lx (an
office), over 1000:1. One linear constant either clips every interior to white or puts every car park under the dark
line; a log curve is how eyes and the meter's thresholds read light. Lamps still add linearly in the engine (G314's
inverse-square terms); the curve only labels the summed level in lux, so the picture, meter and guards are unchanged by
it (parity holds by construction).

| Engine night floor | Level | Reads as | Real reference |
| --- | --- | --- | --- |
| Moonlight (campus theme, `moonLight`) | 0.104 | 0.28 lx | full moon on open ground 0.05-0.3 lx |
| Standby fill (`ambientZone` 0.14, SPEC LR7) | 0.14 | 0.37 lx | sky glow and spill; escape-route emergency lighting minimum 0.2 lx (AS/NZS 2293, to verify) |
| Moon + standby fill (S1 open ground, no lamp) | 0.244 | 0.77 lx | |
| Transit fill (connectors, stair cores) | 0.30 | 1.15 lx | |

Alternatives for the pack: (B) 1 lx = 0.28 and 7 lx = 0.60 (slope 0.379; the P11b average reads lit); (C) a linear
constant (rejected above).

## 3. Band table
Band = the standard's maintained average as the floor of the space's mean, up to 2.5x it, plus the point minimum where
the standard gives one (BRIEF A4). Plane: H0 = horizontal at the ground or floor (field y 0.1), H0.8 = the task plane
(y 0.8) (BRIEF A3). Recommended row in **bold** where a space type has more than one category.

### 3a. Outdoor (AS/NZS 1158.3.1; EN 12464-2 cross-check)
| Space type | Category (AS/NZS) | Avg lx | Point min lx | Level avg / min | EN 12464-2 | Plane | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Outdoor car park, high night use (S1 staff car park, A5)** | **P11a** | **14** | **3** | **0.65 / 0.43** | parking, heavy traffic 20 lx, U0 0.25 (to verify) | H0 | "car parks are generally well lit": no dark floor at this level except behind cars, under a roof, cut or shot |
| Outdoor car park, medium night use | P11b | 7 | 1.5 | 0.55 / 0.34 | medium traffic 10 lx (to verify) | H0 | the pack's alternative |
| Outdoor car park, low night use | P11c | 3.5 | 0.7 | 0.45 / 0.23 | light traffic 5 lx (to verify) | H0 | remote rows; min reads dark |
| Covered car park, carport roof | covered car park categories in 1158.3.1 (to verify) | to verify | to verify | - | EN 12464-1 parking buildings 75 lx (to verify) | H0 | an open carport over outdoor bays stays in the outdoor band; under its roof is a real gap only where no fitting hangs under it |
| **Campus road, ring road** | **P2** (to verify) | 3.5 | 0.7 | 0.45 / 0.23 | traffic areas, regular vehicles 20 lx (to verify) | H0 | between poles reads dark: a real gap |
| Service lane, bin lane | P3 (to verify) | 1.75 | 0.3 | 0.36 / 0.11 | slow vehicles 10 lx (to verify) | H0 | mostly mid, dark between poles |
| Pathway, shore path | pathway category (to verify) | 0.85-3.5 (to verify) | 0.14-0.7 (to verify) | 0.26-0.45 / 0.01-0.23 | walkways for pedestrians 5 lx (to verify) | H0 | |
| Forecourt, building entry plaza | public activity area category (to verify) | 7 (to verify) | 2 (to verify) | 0.55 / 0.38 | - | H0 | S1 forecourt and canopy approach |
| Yard, loading apron (outdoor workplace) | AS/NZS 1680.5 (to verify) | 20-50 (to verify) | - | 0.70-0.82 | loading / unloading 50 lx (to verify) | H0 | delivery yard, generator compound, dock apron |

### 3b. Interior (AS/NZS 1680.1 / 1680.2.x; EN 12464-1 cross-check)
| Space type | AS/NZS 1680 lx | EN 12464-1 lx | Band floor used | Level | Plane | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Corridor, walkway | 40 (low traffic; 80 busy, to verify) | 100 | 40 | 0.79 | H0 | night lamps of 0.25 (`campusS2.ts:570`) are below this |
| Stair, landing | 80 (to verify) | 150 (to verify for 2021) | 80 | 0.89 | H0 | |
| Lobby, entrance hall | 160 (to verify) | 100 | 100 | 0.92 | H0 | |
| Reception desk, cafe counter | 320 | 300 | 300 | 1.0 | H0.8 | |
| Office, open plan, meeting room | 320 (1680.2.2) | 500 | 320 | 1.0 | H0.8 | |
| Security room, control room (screens) | 320 with screen glare limits (1680.2.2, to verify) | 500 (to verify) | 320 | 1.0 | H0.8 | gatehouse, S2 security, NOC |
| Laboratory, clean room | 400 (to verify) | 500 | 400 | 1.0 | H0.8 | S3 labs |
| Data hall, server room | no row known (to verify) | no row known (to verify) | 500 (industry practice, TIA-942, not a lighting standard) | 1.0 | H0.8 | S4 cold and hot aisles alike |
| Plant room, switch room, battery room, riser | 160 (1680.2.4, to verify) | 200 | 160 | 0.99 | H0 | |
| Warehouse, storage, rack aisles (staffed) | 80-160 (1680.2.4, to verify) | 150 aisles (staffed), 100 stockrooms | 100 | 0.92 | H0 | base warehouse; Marlow goods shed |
| Loading dock (indoor) | 160 (to verify) | 150 | 150 | 0.98 | H0 | |
| Toilets, changing room | 80 | 200 | 80 | 0.89 | H0 | |
| Kitchen, canteen, cafe seating | 160-240 (to verify) | 200 | 160 | 0.99 | H0.8 | S2 cafe (now unlit, `campusS2.ts:194`) |
| Archive, records store | 160 (to verify) | 200 | 160 | 0.99 | H0 | S5 archive ("aisle lights off", `campusS5.ts:597`) |
| Workshop, assembly | 400 | 300-500 | 300 | 1.0 | H0.8 | |

Every interior band reads at or above 0.79: a working interior is lit for the meter and guards wherever its lamps
reach. Indoors, darkness comes from cut circuits, shot lamps and occluders (racks, desks, partitions), as Michael
picked (Q2 "Never").

## 4. Gaps and cut power
- A cut circuit drops a space to the standby fill (0.14, 0.37 lx), the same order as escape-route emergency lighting
  (AS/NZS 2293 minimum 0.2 lx, to verify): reads dark. No change to the fill (torch slots, `src/world/torches.ts:36`).
- Real gaps that the bands leave: between poles on roads and lanes (point minima 0.3-0.7 lx read dark), behind cars and
  under roofs (the bake's own occlusion), car-park rows in category P11c, shot and cut lamps.

## 5. To verify (before scale sheet 9 is filled)
Every "to verify" above, in priority order: P11a-c values and the uniformity rule (S1); P2 / P3 and the pathway and
public activity categories (S1 lane, forecourt, S5 grounds); AS/NZS 1680.5 yards; AS/NZS 1680.2.1 corridors, stairs
and lobbies; AS/NZS 1680.2.4 plant rooms and warehouses; EN 12464-1:2021 stairs; data halls. Method: a purchased or
library copy, read by the lead; or Michael confirms the table as shown in the pack. Gameplay changes only where a
corrected value crosses 0.28 or 0.60 on the curve: interior rows all sit above 0.79, so only outdoor rows can move a
stealth read.
