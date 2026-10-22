import '../anim/tune'; // Body, Gun and Camera register first (the panel's section order)
import { registerTuneSection, TUNE_FLAGS, TUNE_STATE_BAG, type TuneTunable } from '../anim/tuneRegistry';
import { DRAW_CUR, DRAW_MOTION, type DrawClass } from '../anim/drawMotion';

/**
 * (anim-natural N3) The tuner's Draw section: the draw / holster / swap motion per weapon (groups `draw.rifle`,
 * `draw.pistol`; `anim/drawMotion.ts` explains the phases). Identity at default: the code values are the tuned motion.
 * Every slider bakes (`tuneBakeTable.ts`) into `DRAW_MOTION`. The draw and holster times are the Clip speed section's
 * (`anim/tuneClipSpeed.ts`: rifle / pistol draw, rifle / pistol holster; master 4.53.0 merge).
 *
 * Read by the local player only (`PlayerWeapons` calls `drawTuneApply` each step: `DRAW_CUR`).
 * No allocation on the step. The bypass (TUNE_FLAGS.bypass) reads identity.
 */
export const DRAW_GROUPS = ['draw.rifle', 'draw.pistol'] as const;

const add = (id: string, label: string, min: number, max: number, step: number, unit: string, hook: string): TuneTunable => ({ id, label, kind: 'add', def: 0, min, max, step, unit, groups: DRAW_GROUPS, hook });
const AXES = ['X', 'Y', 'Z'] as const;
const AXIS_NAME = ['right', 'up', 'forward'] as const;

export const DRAW_SECTION = registerTuneSection({
  id: 'draw',
  label: 'Draw',
  note: 'Draw / holster / swap per weapon: reach, grip, lift, present, settle. The draw and holster times are in Clip speed.',
  groups: DRAW_GROUPS,
  tunables: [
    add('reachAdd', 'reach (share of the draw)', -0.2, 0.3, 0.01, '', 'drawMotion.ts DRAW_MOTION.<gun>.reach: the hand to the gun on the sling / in the holster'),
    add('gripAdd', 'grip: lift starts at (share of the reach)', -0.5, 0.4, 0.01, '', 'drawMotion.ts DRAW_MOTION.<gun>.grip: below 1 the gun leaves as the fingers close'),
    add('handoverAdd', 'hand-over to the ready pose (share of the present)', -0.3, 0.5, 0.01, '', 'drawMotion.ts DRAW_MOTION.<gun>.handover: where the reach pose starts blending into the low ready / aim'),
    add('settleAdd', 'settle overshoot (3 none, 5 ~2.4 %, 6 ~5.5 %)', -2, 1.5, 0.05, '', 'drawMotion.ts DRAW_MOTION.<gun>.settle: drawEase past the pocket and back'),
    ...AXES.map((a, i) => add(`out${a}`, `lift / clear path ${AXIS_NAME[i]}`, -15, 15, 0.5, 'cm', `drawMotion.ts DRAW_MOTION.<gun>.out[${i}] (added to weaponModel TRAVEL_OUT)`)),
    ...AXES.map((a, i) => add(`via${a}`, `present waypoint ${AXIS_NAME[i]}`, -20, 20, 0.5, 'cm', `drawMotion.ts DRAW_MOTION.<gun>.via[${i}] (added to weaponModel TRAVEL_VIA)`)),
  ],
  select: (s) => s.draw || null,
});
TUNE_STATE_BAG.draw = '';

const CLASSES: readonly DrawClass[] = ['rifle', 'pistol'];
const GROUP_OF: Record<DrawClass, string> = { rifle: 'draw.rifle', pistol: 'draw.pistol' };

/** Writes `DRAW_CUR` from the table and the Draw sliders (identity under the bypass); `follow`: the
 *  local player's current gun (the panel's follow). No allocation. */
export function drawTuneApply(follow: DrawClass | null): void {
  const V = DRAW_SECTION.values;
  const id = DRAW_SECTION.identity;
  for (let c = 0; c < CLASSES.length; c++) {
    const k = CLASSES[c]!;
    const v = TUNE_FLAGS.bypass ? id : (V[GROUP_OF[k]] ?? id);
    const b = DRAW_MOTION[k];
    const o = DRAW_CUR[k];
    o.reach = Math.max(0, b.reach + v.reachAdd!);
    o.grip = Math.max(0, b.grip + v.gripAdd!);
    o.handover = Math.max(0, Math.min(1, b.handover + v.handoverAdd!));
    o.settle = Math.max(0, b.settle + v.settleAdd!);
    o.out[0] = b.out[0] + v.outX! * 0.01;
    o.out[1] = b.out[1] + v.outY! * 0.01;
    o.out[2] = b.out[2] + v.outZ! * 0.01;
    o.via[0] = b.via[0] + v.viaX! * 0.01;
    o.via[1] = b.via[1] + v.viaY! * 0.01;
    o.via[2] = b.via[2] + v.viaZ! * 0.01;
  }
  TUNE_STATE_BAG.draw = follow ? GROUP_OF[follow] : '';
}
