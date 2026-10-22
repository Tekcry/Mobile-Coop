/**
 * A7 the Data Hall (SPEC section 9 "A7 - Set 7, the Data Hall"; PLAN slice 7). STUB (slice 0d): an empty lit hall that walks through to the next room
 * (`stub.ts`). The set slice replaces `buildStub` with the set (greybox, lights, guards, devices, objective steps,
 * dressing) inside `SET_BOX.a7DataHall`, keeps this function's name and signature, and drops `stub: true`.
 */
import type { FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { buildStub } from './stub';
import type { SetPart } from './types';

export function buildA7DataHall(b: LevelBuilder, _kit: FacilityKit): SetPart {
  return buildStub(b, 'a7DataHall');
}
