/**
 * (sector-redesign S4/S5 cap fix) Which interactables a co-op host mirrors to its clients (pure: no Babylon / DOM).
 *
 * A Sector Ops map registers every section's items at the start (Saltmarsh Park: 196 with all five sections built), but
 * the wire list is capped (`MAX_ITEMS`, protocol.ts). Each item may carry the section it belongs to; while a scope is
 * set (Sector Ops: the live section, -1 between an unload and the next load) only untagged items (objective, exit,
 * connector doors, revives) and the live section's items are mirrored. Other modes leave the scope off and
 * mirror everything, as before.
 */

/** No scope: every item is mirrored (every mode but Sector Ops). */
export const ITEM_SCOPE_OFF = -2;

/** Is an item of `section` (none: always) in the mirrored set while `scope` is the live section (`ITEM_SCOPE_OFF`: all)? */
export function itemInScope(section: number | undefined, scope: number): boolean {
  return scope === ITEM_SCOPE_OFF || section === undefined || section === scope;
}
