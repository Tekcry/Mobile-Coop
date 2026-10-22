/**
 * (clip-speed, track A) Clip speed: a baked speed multiplier per timed clip, and one for every clip, in the animation
 * tuner (Michael 2026-10-22: "Can I fine tune the whole animation speed in anim tuner?"). Pure, Babylon-free, no DOM;
 * registered through the section registry, so the panel, the pad, the save, the export and the import come with it.
 *
 * A value is a speed: 1 is today's timing, 2 plays the clip in half the time, 0.5 in twice the time. The clip's own
 * owner applies it where it reads its duration (never a copy of it): `drawState.ts` (the draws and the holster, which
 * also time when the gun can fire), `playerWeapons.ts` (the swap and the grenade throw advance their clock this much
 * faster) and `animGraph.ts` (the start shift, the stop settle and the landings, through `CLIP_RATE` in
 * `clips/actions.ts`). At identity every expression is `x / 1` or `x * 1`: bit-identical to the untuned game.
 *
 * Not here: the gait cycles (paced by the speed, the Speed and Stepping sections), the traversal and co-op one-shots
 * (their own Timing sliders, `moveTune.ts`), the reloads (weapon data). It is not the View tab's slow motion either:
 * that scales the whole sim for viewing; this changes the clips' durations and bakes (`tuneBakeTable.ts`, section
 * `clip`). The hot path (`clipSpeed`) allocates nothing.
 */
import { registerTuneSection, TUNE_FLAGS, type TuneTunable } from './tuneRegistry';

export const CLIP_GUN = 'clip.gun';
export const CLIP_BODY = 'clip.body';
export const CLIP_ALL = 'clip.all';
export const CLIP_GROUPS = [CLIP_GUN, CLIP_BODY, CLIP_ALL] as const;

/** The per-clip sliders, in panel order (the draws, holster and swap first). */
export const CLIP_SPEED_IDS = ['rifleDraw', 'pistolDraw', 'holster', 'swap', 'grenade', 'startShift', 'stopSettle', 'land'] as const;
export type ClipSpeedId = (typeof CLIP_SPEED_IDS)[number];

const ROWS: readonly { id: ClipSpeedId; label: string; group: string; hook: string }[] = [
  { id: 'rifleDraw', label: 'Rifle draw speed (every long gun)', group: CLIP_GUN, hook: 'drawState.ts DRAW_TIME_PRIMARY / this (also when the gun can fire, and the aim camera blend)' },
  { id: 'pistolDraw', label: 'Pistol draw speed', group: CLIP_GUN, hook: 'drawState.ts DRAW_TIME_SIDEARM / this (also when the gun can fire, and the aim camera blend)' },
  { id: 'holster', label: 'Holster speed (every gun)', group: CLIP_GUN, hook: 'drawState.ts HOLSTER_TIME / this' },
  { id: 'swap', label: 'Weapon swap speed', group: CLIP_GUN, hook: 'playerWeapons.ts SWAP_TIME / this (the swap clock runs this much faster; also the stow for a climb)' },
  { id: 'grenade', label: 'Grenade throw speed', group: CLIP_GUN, hook: 'playerWeapons.ts GRENADE_TIME / this (the release moves with it)' },
  { id: 'startShift', label: 'Start-off weight shift speed', group: CLIP_BODY, hook: 'animGraph START_SHIFT clock x clips/actions.ts CLIP_RATE.startShift x this' },
  { id: 'stopSettle', label: 'Stop settle speed', group: CLIP_BODY, hook: 'animGraph STOP_SETTLE clock x clips/actions.ts CLIP_RATE.stopSettle x this' },
  { id: 'land', label: 'Landing speed (soft and deep)', group: CLIP_BODY, hook: 'animGraph LAND / LAND_DEEP clock x clips/actions.ts CLIP_RATE.land x this' },
];

const speed = (id: string, label: string, groups: readonly string[], hook: string): TuneTunable => ({ id, label, kind: 'mul', def: 1, min: 0.25, max: 3, step: 0.05, unit: 'x', groups, hook });

/**
 * Today's duration (s) of each clip at speed 1, filled by the owner module from where the value lives (the panel's
 * "today" line only; a clip whose owner is not loaded has none).
 */
export const CLIP_BASE: Partial<Record<ClipSpeedId, number>> = {};

const fmt = (s: number): string => `${s.toFixed(2)} s`;

export const CLIP_SPEED_SECTION = registerTuneSection({
  id: 'clip',
  label: 'Clip speed',
  note: 'How fast each clip plays: 1 is today, 2 twice as fast (half the time), 0.5 half as fast. Baked by the bake script.',
  groups: CLIP_GROUPS,
  tunables: [...ROWS.map((r) => speed(r.id, r.label, [r.group], r.hook)), speed('all', 'Every clip speed (all of the above)', [CLIP_ALL], 'multiplies every clip speed slider of this section')],
  notes: (_g, id) => {
    const b = CLIP_BASE[id as ClipSpeedId];
    return b !== undefined ? [`today: ${fmt(b)} at 1${id === 'land' ? ' (the soft landing)' : ''}`] : [];
  },
});

const V = CLIP_SPEED_SECTION.values;
const ALL = V[CLIP_ALL]!;
/** Each clip's value row (the registry edits these objects in place: a load or an import never replaces them). */
const ROW_OF = {} as Record<ClipSpeedId, Record<string, number>>;
for (const r of ROWS) ROW_OF[r.id] = V[r.group]!;

/** A clip's speed now: its slider x the every-clip slider (1 with the tuner's bypass held). No allocation. */
export function clipSpeed(id: ClipSpeedId): number {
  if (TUNE_FLAGS.bypass) return 1;
  return ROW_OF[id][id]! * ALL.all!;
}
