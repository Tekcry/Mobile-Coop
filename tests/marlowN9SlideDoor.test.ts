// (marlow-final N9) Sliding doors (`leaf: 'slide'`): Open only (no crack / peek, bash, stealth drive or committed
// swing); the door still opens, closes and is pushed open by guards on the same DoorState. Hinged doors unchanged.
import { describe, expect, it } from 'vitest';
import { addDoorRows, doorMenuOptions, DoorMenuView, type DoorOpt } from '../src/game/doorMenu';
import { ContextMenu } from '../src/game/contextMenu';
import { DoorOpenCore, doorOpenMove } from '../src/world/doorOpen';
import { doorPeekEligible, hostCrackOk, isSlideDoor, type PeekDoor } from '../src/world/doorPeek';
import { DOOR, Doors, type DoorState } from '../src/world/doors';

type Leaf = 'swing' | 'slide' | undefined;

// a 1 m door along +z from the origin (yaw 0): its normal is +x; the body stands on +x facing -x
const FACE = -Math.PI / 2;
const anchor = (leaf: Leaf) => ({ kind: 'door', id: 0, hinge: { x: 0, y: 0, z: 0 }, width: 1, height: 2.1, yaw: 0, swing: 1 as const, locked: false, breachable: true, ...(leaf ? { leaf } : {}) });
const peekDoor = (leaf: Leaf): PeekDoor => ({ anchor: anchor(leaf), target: 0, cx: 0, cz: 0.5 });

// Doors without a scene (no leaf mesh): the state rules only (as tests/doors.test.ts)
function doors(leaf: Leaf): { ds: Doors; d: DoorState; sounds: string[] } {
  const ds = Object.create(Doors.prototype) as Doors;
  const body = { shape: { dispose: () => undefined }, dispose: () => undefined };
  const d: DoorState = {
    anchor: anchor(leaf) as unknown as DoorState['anchor'],
    open: 0, target: 0, rate: 0, cracked: false, ajar: 0, held: false, cx: 0, cz: 0.5,
    body: body as unknown as DoorState['body'], node: null, index: 0,
  };
  const sounds: string[] = [];
  Object.assign(ds, { list: [d], onSound: (_d: DoorState, how: string) => sounds.push(how), armed: true, mesh: null });
  return { ds, d, sounds };
}

describe('N9 sliding door: the door menu', () => {
  it('a sliding door lists Open only (even with the peek on offer); a hinged door its full CT set', () => {
    expect(doorMenuOptions(true, [], true)).toEqual(['open']);
    expect(doorMenuOptions(false, [], true)).toEqual(['open']);
    expect(doorMenuOptions(true)).toEqual(['open', 'stealth', 'bash', 'optic']);
    expect(doorMenuOptions(true, [], false)).toEqual(['open', 'stealth', 'bash', 'optic']);
  });

  it('the context menu gets one Open door row for a sliding door', () => {
    const m = new ContextMenu();
    const view = new DoorMenuView(m);
    const opts: DoorOpt[] = view.opts;
    m.begin();
    addDoorRows(m, 2, true, opts, true);
    m.end();
    expect(m.count).toBe(1);
    expect(m.opts[0]!.label).toBe('Open door');
    expect(view.opts).toEqual(['open']);
  });
});

describe('N9 sliding door: no peek, no crack', () => {
  it('isSlideDoor reads the anchor leaf (no key: hinged)', () => {
    expect(isSlideDoor(anchor('slide'))).toBe(true);
    expect(isSlideDoor(anchor('swing'))).toBe(false);
    expect(isSlideDoor(anchor(undefined))).toBe(false);
  });

  it('the door peek is never on offer at a sliding door (same spot: on offer at a hinged one)', () => {
    expect(doorPeekEligible(peekDoor(undefined), false, 0.6, 0.5, FACE, true, false)).toBe(true);
    expect(doorPeekEligible(peekDoor('slide'), false, 0.6, 0.5, FACE, true, false)).toBe(false);
  });

  it('the host refuses a client crack on a sliding door (the close request still passes)', () => {
    expect(hostCrackOk(peekDoor(undefined), 0.6, 0.5, true)).toBe(true);
    expect(hostCrackOk(peekDoor('slide'), 0.6, 0.5, true)).toBe(false);
    expect(hostCrackOk(peekDoor('slide'), 0.6, 0.5, false)).toBe(true);
  });

  it('Doors.crack and Doors.drive do nothing to a sliding door; a hinged door still cracks', () => {
    const s = doors('slide');
    expect(s.ds.crack(s.d, true)).toBe(false);
    expect(s.d.cracked).toBe(false);
    s.ds.drive(s.d, DOOR.driveMax);
    expect(s.d.open).toBe(0);
    expect(s.d.target).toBe(0);
    expect(s.d.held).toBe(false);
    expect(s.d.body).not.toBeNull();
    expect(s.sounds).toEqual([]);
    const h = doors(undefined);
    expect(h.ds.crack(h.d, true)).toBe(true);
    expect(h.d.cracked).toBe(true);
  });
});

describe('N9 sliding door: open, close and guards on the same DoorState', () => {
  it('opens (body gone), slides to open, closes and gets its body back', () => {
    const { ds, d, sounds } = doors('slide');
    expect(ds.open(d, 'quiet')).toBe(true);
    expect(d.target).toBe(1);
    expect(d.body).toBeNull();
    // (no mesh here, so `update` does not run: set the travel's end as the slide would)
    d.open = 1;
    expect(ds.close(d, () => false)).toBe(true);
    expect(d.target).toBe(0);
    expect(sounds).toEqual(['quiet', 'close']);
  });

  it('a guard walking into a shut sliding door pushes it open', () => {
    const { ds, d, sounds } = doors('slide');
    ds.pushOpen(0.3, 0.5);
    expect(d.target).toBe(1);
    expect(d.body).toBeNull();
    expect(sounds).toEqual(['enemy']);
  });

  it('a locked sliding door refuses open (course locks drive it unchanged)', () => {
    const { ds, d } = doors('slide');
    ds.setLocked(d, true);
    expect(ds.open(d, 'quiet')).toBe(false);
    ds.setLocked(d, false);
    expect(ds.open(d, 'quiet')).toBe(true);
  });
});

describe('N9 sliding door: no committed swing', () => {
  it('Open at a sliding door starts no step-and-push move (the caller opens it at once)', () => {
    expect(doorOpenMove(anchor('slide'))).toBe(false);
    expect(doorOpenMove(anchor(undefined))).toBe(true);
    const o = new DoorOpenCore();
    expect(o.start(0, anchor('slide'), 1, 0.5)).toBe(false);
    expect(o.active).toBe(false);
    expect(o.door).toBe(-1);
  });

  it('a hinged door keeps the committed move', () => {
    const o = new DoorOpenCore();
    expect(o.start(0, anchor(undefined), 1, 0.5)).toBe(true);
    expect(o.active).toBe(true);
    expect(o.phase).toBe('step');
  });
});
