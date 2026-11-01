import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fittingOf, FITTINGS, LIGHT_GROUPS, lightParams, kelvinColour, CIRCUIT_REASON } from '../../src/editor/lightCatalogue';
import { circuitLink, defaultCircuit, drawLamp, lampLength, lampLumens, placeLamp, placeSwitch, stepLamp, withParams } from '../../src/editor/lamps';
import type { Circuit, Lamp, LampData, PlaceCtx } from '../../src/editor/lamps';
import { joinPlay, playText, splitPlay } from '../../src/editor/playFile';
import { campusText, EditorModel } from '../../src/editor/model';
import { presetOf } from '../../src/editor/catalogue';
import { contribution, LightRegistry } from '../../src/world/lights';
import { campusLights } from '../../src/world/maps/kestrelLights';
import { campusToBuild } from '../../src/world/maps/kestrelCampus';
import type { Campus, Elem } from '../../src/editor/types';

const facts = JSON.parse(readFileSync('scripts/kestrel/facts.json', 'utf8')) as Record<string, Record<string, { value: number }>>;
const LF = (n: string): number => facts.light![n]!.value;

const campus = (): Campus =>
  ({
    meta: { id: 't', buildings: [{ id: 'A', footprint: [0, 0, 20, 10] }] },
    levels: [{ id: 'G', name: 'Ground', floor: 0, height: 4 }],
    rooms: [
      { id: 'R1', level: 'G', name: 'Office', kind: 'room', rect: [0, 0, 10, 10], ceiling: 2.7, building: 'A' },
      { id: 'R2', level: 'G', name: 'Store', kind: 'room', rect: [10, 0, 20, 10], ceiling: 0, building: 'A' },
    ],
    walls: [{ id: 'W1', level: 'G', a: [10, 0], b: [10, 10], t: 0.2, h: 4, kind: 'interior' }],
    openings: [{ id: 'D1', wall: 'W1', at: 5, w: 1, h: 2.1, sill: 0, type: 'door' }],
    stairs: [],
    ladders: [],
    voids: [],
    objects: [{ id: 'O1', level: 'G', name: 'Desk', preset: 'desk', rect: [2, 2, 3.6, 2.8], h: 0.73, y: 0, noLedge: false }],
  }) as unknown as Campus;
const ctx = (d: LampData): PlaceCtx => ({ data: d, level: 'G', grid: 0.1, yaw: 0 });
const one = (r: ReturnType<typeof placeLamp>): Lamp => ({ ...r.lamps[0]!, id: 'LP1', circuit: '' });

describe('fitting catalogue', () => {
  it('every entry has a src, a group, positive sizes and lumens, and a known object to sit on', () => {
    const ids = new Set<string>();
    for (const f of FITTINGS) {
      expect(f.src.length, f.id).toBeGreaterThan(0);
      expect(LIGHT_GROUPS.some((g) => g.id === f.group), f.id).toBe(true);
      expect(f.body.every((v) => v > 0) && f.lumens > 0 && f.kelvin > 0 && f.beam > 0, f.id).toBe(true);
      expect(ids.has(f.id), f.id).toBe(false);
      ids.add(f.id);
      for (const o of f.onObjects ?? []) expect(presetOf(o), `${f.id} on ${o}`).toBeTruthy();
      if (f.circuit !== 'switched') expect(CIRCUIT_REASON[f.circuit].length).toBeGreaterThan(0);
    }
    for (const g of LIGHT_GROUPS) expect(FITTINGS.some((f) => f.group === g.id), g.id).toBe(true);
    expect(FITTINGS.length).toBe(27);
  });

  it('a 900 lm downlight is the calibration lamp (drop 2.45, radius 4, intensity 0.7)', () => {
    // the calibration point was the old Warehouse gatehouse door lamp (the map went in clean-up H); its numbers stay
    const p = lightParams({ lumens: LF('calLumens'), kelvin: 4000, beam: LF('calBeam') });
    expect(p.radius).toBe(LF('calRadius'));
    expect(p.intensity).toBe(LF('calIntensity'));
    // the floor under each at the same drop: the game's own formula gives the same light
    const reg = new LightRegistry();
    const wh = reg.add({ kind: 'lamp', x: 0, y: 2.45, z: 0, radius: 4, intensity: 0.7 });
    const dl = reg.add({ x: 0, y: 2.45, z: 0, radius: p.radius, intensity: p.intensity, kind: p.kind, cone: p.cone ?? null });
    expect(contribution(dl, 0, 0, 0)).toBeCloseTo(contribution(wh, 0, 0, 0), 6);
  });

  it('the conversion is monotonic in lumens, wider beams reach less, colour from the temperature', () => {
    let last = { radius: 0, intensity: 0 };
    for (const lm of [20, 50, 100, 300, 900, 2000, 3600, 8000, 12000, 20000]) {
      const p = lightParams({ lumens: lm, kelvin: 4000, beam: 110 });
      expect(p.radius).toBeGreaterThanOrEqual(last.radius);
      expect(p.intensity).toBeGreaterThanOrEqual(last.intensity);
      last = p;
    }
    expect(lightParams({ lumens: 3000, kelvin: 4000, beam: 40 }).radius).toBeGreaterThan(lightParams({ lumens: 3000, kelvin: 4000, beam: 120 }).radius);
    expect(lightParams({ lumens: 3000, kelvin: 4000, beam: 40 }).cone).toBeTruthy();
    expect(lightParams({ lumens: 3000, kelvin: 4000, beam: 120 }).cone).toBeUndefined();
    const warm = kelvinColour(3000);
    const cool = kelvinColour(6500);
    expect(warm[0]).toBe(1);
    expect(warm[2]).toBeLessThan(cool[2]);
  });
});

