/**
 * (guard-models G7) A guard's tint table (SPEC section 8, A7; pure, no Babylon): rgb bytes per tint slot for
 * `GuardFigure.setTints`, in the kit's slot order (`guards.json` `tintSlots`: uniform, kit, headwear, hair, skin, none;
 * `_TINT` indexes it).
 *
 * Tint = the slot's linear target colour / the slot's neutral mean (`tintNeutral`: fabric 0.4, skin 0.75, hair 0.6),
 * clamped to [0, 1]; the fabric slots take the variant's value jitter (+-6 %). The bytes are sRGB-encoded (`gvis` rgb:
 * the plugin decodes with `toLinearSpace`, pow 2.2, so the encode is pow 1 / 2.2). Sources (the faction palette,
 * `factions.ts`):
 * - uniform: the faction's `torso`; kinds with `uniformTint: 'kind'` (runner, officer) their own `look.colors.torso`;
 * - kit: the faction's `backpack`;
 * - headwear: the faction's `helmet`; heavy and enforcer `#14161a` (as `factionLook`); the officer his own
 *   `look.colors.helmet` (the peaked cap);
 * - hair: the variant's hair colour; skin: its skin tone; none: white (baked colours).
 * No allocation (writes `out`).
 */
import kitJson from '../../../scripts/operators/data/guards.json';
import { FACTIONS } from '../../ai/factions';
import type { Faction } from '../../world/mapDef';
import type { GuardVariant } from './guardVariant';

interface TintKit {
  tintSlots: string[];
  tintNeutral: { fabric: number; skin: number; hair: number };
  skinTones: { id: number; rgb: number[] }[];
  hairColours: { id: string; rgb: number[] }[];
  kinds: { id: string; uniformTint: string }[];
}
const KIT = kitJson as unknown as TintKit;

/** The kit's slot order. */
export const TINT_SLOTS: readonly string[] = KIT.tintSlots;
const SLOT_UNIFORM = TINT_SLOTS.indexOf('uniform');
const SLOT_KIT = TINT_SLOTS.indexOf('kit');
const SLOT_HEADWEAR = TINT_SLOTS.indexOf('headwear');
const SLOT_HAIR = TINT_SLOTS.indexOf('hair');
const SLOT_SKIN = TINT_SLOTS.indexOf('skin');
const KIND_UNIFORM = new Set(KIT.kinds.filter((k) => k.uniformTint === 'kind').map((k) => k.id));
const HAIR = new Map(KIT.hairColours.map((h) => [h.id, h.rgb] as const));
const SKIN = KIT.skinTones.map((t) => t.rgb);
const HEAVY_HELMET = '#14161a';

/** sRGB 0..1 -> linear (the exact curve; SPEC's linear targets use it). */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** A linear tint 0..1 as the sRGB byte the plugin's `toLinearSpace` (pow 2.2) turns back into it. */
export function tintByte(lin: number): number {
  const x = lin > 0 ? (lin < 1 ? lin : 1) : 0;
  return Math.round(255 * x ** (1 / 2.2));
}

function hexChannel(hex: string, i: number): number {
  return srgbToLinear(parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255);
}

function putHex(out: Uint8Array, slot: number, hex: string, neutral: number, gain: number): void {
  if (slot < 0 || slot * 3 + 2 >= out.length) return;
  for (let i = 0; i < 3; i++) out[slot * 3 + i] = tintByte((hexChannel(hex, i) / neutral) * gain);
}

function putRgb(out: Uint8Array, slot: number, rgb: readonly number[] | undefined, neutral: number): void {
  if (slot < 0 || slot * 3 + 2 >= out.length || !rgb) return;
  for (let i = 0; i < 3; i++) out[slot * 3 + i] = tintByte((rgb[i] ?? 1) / neutral);
}

/** The colours a guard kind's own look gives (`EnemyDef.look.colors`). */
export interface KindColours {
  torso: string;
  helmet: string;
}

/**
 * Fills `out` (`slots` x 3 bytes; 255 = untinted) for variant `v` of `kind` in `faction`. `own` is the kind's own look
 * colours (the `uniformTint: 'kind'` kinds and the officer's cap). Slots past the kit's six stay white.
 */
export function guardTints(v: GuardVariant, kind: string, faction: Faction, own: KindColours, out: Uint8Array): Uint8Array {
  out.fill(255);
  const f = FACTIONS[faction] ?? FACTIONS.urban;
  const n = KIT.tintNeutral;
  const gain = 1 + v.jitter;
  putHex(out, SLOT_UNIFORM, KIND_UNIFORM.has(kind) ? own.torso : f.torso, n.fabric, gain);
  putHex(out, SLOT_KIT, f.backpack, n.fabric, gain);
  const head = kind === 'heavy' || kind === 'enforcer' ? HEAVY_HELMET : kind === 'officer' ? own.helmet : f.helmet;
  putHex(out, SLOT_HEADWEAR, head, n.fabric, gain);
  putRgb(out, SLOT_HAIR, HAIR.get(v.hairColour), n.hair);
  putRgb(out, SLOT_SKIN, SKIN[v.skinTone], n.skin);
  return out;
}
