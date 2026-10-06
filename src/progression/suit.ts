/**
 * The suit (Blacklist-style), HQ upgrades, challenges, play-style cash and loadout presets (pure, unit-tested).
 * Suit pieces have tiers (0 = issued) that trade armour for noise, speed up hands, quiet the feet, extend the
 * goggles and carry more gadgets; each tier changes the operator's look. HQ upgrades are levelled once and apply
 * to every operation.
 */
import type { AvatarLook } from '../cosmetics/avatarLook';

export type SuitPiece = 'vest' | 'gloves' | 'boots' | 'goggles' | 'pouches';
export const SUIT_PIECES: readonly SuitPiece[] = ['vest', 'gloves', 'boots', 'goggles', 'pouches'];

export interface SuitTier {
  name: string;
  price: number;
  level: number;
  /** What it does (shown in the HQ). */
  desc: string;
}

export const SUIT: Record<SuitPiece, SuitTier[]> = {
  vest: [
    { name: 'Field shirt', price: 0, level: 1, desc: 'No armour, quiet' },
    { name: 'Light vest', price: 800, level: 3, desc: '-15% damage, +10% footstep noise' },
    { name: 'Plate carrier', price: 1600, level: 6, desc: '-30% damage, +25% noise' },
    { name: 'Heavy armour', price: 2800, level: 10, desc: '-45% damage, +45% noise' },
  ],
  gloves: [
    { name: 'Issue gloves', price: 0, level: 1, desc: 'Standard hands' },
    { name: 'Tactical gloves', price: 600, level: 2, desc: 'Swaps and takedowns 8% faster' },
    { name: 'Grip gloves', price: 1200, level: 5, desc: '15% faster' },
    { name: 'Infiltrator gloves', price: 2000, level: 9, desc: '22% faster' },
  ],
  boots: [
    { name: 'Issue boots', price: 0, level: 1, desc: 'Standard footsteps' },
    { name: 'Soft soles', price: 700, level: 2, desc: '-15% footstep noise' },
    { name: 'Stealth boots', price: 1400, level: 5, desc: '-28% noise' },
    { name: 'Ghost boots', price: 2400, level: 9, desc: '-40% noise' },
  ],
  goggles: [
    { name: 'Tri-lens Mk1', price: 0, level: 1, desc: 'Night vision, sonar' },
    { name: 'Tri-lens Mk2', price: 1200, level: 4, desc: 'Sonar range +25%' },
    { name: 'Tri-lens Mk3', price: 2400, level: 8, desc: 'Sonar range +50%, faster recharge' },
  ],
  pouches: [
    { name: 'Belt', price: 0, level: 1, desc: 'Standard gadget carry' },
    { name: 'Chest rig', price: 900, level: 3, desc: '+1 of each gadget' },
    { name: 'Assault rig', price: 1800, level: 7, desc: '+2 of each gadget' },
  ],
};

export type SuitLoadout = Record<SuitPiece, number>;

export function defaultSuit(): SuitLoadout {
  return { vest: 0, gloves: 0, boots: 0, goggles: 0, pouches: 0 };
}

export interface SuitStats {
  /** Damage taken multiplier. */
  damage: number;
  /** Footstep noise multiplier. */
  noise: number;
  /** Swap / takedown time multiplier. */
  hands: number;
  /** Sonar range multiplier and recharge multiplier. */
  sonarRange: number;
  sonarRecharge: number;
  /** Extra of each gadget. */
  gadgets: number;
}

const VEST_DMG = [1, 0.85, 0.7, 0.55];
const VEST_NOISE = [1, 1.1, 1.25, 1.45];
const HANDS = [1, 0.92, 0.85, 0.78];
const BOOTS = [1, 0.85, 0.72, 0.6];
const SONAR = [1, 1.25, 1.5];

const tier = (piece: SuitPiece, t: number): number => Math.max(0, Math.min(SUIT[piece].length - 1, Math.floor(t)));

