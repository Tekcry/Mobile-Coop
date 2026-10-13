import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aimFor, faceNear, beamHeights, camSees, camView, cameraCells, coverage, deskFeeds, freeMonitor, joinSecurity, makeBeam, pirCovers, placeCamera, placePir, placeReader, readerLink, securityText, splitSecurity, stepDevice, turnDevice } from '../../src/editor/security';
import type { Camera, Device, Pir, Reader, SecData, SightRay } from '../../src/editor/security';
import { DEVICE_SIZES, LEVEL_COLOURS, READER_TYPES, SEC_TOOLS } from '../../src/editor/securityCatalogue';
import { cellCentre, levelCells } from '../../src/editor/lightPreview';
import { campusText } from '../../src/editor/model';
import type { Campus, Elem, Opening } from '../../src/editor/types';

const facts = JSON.parse(readFileSync('scripts/kestrel/facts.json', 'utf8')) as { security: Record<string, { value: number; src: string }> };
const SF = (n: string): number => facts.security[n]!.value;

/** Two rooms either side of a wall at x = 10 with a door D1 in it; a 4 m level, 2.7 m ceilings; a security desk object. */
const campus = (): SecData =>
  ({
    meta: { id: 't', buildings: [{ id: 'A', footprint: [0, 0, 20, 20] }, { id: 'B', footprint: [30, 0, 50, 20] }] },
    levels: [{ id: 'G', name: 'Ground', floor: 0, height: 4 }],
    rooms: [
      { id: 'R1', level: 'G', name: 'Hall', kind: 'room', rect: [0, 0, 10, 20], ceiling: 2.7 },
      { id: 'R2', level: 'G', name: 'Office', kind: 'room', rect: [10, 0, 20, 20], ceiling: 2.7 },
    ],
    walls: [{ id: 'W1', level: 'G', a: [10, 0], b: [10, 20], t: 0.2, h: 4, kind: 'interior' }],
    openings: [{ id: 'D1', wall: 'W1', at: 5, w: 1, h: 2.1, sill: 0, type: 'door' }],
    objects: [{ id: 'OB1', level: 'G', name: 'Desk', preset: 'security-desk', rect: [2, 15, 4.4, 15.9], h: 1.15, y: 0 }],
    lamps: [{ id: 'LP1', fixture: 'pir-bulkhead', room: 'R1', at: [5, 2.6, 5], circuit: 'C1', motion: true, params: { radius: 5, intensity: 1, color: [1, 1, 1] } }],
  }) as unknown as SecData;

/** A synthetic ray: walls as 2D segments (blocks from the floor to its height), as the game's static collision would. */
function wallRay(walls: { a: [number, number]; b: [number, number]; h: number }[]): SightRay {
  return {
    ray(from, to) {
      let best = Infinity;
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const len = Math.sqrt(dx * dx + dz * dz + (to.y - from.y) ** 2);
      for (const w of walls) {
        const ex = w.b[0] - w.a[0];
        const ez = w.b[1] - w.a[1];
        const den = dx * ez - dz * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((w.a[0] - from.x) * ez - (w.a[1] - from.z) * ex) / den;
        const u = ((w.a[0] - from.x) * dz - (w.a[1] - from.z) * dx) / den;
        if (t < 0 || t > 1 || u < 0 || u > 1) continue;
        const y = from.y + (to.y - from.y) * t;
        if (y <= w.h) best = Math.min(best, t * len);
      }
      return { hit: best < Infinity, distance: best };
    },
  };
}

describe('security catalogue', () => {
  it('every entry has a src; tools, reader types and level colours are complete', () => {
    expect(SEC_TOOLS.map((t) => t.id)).toEqual(['camera', 'pan', 'reader', 'keypad', 'pir', 'beam']);
    for (const r of READER_TYPES) expect(r.src.length).toBeGreaterThan(0);
    expect(LEVEL_COLOURS.map((c) => c.level)).toEqual([0, 1, 2, 3, 4, 5]);
    for (const c of LEVEL_COLOURS) expect(c.src.length).toBeGreaterThan(0);
    for (const s of Object.values(DEVICE_SIZES)) expect(s.src.length).toBeGreaterThan(0);
    for (const [k, v] of Object.entries(facts.security)) expect(v.src.length, k).toBeGreaterThan(0);
  });
});

