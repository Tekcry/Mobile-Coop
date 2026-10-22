/**
 * A6 the Pump House (SPEC section 9 "A6 - Set 6, the Pump House"; PLAN slice 6). STUB (slice 0d): an empty lit hall that walks through to the next room
 * (`stub.ts`). The set slice replaces `buildStub` with the set (greybox, lights, guards, devices, objective steps,
 * dressing) inside `SET_BOX.a6PumpHouse`, keeps this function's name and signature, and drops `stub: true`.
 */
import type { FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { buildStub } from './stub';
import type { SetPart } from './types';

export function buildA6PumpHouse(b: LevelBuilder, _kit: FacilityKit): SetPart {
  return buildStub(b, 'a6PumpHouse');
}
