import raw from '../config/weapons.json';
import grenadeRaw from '../config/grenade.json';

export type WeaponId = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper';
export const WEAPON_IDS: readonly WeaponId[] = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper'];

export interface ModelPart {
  shape: 'box' | 'cyl';
  size: [number, number, number];
  pos: [number, number, number];
  rot?: [number, number, number];
  /** 'body' | 'grip' | 'accent' slots take the skin colours; anything else is a literal hex. */
  color: string;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  class: string;
  slot: 'primary' | 'secondary';
  fireMode: 'semi' | 'auto';
  kind: 'hitscan' | 'projectile';
  projectileSpeed?: number;
  projectileGravity?: number;
  rpm: number;
  damage: number;
  headMult: number;
  falloffStart: number;
  falloffEnd: number;
  minDamageMult: number;
  pellets: number;
  range: number;
  magSize: number;
  reserve: number;
  reloadTime: number;
  spreadHip: number;
  spreadAds: number;
  spreadMove: number;
  spreadPerShot: number;
  spreadRecovery: number;
  maxSpread: number;
  recoilPitch: number;
  recoilYaw: number;
  recoilPattern: [number, number][];
  adsZoom: number;
  moveSpeedMult: number;
  impulse: number;
  tracer: string;
  unlockLevel: number;
  price: number;
  model: ModelPart[];
  muzzle: [number, number, number];
}

export interface GrenadeDef {
  name: string;
  fuse: number;
  throwSpeed: number;
  upBias: number;
  radius: number;
  damage: number;
  force: number;
  maxCarry: number;
  startCount: number;
  cooldown: number;
}

const NUM_FIELDS = [
  'rpm', 'damage', 'headMult', 'falloffStart', 'falloffEnd', 'minDamageMult', 'pellets', 'range', 'magSize',
  'reserve', 'reloadTime', 'spreadHip', 'spreadAds', 'spreadMove', 'spreadPerShot', 'spreadRecovery', 'maxSpread',
  'recoilPitch', 'recoilYaw', 'adsZoom', 'moveSpeedMult', 'impulse', 'unlockLevel', 'price',
] as const;

/** Validates weapon JSON. Throws with a precise message on bad content data. */
export function validateWeaponDefs(data: unknown): Record<WeaponId, WeaponDef> {
  if (typeof data !== 'object' || data === null) throw new Error('weapons: not an object');
  const out = {} as Record<WeaponId, WeaponDef>;
  for (const id of WEAPON_IDS) {
    const w = (data as Record<string, unknown>)[id] as Record<string, unknown> | undefined;
    if (!w) throw new Error(`weapons: missing ${id}`);
    for (const f of NUM_FIELDS) {
      if (typeof w[f] !== 'number' || !Number.isFinite(w[f])) throw new Error(`weapons.${id}.${f}: expected number`);
    }
    if (w.fireMode !== 'semi' && w.fireMode !== 'auto') throw new Error(`weapons.${id}.fireMode invalid`);
    if (w.kind !== 'hitscan' && w.kind !== 'projectile') throw new Error(`weapons.${id}.kind invalid`);
    if (w.kind === 'projectile' && typeof w.projectileSpeed !== 'number') throw new Error(`weapons.${id}.projectileSpeed required`);
    if (!Array.isArray(w.recoilPattern) || w.recoilPattern.length === 0) throw new Error(`weapons.${id}.recoilPattern empty`);
    if ((w.falloffEnd as number) < (w.falloffStart as number)) throw new Error(`weapons.${id}: falloffEnd < falloffStart`);
    if ((w.magSize as number) < 1 || (w.pellets as number) < 1) throw new Error(`weapons.${id}: magSize/pellets < 1`);
    if (!Array.isArray(w.model) || !Array.isArray(w.muzzle)) throw new Error(`weapons.${id}: model/muzzle missing`);
    out[id] = { ...(w as unknown as WeaponDef), id };
  }
  return out;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = validateWeaponDefs(raw);
export const GRENADE: GrenadeDef = grenadeRaw as GrenadeDef;
