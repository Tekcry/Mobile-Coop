/**
 * (guard-ai mill-hunt, PR 1) The hunt board's sims on the real storm mill: `THORNBECK_HUNT` with the scene's 12 guards
 * (`THORNBECK_GUARDS`, the section's list) and the 16 (`THORNBECK_GUARDS_16`). The scene spawns the section's list in
 * order at the dark (`pianoScene.spawnBeat` -> `SectorMode.sceneSpawn` -> `fill`, each guard at his slot's x / y / z,
 * `placeSlot` setting `slotIdx` and `pairSlot` from the slot); the board is built empty and admits them in that order.
 * The same kinematic sim as `tests/millHunt.test.ts` (`tests/helpers/millHuntSim.ts`: straight legs at the goal's pace,
 * the calm turn rate; it has no nav grid, H1's tests check the walks between adjacent stops on it). Plus plan check 2
 * fold-in 1: a hall-facing aim on each gallery hold stop, and the gallery holds actually face the hall.
 */
import { describe, expect, it } from 'vitest';
import { H_HOLD, H_SPREAD } from '../src/ai/millHunt';
import type { SectorGuard } from '../src/game/sectors';
import { THORNBECK_GUARDS, THORNBECK_GUARDS_16, THORNBECK_HUNT } from '../src/world/maps/thornbeckMill';
import { endState, HuntWorld, runHunt, type SimSlot } from './helpers/millHuntSim';

/** The slot fields the board reads, from the map's guard list (index = slot = spawn order). */
function slots(gs: readonly SectorGuard[]): SimSlot[] {
  return gs.map((g) => ({ x: g.x, z: g.z, y: g.y, pair: g.pair }));
}

const SET_12 = slots(THORNBECK_GUARDS);
const SET_16 = slots(THORNBECK_GUARDS_16);
const LAST = THORNBECK_HUNT.phases.length - 1;
/** Facing the hall from the gallery: south, within about 45 degrees (H1's test, plan check 2 fold-in 1). */
const hallFacing = (yaw: number): boolean => Math.cos(yaw) < -0.7;
/** A hold this long has run at least one full aim cycle (4 aims at `holdAim` plus the calm turns). */
const FULL_HOLD = 30;

/** All admitted in spawn order at t = 0. */
function admitAll(set: readonly SimSlot[]): HuntWorld {
  const w = new HuntWorld(THORNBECK_HUNT);
  for (let k = 0; k < set.length; k++) expect(w.board.admit(w.spawn(set, k))).toBe(true);
  return w;
}

/** The room id of a board stop. */
function roomOf(w: HuntWorld, s: number): string {
  return w.board.roomIds[w.board.stopRoom[s]!]!;
}

/**
 * Per-step watcher of the gallery holds: every hold of a full aim cycle on a gallery stop had a member facing the hall.
 * Returns the step hook and a reader (fails, holds checked).
 */
function hallWatch(): { onStep: (w: HuntWorld) => void; result: (w: HuntWorld) => { fails: string[]; checked: number } } {
  const ep = new Map<number, { t0: number; s: number; hall: boolean }>();
  const fails: string[] = [];
  let checked = 0;
  const close = (w: HuntWorld, u: number): void => {
    const e = ep.get(u);
    if (!e) return;
    ep.delete(u);
    if (w.t - e.t0 < FULL_HOLD) return;
    checked++;
    if (!e.hall) fails.push(`unit ${u} held ${(w.t - e.t0).toFixed(0)} s at ${roomOf(w, e.s)} stop ${e.s} never facing the hall`);
  };
  return {
    onStep: (w) => {
      const b = w.board;
      const gal = 1;
      for (let u = 0; u < b.cap; u++) {
        const s = b.uFrom[u]!;
        const on = b.uLive[u] === 1 && b.uState[u] === H_HOLD && b.uLine[u] === gal;
        const e = ep.get(u);
        if (e && (!on || e.s !== s)) close(w, u);
        if (!on) continue;
        if (!ep.has(u)) ep.set(u, { t0: w.t, s, hall: false });
        const cur = ep.get(u)!;
        for (const i of [b.uA[u]!, b.uB[u]!]) {
          if (i < 0) continue;
          const g = b.member(i)!;
          if (g.face === g.face && hallFacing(g.face)) cur.hall = true;
        }
      }
    },
    result: (w) => {
      for (const u of [...ep.keys()]) close(w, u);
      return { fails, checked };
    },
  };
}

