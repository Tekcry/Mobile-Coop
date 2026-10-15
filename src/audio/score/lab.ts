import { hookShot, melodyShot, menuPlan, missionPlans, type LayerDef, type MusicState, type Plan } from './arrange';
import { subtleGuitar, subtleHooks } from './hookLab';
import { HOOKS, hookPlan, type HookDef } from './hooks';
import { ALERT_HOOKS, alertHookPlan, type AlertHook } from './mgs';
import type { GameAwareness } from './director';
import { ScorePlayer, type LayerRt } from './player';
import { renderAll, renderLayer, type Rendered } from './render';
import { SKETCHES, type SketchDef } from './themes';
import { WorldSim, type Gait, type Surface } from './worldSim';

/**
 * The standalone V4 music test page (`/music-test.html`, linked from nowhere in the game). Renders a sketch's layers
 * offline, plays the menu theme or the mission score, switches the game state live, triggers the stinger, and plays
 * fake footsteps and a guard voice over the top. Per-layer volume sliders.
 */

let player: ScorePlayer | null = null;
let world: WorldSim | null = null;
let busy = false;
const cache = new Map<string, Rendered[]>();
const log: string[] = [];

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector(sel) as T;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  Object.assign(e, props);
  for (const k of kids) e.append(k);
  return e;
}

function ensure(): { p: ScorePlayer; w: WorldSim } {
  if (!player) {
    player = new ScorePlayer();
    world = new WorldSim(player);
    player.onEvent = (m) => note(m);
    applyVolumes();
  }
  void player.ctx.resume();
  return { p: player, w: world! };
}

function note(msg: string): void {
  const t = player ? player.ctx.currentTime.toFixed(1).padStart(6) : '';
  log.unshift(`${t}s  ${msg}`);
  log.length = Math.min(log.length, 8);
  $('#log').textContent = log.join('\n');
}

function setBusy(on: boolean, text = ''): void {
  busy = on;
  document.body.classList.toggle('busy', on);
  $('#progress').textContent = text;
}

/** Keep only the content being played (a mission sketch is a few hundred MB of decoded audio). */
function keepOnly(key: string): void {
  for (const k of [...cache.keys()]) if (k !== key && !k.startsWith('shot-')) cache.delete(k);
}

async function rendered(key: string, defs: LayerDef[], loop: (d: LayerDef) => boolean, label: string): Promise<Rendered[]> {
  const hit = cache.get(key);
  if (hit) return hit;
  keepOnly(key);
  const t0 = performance.now();
  setBusy(true, `Rendering ${label}: 0 / ${defs.length} parts...`);
  const out = await renderAll(defs, loop, (_r, done) => setBusy(true, `Rendering ${label}: ${done} / ${defs.length} parts...`));
  cache.set(key, out);
  setBusy(false, `${label} rendered in ${((performance.now() - t0) / 1000).toFixed(1)} s.`);
  return out;
}

async function playMenu(sk: SketchDef): Promise<void> {
  await playLoop(menuPlan(sk));
}

/** Any looping plan (a menu theme or a Hook A partner loop), with a slider per layer. */
async function playLoop(plan: Plan): Promise<void> {
  if (busy) return;
  const { p, w } = ensure();
  const r = await rendered(plan.id, plan.layers, () => true, plan.name);
  w.setChatter(false);
  p.playMenu(plan, r);
  note(`Playing ${plan.name} (${plan.bpm} BPM, ${plan.bars} bars, ${(r[0]!.loopSec).toFixed(0)} s loop)`);
  buildLayers();
}