describe('placing lamps', () => {
  it('a ceiling fitting sits under the room ceiling (or the slab above when the room has none), clear of the grown slab in the bake', () => {
    const d = campus();
    const t = placeLamp(fittingOf('troffer-600')!, 5, 5, ctx(d));
    expect(t.why).toBeNull();
    expect(t.lamps[0]!.at[1]).toBeCloseTo(2.7 - LF('surfaceGap'), 6);
    expect(t.lamps[0]!.room).toBe('R1');
    expect(t.lamps[0]!.owner).toBe('Building A');
    expect(placeLamp(fittingOf('troffer-600')!, 15, 5, ctx(d)).lamps[0]!.at[1]).toBeCloseTo(4 - facts.room!.slab!.value - LF('surfaceGap'), 6);
    expect(placeLamp(fittingOf('pendant')!, 5, 5, ctx(d)).lamps[0]!.at[1]).toBeCloseTo(2.7 - 0.8 - 0.25, 6);
    expect(placeLamp(fittingOf('troffer-600')!, 30, 5, ctx(d)).why).toMatch(/room or yard/);
  });

  it('a wall fitting backs onto the face; a flood aims out of its wall', () => {
    const d = campus();
    const r = placeLamp(fittingOf('floodlight')!, 10.3, 3, ctx(d));
    expect(r.on).toBe('W1');
    const l = one(r);
    expect(l.at[0]).toBeCloseTo(10.1 + LF('surfaceGap'), 6);
    expect(l.room).toBe('R2');
    expect(l.aim).toEqual([90, 30]);
    expect(l.params.cone!.dx).toBeGreaterThan(0.5);
    expect(placeLamp(fittingOf('floodlight')!, 5, 5, ctx(d)).why).toMatch(/wall face/);
  });

  it('an exit sign snaps over an opening, on the side of the dot', () => {
    const d = campus();
    const r = placeLamp(fittingOf('exit-sign')!, 9.6, 5.3, ctx(d));
    expect(r.on).toBe('D1');
    const l = one(r);
    expect(l.at[2]).toBeCloseTo(5, 6);
    expect(l.at[0]).toBeLessThan(10);
    expect(l.at[1]).toBeCloseTo(2.1 + LF('signAbove'), 6);
    expect(l.room).toBe('R1');
    expect(l.emergency).toBe('maintained');
    expect(placeLamp(fittingOf('exit-sign')!, 5, 5, ctx(d)).why).toMatch(/door/);
  });

  it('a desk lamp sits on a desk top', () => {
    const d = campus();
    const l = one(placeLamp(fittingOf('desk-lamp')!, 2.5, 2.5, ctx(d)));
    expect(l.at[1]).toBeCloseTo(0.73 + 0.4, 6);
    expect(l.on).toBe('O1');
    expect(placeLamp(fittingOf('desk-lamp')!, 6, 6, ctx(d)).why).toMatch(/Move onto a desk/);
  });

  it('a linear fitting is drawn A to B: its length and lumens per metre', () => {
    const d = campus();
    const r = drawLamp(fittingOf('led-strip')!, [1, 1], [4, 1], ctx(d));
    const l = { ...r.lamp!, id: 'LP1', circuit: '' } as Lamp;
    expect(lampLength(l)).toBeCloseTo(3, 6);
    expect(lampLumens(l)).toBeCloseTo(3000, 6);
    expect(l.params.fixture!.sx).toBeCloseTo(3, 6);
    const longer = withParams({ ...l, b: [7, l.at[1], 1] });
    expect(longer.params.radius).toBeGreaterThan(l.params.radius);
  });

  it('a switch goes on a wall face at the switch height', () => {
    const d = campus();
    const s = placeSwitch(9.7, 2, ctx(d));
    expect(s.sw?.wall).toBe('W1');
    expect(s.room?.id).toBe('R1');
    expect(s.sw?.at[1]).toBe(1.2);
    expect(placeSwitch(5, 5, ctx(d)).why).toMatch(/wall face/);
  });
});