describe('device records', () => {
  it('round-trip through the security file: zones and cards kept, devices replaced, a no-op save byte-identical', () => {
    const file = { devices: [{ id: 'CAM1', kind: 'camera', level: 'G', at: [2, 2], y: 3, facing: 90, mount: 'wall', room: 'R1', reason: 'watches R1' }, { id: 'desk', kind: 'desk', level: 'G', at: [3, 15], y: 0, room: 'R1', reason: 'operator post', feeds: ['CAM1'] }], zones: [{ id: 'secure', rooms: ['R2'], secure: true }], cards: [{ id: 'card-1', opens: [], heldBy: 'g1' }] };
    const text = securityText(file);
    const d = joinSecurity(campus() as unknown as Record<string, unknown>, JSON.parse(text) as Record<string, unknown>);
    expect((d.devices as Device[]).length).toBe(2);
    const split = splitSecurity(d, JSON.parse(text) as Record<string, unknown>);
    expect('devices' in split.data).toBe(false);
    expect(securityText(split.security!)).toBe(text);
    // the campus keys and their order are untouched by the join and split
    expect(campusText(split.data as unknown as Campus)).toBe(campusText(campus() as unknown as Campus));
  });

  it('no file and no devices: none written; the first device creates it with empty zones and cards', () => {
    expect(splitSecurity(campus() as unknown as Record<string, unknown>, null).security).toBeNull();
    const d = { ...campus(), devices: [{ id: 'CAM1', kind: 'camera', level: 'G', room: 'R1', reason: 'x' }] } as unknown as Record<string, unknown>;
    expect(splitSecurity(d, null).security).toEqual({ devices: [{ id: 'CAM1', kind: 'camera', level: 'G', room: 'R1', reason: 'x' }], zones: [], cards: [] });
  });
});