async function playMission(sk: SketchDef): Promise<void> {
  if (busy) return;
  const { p } = ensure();
  const m = missionPlans(sk);
  const defs = [...m.low.layers, ...m.alert.layers, m.stinger, m.stingerShort];
  const r = await rendered(`mission-${sk.id}`, defs, (d) => d.group !== 'shot', `Mission ${sk.id}`);
  const nLow = m.low.layers.length;
  const nAlert = m.alert.layers.length;
  p.playMission(m.low, r.slice(0, nLow), m.alert, r.slice(nLow, nLow + nAlert), r[nLow + nAlert]!, r[nLow + nAlert + 1]!);
  note(`Playing Mission ${sk.id}: Calm (${m.low.bpm} BPM, ${r[0]!.loopSec.toFixed(0)} s loop); Alert ${m.alert.bpm} BPM, ${r[nLow]!.loopSec.toFixed(0)} s loop`);
  setGameButtons('calm');
  buildLayers();
}

async function playShot(def: LayerDef): Promise<void> {
  if (busy) return;
  const { p } = ensure();
  const key = `shot-${def.id}`;
  let r = cache.get(key)?.[0];
  if (!r) {
    setBusy(true, `Rendering ${def.name}...`);
    r = await renderLayer(def, false);
    cache.set(key, [r]);
    setBusy(false, '');
  }
  p.playShot(r);
  note(`Playing ${def.name}`);
  buildLayers();
}

function stop(): void {
  player?.stopAll();
  world?.stop();
  syncWorld();
  buildLayers();
  note('Stopped');
}

function setGame(s: GameAwareness): void {
  if (!player || player.mode !== 'mission') return;
  player.setGame(s);
  setGameButtons(s);
  note(`Game state: ${s}`);
}

function glance(): void {
  if (!player || player.mode !== 'mission') return;
  const before = player.game;
  setGame('caution');
  window.setTimeout(() => setGame(before), 400);
}

function setGameButtons(s: GameAwareness): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-game]')) b.classList.toggle('on', b.dataset['game'] === s);
}

// ---------------------------------------------------------------- layers panel

const STATE_LABEL: Record<MusicState, string> = { calm: 'Calm', caution: 'Cautious', alert: 'Alert', evade: 'Evasion' };

function buildLayers(): void {
  const box = $('#layers');
  box.textContent = '';
  const ls = player?.layers() ?? [];
  if (!ls.length) {
    box.append(el('p', { className: 'muted', textContent: 'Play a menu or mission sketch to get a slider for each layer.' }));
    return;
  }
  for (const l of ls) box.append(layerRow(l));
}

function layerRow(l: LayerRt): HTMLElement {
  const slider = el('input', { type: 'range', min: '0', max: '150', value: String(Math.round(l.userValue * 100)) });
  const val = el('span', { className: 'val', textContent: `${slider.value}%` });
  const mute = el('button', { className: 'small', textContent: 'Mute' });
  mute.classList.toggle('on', l.muted);
  slider.oninput = () => {
    val.textContent = `${slider.value}%`;
    player?.setLayerGain(l, Number(slider.value) / 100);
  };
  mute.onclick = () => {
    player?.setLayerGain(l, l.userValue, !l.muted);
    mute.classList.toggle('on', l.muted);
  };
  const states = l.group === 'menu' ? '' : (Object.keys(l.r.def.mix) as MusicState[]).filter((s) => l.r.def.mix[s] > 0).map((s) => STATE_LABEL[s]).join(', ');
  return el(
    'div',
    { className: 'layer' },
    el('div', { className: 'lname' }, el('b', { textContent: l.r.def.name }), el('small', { textContent: states ? ` in ${states}` : '' })),
    slider,
    val,
    mute,
  );
}

// ---------------------------------------------------------------- status

