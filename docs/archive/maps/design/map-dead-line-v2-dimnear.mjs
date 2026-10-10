// The proposed dim-light rule (Michael, D1 revision item 7), for measuring only: the engine does not use it.
// Inside the focus cone and within `range`, a target in dim light gets a second fill rate without the squared light factor; full from
// light `full` up, none below `from`; the guard uses the larger of this and the engine's rate.
import { PERCEPTION } from './map-dead-line-core.mjs';
import { sightRate, motionFactor } from './map-dead-line-engine.mjs';

export const DIM_NEAR = { from: 0.2, full: 0.28, range: 8, rate: 1.8 };
export function proposedRate(i) {
  const base = sightRate(i);
  if (i.exposure <= 0 || Math.abs(i.angle) > PERCEPTION.focusHalf || i.dist >= DIM_NEAR.range) return base;
  const k = Math.max(0, Math.min(1, (i.light - DIM_NEAR.from) / (DIM_NEAR.full - DIM_NEAR.from)));
  if (k <= 0) return base;
  const stance = i.crouched ? PERCEPTION.crouchMul : 1;
  const exp = PERCEPTION.exposureMin + (1 - PERCEPTION.exposureMin) * Math.min(1, i.exposure);
  const dim = DIM_NEAR.rate * (1 - i.dist / DIM_NEAR.range) * k * stance * motionFactor(i.speed) * exp * i.sensitivity;
  return Math.min(PERCEPTION.maxRate, Math.max(base, dim));
}
