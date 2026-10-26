/**
 * (guard-models G6n, M3) A guard's 7-bit look seed (`Enemy.look`, 0-127): set once at spawn by `EnemyManager` from the
 * section's spawn slot, never from `Enemy.num` or the spawn order, so a section restart gives every slot the same
 * seed. Co-op: the host sends it in the enemy `al` bits (`AL_LOOK`), so both screens build the same look from it.
 * Pure (no Babylon, no `Math.random`): a deterministic integer hash of the slot's key.
 */

/** The largest look seed (7 bits). */
export const LOOK_MAX = 127;

/** Odd, so `index -> seed` for one key is a permutation of 0-127: up to 128 slots of one key never share a seed. */
const STRIDE = 79;

/** 32-bit FNV-1a over the key's UTF-16 units, then a murmur3 finaliser (every key bit reaches the low 7 bits). */
function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h;
}

/** The seed of slot `index` under `key` (distinct for indices 0-127 of one key). */
export function lookSeed(key: string, index: number): number {
  return (hashKey(key) + Math.imul(index | 0, STRIDE)) & LOOK_MAX;
}

/** An authored guard: slot `slot` of section `section` (its id) on map `mapId`. */
export function slotLook(mapId: string, section: string, slot: number): number {
  return lookSeed(`${mapId}|${section}`, slot);
}

/** A response team member: member `member` (join order, the shield guard first) of team `team` in section `section`
 *  on map `mapId` (distinct within a team). `team` is the team's order in the section since its load (one team per
 *  alarm, so it stands for the alarm stage that brought it; the live stage itself can move on while members wait to
 *  spawn, so it is not part of the key). */
export function teamLook(mapId: string, section: number, team: number, member: number): number {
  return lookSeed(`${mapId}|${section}|rt|${team}`, member);
}

/** Any other spawn (no slot key): its authored point, quantised to 0.1 m (the same data point on every load). */
export function posLook(mapId: string, x: number, z: number): number {
  return lookSeed(`${mapId}|@${Math.round(x * 10)},${Math.round(z * 10)}`, 0);
}

/**
 * (gm-look-seeds) The first seed free in `use` (a count per seed, 0 = free) from `preferred` on: `preferred`, then
 * `preferred + 1`, ... (mod 128). All 128 taken: `preferred` (a repeat only past 128 guards). No allocation.
 */
export function freeLook(preferred: number, use: ArrayLike<number>): number {
  for (let k = 0; k <= LOOK_MAX; k++) {
    const s = (preferred + k) & LOOK_MAX;
    if (use[s] === 0) return s;
  }
  return preferred & LOOK_MAX;
}

/**
 * (gm-look-seeds) In place, in list order: each seed becomes `freeLook` of itself against the seeds already given in
 * this list, so the first claimer of a seed keeps it and no two share one up to 128. Past 128 the mask starts again
 * (repeats spread evenly). Load time only (one local mask). Returns `seeds`.
 */
export function distinctLooks(seeds: number[]): number[] {
  const use = new Uint8Array(LOOK_MAX + 1);
  let given = 0;
  for (let i = 0; i < seeds.length; i++) {
    if (given > LOOK_MAX) {
      use.fill(0);
      given = 0;
    }
    const s = freeLook(seeds[i]!, use);
    use[s] = 1;
    given++;
    seeds[i] = s;
  }
  return seeds;
}
