/**
 * (mixamo-retarget Source wire, G400, Michael Q39: "yes players must look exact in everyones games") Each player's own
 * Animation source rides that player's networked state (`PlayerState.an`) and every screen draws that player with the
 * OWNER's choice: `AnimGraph.animSource` picks the graph's clip tables (`animSource.ts` SOURCE_TABLES / PAGE_TABLES).
 * - each source's own tables are exactly the page's tables for that setting with no override;
 * - per graph: two graphs handed two sources each draw their own (bit-identical to a page set to that source), whatever
 *   this page's source is; a graph no one hands a source follows the page (the default game unchanged);
 * - the wire: the source round-trips through `pstate`; CMU sends no field; no field or a bad one reads CMU;
 * - no allocation a frame on a handed source.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { ANIM_SOURCE, ANIM_SOURCE_DEFAULT, ANIM_SOURCES, applyAnimSource, PAGE_TABLES, setAnimSource, SOURCE_TABLES, wireAnimSource, type AnimSource, type SourceTables } from '../src/anim/animSource';
import { LOCO, MOCAP_SET } from '../src/anim/mocap';
import { MIXAMO, MIXAMO_ON, setMixamo, WREN_KEYED, WREN_STANCE, WREN_TRAV } from '../src/anim/mixamo';
import { AnimGraph, defaultInput, type AnimInput } from '../src/anim/animGraph';
import { proportions } from '../src/player/proportions';
import { ANIM_SOURCE_WIRE, animSourceOf, animSourceWire, parseMessage } from '../src/net/protocol';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

const DT = 1 / 60;
const ON0 = { ...MIXAMO_ON };
afterEach(() => {
  Object.assign(MIXAMO_ON, ON0);
  setMixamo(MIXAMO.on);
  setAnimSource(ANIM_SOURCE_DEFAULT);
});

/** A table's contents (the clip references and flags), for a by-reference comparison. */
function contents(T: SourceTables): unknown {
  return { set: T.loco.set, mocap: T.loco.mocap, slots: T.loco.slots, trav: { ...T.trav }, keyed: { ...T.keyed }, stance: { ...T.stance } };
}

/** cyrb53 over float64 bit patterns (-0 as +0), as tests/mixamoSwitch.test.ts. */
class Hasher {
  private h1 = 0xdeadbeef;
  private h2 = 0x41c6ce57;
  private readonly f = new Float64Array(1);
  private readonly u = new Uint32Array(this.f.buffer);
  add(v: number): void {
    this.f[0] = v === 0 ? 0 : v;
    for (let k = 0; k < 2; k++) {
      const c = this.u[k]!;
      this.h1 = Math.imul(this.h1 ^ c, 2654435761);
      this.h2 = Math.imul(this.h2 ^ c, 1597334677);
    }
  }
  digest(): string {
    return (this.h1 >>> 0).toString(16) + (this.h2 >>> 0).toString(16);
  }
}

function hashAll(h: Hasher, v: unknown, seen: Set<object>): void {
  if (typeof v === 'number') h.add(v);
  else if (typeof v === 'boolean') h.add(v ? 1 : 0);
  else if (typeof v === 'string') for (let k = 0; k < v.length; k++) h.add(v.charCodeAt(k));
  else if (v !== null && typeof v === 'object') {
    if (seen.has(v)) return;
    seen.add(v);
    if (ArrayBuffer.isView(v)) {
      const a = v as unknown as ArrayLike<number>;
      for (let k = 0; k < a.length; k++) h.add(Number(a[k]));
    } else for (const k of Object.keys(v)) hashAll(h, (v as Record<string, unknown>)[k], seen);
  }
}

/** Still (the idle), a crouched sneak, crouched still (the stance shot on the way down / up), a walk. */
const SEGMENTS: readonly { sec: number; speed: number; crouch: number }[] = [
  { sec: 2, speed: 0, crouch: 0 },
  { sec: 1.5, speed: 0.7, crouch: 1 },
  { sec: 1, speed: 0, crouch: 1 },
  { sec: 1, speed: 0, crouch: 0 },
  { sec: 1.5, speed: 1.4, crouch: 0 },
];

/** Wren graphs (each handed a source, or null: the page's) stepped together through SEGMENTS: one hash a frame each. */
function runGraphs(sources: readonly (AnimSource | null)[]): string[][] {
  const random = Math.random;
  const gs: AnimGraph[] = [];
  const outs: string[][] = [];
  try {
    for (const s of sources) {
      // the graph's own randomness (the idle clock's start) seeded alike, so runs compare bit for bit
      let seed = 4242;
      Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
      const g = new AnimGraph(proportions('average', 1.68));
      g.wrenReady = true;
      if (s !== null) g.animSource = s;
      gs.push(g);
      outs.push([]);
    }
    Math.random = random;
    const i: AnimInput = defaultInput();
    i.keyedOk = true;
    i.ready = true;
    i.armed = false;
    i.mocapOk = true;
    for (const seg of SEGMENTS) {
      for (let n = 0; n < Math.round(seg.sec * 60); n++) {
        i.speed = seg.speed;
        i.localZ = seg.speed > 0 ? 1 : 0;
        i.crouch = seg.crouch;
        for (let k = 0; k < gs.length; k++) {
          const g = gs[k]!;
          g.update(DT, i);
          const h = new Hasher();
          hashAll(h, g.out, new Set());
          for (let c = 0; c < g.pose.length; c++) h.add(g.pose[c]!);
          outs[k]!.push(h.digest());
        }
      }
    }
    return outs;
  } finally {
    Math.random = random;
  }
}

