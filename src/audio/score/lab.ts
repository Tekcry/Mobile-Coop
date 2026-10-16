import type { LayerDef, MusicState, Plan } from './arrange';
import type { GameAwareness } from './director';
import { ScorePlayer, type LayerRt } from './player';
import type { Rendered } from './render';
import { WorldSim, type Gait, type Surface } from './worldSim';

/**
 * The music test page (`/music-test.html`, linked from nowhere in the game). Round 15 (Michael, 2026-10-16): the two
 * keepers ("Alert, under fire" and "Menu theme, Grand, dialled back"), three sneaking loops run with Under fire by the
 * music director (Calm / Cautious / Alert / Evasion fading into each other, the spotted hit on detection), and two menu
 * alternatives. The pieces are rendered offline from CC0 recordings (`npm run music:orch`; the files stay local).
 */

interface OrchLayer {
  id: string;
  name: string;
  kind: string;
  file: string;
  /** The clean opening (loops). */
  head?: string;
}
interface OrchPiece {
  id: string;
  name: string;
  about: string;
  use: 'alert' | 'menu' | 'stealth' | 'shot';
  bpm: number;
  bars: number;
  loop: number;
  layers: OrchLayer[];
  presets: Record<string, Record<string, number>>;
  /** Length of each layer's clean opening (s). */
  head?: number;
}
const ORCH_JSON = import.meta.glob('../../assets/music/orch/orch.json', { eager: true, import: 'default' }) as Record<string, { pad: number; pieces: OrchPiece[] }>;
const ORCH = Object.values(ORCH_JSON)[0] ?? { pad: 0.5, pieces: [] };
const ORCH_URLS = import.meta.glob('../../assets/music/orch/*.mp3', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const piece = (id: string): OrchPiece | undefined => ORCH.pieces.find((p) => p.id === id);
/** Decode at 24 kHz: half the memory of 48 kHz (a phone holds a whole adaptive set this way). */
const DECODE_RATE = 24000;

let player: ScorePlayer | null = null;
let world: WorldSim | null = null;
let busy = false;
/** Decoded stems per piece: the loop and its clean opening per layer. */
const buffers = new Map<string, { loop: AudioBuffer; head: AudioBuffer | null }[]>();
/** The piece whose presets the Layers panel shows (loops only). */
let current: OrchPiece | null = null;
const solo = new Set<LayerRt>();
const log: string[] = [];
/** Which of Under fire's mixes plays as Alert (its first preset unless chosen). */
let alertMixName = '';
/** Which of the sneaking loop's mixes play as Calm and as Cautious (round 23); '' = the piece's first of each. */
let calmMixName = '';
let cautionMixName = '';
/** The sneaking loop playing in the in-game test (a chooser change replays it). */
let adaptivePc: OrchPiece | null = null;

/** The chosen mix if the piece has it, else its first mix whose name starts with `prefix` (none: silence). */
function mixOf(pc: OrchPiece, chosen: string, prefix: string): { name: string; mix: Record<string, number> } {
  const name = chosen && pc.presets[chosen] ? chosen : (Object.keys(pc.presets).find((k) => k.startsWith(prefix)) ?? '');
  return { name: name || 'silence', mix: pc.presets[name] ?? {} };
}

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

// ---------------------------------------------------------------- loading

/** Decode a piece's stems (kept; other pieces are dropped unless listed in `keep`). */
async function load(pc: OrchPiece, keep: string[]): Promise<{ loop: AudioBuffer; head: AudioBuffer | null }[]> {
  for (const k of [...buffers.keys()]) if (!keep.includes(k)) buffers.delete(k);
  const hit = buffers.get(pc.id);
  if (hit) return hit;
  const decoder = new OfflineAudioContext(2, 1, DECODE_RATE);
  const decode = async (file: string): Promise<AudioBuffer> => {
    const url = ORCH_URLS[`../../assets/music/orch/${file}`];
    if (!url) throw new Error(`missing ${file}: run npm run music:orch`);
    return decoder.decodeAudioData(await (await fetch(url)).arrayBuffer());
  };
  const out = await Promise.all(pc.layers.map(async (ly) => ({ loop: await decode(ly.file), head: ly.head ? await decode(ly.head) : null })));
  buffers.set(pc.id, out);
  return out;
}

const ALL: Record<MusicState, number> = { calm: 1, caution: 1, alert: 1, evade: 1 };

/** Wrap decoded stems for the player: one layer each, with a gain per music state. */
function wrap(pc: OrchPiece, bufs: { loop: AudioBuffer; head: AudioBuffer | null }[], mixOf: (layerId: string) => Record<MusicState, number>, group: LayerDef['group'] = 'menu'): Rendered[] {
  return pc.layers.map((ly, i) => {
    const buffer = bufs[i]!.loop;
    const head = bufs[i]!.head;
    const def: LayerDef = {
      id: `${pc.id}-${ly.id}`,
      name: ly.name,
      group,
      bpm: pc.bpm,
      bars: pc.bars,
      mono: false,
      rate: buffer.sampleRate,
      level: 0,
      fx: { room: 0, hall: 0, far: 0 },
      mix: mixOf(ly.id),
      events: [],
    };
    const loop = pc.use !== 'shot';
    return {
      def,
      buffer,
      loopSec: pc.loop,
      rawDb: 0,
      gain: 1,
      ms: 0,
      ...(loop ? { loopStart: ORCH.pad, loopEnd: ORCH.pad + pc.loop } : {}),
      ...(loop && head && pc.head ? { head, headSec: pc.head } : {}),
    };
  });
}

const planOf = (pc: OrchPiece, group: Plan['group']): Plan => ({ id: pc.id, name: pc.name, group, bpm: pc.bpm, bars: pc.bars, layers: [] });

// ---------------------------------------------------------------- playing

/** One piece as a loop, with its presets in the Layers panel. */
async function playLoop(pc: OrchPiece): Promise<void> {
  if (busy) return;
  const { p, w } = ensure();
  setBusy(true, `Loading ${pc.name}...`);
  try {
    const bufs = await load(pc, [pc.id]);
    w.setChatter(false);
    p.playMenu(planOf(pc, 'menu'), wrap(pc, bufs, () => ALL));
    current = pc;
    solo.clear();
    buildLayers();
    const first = Object.keys(pc.presets)[0]!;
    applyPreset(first, 0.02);
    note(`Playing ${pc.name} (${pc.bpm} BPM, ${pc.loop.toFixed(0)} s loop), ${first}`);
  } finally {
    setBusy(false, '');
  }
}

/** A sneaking loop and Under fire, run by the music director: the game-state buttons drive it. */
async function playAdaptive(stealth: OrchPiece): Promise<void> {
  if (busy) return;
  const alert = piece('underfire');
  const hitPc = piece('spotted');
  if (!alert || !hitPc) return;
  const { p } = ensure();
  setBusy(true, `Loading ${stealth.name} + ${alert.name}...`);
  try {
    const keep = [stealth.id, alert.id, hitPc.id];
    const sb = await load(stealth, keep);
    const ab = await load(alert, keep);
    const hb = await load(hitPc, keep);
    const calmPick = mixOf(stealth, calmMixName, 'Calm');
    const cautionPick = mixOf(stealth, cautionMixName, 'Cautious');
    const calm = calmPick.mix;
    const caution = cautionPick.mix;
    const lowR = wrap(stealth, sb, (id) => ({ calm: calm[id] ?? 0, caution: caution[id] ?? 0, alert: 0, evade: 0 }), 'low');
    const name = alertMixName || Object.keys(alert.presets)[0]!;
    const alertMix = alert.presets[name] ?? {};
    const evade = alert.presets['Evasion'] ?? {};
    const alertR = wrap(alert, ab, (id) => ({ calm: 0, caution: 0, alert: alertMix[id] ?? 0, evade: evade[id] ?? 0 }), 'alert');
    const hitR = wrap(hitPc, hb, () => ALL, 'shot')[0]!;
    p.playMission(planOf(stealth, 'low'), lowR, planOf(alert, 'alert'), alertR, hitR, hitR);
    current = null;
    adaptivePc = stealth;
    solo.clear();
    setGameButtons('calm');
    buildLayers();
    note(`Adaptive: ${stealth.name}, Calm = ${calmPick.name}, Cautious = ${cautionPick.name}; ${alert.name} (${name}) for Alert and Evasion`);
  } finally {
    setBusy(false, '');
  }
}

function stop(): void {
  current = null;
  adaptivePc = null;
  solo.clear();
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

// ---------------------------------------------------------------- presets, solo, layers panel

function applyPreset(name: string, tc?: number): void {
  const p = player;
  if (!p || !current) return;
  const mix = current.presets[name] ?? {};
  const fade = tc ?? (60 / current.bpm) * (4 / 3);
  const prefix = `${current.id}-`;
  solo.clear();
  for (const l of p.layers()) p.setLayerGain(l, mix[l.r.def.id.slice(prefix.length)] ?? 0, false, fade);
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) b.classList.toggle('on', b.dataset['preset'] === name);
  if (tc === undefined) note(`Preset: ${name}`);
  syncLayerRows();
}

function applySolo(): void {
  const p = player;
  if (!p) return;
  for (const l of p.layers()) p.setLayerOut(l, solo.size ? (solo.has(l) ? l.userValue : 0) : l.muted ? 0 : l.userValue);
}

const STATE_LABEL: Record<MusicState, string> = { calm: 'Calm', caution: 'Cautious', alert: 'Alert', evade: 'Evasion' };
const rows = new Map<LayerRt, { slider: HTMLInputElement; val: HTMLElement; mute: HTMLButtonElement; solo: HTMLButtonElement }>();

function buildLayers(): void {
  rows.clear();
  const box = $('#layers');
  box.textContent = '';
  const ls = player?.layers() ?? [];
  if (!ls.length) {
    box.append(el('p', { className: 'muted', textContent: 'Play something to get a slider, Mute and Solo for each layer.' }));
    return;
  }
  const head = el('div', { className: 'row presets' });
  if (current) {
    head.append(el('b', { textContent: `${current.name}: ` }));
    for (const name of Object.keys(current.presets)) {
      const b = button(name, () => applyPreset(name), 'state');
      b.dataset['preset'] = name;
      head.append(b);
    }
  } else head.append(el('small', { textContent: 'Adaptive: each layer plays at its level for the current music state; the sliders scale that.' }));
  head.append(
    button('All to 100%', () => {
      for (const l of ls) player?.setLayerGain(l, 1, false);
      solo.clear();
      for (const b of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) b.classList.remove('on');
      syncLayerRows();
    }),
    button('Clear solo', () => {
      solo.clear();
      applySolo();
      syncLayerRows();
    }),
  );
  box.append(head);
  for (const l of ls) box.append(layerRow(l));
}

function syncLayerRows(): void {
  for (const [l, r] of rows) {
    r.slider.value = String(Math.round(l.userValue * 100));
    r.val.textContent = `${r.slider.value}%`;
    r.mute.classList.toggle('on', l.muted);
    r.solo.classList.toggle('on', solo.has(l));
  }
}

function layerRow(l: LayerRt): HTMLElement {
  const slider = el('input', { type: 'range', min: '0', max: '150', value: String(Math.round(l.userValue * 100)) });
  const val = el('span', { className: 'val', textContent: `${slider.value}%` });
  const mute = el('button', { className: 'small', textContent: 'Mute' });
  const soloB = el('button', { className: 'small', textContent: 'Solo' });
  slider.oninput = () => {
    val.textContent = `${slider.value}%`;
    player?.setLayerGain(l, Number(slider.value) / 100);
    applySolo();
  };
  mute.onclick = () => {
    player?.setLayerGain(l, l.userValue, !l.muted);
    applySolo();
    syncLayerRows();
  };
  soloB.onclick = () => {
    if (solo.has(l)) solo.delete(l);
    else solo.add(l);
    applySolo();
    syncLayerRows();
  };
  rows.set(l, { slider, val, mute, solo: soloB });
  mute.classList.toggle('on', l.muted);
  const states =
    l.group === 'menu'
      ? ''
      : (Object.keys(l.r.def.mix) as MusicState[])
          .filter((s) => l.r.def.mix[s] > 0)
          .map((s) => STATE_LABEL[s])
          .join(', ');
  return el(
    'div',
    { className: 'layer' },
    el('div', { className: 'lname' }, el('b', { textContent: l.r.def.name }), el('small', { textContent: states ? ` in ${states}` : l.group === 'menu' ? '' : ' (off in every state)' })),
    slider,
    val,
    el('div', { className: 'btns' }, mute, soloB),
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
  } else box.textContent = 'Stopped.';
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
  b.onclick = () => fn();
  return b;
}

function card(pc: OrchPiece, ...actions: HTMLElement[]): HTMLElement {
  return el(
    'div',
    { className: 'partner' },
    el('b', { textContent: pc.name }),
    el('small', { textContent: `${pc.about} ${pc.bpm} BPM, ${Math.round(pc.loop)} s, ${pc.layers.length} layers.` }),
    el('div', { className: 'row' }, ...actions),
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

function gameButton(label: string, state: GameAwareness): HTMLButtonElement {
  const b = button(label, () => setGame(state), `state g-${state}`);
  b.dataset['game'] = state;
  return b;
}

/** A chooser of every sneaking loop's mixes starting with `prefix` (each piece falls back to its own first). */
function mixChooser(stealth: OrchPiece[], prefix: string, set: (v: string) => void): HTMLSelectElement {
  const names: string[] = [];
  for (const pc of stealth) for (const k of Object.keys(pc.presets)) if (k.startsWith(prefix) && !names.includes(k)) names.push(k);
  const sel = el('select', {}, ...names.map((v) => el('option', { value: v, textContent: v })));
  set(names[0] ?? '');
  sel.onchange = () => {
    set(sel.value);
    if (adaptivePc) void playAdaptive(adaptivePc);
    else note(`${prefix}: ${sel.value} (press "Play with Under fire")`);
  };
  return sel;
}

export function mountScoreLab(root: HTMLElement): void {
  const missing = !ORCH.pieces.length;
  const keepers = ['underfire', 'grandlong', 'grandsoft'].map(piece).filter((p): p is OrchPiece => !!p);
  const stealth = ORCH.pieces.filter((p) => p.use === 'stealth');
  const menus = ORCH.pieces.filter((p) => p.use === 'menu' && p.id !== 'grandsoft' && p.id !== 'grandlong');
  root.append(
    el('h1', { textContent: 'Night Shift - music test' }),
    el('p', { className: 'muted', textContent: 'Real orchestra recordings, built around the two keepers. Each piece loads in a second or two the first time.' }),
    el('div', { id: 'progress', className: 'progress' }),
    missing
      ? el('p', { className: 'muted', textContent: 'Not rendered on this computer yet: run "npm run music:orch" (needs the samples: node scripts/music/fetch-samples.mjs orch-samples.json orch).' })
      : '',
    el(
      'section',
      {},
      el('h2', { textContent: '1. The keepers' }),
      el('div', { className: 'partners' }, ...keepers.map((pc) => card(pc, button('Play', () => void playLoop(pc), 'big')))),
      el('div', { className: 'row' }, button('Stop', stop)),
    ),
    el(
      'section',
      {},
      el('h2', { textContent: '2. In game: sneaking to Alert, fading together' }),
      el('p', {
        className: 'muted',
        textContent:
          'Round 23: "Hook thread" holds four new Calm options and three new Cautious options on one timeline, so any Calm pairs with any Cautious. Choose a Calm and a Cautious below, press "Play with Under fire", then use CALM / CAUTIOUS / ALERT as the game would (changing a choice replays). ALERT plays the spotted build and Under fire lands on its downbeat; calming down steps back through Evasion and Cautious. "(in game now)" marks what the game plays today. Keys: 1 2 3, G glance.',
      }),
      el('div', { className: 'partners' }, ...stealth.map((pc) => card(pc, button('Play with Under fire', () => void playAdaptive(pc), 'big'), button('Loop alone', () => void playLoop(pc))))),
      el(
        'div',
        { className: 'row' },
        gameButton('CALM', 'calm'),
        gameButton('CAUTIOUS', 'caution'),
        gameButton('ALERT', 'alert'),
        button('Guard glance (0.4 s)', glance),
        button('Spotted hit only', () => player?.playStinger()),
        button('Stop', stop),
      ),
      el(
        'div',
        { className: 'row' },
        el(
          'label',
          {},
          'Calm ',
          mixChooser(stealth, 'Calm', (v) => (calmMixName = v)),
        ),
        el(
          'label',
          {},
          'Cautious ',
          mixChooser(stealth, 'Cautious', (v) => (cautionMixName = v)),
        ),
        el(
          'label',
          {},
          'Alert mix ',
          (() => {
            const names = Object.keys(piece('underfire')?.presets ?? {}).filter((k) => k !== 'Evasion' && k !== 'Strings only');
            const sel = el('select', {}, ...names.map((v) => el('option', { value: v, textContent: v })));
            sel.onchange = () => {
              alertMixName = sel.value;
              if (adaptivePc) void playAdaptive(adaptivePc);
              else note(`Alert mix: ${sel.value} (press "Play with Under fire")`);
            };
            return sel;
          })(),
        ),
      ),
      el('div', { id: 'state', className: 'status' }),
    ),
    el(
      'section',
      {},
      el('h2', { textContent: '3. Menu alternatives' }),
      el('p', { className: 'muted', textContent: 'Variations on the menu theme you chose (Grand, dialled back).' }),
      el('div', { className: 'partners' }, ...menus.map((pc) => card(pc, button('Play', () => void playLoop(pc), 'big')))),
      el('div', { className: 'row' }, button('Stop', stop)),
    ),
    el('section', { className: 'mixer' }, el('h2', { textContent: 'Layers' }), el('div', { id: 'layers' })),
    el(
      'section',
      {},
      el('h2', { textContent: '4. Gameplay sounds over the music' }),
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
        el('label', {}, 'Music volume ', slider('musicVol', 50, 100), el('small', { textContent: ' (game default 15)' })),
        el('label', {}, 'Gameplay sounds ', slider('sfxVol', 100, 150)),
      ),
    ),
    el('section', {}, el('h2', { textContent: 'Log' }), el('pre', { id: 'log' })),
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
    else if (k === 'v') ensure().w.guardVoice();
    else if (k === 'b') ensure().w.noiseCue();
    else if (k === 'w') {
      const { w } = ensure();
      w.setGait(w.walking === 'off' ? 'walk' : 'off');
      syncWorld();
    }
  });
  (window as unknown as { __score: unknown }).__score = {
    get player() {
      return player;
    },
    pieces: ORCH.pieces,
  };
}
