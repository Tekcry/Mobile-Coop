import raw from '../config/enemies.json';
import { defaultLook, sanitizeLook, type AvatarLook } from '../cosmetics/avatarLook';
import { BUILDS, type Build } from '../player/proportions';
import { WEAPON_IDS, type WeaponId } from '../weapons/weaponDefs';

/** `grunt` is the Guard (rifle; a flashlight at night). */
export type EnemyKind = 'grunt' | 'runner' | 'heavy' | 'sniper' | 'enforcer' | 'dog' | 'droneOp' | 'officer';
export const ENEMY_KINDS: readonly EnemyKind[] = ['grunt', 'runner', 'heavy', 'sniper', 'enforcer', 'dog', 'droneOp', 'officer'];

/** A per-kind tally starting at zero. */
export function emptyKinds(): Record<EnemyKind, number> {
  const o = {} as Record<EnemyKind, number>;
  for (const k of ENEMY_KINDS) o[k] = 0;
  return o;
}

export interface EnemyWeapon {
  damage: number;
  rpm: number;
  burstMin: number;
  burstMax: number;
  pauseMin: number;
  pauseMax: number;
  windup: number;
  spreadDeg: number;
  range: number;
  tracer: string;
}

export interface EnemyMelee {
  damage: number;
  range: number;
  cooldown: number;
  lunge: number;
}

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  armor: number;
  headMult: number;
  walkSpeed: number;
  runSpeed: number;
  /** Standing height (m); `scale` = height / 1.75 for hit volumes and eye heights. */
  height: number;
  scale: number;
  build: Build;
  /** Wears armour plates (heavies). */
  plated: boolean;
  /** Carried weapon model (null for melee). */
  gun: WeaponId | null;
  turnSpeed: number;
  engageMin: number;
  engageMax: number;
  usesCover: boolean;
  weapon: EnemyWeapon | null;
  melee: EnemyMelee | null;
  xp: number;
  credits: number;
  look: AvatarLook;
  /** Four-legged (the dog): its own body model on the shared brain; smells as well as sees. */
  quadruped: boolean;
}

export function validateEnemyDefs(data: unknown): Record<EnemyKind, EnemyDef> {
  const out = {} as Record<EnemyKind, EnemyDef>;
  for (const k of ENEMY_KINDS) {
    const e = (data as Record<string, Record<string, unknown>>)[k];
    if (!e) throw new Error(`enemies: missing ${k}`);
    for (const f of ['hp', 'armor', 'walkSpeed', 'runSpeed', 'height', 'engageMin', 'engageMax', 'xp', 'credits']) {
      if (typeof e[f] !== 'number' || !((e[f] as number) >= 0)) throw new Error(`enemies.${k}.${f} invalid`);
    }
    if (!e.weapon && !e.melee) throw new Error(`enemies.${k}: needs weapon or melee`);
    const base = defaultLook();
    const l = (e.look ?? {}) as Record<string, unknown>;
    const look = sanitizeLook({ ...base, ...l, colors: { ...base.colors, ...((l.colors as object) ?? {}) } });
    const height = Math.max(e.quadruped === true ? 0.5 : 1.6, Math.min(1.95, e.height as number));
    const build = BUILDS.includes(e.build as Build) ? (e.build as Build) : 'average';
    const gun = WEAPON_IDS.includes(e.gun as WeaponId) ? (e.gun as WeaponId) : null;
    out[k] = { ...(e as unknown as EnemyDef), kind: k, look, height, scale: height / 1.75, build, plated: e.plated === true, gun, quadruped: e.quadruped === true };
  }
  return out;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = validateEnemyDefs(raw);

export { DIFFICULTY, DIFFICULTIES, parseDifficulty, type Difficulty } from './archetypes';
