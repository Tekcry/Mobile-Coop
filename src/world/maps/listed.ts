/**
 * The maps the game lists (3.0: Warehouse, plus Proving Grounds kept basic for testing). Pure so content
 * (missions, challenges) can filter on it without importing the map builders. Parked maps live in
 * `parked.ts`, which nothing imports: they are not in the bundle and get no further work.
 */
export const LISTED_MAP_IDS: readonly string[] = ['warehouse', 'proving'];

export function isListedMap(id: string): boolean {
  return LISTED_MAP_IDS.includes(id);
}
