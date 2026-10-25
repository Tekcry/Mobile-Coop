import './speedTune'; // Body, Gun, Camera and Speed register first (the panel's section order)
import { registerTuneSection, TUNE_FLAGS, TUNE_STATE_BAG, tuneSectionEase, type TuneTunable } from '../anim/tuneRegistry';
import { WEIGHT_GROUPS, WEIGHT_TUNABLES, weightGroupFor, WeightLayers, weightMoveLoad, weightPoseClear, type WeightFrameIn, type WeightValues } from '../anim/weight';

/**
 * (anim-weight) The tuner's Weight section (registered from its own file through the section registry): procedural
 * weight per gait / state (`weight.walk / jog / run` holstered, `weight.crouch`, `weight.drawn`). The layers and every
 * slider are in `src/anim/weight.ts`; `docs/archive/anim-tuner/WEIGHT.md` lists them. Identity at default.
 *
 * - Momentum (gameplay): `weightSim` around the local player's motion step (PlayerController), like the Speed
 *   section: this machine and the local player only; remotes still pose from MoveState.
 * - Everything else is the local player's pose only: `weightBegin` / `weightEnd` around its rig's animate (player.ts).
 */
TUNE_STATE_BAG.weight = '';

const TUNABLES: readonly TuneTunable[] = WEIGHT_TUNABLES.map((t) => ({ ...t, groups: WEIGHT_GROUPS }));

export const WEIGHT_SECTION = registerTuneSection<WeightValues>({
  id: 'weight',
  label: 'Weight',
  note: 'The momentum sliders are gameplay (this machine and the local player only, like Speed); the rest is the local pose only. The camera signal is exposed for the camera section, not applied.',
  groups: WEIGHT_GROUPS,
  tunables: TUNABLES,
  select: (s) => s.weight || null,
  tau: 0.1,
});

/** The local player's visual layers. */
export const WEIGHT_LAYERS = new WeightLayers();

/**
 * Before the local player's motion step: the momentum values of its group (`crouched`, a weapon `drawn`, `speed` the
 * larger of the wanted and the current pace). `weightSimEnd` after it. (anim-bake-all) The effective values: the base
 * table's `sections.weight` composed with the tuner's; the bypass reads the base alone (identity untuned). No allocation.
 */
export function weightSim(crouched: boolean, drawn: boolean, speed: number): void {
  const g = weightGroupFor(crouched, drawn, speed);
  weightMoveLoad((TUNE_FLAGS.bypass ? WEIGHT_SECTION.base[g] : WEIGHT_SECTION.eff[g]) ?? null);
}

export function weightSimEnd(): void {
  weightMoveLoad(null);
}

/** Before the local rig's animate: select the group, ease its values over `i.dt` and step the layers. No allocation. */
export function weightBegin(i: WeightFrameIn, crouched: boolean, drawn: boolean): void {
  const g = weightGroupFor(crouched, drawn, i.speed);
  TUNE_STATE_BAG.weight = g;
  tuneSectionEase(WEIGHT_SECTION, g, i.dt);
  WEIGHT_LAYERS.step(i, WEIGHT_SECTION.cur);
}

/** After the local rig's animate: the pose offsets back to 0 (no other rig sees them). */
export function weightEnd(): void {
  weightPoseClear();
}
