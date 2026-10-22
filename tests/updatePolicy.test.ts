import { describe, expect, it } from 'vitest';
import { contextFrom, decideUpdate, type ScreenFacts } from '../src/pwa/updatePolicy';

const menu: ScreenFacts = { menuState: true, booting: false, topClasses: ['screen', 'main-menu'], coopOpen: false };

describe('sw-reload update policy', () => {
  it('does nothing without a waiting worker', () => {
    expect(decideUpdate(contextFrom(false, menu))).toBe('none');
  });

  it('applies on the main menu and the title', () => {
    expect(decideUpdate(contextFrom(true, menu))).toBe('apply');
    expect(decideUpdate(contextFrom(true, { ...menu, topClasses: ['title-screen', 'ts-seq'] }))).toBe('apply');
  });

  it('defers in a match (solo or co-op) and while a match or the menu loads', () => {
    expect(decideUpdate(contextFrom(true, { ...menu, menuState: false, topClasses: [] }))).toBe('defer');
    expect(decideUpdate(contextFrom(true, { ...menu, menuState: false, topClasses: ['objectives-screen'] }))).toBe('defer');
    expect(decideUpdate(contextFrom(true, { ...menu, booting: true }))).toBe('defer');
  });

  it('defers while a co-op screen is open, even under another screen', () => {
    expect(decideUpdate(contextFrom(true, { ...menu, topClasses: ['coop-screen', 'lobby-screen'], coopOpen: true }))).toBe('defer');
    expect(decideUpdate(contextFrom(true, { ...menu, topClasses: ['settings-screen'], coopOpen: true }))).toBe('defer');
    // a stale main-menu top with a lobby somewhere in the stack still waits
    expect(decideUpdate(contextFrom(true, { ...menu, coopOpen: true }))).toBe('defer');
  });

  it('defers on other menu screens (settings, loadout) until the player is back on the main menu', () => {
    expect(decideUpdate(contextFrom(true, { ...menu, topClasses: ['settings-screen'] }))).toBe('defer');
    expect(decideUpdate(contextFrom(true, { ...menu, topClasses: [] }))).toBe('defer');
  });

  it('decides from the raw context too', () => {
    expect(decideUpdate({ updateWaiting: true, inMatch: false, coopConnected: false, onMenu: true })).toBe('apply');
    expect(decideUpdate({ updateWaiting: true, inMatch: true, coopConnected: false, onMenu: true })).toBe('defer');
    expect(decideUpdate({ updateWaiting: true, inMatch: false, coopConnected: true, onMenu: true })).toBe('defer');
  });
});