describe('circuits', () => {
  const lamp = (id: string, room: string, circuit: string, fixture = 'downlight', x = 5): Lamp => withParams({ id, fixture, owner: 'Building A', room, at: [x, 2.6, 5], circuit, params: { radius: 0, intensity: 0, color: [1, 1, 1] }, breakable: true });

  it('the default circuit: the switch in the room, else a new one; emergency and desk lamps their own with the reason', () => {
    const d = campus() as LampData;
    d.circuits = [{ id: 'C1', switch: { at: [9.885, 1.2, 2], wall: 'W1' }, lamps: [], unswitchable: '' }];
    expect(defaultCircuit(d, lamp('LP1', 'R1', '')).circuit).toBe('C1');
    const other = defaultCircuit(d, lamp('LP2', 'R2', '', 'downlight', 15));
    expect(other.circuit).toBe('C2');
    expect(other.add).toEqual({ id: 'C2', switch: null, lamps: ['LP2'], unswitchable: '' });
    const em = defaultCircuit(d, lamp('LP3', 'R1', '', 'spitfire'));
    expect(em.add?.unswitchable).toMatch(/^Emergency/);
    d.lamps = [lamp('LP3', 'R1', 'C2', 'spitfire')];
    d.circuits.push({ id: 'C2', switch: null, lamps: ['LP3'], unswitchable: em.add!.unswitchable });
    expect(defaultCircuit(d, lamp('LP4', 'R1', '', 'emergency-bulkhead')).circuit).toBe('C2');
    expect(defaultCircuit(d, lamp('LP5', 'R1', '', 'desk-lamp')).add?.unswitchable).toBe('Switched at the lamp');
  });

  it('add, move and remove keep each lamp on one circuit (the link), and undo puts it back', () => {
    const d = campus();
    const m = new EditorModel(d);
    m.link = circuitLink;
    const C1: Circuit = { id: 'C1', switch: { at: [9.885, 1.2, 2], wall: 'W1' }, lamps: [], unswitchable: '' };
    m.commit('switch', [{ coll: 'circuits', id: 'C1', before: null, after: C1 as unknown as Elem }]);
    m.commit('l1', [{ coll: 'lamps', id: 'LP1', before: null, after: lamp('LP1', 'R1', 'C1') as unknown as Elem }]);
    m.commit('l2', [{ coll: 'lamps', id: 'LP2', before: null, after: lamp('LP2', 'R1', 'C1', 'downlight', 6) as unknown as Elem }]);
    expect(m.get<Circuit>('circuits', 'C1')!.lamps).toEqual(['LP1', 'LP2']);
    // the card's "new circuit": LP2 to C2, which the link makes
    const l2 = m.snapshot<Lamp>('lamps', 'LP2')!;
    const moved = stepLamp(m.data as LampData, l2, 'circuit', 1, 0.1)!;
    expect(moved.circuit).toBe('C2');
    m.commit('move', [{ coll: 'lamps', id: 'LP2', before: l2 as unknown as Elem, after: moved as unknown as Elem }]);
    expect(m.get<Circuit>('circuits', 'C1')!.lamps).toEqual(['LP1']);
    expect(m.get<Circuit>('circuits', 'C2')!.lamps).toEqual(['LP2']);
    const all = (m.data.circuits ?? []).flatMap((c) => c.lamps);
    expect(new Set(all).size).toBe(all.length);
    // back to C1: C2 (no switch, no lamps) goes
    const back = { ...m.snapshot<Lamp>('lamps', 'LP2')!, circuit: 'C1' };
    m.commit('back', [{ coll: 'lamps', id: 'LP2', before: m.snapshot('lamps', 'LP2'), after: back as unknown as Elem }]);
    expect(m.get('circuits', 'C2')).toBeUndefined();
    expect(m.get<Circuit>('circuits', 'C1')!.lamps).toEqual(['LP1', 'LP2']);
    // deleting a lamp takes it off; a switched circuit stays when empty
    m.commit('del', [{ coll: 'lamps', id: 'LP1', before: m.snapshot('lamps', 'LP1'), after: null }, { coll: 'lamps', id: 'LP2', before: m.snapshot('lamps', 'LP2'), after: null }]);
    expect(m.get<Circuit>('circuits', 'C1')!.lamps).toEqual([]);
    m.undo();
    expect(m.get<Circuit>('circuits', 'C1')!.lamps).toEqual(['LP1', 'LP2']);
    // deleting the circuit leaves its lamps on none
    m.commit('delC', [{ coll: 'circuits', id: 'C1', before: m.snapshot('circuits', 'C1'), after: null }]);
    expect(m.get<Lamp>('lamps', 'LP1')!.circuit).toBe('');
  });
});

