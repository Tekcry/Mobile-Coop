/**
 * The maps the game lists (Kestrel only since clean-up stage H). Pure so content can filter on it without importing the
 * map builders.
 */
export const LISTED_MAP_IDS: readonly string[] = ['kestrel'];

export function isListedMap(id: string): boolean {
  return LISTED_MAP_IDS.includes(id);
}