describe('placing', () => {
  it('a camera on a wall faces out of it at the default mount; under the ceiling it hangs at the ceiling, inside SN04', () => {
    const d = campus();
    const w = placeCamera(d, 'G', 9.6, 8, 0, false, 0.1);
    expect(w.dev?.mount).toBe('wall');
    expect(w.dev?.facing).toBe(270);
    // (the mount height: the bracket at most at the 2.7 m ceiling)
    expect(w.dev?.y).toBe(Math.min(SF('cameraMountDefault'), 2.7));
    expect(w.dev!.y).toBeGreaterThanOrEqual(SF('cameraMountMin'));
    expect(w.dev?.room).toBe('R1');
    expect(w.dev?.reason).toMatch(/watches R1/);
    const c = placeCamera(d, 'G', 4, 4, 45, true, 0.1);
    expect(c.dev?.mount).toBe('ceiling');
    expect(c.dev?.facing).toBe(45);
    expect(c.dev?.sweep).toEqual([0, 90]);
    // a 2.3 m ceiling is under the mount range
    const low = campus();
    (low.rooms[0] as unknown as { ceiling: number }).ceiling = 2.3;
    expect(placeCamera(low, 'G', 4, 4, 0, false, 0.1).why).toMatch(/under the camera mount range/);
  });

  it('a reader snaps beside a door and fills its reader, card level and lock (the model link); stepping its level follows', () => {
    const d = campus();
    const p = placeReader(d, 'G', 9.7, 5.2, 'reader', 0.1);
    const r = { ...p.dev!, id: 'RD1' } as Reader;
    expect(r.door).toBe('D1');
    expect(r.at[0]).toBeLessThan(10);
    expect(r.facing).toBe(270);
    expect(r.room).toBe('R1');
    expect(r.building).toBe('A');
    const ch = readerLink(d, [{ coll: 'devices', id: 'RD1', before: null, after: r as unknown as Elem }]);
    expect(ch).toHaveLength(1);
    const o = ch[0]!.after as Opening & { door: { reader: string; level: number } };
    expect(o.door.reader).toBe('card');
    expect(o.door.level).toBe(1);
    expect(o.locked).toBe(true);
    d.openings[0] = o;
    d.devices = [r];
    const r2 = stepDevice(d, r, 'level', 1, 0.1) as Reader;
    expect(r2.accessLevel).toBe(2);
    const ch2 = readerLink(d, [{ coll: 'devices', id: 'RD1', before: r as unknown as Elem, after: r2 as unknown as Elem }]);
    expect((ch2[0]!.after as unknown as { door: { level: number } }).door.level).toBe(2);
    // a keypad type sets the PIN flag and the door's reader
    const k = stepDevice(d, r2, 'type', 1, 0.1) as Reader;
    expect(k.reader).toBe('card-pin');
    expect(k.pin).toBe(true);
    // deleting the reader leaves the door with no reader (still locked); deleting the door drops it from the reader
    const del = readerLink(d, [{ coll: 'devices', id: 'RD1', before: r2 as unknown as Elem, after: null }]);
    expect((del[0]!.after as unknown as { door: { reader: string } }).door.reader).toBe('none');
    const gone = readerLink(d, [{ coll: 'openings', id: 'D1', before: o as Elem, after: null }]);
    expect((gone[0]!.after as unknown as Reader).door).toBeUndefined();
  });

  it('a dot on a wall itself (the dot magnet) takes the face towards the view', () => {
    const d = campus();
    expect(faceNear(d, 'G', 10, 15, [3, 15])).toMatchObject({ id: 'W1', n: -1, pos: 9.9 });
    expect(faceNear(d, 'G', 10.05, 15, [18, 15])).toMatchObject({ id: 'W1', n: 1, pos: 10.1 });
    expect(placeCamera(d, 'G', 10, 15, 0, false, 0.1, [3, 15]).dev).toMatchObject({ mount: 'wall', facing: 270, room: 'R1' });
    expect(faceNear(d, 'G', 5, 15, null)).toBeNull();
  });

  it('a reader away from a door goes alone on a wall face; with no face nothing', () => {
    const d = campus();
    const k = placeReader(d, 'G', 10.3, 15, 'keypad', 0.1).dev!;
    expect(k).toMatchObject({ reader: 'keypad', pin: true, facing: 90, room: 'R2' });
    expect(k.door).toBeUndefined();
    expect(placeReader(d, 'G', 4, 4, 'reader', 0.1).dev).toBeNull();
  });

  it('a PIR links to the nearest motion lamp in range, else the alarm; its link steps on the card', () => {
    const d = campus();
    const p = placePir(d, 'G', 5, 6, 0.1).dev!;
    expect(p.lamp).toBe('LP1');
    const far = placePir(d, 'G', 17, 17, 0.1).dev!;
    expect(far.alarm).toBe(true);
    const a = stepDevice(d, p, 'link', 1, 0.1) as Pir;
    expect(a.alarm).toBe(true);
    expect(a.lamp).toBeUndefined();
    const back = stepDevice(d, a, 'link', 1, 0.1) as Pir;
    expect(back.lamp).toBe('LP1');
    expect(back.alarm).toBeUndefined();
  });

  it('beams: lengths and heights from SN40-SN48; the height steps only through allowed values', () => {
    const d = campus();
    expect(beamHeights()).toEqual([0.3, 0.4, 1.3, 1.4, 1.5]);
    expect(makeBeam(d, 'G', [1, 1], [1, 1.2], 1.4).why).toMatch(/shorter/);
    expect(makeBeam(d, 'G', [0, 1], [13, 1], 1.4).why).toMatch(/longer/);
    expect(makeBeam(d, 'G', [1, 1], [8, 1], 0.9).why).toMatch(/not an allowed beam height/);
    const b = makeBeam(d, 'G', [1, 1], [8, 1], SF('beamHeightDefault')).dev!;
    expect(b.a[1]).toBe(1.4);
    const up = stepDevice(d, b, 'y', 1, 0.1)!;
    expect((up as typeof b).a[1]).toBe(1.5);
    expect(stepDevice(d, up, 'y', 1, 0.1)).toBeNull();
    const down = stepDevice(d, stepDevice(d, b, 'y', -1, 0.1)!, 'y', -1, 0.1) as typeof b;
    expect(down.a[1]).toBe(0.4);
  });
});

