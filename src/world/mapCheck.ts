import type { MapLayout } from './mapDef';
import type { SectorDef } from '../game/sectors';

/**
 * Map data rules (pure). Returns one message per broken rule, an empty list when the layout is clean.
 * - No ammo pickups inside sections: `MapLayout.pickups` (and the sector `S*_PICKUPS` lists feeding it) hold no ammo
 *   (Michael, 2026-10-23: ammo comes only from the starting loadout and, later, a between-section weapons crate).
