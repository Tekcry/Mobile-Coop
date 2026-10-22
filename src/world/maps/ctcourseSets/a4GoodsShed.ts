/**
 * A4 the Goods Shed (SPEC section 9 "A4 - Set 4, the Goods Shed"; PLAN slice 4). STUB (slice 0d): an empty lit hall that walks through to the next room
 * (`stub.ts`). The set slice replaces `buildStub` with the set (greybox, lights, guards, devices, objective steps,
 * dressing) inside `SET_BOX.a4GoodsShed`, keeps this function's name and signature, and drops `stub: true`.
 */
import type { FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { buildStub } from './stub';
import type { SetPart } from './types';

export function buildA4GoodsShed(b: LevelBuilder, _kit: FacilityKit): SetPart {
  return buildStub(b, 'a4GoodsShed');
}
