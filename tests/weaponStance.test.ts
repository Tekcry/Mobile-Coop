// (anim-rework S1, BRIEF section 1; Michael 2026-10-20 M1-M4, A2, A3) the three weapon states and the trigger's tap / hold
import { describe, expect, it } from 'vitest';
import { emptyStanceInput, STANCE, TriggerTapHold, WeaponStance, type StanceInput } from '../src/player/weaponStance';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

const dt = 1 / 60;
/** Run `s` seconds with the input `i` (the gun is out once `outAfter` s of wanting it have passed). */
function run(w: WeaponStance, i: StanceInput, s: number): void {
  for (let t = 0; t < s - 1e-9; t += dt) w.update(dt, i);
}
const inp = (o: Partial<StanceInput> = {}): StanceInput => ({ ...emptyStanceInput(), ...o });

describe('weapon stance (anim-rework S1)', () => {
  it('starts holstered; an X tap draws to low ready (on the press), the next tap holsters (M1)', () => {
    const w = new WeaponStance();
    run(w, inp(), 0.1);
    expect(w.state).toBe('holstered');
    w.update(dt, inp({ xDown: true }));
    expect(w.state).toBe('lowReady');
    expect(w.drawWanted).toBe(true);
    run(w, inp({ xDown: true }), 0.1);
    run(w, inp({ gunOut: true }), 0.1);
    expect(w.state).toBe('lowReady');
    run(w, inp({ xDown: true, gunOut: true }), 0.1);
    expect(w.state).toBe('lowReady');
    w.update(dt, inp({ gunOut: true }));
    expect(w.state).toBe('holstered');
    expect(w.taps).toBe(2);
  });
  it('X held from holstered draws and stays drawn (no reload ask, no holster on release)', () => {
    const w = new WeaponStance();
    run(w, inp({ xDown: true }), 1);
    expect(w.holds).toBe(0);
    w.update(dt, inp({ gunOut: true }));
    expect(w.state).toBe('lowReady');
  });
  it('X held 0.4 s with the gun out asks for the reload once (A2); no holster on its release', () => {
    const w = new WeaponStance();
    w.update(dt, inp({ xDown: true }));
    run(w, inp({ gunOut: true }), 0.2);
    let asks = 0;
    for (let t = 0; t < 1; t += dt) {
      w.update(dt, inp({ xDown: true, gunOut: true }));
      if (w.holdAsk) asks++;
    }
    expect(asks).toBe(1);
    expect(STANCE.xHold).toBe(0.4);
    w.update(dt, inp({ gunOut: true }));
    expect(w.state).toBe('lowReady');
    // nothing to reload: the weapons holster
    w.holster();
    w.update(dt, inp());
    expect(w.state).toBe('holstered');
  });
  it('LT held aims, release drops to low ready (no toggle)', () => {
    const w = new WeaponStance();
    w.update(dt, inp({ xDown: true }));
    run(w, inp({ gunOut: true }), 0.3);
    run(w, inp({ aimDown: true, gunOut: true }), 0.3);
    expect(w.state).toBe('aiming');
    expect(w.aimWanted).toBe(true);
    expect(w.slingDraw).toBe(false);
    w.update(dt, inp({ gunOut: true }));
    expect(w.state).toBe('lowReady');
  });
  it('LT from holstered: the sling draw straight to the aim (M2), slower, its own state; release mid-draw: low ready', () => {
    const w = new WeaponStance();
    run(w, inp({ aimDown: true }), 0.2);
    expect(w.state).toBe('slingDraw');
    expect(w.slingDraw).toBe(true);
    w.update(dt, inp({ aimDown: true, gunOut: true }));
    expect(w.state).toBe('aiming');
    expect(w.slingDraw).toBe(false);
    w.update(dt, inp({ gunOut: true }));
    expect(w.state).toBe('lowReady');
    expect(STANCE.slingDrawMult).toBeGreaterThan(1);
    // let go before the gun is out: the draw goes on to low ready
    const v = new WeaponStance();
    run(v, inp({ aimDown: true }), 0.1);
    v.update(dt, inp());
    expect(v.state).toBe('lowReady');
    expect(v.slingDraw).toBe(false);
  });
  it('an X tap while aiming holsters; the aim stays blocked until LT is let go', () => {
    const w = new WeaponStance();
    w.update(dt, inp({ aimDown: true }));
    run(w, inp({ aimDown: true, gunOut: true }), 0.3);
    w.update(dt, inp({ aimDown: true, gunOut: true, xDown: true }));
    w.update(dt, inp({ aimDown: true, gunOut: true }));
    expect(w.state).toBe('holstered');
    run(w, inp({ aimDown: true }), 0.3);
    expect(w.state).toBe('holstered');
    w.update(dt, inp());
    w.update(dt, inp({ aimDown: true }));
    expect(w.state).toBe('slingDraw');
  });
  it('no aim toggle (Michael 15:25: "Remove it"): a quick LT press and release aims only while held', () => {
    const w = new WeaponStance();
    w.update(dt, inp({ aimDown: true }));
    run(w, inp({ gunOut: true }), 0.2);
    expect(w.state).toBe('lowReady');
    expect(w.aimWanted).toBe(false);
  });
  it('traversal holds the state (M4): holstered for the move, the state it had comes back after', () => {
    const w = new WeaponStance();
    w.update(dt, inp({ xDown: true }));
    run(w, inp({ gunOut: true }), 0.3);
    run(w, inp({ suspended: true }), 1);
    expect(w.state).toBe('holstered');
    expect(w.drawWanted).toBe(false);
    // an X press during the move is ignored
    run(w, inp({ suspended: true, xDown: true }), 0.1);
    run(w, inp({ suspended: true }), 0.1);
    w.update(dt, inp());
    expect(w.state).toBe('lowReady');
    // aiming before, LT still held after: the aim comes back
    run(w, inp({ aimDown: true, gunOut: true }), 0.2);
    run(w, inp({ aimDown: true, suspended: true }), 0.5);
    expect(w.state).toBe('holstered');
    w.update(dt, inp({ aimDown: true }));
    expect(w.state).toBe('aiming');
  });
  it('LT while suspended (the attached sidearm) aims without drawing the main state', () => {
    const w = new WeaponStance();
    run(w, inp({ aimDown: true, suspended: true }), 0.3);
    expect(w.aimWanted).toBe(true);
    expect(w.base).toBe('holstered');
    run(w, inp(), 0.1);
    expect(w.state).toBe('holstered');
  });
  it('holding a guard: X does nothing, LT is the pistol aim; let go: holstered', () => {
    const w = new WeaponStance();
    run(w, inp({ locked: true, xDown: true }), 0.1);
    run(w, inp({ locked: true }), 0.1);
    expect(w.state).toBe('holstered');
    run(w, inp({ locked: true, aimDown: true }), 0.2);
    expect(w.state).toBe('aiming');
    run(w, inp({ locked: true }), 0.1);
    expect(w.state).toBe('holstered');
    run(w, inp(), 0.1);
    expect(w.state).toBe('holstered');
  });
  it('blank input (a held context menu, the wheel) is no X release: the press is spent, the state stays', () => {
    const w = new WeaponStance();
    w.update(dt, inp({ xDown: true }));
    run(w, inp({ xDown: true, gunOut: true }), 0.1);
    // X still held when A's list takes the input, let go under it, the list closes: no holster, no reload ask
    run(w, inp({ blank: true, gunOut: true }), 0.6);
    run(w, inp({ gunOut: true }), 0.1);
    expect(w.state).toBe('lowReady');
    // a fresh X tap from low ready under no blank still holsters
    w.update(dt, inp({ xDown: true, gunOut: true }));
    run(w, inp({ blank: true, xDown: true, gunOut: true }), 0.5);
    w.update(dt, inp({ gunOut: true }));
    expect(w.state).toBe('lowReady');
    expect(w.holds).toBe(0);
  });
  it('a reload asked for while holstered (KBM R) brings the state to low ready (A43)', () => {
    const w = new WeaponStance();
    w.readyForReload();
    w.update(dt, inp());
    expect(w.state).toBe('lowReady');
  });
  it('forced aim (tests, tools) never changes the base state; death resets', () => {
    const w = new WeaponStance();
    run(w, inp({ forceAim: true }), 0.3);
    expect(w.state).toBe('aiming');
    run(w, inp(), 0.1);
    expect(w.state).toBe('holstered');
    w.update(dt, inp({ xDown: true }));
    expect(w.state).toBe('lowReady');
    w.update(dt, inp({ alive: false }));
    expect(w.state).toBe('holstered');
    expect(w.base).toBe('holstered');
  });
});