function differ(a: string[], b: string[]): number {
  let n = Math.abs(a.length - b.length);
  for (let k = 0; k < Math.min(a.length, b.length); k++) if (a[k] !== b[k]) n++;
  return n;
}

describe('source wire: each source has its own tables', () => {
  it("each source's own tables are the page's tables for that setting with no override", () => {
    for (const s of ANIM_SOURCES) {
      setAnimSource(s);
      expect(contents(SOURCE_TABLES[s]), s).toEqual(contents(PAGE_TABLES));
      for (const k of Object.keys(SOURCE_TABLES[s].trav)) expect((SOURCE_TABLES[s].trav as Record<string, unknown>)[k], `${s} ${k}`).toBe((PAGE_TABLES.trav as Record<string, unknown>)[k]);
      expect(SOURCE_TABLES[s].keyed.idle).toBe(PAGE_TABLES.keyed.idle);
      expect(SOURCE_TABLES[s].stance.down).toBe(PAGE_TABLES.stance.down);
    }
    // the page's tables are today's switches, by reference
    expect(PAGE_TABLES.loco).toBe(LOCO);
    expect(PAGE_TABLES.trav).toBe(WREN_TRAV);
    expect(PAGE_TABLES.keyed).toBe(WREN_KEYED);
    expect(PAGE_TABLES.stance).toBe(WREN_STANCE);
  });

  it('a source table does not take this page\'s pick or overrides, and follows MIXAMO_ON on a resolve (rewritten in place)', () => {
    setAnimSource('cmu');
    const mx = SOURCE_TABLES.mixamo;
    const trav = mx.trav;
    expect(mx.trav.hangIdle).not.toBeNull();
    // the page's Mixamo flag on its own (a ?mixamo=1 page) leaves the CMU table as the CMU source
    setMixamo(true);
    expect(SOURCE_TABLES.cmu.trav.any).toBe(false);
    expect(SOURCE_TABLES.cmu.loco.set).toBe(MOCAP_SET);
    setMixamo(false);
    MIXAMO_ON.hanging_idle = false;
    setMixamo(false);
    expect(mx.trav.hangIdle).toBeNull();
    expect(mx.trav).toBe(trav);
  });
});

describe('source wire: per graph (each draws its own source)', () => {
  it('two graphs handed two sources each draw as a page set to that source; a graph handed none follows the page', () => {
    // references: a graph with no handed source under a page set to each source
    const ref: Record<AnimSource, string[]> = { hand: [], cmu: [], mixamo: [] };
    for (const s of ANIM_SOURCES) {
      setAnimSource(s);
      ref[s] = runGraphs([null])[0]!;
    }
    // the sources really differ on this run (else the check below proves nothing)
    expect(differ(ref.hand, ref.cmu)).toBeGreaterThan(0);
    expect(differ(ref.mixamo, ref.cmu)).toBeGreaterThan(0);
    // a CMU page drawing a Hand-made partner and a Mixamo partner, and its own player (no handed source)
    setAnimSource('cmu');
    const [hand, mixamo, own] = runGraphs(['hand', 'mixamo', null]);
    expect(differ(hand!, ref.hand)).toBe(0);
    expect(differ(mixamo!, ref.mixamo)).toBe(0);
    expect(differ(own!, ref.cmu)).toBe(0);
    // a Mixamo page drawing a CMU partner (no field on the wire: CMU) and a Hand-made one
    setAnimSource('mixamo');
    const [cmu2, hand2, own2] = runGraphs(['cmu', 'hand', null]);
    expect(differ(cmu2!, ref.cmu)).toBe(0);
    expect(differ(hand2!, ref.hand)).toBe(0);
    expect(differ(own2!, ref.mixamo)).toBe(0);
  }, 240_000);

  it('the field: a graph reads the page source until handed one; followPageSource gives it back', () => {
    setAnimSource('hand');
    const g = new AnimGraph(proportions('average', 1.68));
    expect(g.animSource).toBe('hand');
    expect(g.sourceTables()).toBe(PAGE_TABLES);
    setAnimSource('cmu');
    expect(g.animSource).toBe(ANIM_SOURCE.source);
    g.animSource = 'mixamo';
    expect(g.animSource).toBe('mixamo');
    expect(g.sourceTables()).toBe(SOURCE_TABLES.mixamo);
    g.animSource = 'cmu';
    expect(g.sourceTables()).toBe(SOURCE_TABLES.cmu);
    g.followPageSource();
    expect(g.sourceTables()).toBe(PAGE_TABLES);
  });

  it('default identity: the default page, a graph handed CMU and one handed none draw the same', () => {
    setAnimSource('cmu');
    expect(LOCO.set).toBe(MOCAP_SET);
    expect(contents(SOURCE_TABLES.cmu)).toEqual(contents(PAGE_TABLES));
    const [cmu, own] = runGraphs([animSourceOf(undefined), null]);
    expect(differ(cmu!, own!)).toBe(0);
  }, 120_000);
});