function refresh(): void {
  const p = player;
  const box = $('#state');
  if (!p) {
    box.textContent = 'Click any button to start audio.';
    return;
  }
  const s = p.status();
  if (s.mode === 'mission') {
    const nxt = s.nextStep === null ? '' : ` | steps down in ${s.nextStep.toFixed(1)} s`;
    box.innerHTML =
      `Game: <b class="g-${s.game}">${s.game.toUpperCase()}</b> &nbsp; Music: <b class="m-${s.music}">${STATE_LABEL[s.music].toUpperCase()}</b>` +
      ` (for ${s.held.toFixed(1)} s${nxt})<br><small>${s.group} - ${s.bpm} BPM - bar ${s.bar}, beat ${s.beat}</small>`;
  } else if (s.mode === 'menu') {
    box.innerHTML = `Loop playing<br><small>${s.group} - ${s.bpm} BPM - bar ${s.bar}, beat ${s.beat}</small>`;
  } else box.textContent = s.mode === 'shot' ? 'Playing...' : 'Stopped.';
}

// ---------------------------------------------------------------- world sounds and volumes

function syncWorld(): void {
  const g = world?.walking ?? 'off';
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gait]')) b.classList.toggle('on', b.dataset['gait'] === g);
}

function applyVolumes(): void {
  if (!player) return;
  player.musicVol.gain.value = Number(($('#musicVol') as HTMLInputElement).value) / 100;
  player.sfxBus.gain.value = Number(($('#sfxVol') as HTMLInputElement).value) / 100;
}

// ---------------------------------------------------------------- page

function button(label: string, fn: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', { textContent: label, className: cls });
  b.onclick = () => {
    fn();
  };
  return b;
}

function sketchCard(sk: SketchDef): HTMLElement {
  return el(
    'div',
    { className: 'card' },
    el('h3', { textContent: `${sk.id} - ${sk.name}` }),
    el('p', { textContent: sk.blurb }),
    el('p', { className: 'notes', textContent: `Theme: ${sk.themeText.replace(/:/g, ' ')}` }),
    el('p', { className: 'notes', textContent: `Hook: ${sk.hookText}` }),
    el('div', { className: 'row' }, button(`Theme ${sk.id} alone`, () => void playShot(melodyShot(sk))), button(`Hook ${sk.id} alone`, () => void playShot(hookShot(sk)))),
  );
}