describe('the trigger tap / hold (M3)', () => {
  it('a release before the hold time is a tap; a hold fires once at the hold time; unarmed presses are ignored', () => {
    const t = new TriggerTapHold();
    expect(STANCE.rtHold).toBeCloseTo(0.35);
    expect(t.update(true, dt, true)).toBeNull();
    expect(t.pending).toBe(true);
    for (let i = 0; i < 5; i++) expect(t.update(true, dt, true)).toBeNull();
    expect(t.update(false, dt, true)).toBe('tap');
    let holds = 0;
    for (let i = 0; i < 60; i++) if (t.update(true, dt, true) === 'hold') holds++;
    expect(holds).toBe(1);
    expect(t.update(false, dt, true)).toBeNull();
    // armed is read at the press only: an aimed press stays a shot to its release
    expect(t.update(true, dt, false)).toBeNull();
    for (let i = 0; i < 60; i++) expect(t.update(true, dt, true)).toBeNull();
    expect(t.update(false, dt, true)).toBeNull();
  });
  it('allocates nothing per update', async () => {
    const w = new WeaponStance();
    const t = new TriggerTapHold();
    const a = inp({ gunOut: true });
    // gc() + new space per update (tests/helpers/allocPerCall.ts), not heapUsed (that read whatever a GC left in the
    // window, no warm-up): even one boxed double an update reads 16 B
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        a.xDown = (i & 31) < 8;
        a.aimDown = (i & 63) > 40;
        w.update(dt, a);
        t.update((i & 15) < 3, dt, true);
      }
    }, HEAP_NUMBER / 2);
    console.info(`bytes per stance + trigger update: ${per.toFixed(1)}`);
    expect(per).toBeLessThanOrEqual(HEAP_NUMBER / 2);
  });
});
