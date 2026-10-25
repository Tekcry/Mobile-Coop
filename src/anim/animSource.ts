/**
 * (mixamo-retarget Toggle, Michael 2026-10-26 00:25: "allow toggle between hand made, cmu, and mixamo") The Animation
 * source: one global look choice for Wren's clips, resolved once per change (settings load and change, the URL, the Anim
 * Studio's switch), never per frame. Pure: no DOM, no Babylon.
 * - `hand`: the hand-made clips (the CMU mocap locomotion off, the Mixamo captures off).
 * - `cmu`: the CMU mocap locomotion on, the Mixamo captures off: today's game (the default; tests/animSource.test.ts pins
 *   it byte-identical to the switch as it was).
 * - `mixamo`: the CMU set as `cmu`, with the Mixamo captures `MIXAMO_ON` lets play on top (`mixamo.ts`); a move with no
 *   Mixamo clip, or its row off, keeps the `cmu` clip.
 * Overrides for one page: `?anim=hand|cmu|mixamo` (the source), then `?mocap=0/1` and `?mixamo=0/1` (each half on its
 * own), then the tuner's "Mocap locomotion" box (the mocap half). A look choice only: gameplay reads none of it (timing
 * and reach are unchanged). A co-op partner is drawn with the partner's own source (the wire, below: G400).
 */
import { applyMocapSwitch, HAND_KEYED_SET, hasSlots, LOCO, MOCAP_SET, type LocoClipSet } from './mocap';
import { addMixamoResolver, fillWrenKeyed, fillWrenStance, fillWrenTrav, KEYED_IDLE_PERIOD_S, MIXAMO, newWrenTrav, setMixamo, WREN_KEYED, WREN_STANCE, WREN_TRAV, type WrenKeyed, type WrenStance, type WrenTravTable } from './mixamo';
import { KEYED_IDLE } from './clips/keyed/idle';

export type AnimSource = 'hand' | 'cmu' | 'mixamo';
/** The sources in menu order. */
export const ANIM_SOURCES: readonly AnimSource[] = ['hand', 'cmu', 'mixamo'];
/** The default: today's game (the CMU mocap locomotion on, no Mixamo). */
export const ANIM_SOURCE_DEFAULT: AnimSource = 'cmu';
/** The menu / Now playing word per source. */
export const ANIM_SOURCE_LABEL: Readonly<Record<AnimSource, string>> = { hand: 'Hand-made', cmu: 'CMU', mixamo: 'Mixamo' };

/** A URL / stored value as a source (null: not one). */
export function parseAnimSource(v: unknown): AnimSource | null {
  return v === 'hand' || v === 'cmu' || v === 'mixamo' ? v : null;
}

/** What a page asks for: the setting, then the page's overrides (null: none). */
export interface AnimSourceWant {
  /** The stored setting (Options > Gameplay > Animation source, or the Anim Studio's switch). */
  setting: AnimSource;
  /** `?anim=` */
  url?: AnimSource | null;
  /** `?mocap=0/1` */
  mocapUrl?: boolean | null;
  /** The tuner's "Mocap locomotion" box (this page only). */
  mocapTuner?: boolean | null;
  /** `?mixamo=0/1` */
  mixamoUrl?: boolean | null;
}

/** The resolved state (the same object always; rewritten by `applyAnimSource`). */
export const ANIM_SOURCE: { source: AnimSource; mocap: boolean; mixamo: boolean } = { source: ANIM_SOURCE_DEFAULT, mocap: true, mixamo: false };

/** Resolve a want into the two switches (pure; `out` is written and returned). */
export function resolveAnimSource(w: AnimSourceWant, out: { source: AnimSource; mocap: boolean; mixamo: boolean }): typeof out {
  const source = w.url ?? w.setting;
  out.source = source;
  out.mocap = w.mocapUrl ?? w.mocapTuner ?? source !== 'hand';
  out.mixamo = w.mixamoUrl ?? source === 'mixamo';
  return out;
}

/** Resolve and apply (settings load and change, the Studio switch; never per frame). Returns the resolved state. */
export function applyAnimSource(w: AnimSourceWant): typeof ANIM_SOURCE {
  const r = resolveAnimSource(w, ANIM_SOURCE);
  // the mocap half through its own switch (it applies only on a change); the Mixamo half rebuilds its table on a change
  applyMocapSwitch(null, r.mocap);
  if (r.mixamo !== MIXAMO.on) setMixamo(r.mixamo);
  return r;
}

/** The source alone, no overrides (the Anim Studio's switch, tests). */
export function setAnimSource(s: AnimSource): typeof ANIM_SOURCE {
  return applyAnimSource({ setting: s });
}