describe('play file', () => {
  it('both files are byte-identical through a load and a no-op save', () => {
    const text = readFileSync('docs/kestrel/kestrel.campus.blocks.json', 'utf8');
    const play = { spaces: [{ id: 'S1' }], lamps: [{ id: 'LP1', fixture: 'downlight', owner: 'Site', room: 'G-FRONT', at: [5, 2.6, 35], circuit: 'C1', params: { radius: 4, intensity: 0.7, color: [1, 1, 1] } }], circuits: [{ id: 'C1', switch: null, lamps: ['LP1'], unswitchable: '' }], guards: [] };
    const pText = playText(play);
    const data = joinPlay(JSON.parse(text) as Campus, JSON.parse(pText) as Record<string, unknown>);
    expect(data.lamps?.length).toBe(1);
    const out = splitPlay(data, JSON.parse(pText) as Record<string, unknown>);
    expect(campusText(out.campus)).toBe(text);
    expect(playText(out.play!)).toBe(pText);
  });

  it('no play file and no lamps: no play file; the first lamp makes one with only the editor collections', () => {
    const text = readFileSync('docs/kestrel/kestrel.campus.blocks.json', 'utf8');
    const data = joinPlay(JSON.parse(text) as Campus, null);
    expect(splitPlay(data, null).play).toBeNull();
    data.lamps = [];
    expect(splitPlay(data, null).play).toBeNull();
    data.lamps = [{ id: 'LP1' } as Lamp];
    data.circuits = [];
    const out = splitPlay(data, null);
    expect(Object.keys(out.play!)).toEqual(['lamps', 'circuits']);
    expect(campusText(out.campus)).toBe(text);
  });
});

describe('walk test lights', () => {
  it('lamps build into LightInits: circuit groups, breakable, PIR and non-maintained off, twin heads', () => {
    const d = campus() as LampData;
    const mk = (id: string, fixture: string, circuit: string): Lamp => ({ ...one(placeLamp(fittingOf(fixture)!, 9.8, 3, ctx(d))), id, circuit });
    d.lamps = [{ ...one(placeLamp(fittingOf('downlight')!, 5, 5, ctx(d))), id: 'LP1', circuit: 'C1' }, mk('LP2', 'spitfire', 'C2'), mk('LP3', 'pir-flood', 'C3'), mk('LP4', 'emergency-bulkhead', 'C2')];
    d.circuits = [
      { id: 'C1', switch: null, lamps: ['LP1'], unswitchable: '' },
      { id: 'C2', switch: null, lamps: ['LP2', 'LP4'], unswitchable: 'x' },
      { id: 'C3', switch: null, lamps: ['LP3'], unswitchable: 'y' },
    ];
    const ls = campusLights(d);
    expect(ls.length).toBe(5);
    expect(ls[0]!.group).toBe(1);
    expect(ls[0]!.on).toBe(true);
    expect(ls[0]!.y).toBeCloseTo(2.7 - LF('surfaceGap'), 6);
    expect(ls[0]!.destructible).toBe(true);
    expect(ls[1]!.on).toBe(false);
    expect(ls[2]!.cone!.dz).toBeCloseTo(-ls[1]!.cone!.dz, 6);
    expect(ls[3]!.on).toBe(false);
    expect(ls[4]!.on).toBe(true);
    // the campus converter hands them to the map with the rest
    expect(campusToBuild({ ...(d as unknown as Parameters<typeof campusToBuild>[0]), voids: [], stairs: [], meta: { id: 't', entry: [1, 1], site: [0, 0, 20, 10] } }).lights.length).toBe(5);
  });
});
