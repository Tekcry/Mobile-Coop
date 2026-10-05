/** Data describing a modular primitive avatar. Pure data: safe to save and send over the network. */
export const BODY_TYPES = ['slim', 'regular', 'heavy'] as const;
export const HEADS = ['round', 'square', 'hex', 'tall'] as const;
export const HAIRS = ['none', 'buzz', 'mohawk', 'long', 'bun', 'spikes'] as const;
export const TORSOS = ['tee', 'vest', 'armor', 'jacket', 'hoodie'] as const;
export const LEGS = ['pants', 'cargo', 'shorts', 'armored'] as const;
export const BACKPACKS = ['none', 'pack', 'radio', 'tank', 'blade'] as const;
export const HELMETS = ['none', 'cap', 'combat', 'visor', 'beret', 'horns'] as const;
export const PATTERNS = ['solid', 'stripes', 'camo', 'digital', 'tiger', 'checker'] as const;

export type BodyType = (typeof BODY_TYPES)[number];
export type HeadKind = (typeof HEADS)[number];
export type HairKind = (typeof HAIRS)[number];
export type TorsoKind = (typeof TORSOS)[number];
export type LegKind = (typeof LEGS)[number];
export type BackpackKind = (typeof BACKPACKS)[number];
export type HelmetKind = (typeof HELMETS)[number];
export type PatternKind = (typeof PATTERNS)[number];

export interface AvatarColors {
  skin: string;
  hair: string;
  torso: string;
  legs: string;
  boots: string;
  accent: string;
  helmet: string;
  backpack: string;
  pattern: string;
}

export interface AvatarLook {
  body: BodyType;
  head: HeadKind;
  hair: HairKind;
  torso: TorsoKind;
  legs: LegKind;
  backpack: BackpackKind;
  helmet: HelmetKind;
  pattern: PatternKind;
  colors: AvatarColors;
}

export const SKIN_TONES = ['#f2d0b1', '#e0b08a', '#c68a5e', '#9a6440', '#6e4428', '#4a2c19'];
export const PALETTE_COLORS = [
  '#2f3b45', '#4b5a3a', '#6b7b4c', '#8a7454', '#b9a27a', '#d8d2c4', '#f1f1ef',
  '#1c1f24', '#5a2e2e', '#b23a3a', '#e5533d', '#ff8a1e', '#f2c230', '#9bd14f',
  '#3aa37a', '#2a8fb8', '#3f6fd9', '#5e4bc4', '#a04bc4', '#e35d9c',
];

export function defaultLook(): AvatarLook {
  return {
    body: 'regular',
    head: 'round',
    hair: 'buzz',
    torso: 'vest',
    legs: 'cargo',
    backpack: 'pack',
    helmet: 'combat',
    pattern: 'solid',
    colors: {
      skin: '#e0b08a',
      hair: '#2b1d14',
      torso: '#3f6fd9',
      legs: '#2f3b45',
      boots: '#1c1f24',
      accent: '#ff8a1e',
      helmet: '#4b5a3a',
      backpack: '#6b7b4c',
      pattern: '#1c1f24',
    },
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Validate untrusted look data (saves, peers). */
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
    pattern: pick(r.pattern, PATTERNS, d.pattern),
    colors: {
      skin: col('skin'),
      hair: col('hair'),
      torso: col('torso'),
      legs: col('legs'),
      boots: col('boots'),
      accent: col('accent'),
      helmet: col('helmet'),
      backpack: col('backpack'),
      pattern: col('pattern'),
    },
  };
}
