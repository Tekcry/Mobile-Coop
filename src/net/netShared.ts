import type { GameState } from '../game/gameState';
import { PF } from './protocol';

/** Local player's animation/state flags for the wire. */
export function localFlags(g: GameState): number {
  const p = g.player;
  const c = p.controller;
  let f = 0;
  if (c.crouched) f |= PF.crouch;
  if (p.ads) f |= PF.ads;
  if (g.weapons.firingRecently) f |= PF.firing;
  if (c.isRolling) f |= PF.roll;
  if (c.grounded) f |= PF.grounded;
  if (!p.alive) f |= PF.dead;
  if (c.sprinting) f |= PF.sprint;
  if (g.weapons.current.stats.noise <= 0.6) f |= PF.quiet;
  if (c.steps === 'silent') f |= PF.silent;
  // (3.2.0) cover / traversal drive the step: the host's speed check allows their paces (glides, runs, vaults)
  if (c.override) f |= PF.driven;
  return f;
}

/** Mode HUD info is HTML locally; the wire carries plain text segments split by '|'. */
export function htmlToInfo(html: string): string {
  return html
    .replace(/<\/span>\s*<span>/g, '|')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/g, '')
    .slice(0, 120);
}

const esc = (s: string): string => s.replace(/[&<>"]/g, '');

/** Rebuild HUD HTML from wire text: "Wave 3" -> "<span>Wave <b>3</b></span>". */
export function infoToHtml(info: string): string {
  return info
    .split('|')
    .filter(Boolean)
    .map((seg) => {
      const m = /^(.*?)(\d[\d,]*)\s*$/.exec(seg);
      return m ? `<span>${esc(m[1]!)}<b>${esc(m[2]!)}</b></span>` : `<span>${esc(seg)}</span>`;
    })
    .join('');
}