export function mountScoreLab(root: HTMLElement): void {
  root.append(
    el('h1', { textContent: 'Night Shift - music test' }),
    el('p', {
      className: 'muted',
      textContent:
        'Round 5: Alert hooks in the Metal Gear Solid spirit. Everything is generated in code and rendered when you press play (a second or two each).',
    }),
    el('div', { id: 'progress', className: 'progress' }),
    el(
      'section',
      {},
      el('h2', { textContent: '1. Alert hooks in the Metal Gear Solid spirit' }),
      el('p', {
        className: 'muted',
        textContent:
          'Four original Alert hooks: fast, urgent, a repeated-note pickup into a held note, a driving snare and a pulsing bass. Hear each hook alone, as Alert with the hook on three different instruments, and as Evasion (the drive stays, the hook drops out). Each loops (about 13 s).',
      }),
      el('div', { className: 'partners' }, ...ALERT_HOOKS.map(alertCard)),
      el('div', { className: 'row' }, button('Stop', stop)),
    ),
    el(
      'section',
      {},
      el('h2', { textContent: '2. Gameplay sounds over the music' }),
      el('p', { className: 'muted', textContent: 'Same footstep sound and level as the game. Keys: W walk, V voice, B bottle.' }),
      el(
        'div',
        { className: 'row' },
        ...(['off', 'crouch', 'walk', 'run'] as Gait[]).map((g) => {
          const b = button(g === 'off' ? 'Steps off' : g[0]!.toUpperCase() + g.slice(1), () => {
            ensure().w.setGait(g);
            syncWorld();
          });
          b.dataset['gait'] = g;
          return b;
        }),
        (() => {
          const s = el('select', {}, ...(['concrete', 'metal', 'gravel'] as Surface[]).map((v) => el('option', { value: v, textContent: v })));
          s.onchange = () => {
            ensure().w.surface = s.value as Surface;
          };
          return s;
        })(),
      ),
      el(
        'div',
        { className: 'row' },
        button('Guard voice', () => ensure().w.guardVoice()),
        (() => {
          const b = button('Guard chatter (repeat)', () => {
            const on = !b.classList.contains('on');
            b.classList.toggle('on', on);
            ensure().w.setChatter(on);
          });
          return b;
        })(),
        button('Noise cue (bottle)', () => ensure().w.noiseCue()),
      ),
      el(
        'div',
        { className: 'row' },
        check('Duck music under voices and cues', true, (on) => {
          ensure().w.duckVoices = on;
        }),
        check('Duck under footsteps too', false, (on) => {
          ensure().w.duckSteps = on;
        }),
        check('Mid cut on the music (2 kHz)', true, (on) => ensure().p.setMidCut(on)),
      ),
      el(
        'div',
        { className: 'row' },
        el('label', {}, 'Music volume ', slider('musicVol', 50, 100), el('small', { textContent: ' (game default 50)' })),
        el('label', {}, 'Gameplay sounds ', slider('sfxVol', 100, 150)),
      ),
    ),
    el('section', {}, el('h2', { textContent: '3. Layers' }), el('div', { id: 'layers' })),
    el('section', {}, el('h2', { textContent: 'Log' }), el('pre', { id: 'log' })),
    el(
      'details',
      { className: 'old' },
      el('summary', { textContent: 'Round 4: ten bass hooks (kept for comparison)' }),
    el(
      'section',
      {},
      el('h2', { textContent: 'Hooks to choose from' }),
      el('p', {
        className: 'muted',
        textContent:
          'Ten bass hooks of different character, each alone and quiet. Play each on the soft upright or on a dark, round synth bass (more electronic, closer to Chaos Theory). Each loops (about 20 s).',
      }),
      el('div', { className: 'partners' }, ...HOOKS.map(hookCard)),
      el('div', { className: 'row' }, button('Stop', stop)),
    ),
    ),
    el(
      'details',
      { className: 'old' },
      el('summary', { textContent: 'Round 3: subtle Hook A and soft guitar (kept for comparison)' }),
    el(
      'section',
      {},
      el('h2', { textContent: 'Subtle versions of Hook A' }),
      el('p', {
        className: 'muted',
        textContent: 'Hook A on its own, played more gently. The first one is the original for comparison; the rest are 8-11 dB quieter. Each loops (about 40 s).',
      }),
      cards(subtleHooks()),
      el('div', { className: 'row' }, button('Stop', stop)),
    ),
    el(
      'section',
      {},
      el('h2', { textContent: 'Hook A with a soft guitar' }),
      el('p', { className: 'muted', textContent: 'Gentler takes on round 2 loop 5, all over the "Soft fingers" hook. Use the sliders below to balance them.' }),
      cards(subtleGuitar()),
      el('div', { className: 'row' }, button('Stop', stop)),
    ),
    ),
    el(
      'details',
      { className: 'old' },
      el('summary', { textContent: 'Round 1 sketches (not liked; kept for comparison)' }),
    el(
      'section',
      {},
      el('h2', { textContent: 'Themes on their own' }),
      el('p', { className: 'muted', textContent: 'A plain tone, no backing: can you hum it afterwards? The hook is the bass riff.' }),
      el('div', { className: 'cards' }, ...SKETCHES.map(sketchCard)),
    ),
    el(
      'section',
      {},
      el('h2', { textContent: 'Menu theme' }),
      el('div', { className: 'row' }, ...SKETCHES.map((sk) => button(`Menu ${sk.id} - ${sk.name}`, () => void playMenu(sk), 'big')), button('Stop', stop)),
    ),
    el(
      'section',
      {},
      el('h2', { textContent: 'Mission score' }),
      el('div', { className: 'row' }, ...SKETCHES.map((sk) => button(`Mission ${sk.id} - ${sk.name}`, () => void playMission(sk), 'big')), button('Stop', stop)),
      el('p', { className: 'muted', textContent: 'The buttons set the GAME state, as a guard would. The music follows with its own timing: a short delay going up, holds and a slow ladder going down. Keys: 1 2 3, G glance, S stinger.' }),
      el(
        'div',
        { className: 'row' },
        button('CALM', () => setGame('calm'), 'state g-calm'),
        button('CAUTIOUS', () => setGame('caution'), 'state g-caution'),
        button('ALERT', () => setGame('alert'), 'state g-alert'),
        button('Guard glance (0.4 s)', glance),
        button('Stinger only', () => player?.playStinger()),
      ),
      el('div', { id: 'state', className: 'status' }),
    ),
    ),
  );
  buildLayers();
  refresh();
  window.setInterval(refresh, 100);
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    const k = e.key.toLowerCase();
    if (k === '1') setGame('calm');
    else if (k === '2') setGame('caution');
    else if (k === '3') setGame('alert');
    else if (k === 'g') glance();
    else if (k === 's') player?.playStinger();
    else if (k === 'v') ensure().w.guardVoice();
    else if (k === 'b') ensure().w.noiseCue();
    else if (k === 'w') {
      const { w } = ensure();
      w.setGait(w.walking === 'off' ? 'walk' : 'off');
      syncWorld();
    }
  });
  (window as unknown as { __score: unknown }).__score = { get player() { return player; }, cache, SKETCHES, menuPlan, missionPlans, renderLayer };
}

