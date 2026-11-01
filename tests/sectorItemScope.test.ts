/**
 * (sector-redesign S4/S5 cap fix, `docs/sector-redesign/checks/s45-cap-fix.md`) The co-op item scope: a Sector Ops map's items
 * carry their section index and the host mirrors only the live section's plus the untagged ones (objective / exit,
 * connector doors, revives, crates). These tests hold the rule. (Clean-up F: the Saltmarsh Park tag and budget checks went with the map.)
 */
import { describe, expect, it } from 'vitest';
import { ITEM_SCOPE_OFF, itemInScope } from '../src/game/itemScope';

describe('itemInScope', () => {
  it('off: every item; a live section: its items and the untagged ones; between sections (-1): the untagged only', () => {
    expect(itemInScope(2, ITEM_SCOPE_OFF)).toBe(true);
    expect(itemInScope(undefined, ITEM_SCOPE_OFF)).toBe(true);
    expect(itemInScope(3, 3)).toBe(true);
    expect(itemInScope(undefined, 3)).toBe(true);
    expect(itemInScope(2, 3)).toBe(false);
    expect(itemInScope(0, -1)).toBe(false);
    expect(itemInScope(undefined, -1)).toBe(true);
  });
});