// ---------------------------------------------------------------------------------------------------------------------
// (mixamo-retarget Source wire, G400, Michael Q39: "yes players must look exact in everyones games") Each player's own
// Animation source rides that player's networked state (`PlayerState.an`, src/net/protocol.ts), and every screen draws
// that player with the OWNER's choice. A graph picks its tables by its own source (`AnimGraph.animSource`):
// - a graph no one handed a source (the local player, the Studio rig, the menu puppets, guards): the page's live tables
//   (`PAGE_TABLES`: `LOCO`, `WREN_TRAV`, `WREN_KEYED`, `WREN_STANCE`: the setting with this page's overrides and the
//   Studio's pick), exactly as before the wire (the default game byte-identical);
// - a remote player's graph (handed the owner's source): that source's own tables (`SOURCE_TABLES`, the source alone:
//   no page override, no Studio pick).
// The tables are rewritten in place once per change (the Animation source, the Mixamo switch, `MIXAMO_ON`); a graph
// holds a reference to its table and re-picks only when its source changes (a compare a frame).

/** One source's resolved clip picks, as a graph reads them (the same objects always; fields rewritten per change). */
export interface SourceTables {
  /** The locomotion set: `set` the holstered standing gait's clips, `mocap` the CMU mocap on, `slots` a slot filled. */
  readonly loco: { set: LocoClipSet; mocap: boolean; slots: boolean };
  /** Wren's traversal captures (`mixamo.ts` WrenTravTable). */
  readonly trav: WrenTravTable;
  /** Wren's keyed idle and crouched walk. */
  readonly keyed: WrenKeyed;
  /** Wren's stance shots. */
  readonly stance: WrenStance;
}

/** The page's live tables (a graph with no owner source reads these: today's switches, by reference). */
export const PAGE_TABLES: SourceTables = { loco: LOCO, trav: WREN_TRAV, keyed: WREN_KEYED, stance: WREN_STANCE };

function newTables(): SourceTables {
  return { loco: { set: HAND_KEYED_SET, mocap: false, slots: false }, trav: newWrenTrav(), keyed: { idle: KEYED_IDLE, idlePeriod: KEYED_IDLE_PERIOD_S, crouchWalk: null }, stance: { down: null, up: null } };
}

/** Each source's own tables (a remote player's graph reads its owner's). */
export const SOURCE_TABLES: Readonly<Record<AnimSource, SourceTables>> = { hand: newTables(), cmu: newTables(), mixamo: newTables() };

/** The mocap set with the Mixamo crouched walk in its slot, for the `mixamo` table (a copy, rewritten per change). */
const MX_SET: { -readonly [K in keyof LocoClipSet]: LocoClipSet[K] } = { ...MOCAP_SET };

/** Fill one source's tables, as `resolveAnimSource` + the switches would with that setting and no override (pure). */
export function fillSourceTables(s: AnimSource, T: SourceTables): void {
  const mixamo = s === 'mixamo';
  const mocap = s !== 'hand';
  fillWrenTrav(T.trav, mixamo, '');
  fillWrenKeyed(T.keyed, mixamo);
  fillWrenStance(T.stance, mixamo);
  let set: LocoClipSet = HAND_KEYED_SET;
  if (mocap && T.keyed.crouchWalk !== null) {
    Object.assign(MX_SET, MOCAP_SET);
    MX_SET.crouchWalk = T.keyed.crouchWalk;
    set = MX_SET;
  } else if (mocap) set = MOCAP_SET;
  T.loco.set = set;
  T.loco.mocap = mocap;
  T.loco.slots = hasSlots(set);
}

/** Rewrite every source's own tables (on every Mixamo resolve: the switch, `MIXAMO_ON`, the Studio's pick). */
export function resolveSourceTables(): void {
  for (const s of ANIM_SOURCES) fillSourceTables(s, SOURCE_TABLES[s]);
}
addMixamoResolver(resolveSourceTables);

/** A graph's tables for its owner source (null: the page's). Once per source change, never per frame. */
export function sourceTablesFor(s: AnimSource | null): SourceTables {
  return s === null ? PAGE_TABLES : SOURCE_TABLES[s];
}

/**
 * (Source wire, G400) The source this page sends for its own player (`PlayerState.an`): the one whose own tables are
 * what this page draws, so a `?anim=`, `?mocap=0/1`, `?mixamo=0/1` or tuner-box override reaches the partner too. The
 * Mixamo half on: `mixamo`; else the mocap half on: `cmu`; else `hand`. The one pair no source holds (Mixamo on, mocap
 * off: a dev override) sends `mixamo`. Pure, no allocation (a send, not a frame).
 */
export function wireAnimSource(r: { readonly mocap: boolean; readonly mixamo: boolean }): AnimSource {
  return r.mixamo ? 'mixamo' : r.mocap ? 'cmu' : 'hand';
}
