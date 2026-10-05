import raw from '../config/enemies.json';
import { defaultLook, sanitizeLook, type AvatarLook } from '../cosmetics/avatarLook';

export type EnemyKind = 'grunt' | 'runner' | 'heavy';
export const ENEMY_KINDS: readonly EnemyKind[] = ['grunt', 'runner', 'heavy'];

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
  scale: number;
  turnSpeed: number;
  engageMin: number;
  engageMax: number;
  usesCover: boolean;
  weapon: EnemyWeapon | null;
  melee: EnemyMelee | null;
  xp: number;
  credits: number;
  look: AvatarLook;
}

export function validateEnemyDefs(data: unknown): Record<EnemyKind, EnemyDef> {
  const out = {} as Record<EnemyKind, EnemyDef>;
  for (const k of ENEMY_KINDS) {
    const e = (data as Record<string, Record<string, unknown>>)[k];
    if (!e) throw new Error(`enemies: missing ${k}`);
    for (const f of ['hp', 'armor', 'walkSpeed', 'runSpeed', 'scale', 'engageMin', 'engageMax', 'xp', 'credits']) {
      if (typeof e[f] !== 'number' || !((e[f] as number) >= 0)) throw new Error(`enemies.${k}.${f} invalid`);
    }
    if (!e.weapon && !e.melee) throw new Error(`enemies.${k}: needs weapon or melee`);
    const base = defaultLook();
    const l = (e.look ?? {}) as Record<string, unknown>;
    const look = sanitizeLook({ ...base, ...l, colors: { ...base.colors, ...((l.colors as object) ?? {}) } });
    out[k] = { ...(e as unknown as EnemyDef), kind: k, look };
  }
  return out;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = validateEnemyDefs(raw);

export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTY: Record<Difficulty, { damage: number; accuracy: number; hp: number; reward: number }> = {
  easy: { damage: 0.6, accuracy: 0.7, hp: 0.85, reward: 0.8 },
  normal: { damage: 1, accuracy: 1, hp: 1, reward: 1 },
  hard: { damage: 1.4, accuracy: 1.3, hp: 1.2, reward: 1.35 },
};
