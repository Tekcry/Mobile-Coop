/**
 * (player-hygiene S4) The open selection wheel's ring (`GadgetSystem.refreshRing`, every fixed step while open):
 * - the ring's contents at every step of a loadout story (ammo, gadget counts, guns added, removed, renamed, none)
 *   equal the fixture recorded on the pre-refactor code and `buildWheel` of the same loadout built fresh;
 * - after the refactor the ring is updated in place (the same array and slot objects) while its shape holds, and
 *   rebuilt when it changes;
 * - the open wheel's step allocates nothing when the shape is unchanged (ammo moving included);
 * - a pick still reads the live ring.
 * Fixture `tests/fixtures/player-hygiene-s4.json`: `PH_S4_WRITE=1 npx vitest run tests/wheelRingAlloc.test.ts` rewrites
 * it (only on the pre-refactor code, commit 1 of the slice).
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import * as SW from '../src/game/selectionWheel';
import { buildWheel, type WheelGadget, type WheelGun, type WheelSeg } from '../src/game/selectionWheel';
import { GadgetSystem } from '../src/game/gadgetSystem';
import { GADGET_IDS, GADGETS, type GadgetId } from '../src/game/gadgets';
import type { GameState } from '../src/game/gameState';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

const FIXTURE = path.resolve(__dirname, 'fixtures/player-hygiene-s4.json');
const WRITE = process.env.PH_S4_WRITE === '1';
const REFACTORED = typeof (SW as unknown as Record<string, unknown>).setWheelGun === 'function';

interface Slot { def: { name: string }; mag: number; reserve: number }

/** A fake game with the two members the constructor reads (`weapons`, `grenades`). */
function game() {
  const slots: Slot[] = [{ def: { name: 'Pistol' }, mag: 11, reserve: 20 }, { def: { name: 'Rifle' }, mag: 30, reserve: 90 }];
  const counts: Record<string, number> = { frag: 2, gas: 1, flash: 2, noise: 3, stickyCam: 1, mine: 0, emp: 0 };
  const g = { weapons: { slots, gadgets: { counts }, onThrow: null, onPlace: null }, grenades: { onDetonate: null } };
  const gs = new GadgetSystem(g as unknown as GameState);
  const refresh = (): void => (gs as unknown as { refreshRing(): void }).refreshRing();
  return { slots, counts, gs, refresh };
}

/** `buildWheel` of a loadout, built as `buildRing` builds it. */
function fresh(slots: readonly Slot[], counts: Record<string, number>): WheelSeg[] {
  const guns: WheelGun[] = slots.map((s, i) => ({ index: i, name: s.def.name, loaded: s.mag, reserve: s.reserve }));
  const kit: WheelGadget[] = GADGET_IDS.map((id: GadgetId) => ({ id, name: GADGETS[id].name, count: counts[id]! }));
  return buildWheel(guns, kit);
}

const recorded: Record<string, WheelSeg[]> = {};
const fixture = WRITE ? null : (JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as { steps: Record<string, WheelSeg[]> });

afterAll(() => {
  if (WRITE) fs.writeFileSync(FIXTURE, `${JSON.stringify({ steps: recorded }, null, 2)}\n`);
});

describe('player-hygiene S4: the selection wheel ring', () => {
  it('every step equals the recorded fixture and buildWheel of the same loadout; in place while the shape holds', () => {
    const { slots, counts, gs, refresh } = game();
    const rings: Record<string, WheelSeg[]> = {};
    const firstSlot: Record<string, WheelSeg | undefined> = {};
    const step = (name: string, change: () => void): void => {
      change();
      refresh();
      rings[name] = gs.ring;
      firstSlot[name] = gs.ring[1];
      const got = JSON.parse(JSON.stringify(gs.ring)) as WheelSeg[];
      recorded[name] = got;
      expect(got, name).toEqual(fresh(slots, counts));
      if (fixture) expect(got, `${name} (fixture)`).toEqual(fixture.steps[name]);
    };
    step('open', () => {});
    step('shot', () => { slots[0]!.mag = 10; });
    step('reload', () => { slots[1]!.mag = 5; slots[1]!.reserve = 65; });
    step('gadgetUsed', () => { counts.frag = 1; });
    step('gadgetZero', () => { counts.gas = 0; });
    step('gunAdded', () => { slots.push({ def: { name: 'Shotgun' }, mag: 6, reserve: 24 }); });
    step('gunRemoved', () => { slots.splice(1, 1); });
    step('gunRenamed', () => { slots[0] = { def: { name: 'SMG' }, mag: 25, reserve: 75 }; });
    step('noGuns', () => { slots.length = 0; });
    step('back', () => { slots.push({ def: { name: 'Pistol' }, mag: 11, reserve: 20 }); });
    if (fixture) expect(Object.keys(fixture.steps)).toEqual(Object.keys(recorded));
    if (!REFACTORED) return;
    // (the refactor) the same array and slot objects while the shape holds, a new array when it changes
    for (const n of ['shot', 'reload', 'gadgetUsed', 'gadgetZero']) expect(rings[n], n).toBe(rings.open);
    expect(firstSlot.shot).toBe(firstSlot.open);
    for (const [a, b] of [['gadgetZero', 'gunAdded'], ['gunAdded', 'gunRemoved'], ['gunRemoved', 'gunRenamed'], ['gunRenamed', 'noGuns']]) {
      expect(rings[b], `${a} -> ${b}`).not.toBe(rings[a]);
    }
  });

  it('the open wheel step allocates nothing while the shape holds (ammo moving too)', async () => {
    const { slots, gs, refresh } = game();
    gs.sel.begin('night');
    refresh();
    const still = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        refresh();
        gs.sel.update(gs.ring.length);
      }
    }, HEAP_NUMBER, { n: 1000, warm: 20000 });
    const s0 = slots[0]!;
    const moving = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        s0.mag = k & 7;
        refresh();
        gs.sel.update(gs.ring.length);
      }
    }, HEAP_NUMBER, { n: 1000, warm: 20000 });
    console.info(`bytes per open-wheel step (${REFACTORED ? 'in place' : 'rebuilt'}): still ${still.toFixed(1)}, ammo moving ${moving.toFixed(1)}`);
    if (REFACTORED) {
      expect(still).toBeLessThanOrEqual(HEAP_NUMBER);
      expect(moving).toBeLessThanOrEqual(HEAP_NUMBER);
    }
  }, 120_000);

  it('a pick still reads the live ring', () => {
    const { gs, refresh } = game();
    gs.sel.begin('night');
    refresh();
    const n = gs.ring.length;
    const a = (2 * Math.PI) / n;
    gs.sel.place(Math.sin(a), Math.cos(a));
    gs.sel.update(gs.ring.length);
    expect(gs.sel.pick(gs.ring)).toEqual({ kind: 'gun', index: 0 });
  });
});