describe('mill hunt on THORNBECK_HUNT: admission and the start spread (real guard sets)', () => {
  it('12: G3 leaves the start bay for the aisle; G4 walks back to G5; the pairs pair; nobody starts in a room he does not stand in', () => {
    const w = admitAll(SET_12);
    const b = w.board;
    const u = (k: number): number => b.unitOf(w.gs[k]!);
    expect(u(0)).toBe(u(1));
    expect(u(3)).toBe(u(4));
    expect(u(7)).toBe(u(8));
    expect(u(10)).toBe(u(11));
    expect(b.uState[u(2)]).toBe(H_SPREAD);
    expect(roomOf(w, b.uDest[u(2)]!)).toBe('aisle');
    // G8 + G9 stand in crane west (x 12.5): their start stop is there, not the stair head's (they would walk into a
    // room that holds G10)
    expect(roomOf(w, b.uFrom[u(7)]!)).toBe('craneWest');
    expect(roomOf(w, b.uFrom[u(9)]!)).toBe('stairHead');
  });

  it('16: G8 + G9 step on to crane east, then G10 to crane west; the stair head keeps G15 + G16', () => {
    const w = admitAll(SET_16);
    const b = w.board;
    const u = (k: number): number => b.unitOf(w.gs[k]!);
    expect(u(14)).toBe(u(15));
    expect(b.uState[u(7)]).toBe(H_SPREAD);
    expect(roomOf(w, b.uDest[u(7)]!)).toBe('craneEast');
    expect(b.uState[u(9)]).toBe(H_SPREAD);
    expect(roomOf(w, b.uDest[u(9)]!)).toBe('craneWest');
    for (let n = 0; n < 150; n++) w.step();
    expect(roomOf(w, b.uFrom[u(7)]!)).toBe('craneEast');
    expect(roomOf(w, b.uFrom[u(9)]!)).toBe('craneWest');
    expect(roomOf(w, b.uFrom[u(14)]!)).toBe('stairHead');
  });
});

describe('mill hunt on THORNBECK_HUNT: every gallery stop a hold may use has a hall-facing aim (plan check 2 fold-in 1)', () => {
  it('both ways along the line, in and outside the target room, the aims a unit uses include one into the hall', () => {
    const w = new HuntWorld(THORNBECK_HUNT);
    const b = w.board;
    const gal = 1;
    for (let s = b.lineFirst[gal]!; s < b.lineEnd[gal]!; s++)
      for (const dir of [1, -1])
        for (const full of [false, true]) {
          const mask = b.aimMask(s, b.lineHeading(s, dir), full);
          let hall = false;
          for (let k = 0; k < b.aimN[s]!; k++) if (mask & (1 << k) && hallFacing(b.aims[b.aimFirst[s]! + k]!)) hall = true;
          expect(hall, `gallery stop ${s - b.lineFirst[gal]!} (${roomOf(w, s)}) dir ${dir} full ${full}`).toBe(true);
        }
  });
});

describe('mill hunt on THORNBECK_HUNT: the sims (15 min, no trigger)', () => {
  for (const [name, set, over] of [
    ['12', SET_12, { startBay: 3 }],
    ['16', SET_16, { startBay: 3, stairHead: 3 }],
  ] as const) {
    it(`${name} guards: cap by positions from t = 0, phases to the last row, no deadlock, one reversal at most, the end state, the gallery holds face the hall`, () => {
      const hw = hallWatch();
      const r = runHunt(THORNBECK_HUNT, set, { T: 900, onStep: hw.onStep });
      expect(r.startOver).toEqual(over);
      expect(r.fails).toEqual([]);
      expect(r.phases.at(-1)).toBe(LAST);
      expect(r.maxRev).toBeLessThanOrEqual(1);
      expect(endState(r.world)).toEqual([]);
      const h = hw.result(r.world);
      expect(h.fails).toEqual([]);
      expect(h.checked).toBeGreaterThan(0);
    });

    it(`${name} guards with late joiners (G1 at 12 s, G3 at 20 s) and fight rejoins (G8 100-160 s, G5 200-260 s)`, () => {
      const hw = hallWatch();
      const r = runHunt(THORNBECK_HUNT, set, {
        T: 900,
        late: [
          { k: 0, at: 12 },
          { k: 2, at: 20 },
        ],
        rejoin: [
          { k: 7, off: 100, on: 160 },
          { k: 4, off: 200, on: 260 },
        ],
        onStep: hw.onStep,
      });
      expect(r.fails).toEqual([]);
      expect(r.phases.at(-1)).toBe(LAST);
      expect(r.maxRev).toBeLessThanOrEqual(1);
      expect(endState(r.world)).toEqual([]);
      expect(hw.result(r.world).fails).toEqual([]);
    });

    it(`${name} guards: two runs identical`, () => {
      const a = runHunt(THORNBECK_HUNT, set, { T: 300 });
      const c = runHunt(THORNBECK_HUNT, set, { T: 300 });
      expect(c.trace).toEqual(a.trace);
    });
  }
});
