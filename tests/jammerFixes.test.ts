import { describe, expect, it } from 'vitest';
import {
  DEV_IDLE,
  JAMMER,
  JAM_LIGHT,
  advanceDevJam,
  applyJamLight,
  jamOrigin,
  newDevJam,
  stepDevJam,
  type DevJam,
  type DevPhase,
} from '../src/game/jammer';
import { LightRegistry, groupBaseOn } from '../src/world/lights';
import { LevelBuilder } from '../src/world/levelBuilder';
import { courselab } from '../src/world/maps/courselab';
import { CourseState } from '../src/game/course/courseState';
import { parseMessage } from '../src/net/protocol';

const DT = 1 / 60;
const GROUP = 3;

/** One jammed lamp's driver as `CtDevices.applyJam` runs it: the timeline and the phase it had last call. */
interface Drv {
  d: DevJam;
  last: DevPhase;
}

function drv(): Drv {
  return { d: newDevJam(), last: DEV_IDLE };
}

/** Host step: the timeline moves (`jammed` someone holds it), then the registry follows. */
function hostStep(reg: LightRegistry, id: number, v: Drv, jammed: boolean): void {
  stepDevJam(v.d, jammed, 'light', DT);
  const was = v.last;
  v.last = v.d.ph;
  applyJamLight(reg, id, v.d, was);
}

/** Client step: the host's message sets the mirrored timeline (every other step; it runs on between), then the
 *  registry follows. */
function clientStep(reg: LightRegistry, id: number, v: Drv, host: DevJam, msg: boolean): void {
  if (msg) {
    v.d.ph = host.ph;
    v.d.t = host.t;
  } else advanceDevJam(v.d, 'light', DT);
  const was = v.last;
  v.last = v.d.ph;
  applyJamLight(reg, id, v.d, was);
}

function room(): { reg: LightRegistry; id: number; other: number } {
  const reg = new LightRegistry();
  const id = reg.add({ x: 0, y: 2.8, z: 0, group: GROUP }).id;
  const other = reg.add({ x: 4, y: 2.8, z: 0, group: GROUP }).id;
  return { reg, id, other };
}