export function suitStats(s: SuitLoadout): SuitStats {
  return {
    damage: VEST_DMG[tier('vest', s.vest)]!,
    noise: VEST_NOISE[tier('vest', s.vest)]! * BOOTS[tier('boots', s.boots)]!,
    hands: HANDS[tier('gloves', s.gloves)]!,
    sonarRange: SONAR[tier('goggles', s.goggles)]!,
    sonarRecharge: tier('goggles', s.goggles) >= 2 ? 0.75 : 1,
    gadgets: tier('pouches', s.pouches),
  };
}

/** The look the suit gives the operator (on top of the chosen avatar). */
export function suitLook(base: AvatarLook, s: SuitLoadout): AvatarLook {
  const look: AvatarLook = { ...base, colors: { ...base.colors } };
  const v = tier('vest', s.vest);
  const op = base.torso === 'operator';
  // the operator keeps the fitted suit (its carrier shows the vest); heavy armour adds the leg plates
  if (!op && v === 1) look.torso = 'vest';
  if (!op && v >= 2) look.torso = 'armor';
  if (op && v === 3) look.legs = 'armored';
  if (v === 3) look.colors.accent = '#2a2f36';
  if (tier('pouches', s.pouches) >= 1 && look.backpack === 'none') look.backpack = 'radio';
  if (tier('goggles', s.goggles) >= 1 && look.helmet !== 'trilens') look.helmet = 'headset';
  const b = tier('boots', s.boots);
  if (b >= 2) look.colors.boots = b === 3 ? '#0d0f12' : '#1e2227';
  return look;
}

// ------------------------------------------------------------------------------------------------ HQ upgrades

export type HqId = 'radar' | 'sonar' | 'marks' | 'restock' | 'revive';
export const HQ_IDS: readonly HqId[] = ['radar', 'sonar', 'marks', 'restock', 'revive'];

export interface HqDef {
  name: string;
  desc: string;
  /** Price and player level per upgrade level (index 0 = level 1). */
  prices: number[];
  levels: number[];
}

export const HQ: Record<HqId, HqDef> = {
  radar: { name: 'Minimap radar', desc: 'Enemies within 15 m (level 2: 25 m) show on the minimap in stealth modes', prices: [1500, 3000], levels: [4, 9] },
  sonar: { name: 'Sonar amplifier', desc: 'Sonar range +20% per level', prices: [1000, 2000], levels: [3, 7] },
  marks: { name: 'Execute capacity', desc: '+1 mark for Mark & Execute', prices: [2500], levels: [6] },
  restock: { name: 'Supply drops', desc: 'Gadgets restock at checkpoints', prices: [1800], levels: [5] },
  revive: { name: 'Field medic training', desc: 'Co-op revives 30% faster per level', prices: [800, 1600], levels: [2, 6] },
};

export type HqLevels = Record<HqId, number>;

export function defaultHq(): HqLevels {
  return { radar: 0, sonar: 0, marks: 0, restock: 0, revive: 0 };
}

export interface HqStats {
  radar: number;
  sonarRange: number;
  extraMarks: number;
  restock: boolean;
  reviveSpeed: number;
}

export function hqStats(h: HqLevels): HqStats {
  const lv = (k: HqId): number => Math.max(0, Math.min(HQ[k].prices.length, Math.floor(h[k] ?? 0)));
  return {
    radar: lv('radar') === 0 ? 0 : lv('radar') === 1 ? 15 : 25,
    sonarRange: 1 + 0.2 * lv('sonar'),
    extraMarks: lv('marks'),
    restock: lv('restock') > 0,
    reviveSpeed: 1 + 0.3 * lv('revive'),
  };
}

export type BuyCheck = { ok: true; price: number } | { ok: false; reason: 'maxed' | 'level' | 'credits'; price: number; level?: number };

export function canBuyHq(h: HqLevels, id: HqId, playerLevel: number, credits: number): BuyCheck {
  const cur = h[id] ?? 0;
  const d = HQ[id];
  if (cur >= d.prices.length) return { ok: false, reason: 'maxed', price: 0 };
  const price = d.prices[cur]!;
  const need = d.levels[cur]!;
  if (playerLevel < need) return { ok: false, reason: 'level', price, level: need };
  if (credits < price) return { ok: false, reason: 'credits', price };
  return { ok: true, price };
}