describe('what a camera sees', () => {
  it('cone occlusion on a synthetic level: a wall hides what is behind it; out of frame and range is not seen', () => {
    const d = campus();
    // a camera at the hall's west wall, 3 m up, facing east (+x) toward the dividing wall W1 (solid, no door)
    const cam = { id: 'CAM1', kind: 'camera', level: 'G', at: [0.2, 10], y: 2.6, facing: 90, mount: 'wall', room: 'R1', reason: '' } as Camera;
    const v = camView(d, cam);
    const ray = wallRay([{ a: [9.9, 0], b: [9.9, 20], h: 4 }, { a: [10.1, 0], b: [10.1, 20], h: 4 }]);
    expect(camSees(v, 7, 10, 0, ray)).toBe(true);
    expect(camSees(v, 13, 10, 0, ray)).toBe(false);
    // same point with no wall: seen
    expect(camSees(v, 13, 10, 0, wallRay([]))).toBe(true);
    // out of the 70 degree frame (behind the camera) and out of range (SN03 18 m)
    expect(camSees(v, 7, 19.5, 0, wallRay([]))).toBe(false);
    expect(camSees(v, 19.5, 10, 0, wallRay([]))).toBe(false);
    // under the mount: below the 45 degree vertical frame (SN04)
    expect(camSees(v, 1.2, 10, 0, wallRay([]))).toBe(false);
    const g = levelCells(d.rooms, [], 'G')!;
    const cells = cameraCells(g, v, 0, ray);
    let east = 0;
    let west = 0;
    for (let k = 0; k < cells.length; k++) {
      if (!cells[k]) continue;
      if (cellCentre(g, k)[0] > 10) east++;
      else west++;
    }
    expect(east).toBe(0);
    expect(west).toBeGreaterThan(50);
  });

  it('a pan camera sees across its whole sweep; turning it turns the sweep', () => {
    const d = campus();
    const cam = { id: 'CAM2', kind: 'camera', level: 'G', at: [5, 0.2], y: 2.6, facing: 0, sweep: [-60, 60], mount: 'wall', room: 'R1', reason: '' } as Camera;
    const v = camView(d, cam);
    expect(aimFor(v, 5, 10)).toBeCloseTo(0);
    expect(aimFor(v, 15, 0.3)).toBeCloseTo(Math.PI / 3);
    expect(camSees(v, 12, 6, 0, wallRay([]))).toBe(true);
    const fixed = camView(d, { ...cam, sweep: undefined });
    expect(camSees(fixed, 12, 6, 0, wallRay([]))).toBe(false);
    expect(turnDevice(cam, 30).sweep).toEqual([-30, 90]);
  });
});

describe('coverage', () => {
  it('counts watched floor and gaps: camera cells plus sensor fans; a wall sensor sees only the half in front', () => {
    const d = campus();
    const g = levelCells(d.rooms, [], 'G')!;
    const floor = g.walk.reduce((a, b) => a + b, 0);
    const none = coverage(g, [], []);
    expect(none.watched).toBe(0);
    expect(none.gaps).toBe(floor);
    const cam = camView(d, { id: 'CAM1', kind: 'camera', level: 'G', at: [0.2, 10], y: 2.6, facing: 90, mount: 'wall', room: 'R1', reason: '' } as Camera);
    const cc = cameraCells(g, cam, 0, wallRay([{ a: [9.9, 0], b: [9.9, 20], h: 4 }]));
    const pir = { at: [15, 10] as [number, number], facing: 0, mount: 'ceiling' as const };
    const cov = coverage(g, [cc], [pir]);
    const camN = cc.reduce((a, b) => a + b, 0);
    expect(cov.watched + cov.gaps).toBe(floor);
    expect(cov.watched).toBeGreaterThan(camN);
    expect(cov.cells.filter((c) => c === 1).length).toBe(camN);
    // a ceiling PIR covers its 6 m circle (SN50): every floor cell within 6 m that no camera sees
    let want = 0;
    for (let k = 0; k < cc.length; k++) if (g.walk[k] && !cc[k] && Math.hypot(cellCentre(g, k)[0] - 15, cellCentre(g, k)[1] - 10) <= 6) want++;
    expect(cov.cells.filter((c) => c === 4).length).toBe(want);
    expect(want).toBeGreaterThan(300);
    const wall = { at: [10.1, 10] as [number, number], facing: 90, mount: 'wall' as const };
    expect(pirCovers(wall, 13, 10)).toBe(true);
    expect(pirCovers(wall, 7, 10)).toBe(false);
  });
});

describe('security desk link', () => {
  it('a camera picks a desk on its card and takes the next free monitor; the desk lists its feeds', () => {
    const d = campus();
    const c1 = { id: 'CAM1', kind: 'camera', level: 'G', at: [1, 1], y: 2.6, facing: 0, mount: 'ceiling', room: 'R1', reason: '' } as Camera;
    const a = stepDevice(d, c1, 'desk', 1, 0.1) as Camera;
    expect(a.desk).toBe('OB1');
    expect(a.monitor).toBe(1);
    d.devices = [a];
    expect(freeMonitor(d, 'OB1')).toBe(2);
    const c2 = stepDevice(d, { ...c1, id: 'CAM2' }, 'desk', 1, 0.1) as Camera;
    expect(c2.monitor).toBe(2);
    d.devices = [a, c2];
    expect(deskFeeds(d, 'OB1').map((c) => c.id)).toEqual(['CAM1', 'CAM2']);
    const off = stepDevice(d, a, 'desk', 1, 0.1) as Camera;
    expect(off.desk).toBeUndefined();
  });
});