describe('jammer-fixes 1: a jammed lamp comes back in the state its switches / EMP give it now', () => {
  it('switched off during the jam: dark through the release, the 4 s and the flicker; on again only with the switch', () => {
    const { reg, id, other } = room();
    const v = drv();
    for (let i = 0; i < 60; i++) hostStep(reg, id, v, true);
    // the wall switch turns the group off mid-jam
    reg.setGroup(GROUP, false);
    expect(reg.get(other)!.on).toBe(false);
    for (let i = 0; i < 60; i++) hostStep(reg, id, v, true);
    let seenOn = false;
    for (let i = 0; i < Math.ceil((JAM_LIGHT.offHold + JAM_LIGHT.flickerOn + 1) / DT); i++) {
      hostStep(reg, id, v, false);
      if (reg.get(id)!.on) seenOn = true;
    }
    expect(v.d.ph).toBe(DEV_IDLE);
    expect(seenOn).toBe(false);
    expect(reg.get(id)!.on).toBe(false);
    expect(groupBaseOn(reg, GROUP)).toBe(false);
    reg.setGroup(GROUP, true);
    expect(reg.get(id)!.on).toBe(true);
  });

  it('switched back on during the jam: the jam keeps it dark, then it flickers back on as before', () => {
    const { reg, id } = room();
    const v = drv();
    for (let i = 0; i < 60; i++) hostStep(reg, id, v, true);
    reg.setGroup(GROUP, false);
    reg.setGroup(GROUP, true);
    // still jammed: dark (no relight from the switch while the jam holds it)
    hostStep(reg, id, v, true);
    expect(reg.get(id)!.on).toBe(false);
    for (let i = 0; i < Math.ceil((JAM_LIGHT.offHold + JAM_LIGHT.flickerOn + 0.5) / DT); i++) hostStep(reg, id, v, false);
    expect(reg.get(id)!.on).toBe(true);
  });

  it('EMPed during the jam: stays dark after the jam until the EMP ends; an EMP that ends mid-jam leaves the jam dark', () => {
    const { reg, id } = room();
    const v = drv();
    for (let i = 0; i < 60; i++) hostStep(reg, id, v, true);
    // a long EMP (20 s) lands while the lamp is jammed
    expect(reg.disrupt(0, 2.8, 0, 3, 20)).toBe(1);
    for (let i = 0; i < 30; i++) hostStep(reg, id, v, true);
    for (let i = 0; i < Math.ceil((JAM_LIGHT.offHold + JAM_LIGHT.flickerOn + 1) / DT); i++) {
      reg.update(DT);
      hostStep(reg, id, v, false);
      expect(reg.get(id)!.on).toBe(false);
    }
    reg.update(30);
    expect(reg.get(id)!.on).toBe(true);
    // a short EMP that ends while the lamp is still jammed
    const w = drv();
    for (let i = 0; i < 60; i++) hostStep(reg, id, w, true);
    reg.disrupt(0, 2.8, 0, 3, 0.5);
    for (let i = 0; i < 60; i++) {
      reg.update(DT);
      hostStep(reg, id, w, true);
      expect(reg.get(id)!.on).toBe(false);
    }
    for (let i = 0; i < Math.ceil((JAM_LIGHT.offHold + JAM_LIGHT.flickerOn + 0.5) / DT); i++) hostStep(reg, id, w, false);
    expect(reg.get(id)!.on).toBe(true);
  });

  it('host and client agree at every step (the client takes the group from the host each message)', () => {
    const h = room();
    const c = room();
    const hv = drv();
    const cv = drv();
    const steps = Math.ceil((1 + 2 + JAM_LIGHT.offHold + JAM_LIGHT.flickerOn + 1) / DT);
    for (let i = 0; i < steps; i++) {
      const jammed = i < Math.round(2 / DT);
      if (i === Math.round(1 / DT)) h.reg.setGroup(GROUP, false);
      hostStep(h.reg, h.id, hv, jammed);
      // the course message: the host's group state (its base, never the jam) and the device timeline
      if (i % 2 === 0) c.reg.setGroup(GROUP, groupBaseOn(h.reg, GROUP));
      clientStep(c.reg, c.id, cv, hv.d, i % 2 === 0);
      if (i % 2 !== 0) continue;
      expect(c.reg.get(c.id)!.on).toBe(h.reg.get(h.id)!.on);
      expect(c.reg.get(c.other)!.on).toBe(h.reg.get(h.other)!.on);
    }
    expect(h.reg.get(h.id)!.on).toBe(false);
  });

  it('a shot-out lamp stays out after its jam; a course restart brings it back with the jam flicker', () => {
    const { reg, id } = room();
    const v = drv();
    for (let i = 0; i < 60; i++) hostStep(reg, id, v, true);
    reg.destroy(id);
    for (let i = 0; i < Math.ceil((JAM_LIGHT.offHold + JAM_LIGHT.flickerOn + 1) / DT); i++) hostStep(reg, id, v, false);
    expect(reg.get(id)!.on).toBe(false);
    reg.restore(id);
    expect(reg.get(id)!.on).toBe(true);
  });
});

describe('jammer-fixes 2: jamming courselab\'s mains lamp never opens g-mains; the switch still does', () => {
  const b = new LevelBuilder();
  const lay = courselab.build(b, 0);
  const reg = b.lights;
  const gid = lay.course!.groups!.mains!;
  const gate = lay.course!.def.bays.flatMap((x) => x.gates).find((x) => x.id === 'g-mains');
  const lamp = reg.lights.find((l) => l.group === gid)!;

  it('the mains lamp is an electric lamp in the mains group, behind gate g-mains', () => {
    expect(gate?.kind).toBe('mains');
    expect(lamp.electric && lamp.kind === 'lamp').toBe(true);
  });

  it('through the jam, the hold, the 4 s off and the flicker the door stays locked; the switch unlocks it', () => {
    const s = new CourseState(lay.course!.def);
    const door = (gate as { doorId: string }).doorId;
    expect(s.locked(door)).toBe(true);
    const v = drv();
    let flips = 0;
    let lastOn = lamp.on;
    const steps = Math.ceil((3 + JAM_LIGHT.offHold + JAM_LIGHT.flickerOn + 1) / DT);
    for (let i = 0; i < steps; i++) {
      hostStep(reg, lamp.id, v, i < Math.round(3 / DT));
      // courseMode: the gates read the group's state whenever the registry changes
      s.setGroup('mains', groupBaseOn(reg, gid));
      if (lamp.on !== lastOn) flips++;
      lastOn = lamp.on;
      expect(s.locked(door)).toBe(true);
    }
    // the jam did flicker the lamp (off and back on)
    expect(flips).toBeGreaterThanOrEqual(4);
    expect(lamp.on).toBe(true);
    reg.setGroup(gid, false);
    s.setGroup('mains', groupBaseOn(reg, gid));
    expect(s.locked(door)).toBe(false);
    // switched off mid-jam: the gate opens with the switch and stays open after the jam
    reg.setGroup(gid, true);
    s.setGroup('mains', groupBaseOn(reg, gid));
    expect(s.locked(door)).toBe(true);
    const w = drv();
    for (let i = 0; i < steps; i++) {
      hostStep(reg, lamp.id, w, i < Math.round(3 / DT));
      if (i === Math.round(1 / DT)) reg.setGroup(gid, false);
      s.setGroup('mains', groupBaseOn(reg, gid));
      expect(s.locked(door)).toBe(i < Math.round(1 / DT));
    }
    expect(lamp.on).toBe(false);
  });
});