function alertCard(h: AlertHook, i: number): HTMLElement {
  return el(
    'div',
    { className: 'partner' },
    el('b', { textContent: `${i + 1}. ${h.name}` }),
    el('small', { textContent: `${h.blurb} ${h.bpm} BPM.` }),
    el('p', { className: 'notes', textContent: h.lead.replace(/:\d+/g, '').replace(/ - /g, ' . ') }),
    el(
      'div',
      { className: 'row' },
      button('Hook alone', () => void playLoop(alertHookPlan(h, 'brass', 'alone'))),
      button('Alert: brass', () => void playLoop(alertHookPlan(h, 'brass', 'alert'))),
      button('Alert: synth lead', () => void playLoop(alertHookPlan(h, 'synth', 'alert'))),
      button('Alert: horns', () => void playLoop(alertHookPlan(h, 'horns', 'alert'))),
      button('Evasion', () => void playLoop(alertHookPlan(h, 'brass', 'evade'))),
    ),
  );
}

function hookCard(h: HookDef, i: number): HTMLElement {
  return el(
    'div',
    { className: 'partner' },
    el('b', { textContent: `${i + 1}. ${h.name}` }),
    el('small', { textContent: `${h.blurb} ${h.bpm} BPM.` }),
    el('p', { className: 'notes', textContent: h.notes.replace(/:\d+/g, '').replace(/ - /g, ' . ') }),
    el('div', { className: 'row' }, button('Upright', () => void playLoop(hookPlan(h, 'upright'))), button('Synth bass', () => void playLoop(hookPlan(h, 'synth')))),
  );
}

function cards(plans: Plan[]): HTMLElement {
  return el(
    'div',
    { className: 'partners' },
    ...plans.map((pl, i) => el('div', { className: 'partner' }, button(`${i + 1}. ${pl.name}`, () => void playLoop(pl), 'big'), el('small', { textContent: pl.blurb ?? '' }))),
  );
}

function slider(id: string, value: number, max: number): HTMLInputElement {
  const s = el('input', { type: 'range', id, min: '0', max: String(max), value: String(value) });
  s.oninput = applyVolumes;
  return s;
}

function check(label: string, on: boolean, fn: (on: boolean) => void): HTMLLabelElement {
  const c = el('input', { type: 'checkbox', checked: on });
  c.onchange = () => fn(c.checked);
  return el('label', { className: 'check' }, c, ` ${label}`);
}
