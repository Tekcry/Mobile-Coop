/**
 * A5 the Substation (SPEC section 9 "A5 - Set 5, the Substation"; PLAN slice 5). STUB (slice 0d): an empty lit hall that walks through to the next room
 * (`stub.ts`). The set slice replaces `buildStub` with the set (greybox, lights, guards, devices, objective steps,
 * dressing) inside `SET_BOX.a5Substation`, keeps this function's name and signature, and drops `stub: true`.
 */
import type { FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { buildStub } from './stub';
import type { SetPart } from './types';

export function buildA5Substation(b: LevelBuilder, _kit: FacilityKit): SetPart {
  return buildStub(b, 'a5Substation');
}