describe('source wire: on the wire', () => {
  const base = { id: 'p1', x: 1, y: 0, z: 2, yaw: 0, pitch: 0, speed: 3, f: 16, w: 'rifle', hp: 100 };
  const parsed = (s: Record<string, unknown>): number | undefined | null => {
    const m = parseMessage({ t: 'pstate', s: { ...base, ...s } });
    return m && m.t === 'pstate' ? m.s.an : null;
  };

  it('every source round-trips through pstate; CMU sends no field; no field or a bad one reads CMU', () => {
    expect(ANIM_SOURCE_WIRE.length).toBeLessThanOrEqual(4); // 2 bits
    for (const s of ANIM_SOURCES) {
      const o: { an?: number } = {};
      animSourceWire(s, o);
      if (s === 'cmu') expect('an' in o).toBe(false);
      else expect(o.an).toBe(ANIM_SOURCE_WIRE.indexOf(s));
      expect(animSourceOf(parsed(o) ?? undefined)).toBe(s);
    }
    expect(parsed({})).toBeUndefined();
    expect(animSourceOf(undefined)).toBe('cmu');
    for (const bad of [3, -1, 1.5, '2', null, Number.NaN]) expect(parsed({ an: bad }), String(bad)).toBeUndefined();
    expect(animSourceOf(7)).toBe('cmu');
  });

  it('the sent source is what this page draws: ?anim=, ?mocap=, ?mixamo= and the tuner box reach the partner; the default sends no field', () => {
    const B = [null, true, false] as const;
    let mixed = 0;
    for (const setting of ANIM_SOURCES)
      for (const mocapUrl of B)
        for (const mocapTuner of B)
          for (const mixamoUrl of B) {
            const r = applyAnimSource({ setting, mocapUrl, mocapTuner, mixamoUrl });
            const sent = wireAnimSource(r);
            const label = `${setting} mocap ${String(mocapUrl)}/${String(mocapTuner)} mixamo ${String(mixamoUrl)}`;
            if (r.mixamo && !r.mocap) {
              // the one pair no source holds (a dev override): the captures win
              expect(sent, label).toBe('mixamo');
              mixed++;
              continue;
            }
            expect(contents(SOURCE_TABLES[sent]), label).toEqual(contents(PAGE_TABLES));
          }
    expect(mixed).toBeGreaterThan(0);
    // the default page (no override) sends no field, as before the overrides counted
    applyAnimSource({ setting: ANIM_SOURCE_DEFAULT });
    const o: { an?: number } = {};
    animSourceWire(wireAnimSource(ANIM_SOURCE), o);
    expect('an' in o).toBe(false);
    // ?mocap=0 on a CMU page: drawn hand-made here, so sent hand-made
    applyAnimSource({ setting: 'cmu', mocapUrl: false });
    animSourceWire(wireAnimSource(ANIM_SOURCE), o);
    expect(animSourceOf(o.an)).toBe('hand');
  });

  it('a snapshot carries each player\'s source to the clients', () => {
    const m = parseMessage({ t: 'snap', time: 1, players: [{ ...base, an: 2 }, { ...base, id: 'p2' }], enemies: [], obj: [], info: [], pk: 0 });
    expect(m?.t).toBe('snap');
    if (m?.t === 'snap') {
      expect(animSourceOf(m.players[0]!.an)).toBe('mixamo');
      expect(animSourceOf(m.players[1]!.an)).toBe('cmu');
    }
  });
});

describe('source wire: no allocation a frame', () => {
  it('a graph handed a source other than the page\'s leaves no more a frame than the page\'s own; a re-hand of the same costs nothing', async () => {
    setAnimSource('cmu');
    const g = new AnimGraph(proportions('average', 1.68));
    g.wrenReady = true;
    const i = defaultInput();
    i.keyedOk = true;
    i.ready = true;
    i.armed = false;
    i.crouch = 1;
    i.speed = 0.7;
    i.localZ = 1;
    const run = (n: number): void => {
      for (let k = 0; k < n; k++) {
        g.animSource = 'mixamo';
        g.update(DT, i);
      }
    };
    const handed = await bytesPerCall(run, 0);
    const ref = new AnimGraph(proportions('average', 1.68));
    ref.wrenReady = true;
    setAnimSource('mixamo');
    const runRef = (n: number): void => {
      for (let k = 0; k < n; k++) ref.update(DT, i);
    };
    const page = await bytesPerCall(runRef, 0);
    console.info(`(source wire) bytes a frame: handed mixamo ${handed} (page mixamo ${page})`);
    expect(handed).toBeLessThanOrEqual(page + HEAP_NUMBER);
  }, 240_000);
});