describe('jammer-fixes 3: the jam claim carries the client\'s camera eye (protocol 27)', () => {
  it('the eye round-trips, is clamped to the world, and a malformed one is dropped; a release carries none', () => {
    const msg = { t: 'jam', tgt: 'cam-s3', e: [12.25, 1.52, -40.5] };
    expect(parseMessage(JSON.parse(JSON.stringify(msg)))).toEqual(msg);
    expect(parseMessage({ t: 'jam', tgt: 'cam-s3', e: [1e9, -1e9, -1e9] })).toEqual({ t: 'jam', tgt: 'cam-s3', e: [400, -50, -400] });
    expect(parseMessage({ t: 'jam', tgt: 'cam-s3', e: [1, 'x', 2] })).toEqual({ t: 'jam', tgt: 'cam-s3' });
    expect(parseMessage({ t: 'jam', tgt: 'cam-s3', e: [1, 2] })).toEqual({ t: 'jam', tgt: 'cam-s3' });
    expect(parseMessage({ t: 'jam', tgt: 'cam-s3', e: [1, Number.NaN, 2] })).toEqual({ t: 'jam', tgt: 'cam-s3' });
    expect(parseMessage({ t: 'jam', tgt: 'cam-s3', e: 'junk' })).toEqual({ t: 'jam', tgt: 'cam-s3' });
    expect(parseMessage({ t: 'jam', tgt: '', e: [1, 2, 3] })).toEqual({ t: 'jam', tgt: '' });
    expect(parseMessage({ t: 'jam', tgt: '<x>', e: [1, 2, 3] })).toBeNull();
  });

  it('the host takes an honest eye with a clear line; refuses one beyond the tolerance or without a line (the head then)', () => {
    const out = { x: 0, y: 0, z: 0 };
    const clear = (): boolean => true;
    const wall = (): boolean => false;
    // the settled pistol aim: the eye about 0.5 m behind and beside the head
    expect(jamOrigin(5, 1.6, 5, [5.3, 1.52, 4.6], clear, out)).toBe(true);
    expect(out).toEqual({ x: 5.3, y: 1.52, z: 4.6 });
    // beyond the tolerance (a claimed eye 1.6 m off): the head
    expect(jamOrigin(5, 1.6, 5, [5 + JAMMER.eyeTol + 0.1, 1.6, 5], clear, out)).toBe(false);
    expect(out).toEqual({ x: 5, y: 1.6, z: 5 });
    // within the tolerance but through a wall: the head
    expect(jamOrigin(5, 1.6, 5, [5, 1.6, 6], wall, out)).toBe(false);
    expect(out).toEqual({ x: 5, y: 1.6, z: 5 });
    // no eye (an old-style claim): the head
    expect(jamOrigin(5, 1.6, 5, undefined, clear, out)).toBe(false);
    expect(out).toEqual({ x: 5, y: 1.6, z: 5 });
    // the line is checked from the head to the eye
    let seen: number[] = [];
    jamOrigin(1, 2, 3, [1.5, 2, 3], (ax, ay, az, bx, by, bz) => {
      seen = [ax, ay, az, bx, by, bz];
      return true;
    }, out);
    expect(seen).toEqual([1, 2, 3, 1.5, 2, 3]);
  });
});
