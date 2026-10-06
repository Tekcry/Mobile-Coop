import raw from '../config/weapons.json';
import grenadeRaw from '../config/grenade.json';

export type WeaponId = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper';
export const WEAPON_IDS: readonly WeaponId[] = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper'];

export interface ModelPart {
  /** Authored as box/cyl; rendered with rounded edges (rbox/rcyl). */
  shape: 'box' | 'cyl' | 'pill' | 'capsule';
  size: [number, number, number];
  pos: [number, number, number];
  rot?: [number, number, number];
  /** 'body' | 'grip' | 'accent' slots take the skin colours; anything else is a literal hex. */
  color: string;
  /** What the part is (dimension checks, the magazine well): barrel, receiver, grip, mag, stock, ... */
  role?: string;
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
  /** Weapon-local hand points: trigger grip (right hand) and foregrip (left hand). */
  grip: [number, number, number];
  foregrip: [number, number, number];
  /** Mass factor for carry and handling (1 = rifle); defaults by class (`classWeight`). */
  weight?: number;
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
    const v3 = (v: unknown, def: [number, number, number]): [number, number, number] =>
      Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n)) ? (v as [number, number, number]) : def;
    out[id] = { ...(w as unknown as WeaponDef), id, grip: v3(w.grip, [0, -0.07, 0]), foregrip: v3(w.foregrip, [0, -0.05, 0.2]) };
  }
  return out;
}

/** Weapon-local axis-aligned extents of a model (m): x across, y up, z along the bore. */
export interface ModelExtents {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

/** Extents of a weapon's parts (rotations about x, as authored for cylinders and angled grips). */
export function modelExtents(def: Pick<WeaponDef, 'model'>): ModelExtents {
  const e: ModelExtents = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
  for (const p of def.model) {
    const [sx, sy0, sz0] = p.size;
    const rx = p.rot?.[0] ?? 0;
    const c = Math.abs(Math.cos(rx));
    const s = Math.abs(Math.sin(rx));
    const sy = sy0 * c + sz0 * s;
    const sz = sy0 * s + sz0 * c;
    const [x, y, z] = p.pos;
    e.x0 = Math.min(e.x0, x - sx / 2);
    e.x1 = Math.max(e.x1, x + sx / 2);
    e.y0 = Math.min(e.y0, y - sy / 2);
    e.y1 = Math.max(e.y1, y + sy / 2);
    e.z0 = Math.min(e.z0, z - sz / 2);
    e.z1 = Math.max(e.z1, z + sz / 2);
  }
  return e;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = validateWeaponDefs(raw);
export const GRENADE: GrenadeDef = grenadeRaw as GrenadeDef;
