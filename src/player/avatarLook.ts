/**
 * The part set a character rig is built from (`CharacterRig`): body type, head, hair, clothing, headwear and the colour of
 * each. Pure data. Nothing chooses it any more (stage I removed the appearance screens and the saved look): the operator
 * wears `defaultLook()` (Wren), and each guard kind reads its own look from `config/enemies.json` through `sanitizeLook`.
 */
export const BODY_TYPES = ['average', 'lean', 'athletic', 'broad'] as const;
export const HEADS = ['round', 'oval', 'strong', 'long'] as const;
export const HAIRS = ['none', 'buzz', 'mohawk', 'long', 'bun', 'swept'] as const;
export const TORSOS = ['tee', 'vest', 'armor', 'jacket', 'hoodie', 'operator'] as const;
export const LEGS = ['pants', 'cargo', 'shorts', 'armored'] as const;
export const BACKPACKS = ['none', 'pack', 'radio', 'tank', 'bedroll'] as const;
export const HELMETS = ['none', 'cap', 'combat', 'visor', 'beret', 'headset', 'hood'] as const;

export type BodyType = (typeof BODY_TYPES)[number];
export type HeadKind = (typeof HEADS)[number];
export type HairKind = (typeof HAIRS)[number];
export type TorsoKind = (typeof TORSOS)[number];
export type LegKind = (typeof LEGS)[number];
export type BackpackKind = (typeof BACKPACKS)[number];
export type HelmetKind = (typeof HELMETS)[number];

export interface AvatarColors {
  skin: string;
  hair: string;
  torso: string;
  legs: string;
  boots: string;
  accent: string;
  helmet: string;
  backpack: string;
}

export interface AvatarLook {
  body: BodyType;
  head: HeadKind;
  hair: HairKind;
  torso: TorsoKind;
  legs: LegKind;
  backpack: BackpackKind;
  helmet: HelmetKind;
  colors: AvatarColors;
}

/** The operator (2.0): fitted suit, plate carrier and comms headset, charcoal with an orange accent. */
export function defaultLook(): AvatarLook {
  return {
    body: 'average',
    head: 'round',
    hair: 'none',
    torso: 'operator',
    legs: 'cargo',
    backpack: 'none',
    helmet: 'headset',
    colors: {
      skin: '#e0b08a',
      hair: '#2b1d14',
      torso: '#2b3138',
      legs: '#262b31',
      boots: '#16181c',
      accent: '#3a424b',
      helmet: '#1a1d21',
      backpack: '#3a424b',
    },
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Validate look data (the guard kinds' `look` in `config/enemies.json`): unknown options fall back to the default. */
export function sanitizeLook(raw: unknown): AvatarLook {
  const d = defaultLook();
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def);
  const c = (typeof r.colors === 'object' && r.colors !== null ? r.colors : {}) as Record<string, unknown>;
  const col = (k: keyof AvatarColors): string => (typeof c[k] === 'string' && HEX.test(c[k] as string) ? (c[k] as string) : d.colors[k]);
  return {
    body: pick(r.body, BODY_TYPES, d.body),
    head: pick(r.head, HEADS, d.head),
    hair: pick(r.hair, HAIRS, d.hair),
    torso: pick(r.torso, TORSOS, d.torso),
    legs: pick(r.legs, LEGS, d.legs),
    backpack: pick(r.backpack, BACKPACKS, d.backpack),
    helmet: pick(r.helmet, HELMETS, d.helmet),
    colors: {
      skin: col('skin'),
      hair: col('hair'),
      torso: col('torso'),
      legs: col('legs'),
      boots: col('boots'),
      accent: col('accent'),
      helmet: col('helmet'),
      backpack: col('backpack'),
    },
  };
}
