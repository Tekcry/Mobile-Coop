/**
 * (guard-ai walk 4.82 item 6) Michael, Marlow Yard station 3: "s3 camera finding you pushes you back to the start, but
 * the guard comes to attack you. It's a training exercise, the guard should be non hostile and not respond to you being
 * detected on the camera". A camera with `guardResponse: false` (a training camera) brings no guard response: its alarm
 * makes no device incident (`CtHooks.alertAt` is not called: nobody sent, no radio, no investigation) and its body pass
 * reports nothing; its alarm stage, the course stat and the radio line run as before (the exercise's own rules). Every
 * other camera (the field absent) is unchanged.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import type { Ballistics } from '../src/weapons/ballistics';
import { cameraAlertsGuards, type CameraDevice } from '../src/security/data';
import { SecuritySystem, type CamBody, type CameraBodyEvent, type SecurityEvent, type SightRay } from '../src/security/securitySystem';
import type { CtDevices as CtDevicesT } from '../src/game/ctDevices';

const CAM: CameraDevice = { id: 'cam1', kind: 'camera', level: 'ground', at: [0, 0], y: 3, facing: 0, aim: 8, reason: 't' };
const TRAINING: CameraDevice = { ...CAM, id: 'cam-train', guardResponse: false };

describe('cameraAlertsGuards (pure)', () => {
  it('absent or true: the guards respond (every existing camera); false: a training camera, no guard response', () => {
    expect(cameraAlertsGuards(CAM)).toBe(true);
    expect(cameraAlertsGuards({ guardResponse: true })).toBe(true);
    expect(cameraAlertsGuards(TRAINING)).toBe(false);
  });
});

// ---- the body pass (SecuritySystem) ----

const OPEN: SightRay = {
  hitDistance: (a: Vector3, b: Vector3) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2),
};

function bodies(devices: CameraDevice[]): CameraBodyEvent[] {
  const sys = new SecuritySystem({ devices }, { ballistics: OPEN as unknown as Ballistics, players: () => [] });
  const list: CamBody[] = [{ id: 'b1', pos: { x: 0.5, y: 0.15, z: 8 }, lethal: true, carried: false, hidden: false, present: true } as CamBody];
  const events: CameraBodyEvent[] = [];
  sys.setBodySource(() => list);
  sys.onBody = (e) => events.push(e);
  for (let i = 0; i < 180; i++) sys.fixedUpdate(1 / 60);
  return events;
}

describe('a training camera reports no body', () => {
  it('a plain camera reports the body in its frame; the same camera as a training camera does not', () => {
    expect(bodies([CAM])).toHaveLength(1);
    expect(bodies([TRAINING])).toHaveLength(0);
  });
});

// ---- the camera alarm (CtDevices.onCamera) ----

describe("a training camera's alarm brings no guard (CtDevices)", () => {
  let CtDevices: typeof CtDevicesT;
  beforeAll(async () => {
    (globalThis as unknown as { window: unknown }).window ??= globalThis;
    const gd = globalThis as unknown as { document?: unknown };
    gd.document ??= { createElement: () => ({ className: '', textContent: '', style: { cssText: '', display: '' }, remove: () => undefined }) };
    ({ CtDevices } = await import('../src/game/ctDevices'));
  });
  afterAll(() => {
    delete (globalThis as unknown as { __ctdev?: unknown }).__ctdev;
  });

  const make = (def: CameraDevice) => {
    const banners: string[] = [];
    const g = {
      world: { layout: {}, level: { lights: { lights: [], setOn: () => undefined } }, parts: { instance: () => null }, lightField: { totalAt: () => 1 } },
      scene: {},
      security: null,
      ballistics: { hitDistance: (a: Vector3, b: Vector3) => Vector3.Distance(a, b) },
      app: { quality: { level: { minimal: false } } },
      vision: { night: 0, kind: 0 },
      hud: { banner: (t: string) => banners.push(t), el: { appendChild: () => undefined } },
      playerRefs: () => [],
      weapons: { slots: [] },
    };
    const said: string[] = [];
    const records: string[] = [];
    const alerts: number[][] = [];
    const dev = new CtDevices(g as never, 'host', {
      say: (t) => said.push(t),
      record: (s) => records.push(s),
      dirty: () => undefined,
      alertAt: (x, _y, z, key) => alerts.push([x, z, key]),
    });
    // the camera unit as `onCamera` reads it (its def)
    (dev.cams as unknown as { def: CameraDevice }[]).push({ def });
    const full = (): void => (dev as unknown as { onCamera(e: SecurityEvent): void }).onCamera({ kind: 'stage', camera: def.id, player: 'p1', stage: 2, x: 4, z: 6 } as SecurityEvent);
    return { dev, full, alerts, records, said, banners };
  };

  it('a plain camera at full awareness: the device incident at the spot (alertAt), then the alarm stage', () => {
    const m = make(CAM);
    m.full();
    expect(m.alerts).toEqual([[4, 6, 1000]]);
    expect(m.dev.alarm).toBe(1);
    expect(m.records).toEqual(['alarms']);
    m.dev.dispose();
  });

  it('a training camera: no alertAt (no guard sent, no radio, no investigation); the stage, stat and line still run', () => {
    const m = make(TRAINING);
    m.full();
    expect(m.alerts).toEqual([]);
    expect(m.dev.alarm).toBe(1);
    expect(m.records).toEqual(['alarms']);
    expect(m.said.some((s) => /Camera alert/.test(s))).toBe(true);
    m.dev.dispose();
  });
});
