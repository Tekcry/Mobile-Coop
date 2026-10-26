/** (sector-marks, G290) No exit beacon in Sector Ops: the `extract` item is a zone with nothing drawn. */
import { describe, expect, it } from 'vitest';
import { drawsExitBeacon } from '../src/game/interactables';

describe('sector-marks: the exit beacon', () => {
  it('drawsExitBeacon: off in Sector Ops only', () => {
    expect(drawsExitBeacon('sector')).toBe(false);
    for (const m of ['sandbox', 'mission', 'clear', 'infiltration', 'course'] as const) expect(drawsExitBeacon(m), m).toBe(true);
  });

  it('an extract item draws nothing with the switch off; the default and other kinds are unchanged', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { Interactables } = await import('../src/game/interactables');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const on = new Interactables(scene, lib);
    const a = on.add('a-exit', 'extract', new Vector3(0, 0, 0), 'out', 0);
    expect(a.parts.length).toBe(2);
    expect(a.light).not.toBeNull();
    const off = new Interactables(scene, lib, false);
    const b = off.add('b-exit', 'extract', new Vector3(0, 0, 0), 'out', 0);
    expect(b.parts.length).toBe(0);
    expect(b.light).toBeNull();
    off.setEnabled(b, true);
    expect(b.enabled).toBe(true);
    const t = off.add('t', 'terminal', new Vector3(0, 0, 0), 'Hack', 3);
    expect(t.parts.length).toBe(3);
    scene.dispose();
  });
});