export function canBuySuit(owned: SuitLoadout, piece: SuitPiece, t: number, playerLevel: number, credits: number): BuyCheck {
  const d = SUIT[piece][t];
  if (!d) return { ok: false, reason: 'maxed', price: 0 };
  if (owned[piece] >= t) return { ok: false, reason: 'maxed', price: 0 };
  if (t > owned[piece] + 1) return { ok: false, reason: 'level', price: d.price, level: d.level };
  if (playerLevel < d.level) return { ok: false, reason: 'level', price: d.price, level: d.level };
  if (credits < d.price) return { ok: false, reason: 'credits', price: d.price };
  return { ok: true, price: d.price };
}

// ------------------------------------------------------------------------------------------------ challenges

export interface ChallengeDef {
  id: string;
  name: string;
  /** Target count; credits / xp paid once. */
  goal: number;
  credits: number;
  xp: number;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'aboveTakedowns', name: '10 takedowns from above', goal: 10, credits: 800, xp: 1500 },
  { id: 'knockouts', name: 'Knock out 25 enemies', goal: 25, credits: 600, xp: 1200 },
  { id: 'headshots', name: '50 headshots', goal: 50, credits: 600, xp: 1200 },
  { id: 'executes', name: 'Mark & Execute 15 enemies', goal: 15, credits: 700, xp: 1300 },
  { id: 'ghostMissions', name: 'Complete 3 missions undetected', goal: 3, credits: 1500, xp: 3000 },
  { id: 'hunterNoAlarm', name: 'Finish Hunter without an alarm', goal: 1, credits: 900, xp: 1600 },
  { id: 'gadgetKos', name: 'Put 20 enemies down with gadgets', goal: 20, credits: 700, xp: 1300 },
];

/** What a session adds to each challenge. */
export interface ChallengeSession {
  takedownsByKind: Record<string, number>;
  knockouts: number;
  headshots: number;
  executes: number;
  gadgetKos: number;
  mode: string;
  won: boolean;
  detections: number;
  alarms: number;
}

export function challengeProgress(s: ChallengeSession): Record<string, number> {
  const clamp = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.min(500, Math.floor(n)) : 0);
  return {
    aboveTakedowns: clamp(s.takedownsByKind.above ?? 0),
    knockouts: clamp(s.knockouts),
    headshots: clamp(s.headshots),
    executes: clamp(s.executes),
    ghostMissions: s.mode === 'infiltration' && s.won && s.detections === 0 ? 1 : 0,
    hunterNoAlarm: s.mode === 'clear' && s.won && s.alarms === 0 ? 1 : 0,
    gadgetKos: clamp(s.gadgetKos),
  };
}

// ------------------------------------------------------------------------------------------------ style cash

/** Cash and XP per play-style point (the mission's difficulty multiplier applies on top). */
export const STYLE_PAY = { credits: 0.12, xp: 0.4 } as const;

export function styleLines(style: { ghost: number; panther: number; assault: number }): { label: string; xp: number; credits: number }[] {
  const out: { label: string; xp: number; credits: number }[] = [];
  const nn = (v: number): number => (Number.isFinite(v) && v > 0 ? Math.min(50000, Math.floor(v)) : 0);
  for (const [k, label] of [
    ['ghost', 'Ghost'],
    ['panther', 'Panther'],
    ['assault', 'Assault'],
  ] as const) {
    const p = nn(style[k]);
    if (p) out.push({ label: `${label} (${p})`, xp: Math.round(p * STYLE_PAY.xp), credits: Math.round(p * STYLE_PAY.credits) });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ presets

export interface LoadoutPreset {
  name: string;
  primary: string;
  secondary: string;
  gadget: string;
}

export const PRESETS = 3;

export function defaultPresets(): LoadoutPreset[] {
  return [
    { name: 'Ghost', primary: 'rifle', secondary: 'pistol', gadget: 'gas' },
    { name: 'Panther', primary: 'rifle', secondary: 'pistol', gadget: 'flash' },
    { name: 'Assault', primary: 'rifle', secondary: 'pistol', gadget: 'frag' },
  ];
}
