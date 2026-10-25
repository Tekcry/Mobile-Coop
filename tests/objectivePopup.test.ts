import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { OBJECTIVE_POPUP, ObjectivePopup } from '../src/ui/hud/objectivePopup';

// (G343, hud-guidance B1) the objective line fades in on every update and on a View / O tap, holds ~5 s, fades out.
describe('objective popup (G343)', () => {
  const hold = OBJECTIVE_POPUP.holdS;
  afterEach(() => {
    OBJECTIVE_POPUP.holdS = hold;
  });

  it('starts from the G343 starting values (G356)', () => {
    expect(OBJECTIVE_POPUP).toEqual({ holdS: 5, fadeS: 0.4 });
  });

  it('is hidden until shown', () => {
    const p = new ObjectivePopup();
    expect(p.visible(0)).toBe(false);
    expect(p.visible(100)).toBe(false);
  });

  it('shows on an update (or a tap) and hides after holdS', () => {
    const p = new ObjectivePopup();
    p.show(10);
    expect(p.visible(10)).toBe(true);
    expect(p.visible(10 + hold - 0.01)).toBe(true);
    expect(p.visible(10 + hold)).toBe(false);
    expect(p.visible(10 + hold + 3)).toBe(false);
  });

  it('a re-show restarts the hold (a second tap, or the line changing while shown)', () => {
    const p = new ObjectivePopup();
    p.show(0);
    p.show(4);
    expect(p.visible(hold + 1)).toBe(true);
    expect(p.visible(4 + hold)).toBe(false);
  });

  it('hide() takes it off at once (an empty line)', () => {
    const p = new ObjectivePopup();
    p.show(0);
    p.hide();
    expect(p.visible(0)).toBe(false);
    expect(p.visible(1)).toBe(false);
  });

  it('holdS Infinity keeps the line on (BRIEF A3 undo)', () => {
    OBJECTIVE_POPUP.holdS = Infinity;
    const p = new ObjectivePopup();
    p.show(0);
    expect(p.visible(1e9)).toBe(true);
  });
});

// The HUD and the game loop wiring (node env, no DOM: read the source).
describe('objective popup wiring (G343, BRIEF A4 / A5)', () => {
  const hud = readFileSync('src/ui/hud/hud.ts', 'utf8');
  const game = readFileSync('src/game/gameState.ts', 'utf8');

  it('Hud shows the line on a non-empty update, hides it on an empty one', () => {
    const body = hud.slice(hud.indexOf('setObjective(text: string): void {'));
    const fn = body.slice(0, body.indexOf('\n  }\n'));
    expect(fn).toMatch(/if \(text\) this\.popup\.show\(/);
    expect(fn).toMatch(/else this\.popup\.hide\(\)/);
  });

  it('a tap shows only a non-empty line', () => {
    const body = hud.slice(hud.indexOf('showObjective(): boolean {'));
    const fn = body.slice(0, body.indexOf('\n  }\n'));
    expect(fn).toMatch(/if \(!this\.objText\) return false;/);
  });

  it('Hud.update toggles .show only when visibility flips (no closure)', () => {
    expect(hud).toMatch(/const vis = this\.popup\.visible\(now \/ 1000\);\s*if \(vis !== this\.objShown\) \{/);
  });

  it('the game reads the tap only with no pause or field menu open', () => {
    expect(game).toMatch(/if \(!this\.paused && !this\.menuOpen && realIn\.pressed\('objective'\)\) this\.hud\.showObjective\(\);/);
  });
});
