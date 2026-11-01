import { Vector3, type Scene, type TransformNode } from '../core/babylon';
import {
  TUNE_BODY,
  TUNE_CAM,
  TUNE_CAM_CUR,
  TUNE_CUR,
  TUNE_GUN,
  TUNE_HOOKS,
  TUNE_LOCAL,
  TUNE_LOG,
  TUNE_STATE,
  tunablesFor,
  tuneChanged,
  tuneClearLog,
  tuneExport,
  tuneExportName,
  tuneGet,
  tuneGroupChanged,
  TUNE_FLAGS,
  tuneImport,
  tuneLoad,
  tuneMax,
  tuneMin,
  tuneNotes,
  tuneReset,
  tuneResetAll,
  tuneResetGroup,
  tuneSet,
  tuneSnapshot,
  BODY_GROUPS,
  type BodyGroup,
} from '../anim/tune';
import { isTuneGroup, TUNE_REGISTRY_HOOKS, TUNE_SECTIONS, tuneBakedApplied, type TuneSection } from '../anim/tuneRegistry';
import { tuneBakedReset, type BakedResetResult } from '../anim/tuneBakedReset';
// (anim-bake-1022) the bake ledger, bundled: Reset baked compares the tuner's values with it
import bakeLedger from '../anim/tuneBakeLog.json';
/** (anim-bake-1022) How long a Reset baked notice holds the info line (ms). */
const BAKED_NOTICE_MS = 8000;
/** (anim-skeleton S4 note) Whether a Keys group (`key.<clip>.<k>` / `key.<clip>.a<s>`) belongs to an FK-leg clip. */
function keyClipLegs(group: string): boolean {
  const clip = group.split('.')[1] ?? '';
  return KEY_CLIPS.some((c) => c.name === clip && c.legs === true);
}
import { FREE_CFG, FREE_DEMOS, FREE_IN, FREE_MODES, FREE_ORBIT, FREE_SET, FREE_VIEW, GAME_SPEED, freeAxis, freeTimeScale, type FreeDemo, type FreeMode, type FreeSnap } from '../player/freeView';
import { PAD } from '../input/gamepadMapping';
import { loadAnimTune, loadAnimTuneUi, saveAnimTune, saveAnimTuneUi } from '../save/animTuneStore';
import { download } from './fileOut';
import { TunePadCtl } from './animTunePad';
import { projectPoint } from './overlayProject';
import { TuneSnapshotsUi, type PanelKit } from './tuneSnapshots';
import { TunerKeyTools } from './tunerKeyTools';
import { StudioPanel } from './studioPanel';
import { keyGroupId } from '../anim/tuneKeysFile';
import { keyClip, keyIsLive, keyPhase, keyRank, keyReadout, keyStep } from '../anim/keyTimeline';
import { KEY_CLIPS } from '../anim/tuneKeysMeta';
import { tuneKeysAdd, tuneKeysDelete, tuneKeysEditInfo, tuneKeysGroupOf, tuneKeysIdOf, tuneKeysMirror, tuneKeysMirrorOn, tuneKeysRetime, tuneKeysTimeInfo } from '../anim/tuneKeys';
import { KEY_SPAN, KEY_TIME_ID, keyTimeCount } from '../anim/tuneKeysTime';
import { KEY_ADD_SLOTS, KEY_AT_ID, KEY_DEL_ID } from '../anim/tuneKeysEdit';

/**
 * (marlow-bays T1a, item 18) A Keys list choice shown: a key (not the Mirror box group); with the box on, an own key.
 * (item 25) A live key only: not deleted; an added key's group while it is placed.
 */
function keyListed(clip: string, seg: string): boolean {
  const c = keyClip(clip);
  if (!c) return /^\d+$/.test(seg);
  const k = keySegId(clip, seg);
  if (k < 0 || !keyIsLive(c, k)) return false;
  if (k >= keyTimeCount(c) || !c.mirror) return true;
  return !tuneKeysMirrorOn(clip) || k < c.phases.length;
}

/** (item 25) A Keys picker segment ('3', 'a0') of a clip -> its key id (-1: not a key). */
function keySegId(clip: string, seg: string): number {
  return /^(\d+|a\d+)$/.test(seg) ? (tuneKeysIdOf(`key.${clip}.${seg}`)?.[1] ?? -1) : -1;
}

/** (item 25) A Keys picker choice: "Key 3", numbered in phase order; an added key marked. */
function keyPickLabel(clip: string, seg: string): string {
  const c = keyClip(clip);
  const k = keySegId(clip, seg);
  if (!c || k < 0) return seg;
  const r = keyRank(c, k);
  return `Key ${(r < 0 ? k : r) + 1}${k >= keyTimeCount(c) ? ' (added)' : ''}`;
}
import { STUDIO, STUDIO_LIGHT, STUDIO_SPEED, studioBodyPin, studioEntry } from '../anim/studio';
import { effectMode, sliderEffect, type EffectMode } from './tunerEffect';
import type { KeyedClip } from '../anim/keyed';
import { LOCO } from '../anim/mocap';
import { NOW_PLAYING, bodyWord, nowPlayingGuardText, nowPlayingKey, nowPlayingSourceText, nowPlayingText } from '../anim/nowPlaying';
import { ANIM_SOURCE } from '../anim/animSource'; // (mixamo-retarget Toggle)
import { mocapSource } from '../anim/mocapSources';
import {
  CLARITY_WARN_LABEL,
  KEYS_CAPTURED_NOTE,
  KEYS_MOCAP_NOTE,
  MOCAP_BOX_LABEL,
  REACH_TITLES,
  REACH_WORDS,
  editWarning,
  keyToolField,
  keysClipCaptured,
  reachBand,
  reachSummary,
  rowNote,
  rowNow,
  rowReach,
  rowStates,
  type Reach,
  type ReachNow,
  type ReachShown,
} from './tunerReach';
import { promptHtml, type PromptButton } from './prompts';
import { TUNER_KEY_BACK, TUNER_KEY_FWD, TUNER_MOUSE_KEY, TUNER_MOUSE_LABEL, TUNER_PLAY_KEY, TUNER_SPOT_KEY, TunerMouseCtl, type TunerMouseMode } from './tunerMouse';
import { emptyTarget, partLabel, pickOnBody, RIG_BONES, RIG_JOINTS, rowHasPart, rowKeyParts, tuneTarget, type BodyPart, type RigJoint } from './tunerTarget';
import type { TuneTunable } from '../anim/tuneRegistry';
import {
  bodyCarry,
  buildTabs,
  cycleTab,
  DropNav,
  groupForPath,
  groupPath,
  levelCount,
  levelName,
  levelOptions,
  loopGroups,
  plainGroupWord,
  plainLabel,
  plainSection,
  handRoles,
  roleWords,
  shownUnit,
  plainWords,
  sharedPrefix,
  tabOfSection,
  TUNER_SIZES,
  tunerScale,
  valueText,
  loopForGroup,
  plainLoop,
  stanceText,
  groupOpen,
  listScrollFor,
  guardLoopGroups,
  isGuardSection,
  whoSections,
  type BodyCarry,
  type LoopGroups,
  type TunerSize,
  type TunerTab,
  type TuneWho,
} from './tunerLayout';
import { TUNE_WHO } from '../anim/tuneGuard';
import { flags } from '../core/flags';
import { clearTouchIn } from '../player/freeView';
import { emptyPhoneLayout, GESTURE, TouchGesture, tunerPhoneLayout, type TunerPhoneLayout } from './tunerPhone';

/** What the barrel marker and (marlow-bays item 10) the selection marker read from the local player's rig (typed
 *  loosely: no player import; the joints are `CharacterRig`'s nodes). */
export type TuneRigView = {
  heldWeapon: TransformNode | null;
  gunSpan: { z1: number; bore: number };
} & Partial<Record<RigJoint, TransformNode>>;

/** (marlow-bays item 9) The keyboard and mouse source as the tuner's mouse mode drives it (`core/app.ts` sets it). */
export interface TuneMouseHost {
  /** The drag view on (the pointer free, a left drag on the scene is the look) or off (play's own pointer lock). */
  setFree(on: boolean): void;
  locked(): boolean;
  dragging(): boolean;
}

/** (marlow-bays item 26) The F3 debug readout as the tuner's Settings toggle drives it (the debug overlay sets it). */
export interface TuneDebugHost {
  visible(): boolean;
  set(on: boolean): void;
}

/** The loop the time controls drive (the debug overlay sets it: `GameLoop`). */
export interface TuneLoopView {
  timeScale: number;
  stepHeadless?(seconds: number): void;
}

/** (tuner-camera; tuner-ui) One registered section: its pickers (one per level of its group ids) and rows. */
interface Section {
  reg: TuneSection;
  /** The hidden picker of every group id (the old `anim-tune-pick-<id>`: tests and the console set it). */
  pick: HTMLSelectElement;
  /** One hidden select per level (the visible drop-down buttons read them). */
  levels: HTMLSelectElement[];
  rows: HTMLDivElement;
  wrap: HTMLDivElement;
  group: string;
  prefix: number;
  /** (item 29) The one line saying why some rows are greyed (nothing greyed: hidden). */
  eff: HTMLDivElement;
  /** (tuner-clarity S4) The part's reach line ("This part changes: Both"; no tagged row: hidden). */
  sum: HTMLDivElement;
}

/** (anim-joints J2 fix) The picker level of the section's own group: its path's depth, capped at the level count (the
 *  ids nest to different depths per section, so the deepest picker can be empty for the current group). */
function ownLevel(sec: Section): number {
  return Math.max(0, Math.min(groupPath(sec.group, sec.prefix).length, sec.levels.length) - 1);
}

/** The rendered camera the barrel marker projects through (a FreeCamera: vertical FOV, Euler rotation). */
interface MarkerCam {
  position: Vector3;
  rotation: Vector3;
  fov: number;
  minZ: number;
}

/** How far out along the barrel the marker's end dot sits (m). */
const MARK_DIST = 12;
const SAVE_DELAY = 400;
/** (pass 3) Follow switches group once the new state has held this long (ms): a brief state never rebuilds the rows. */
const FOLLOW_HOLD_MS = 300;
/** (tuner-clarity S4) The Now playing line changes once its key has held this long (ms): no flicker at a band edge. */
const PLAY_HOLD_MS = 300;
/** No key shown yet. */
const PLAY_NONE = -1e9;
/** (tuner-clarity S4, BRIEF A4) How long the edit warning shows (ms). */
const WARN_MS = 5000;
/** (fix round) No pad poll for this long (ms): the free view's pad input is cleared (a disconnected pad). */
const PAD_STALE_MS = 250;
/** One sim step (the step-frame button). */
const STEP_S = 1 / 60;
const FREE_LABEL: Record<FreeMode, string> = { off: 'Off (game camera)', orbit: 'Orbit her', fly: 'Fly' };
const SNAPS: readonly FreeSnap[] = ['front', 'side', 'back', 'top'];

/** (tuner-ui) The panel's look: explicit colours on every control (no browser default shows through), readable on dark. */
const CSS = `
.anim-tune{--tt-bg:rgba(4,6,7,0.9);--tt-fg:var(--text,#d6dfdb);--tt-hi:var(--text-hi,#fff);--tt-dim:var(--muted,#7d8a86);--tt-acc:var(--hl,#38e08c);--tt-acc-rgb:var(--hl-rgb,56,224,140);--tt-warn:var(--warn,#f0b43b);--tt-sel:var(--gold,#f0c24b);--tt-ctl:var(--panel-2,rgba(14,24,23,0.94));--tt-in:var(--ink,#040607);--tt-line:var(--line,rgba(214,223,219,0.16));
position:fixed;top:0;right:0;bottom:0;max-height:100dvh;z-index:150;display:flex;flex-direction:column;box-sizing:border-box;background:linear-gradient(270deg,rgba(4,6,7,0.95),rgba(4,6,7,0.88));border-left:1px solid var(--tt-line);color:var(--tt-fg);
font-family:var(--font-menu,'Barlow Condensed',system-ui,sans-serif);font-weight:500;line-height:1.3;padding:max(0.35em,env(safe-area-inset-top)) max(0.6em,env(safe-area-inset-right)) max(0.3em,env(safe-area-inset-bottom)) 0.6em;pointer-events:auto;overscroll-behavior:contain;font-variant-numeric:tabular-nums}
.anim-tune[hidden]{display:none!important}
.anim-tune [hidden]{display:none!important}
.anim-tune *{box-sizing:border-box}
.anim-tune button,.anim-tune input,.anim-tune select,.anim-tune textarea{font:inherit;color:var(--tt-fg);-webkit-text-fill-color:var(--tt-fg)}
.anim-tune .tt-btn{-webkit-appearance:none;appearance:none;background:var(--tt-ctl);border:1px solid var(--tt-line);border-radius:2px;padding:0.05em 0.6em;min-height:1.9em;cursor:pointer;text-align:left;font-weight:600;letter-spacing:0.02em}
.anim-tune .tt-btn:hover{border-color:rgba(var(--tt-acc-rgb),0.6)}
.anim-tune .tt-btn:disabled{opacity:0.4;cursor:default}
.anim-tune .tt-btn.on{box-shadow:inset 0 -2px 0 var(--tt-acc);color:var(--tt-hi);-webkit-text-fill-color:var(--tt-hi)}
.anim-tune input[type=number],.anim-tune input[type=text],.anim-tune input[type=search],.anim-tune textarea{-webkit-appearance:none;appearance:none;background:var(--tt-in);border:1px solid var(--tt-line);border-radius:2px;min-height:1.9em;padding:0 0.35em}
.anim-tune input[type=search]{width:100%}
.anim-tune input[type=search]:focus,.anim-tune input[type=number]:focus{outline:none;border-color:var(--tt-acc)}
.anim-tune input[type=checkbox]{accent-color:var(--tt-acc);width:1.1em;height:1.1em;margin:0 0.35em 0 0;flex:none}
.anim-tune input[type=range]{accent-color:var(--tt-acc);width:100%;min-width:0;height:1.8em;margin:0;background:transparent;cursor:pointer}
.anim-tune .tt-head{display:flex;align-items:center;gap:0.4em;flex:none;padding-bottom:0.2em}
.anim-tune .tt-title{flex:1;color:var(--tt-hi);font-weight:700;font-size:1.15em;letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.anim-tune .anim-tune-pad{color:var(--tt-warn);font-size:0.85em;white-space:nowrap;letter-spacing:0.04em}
.anim-tune .anim-tune-fold,.anim-tune .anim-tune-close{min-width:1.9em;text-align:center;padding:0}
.anim-tune .anim-tune-tabs{display:flex;flex-wrap:wrap;align-items:center;gap:0 0.1em;flex:none;margin:0 0 0.3em;border-bottom:1px solid var(--tt-line)}
.anim-tune .tt-tab{flex:none;padding:0.25em 0.45em 0.3em;background:transparent;border:none;border-bottom:2px solid transparent;border-radius:0;cursor:pointer;white-space:nowrap;-webkit-appearance:none;appearance:none;font-size:0.92em;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--tt-dim);-webkit-text-fill-color:var(--tt-dim)}
.anim-tune .tt-tab:hover{background:rgba(255,255,255,0.05)}
.anim-tune .tt-tab.active{color:var(--tt-hi);-webkit-text-fill-color:var(--tt-hi);border-bottom-color:var(--tt-acc)}
.anim-tune .tt-bump{flex:none;display:inline-flex;align-items:center}
.anim-tune .anim-tune-playbar{flex:none;border-bottom:1px solid var(--tt-line);padding:0 0 0.25em;margin-bottom:0.25em}
.anim-tune.tt-folded{bottom:auto}
.anim-tune.tt-folded .anim-tune-playbar{display:none!important}
.anim-tune .anim-tune-keyhint{color:var(--tt-warn)}
.anim-tune .anim-tune-mouse{min-height:1.7em;font-size:0.85em;white-space:nowrap}
.anim-tune.tt-gamecam{pointer-events:none;opacity:0.8}
.anim-tune.tt-gamecam .anim-tune-mouse{pointer-events:auto}
.anim-tune .tt-what{display:flex;flex-wrap:wrap;align-items:center;gap:0.25em 0.5em;margin:0.1em 0 0.3em}
.anim-tune .tt-what .tt-field{gap:0.3em}
.anim-tune .tt-what .tt-drop{min-width:5.5em}
.anim-tune .anim-tune-more{border-top:1px solid var(--tt-line);margin-top:0.5em;padding-top:0.2em}
.anim-tune .tt-more-h{-webkit-appearance:none;appearance:none;display:flex;align-items:center;gap:0.4em;width:100%;background:transparent;border:none;padding:0.35em 0.2em;cursor:pointer;text-align:left;font-size:0.85em;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--tt-fg);-webkit-text-fill-color:var(--tt-fg);min-height:1.9em}
.anim-tune .tt-more-h::before{content:'▸';color:var(--tt-acc);-webkit-text-fill-color:var(--tt-acc);width:0.8em}
.anim-tune .tt-more-h.open::before{content:'▾'}
.anim-tune .anim-tune-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0.1em 0.3em 0.1em 0;scrollbar-width:thin;scrollbar-color:rgba(214,223,219,0.3) transparent}
.anim-tune .tt-bar{display:flex;flex-wrap:wrap;gap:0.3em 0.45em;align-items:center;margin:0.2em 0}
.anim-tune .tt-field{display:flex;align-items:center;gap:0.4em;min-height:1.9em}
.anim-tune .tt-grow{flex:1;min-width:9em}
.anim-tune .tt-h{display:block;font-size:0.78em;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:var(--tt-dim);margin:0.45em 0 0.15em}
.anim-tune .tt-block{border-top:1px solid var(--tt-line);padding:0.1em 0 0.3em;margin:0.2em 0}
.anim-tune .tt-note{color:var(--tt-dim);font-size:0.85em}
.anim-tune .tt-val{min-width:3.2em;color:var(--tt-hi);font-weight:600;text-align:right}
.anim-tune .tt-drop{display:inline-flex;justify-content:space-between;align-items:center;gap:0.5em;min-width:7em;max-width:15em;color:var(--tt-hi);-webkit-text-fill-color:var(--tt-hi)}
.anim-tune .tt-drop span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.anim-tune .tt-drop::after{content:'▾';color:var(--tt-acc);-webkit-text-fill-color:var(--tt-acc)}
.anim-tune .anim-tune-drop-list{position:absolute;z-index:5;background:#0a0f10;border:1px solid var(--tt-acc);border-radius:2px;overflow-y:auto;box-shadow:0 6px 16px rgba(0,0,0,0.7)}
.anim-tune .tt-opt{padding:0.15em 0.7em;min-height:1.9em;display:flex;align-items:center;cursor:pointer;white-space:nowrap}
.anim-tune .tt-opt:hover{background:rgba(255,255,255,0.06)}
.anim-tune .tt-opt.cur::before{content:'✓';color:var(--tt-acc);margin-right:0.4em}
.anim-tune .tt-opt.hi{background:linear-gradient(90deg,rgba(var(--tt-acc-rgb),0.34),rgba(var(--tt-acc-rgb),0.1));box-shadow:inset 3px 0 0 var(--tt-acc);color:var(--tt-hi);font-weight:700}
.anim-tune .tt-grp{-webkit-appearance:none;appearance:none;display:flex;align-items:center;gap:0.4em;width:100%;background:transparent;border:none;border-top:1px solid var(--tt-line);padding:0.3em 0.2em 0.15em;margin-top:0.15em;cursor:pointer;text-align:left;font-size:0.8em;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:var(--tt-dim);-webkit-text-fill-color:var(--tt-dim)}
.anim-tune .tt-grp:hover{color:var(--tt-fg);-webkit-text-fill-color:var(--tt-fg)}
.anim-tune .tt-grp::before{content:'▸';color:var(--tt-acc);-webkit-text-fill-color:var(--tt-acc);width:0.8em}
.anim-tune .tt-grp.open::before{content:'▾'}
.anim-tune .tt-grp .n{margin-left:auto;letter-spacing:0.04em}
.anim-tune .tt-grp .chg{color:var(--tt-warn);-webkit-text-fill-color:var(--tt-warn)}
.anim-tune .tt-gbody{display:grid;gap:1px}
.anim-tune .tt-row{display:grid;grid-template-columns:minmax(5em,38%) minmax(3em,1fr) 4.4em 1.1em 1.3em;align-items:center;gap:0.3em;min-height:2em;padding:0 0.1em 0 0.15em;border-radius:0}
.anim-tune .tt-row:hover{background:rgba(255,255,255,0.035)}
.anim-tune .tt-name{display:flex;align-items:center;min-width:0;overflow:hidden;white-space:nowrap;color:var(--tt-fg)}
.anim-tune .tt-name-text{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.anim-tune .tt-row.tt-off{opacity:0.42}
.anim-tune .anim-tune-playing{flex:none;color:var(--tt-hi);font-weight:600;font-size:0.9em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 0 0.25em;min-height:1.3em}
.anim-tune.tt-folded .anim-tune-playing,.anim-tune.tt-folded .anim-tune-warn{display:none!important}
.anim-tune .anim-tune-warn,.anim-tune .tt-warn{color:var(--tt-warn);font-size:0.82em;font-weight:600;line-height:1.25;margin:0.1em 0 0.25em}
.anim-tune .tt-warn{padding:0.1em 0.3em 0.1em 0.5em;border-left:3px solid var(--tt-warn);background:rgba(240,180,59,0.08)}
.anim-tune .tt-reach{display:inline-block;flex:none;margin-left:0.45em;padding:0 0.4em;border-radius:2px;font-size:0.72em;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;vertical-align:middle;border:1px solid currentColor;pointer-events:none}
.anim-tune .tt-reach-mocap{color:#7cc4ff;-webkit-text-fill-color:#7cc4ff}
.anim-tune .tt-reach-keyed{color:#f0b43b;-webkit-text-fill-color:#f0b43b}
.anim-tune .tt-reach-both{color:#b9c4c0;-webkit-text-fill-color:#b9c4c0}
.anim-tune .tt-reach-off{color:#7d8a86;-webkit-text-fill-color:#7d8a86;border-style:dashed}
.anim-tune .tt-reach-sum{margin:0 0 0.2em}
.anim-tune .studio-slide.warn{color:var(--tt-warn);-webkit-text-fill-color:var(--tt-warn);font-weight:700}
.anim-tune .anim-tune-effect{color:var(--tt-warn);font-size:0.8em;margin:0 0 0.2em}
.anim-tune .tt-row.tt-sel{background-color:rgba(240,194,75,0.13);box-shadow:inset 3px 0 0 var(--tt-sel)}
.anim-tune .tt-row.tt-sel .tt-name{color:var(--tt-hi);font-weight:700}
.anim-tune .anim-tune-sel{color:var(--tt-sel);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.anim-tune .anim-tune-num{width:100%;min-width:0;font-weight:700;text-align:right;color:var(--tt-hi);-webkit-text-fill-color:var(--tt-hi);font-size:1.05em}
.anim-tune .anim-tune-num.chg{color:var(--tt-warn);-webkit-text-fill-color:var(--tt-warn)}
.anim-tune .tt-unit{color:var(--tt-dim);font-size:0.9em}
.anim-tune .tt-x{-webkit-appearance:none;appearance:none;background:none;border:none;padding:0;min-height:1.8em;cursor:pointer;color:var(--tt-dim);-webkit-text-fill-color:var(--tt-dim);text-align:center}
.anim-tune .tt-x:hover{color:var(--tt-hi);-webkit-text-fill-color:var(--tt-hi)}
.anim-tune .anim-tune-hint{color:var(--tt-dim);font-size:0.78em;margin:-0.2em 0 0.15em 1.6em}
.anim-tune .anim-tune-menu{display:none;flex-direction:column;gap:0.15em;margin:0.2em 0;padding:0.25em;border:1px solid var(--tt-acc);background:#0a0f10;flex:none}
.anim-tune .anim-tune-info{flex:none;color:var(--tt-dim);font-size:0.85em;padding:0.2em 0 0.1em;border-top:1px solid var(--tt-line)}
.anim-tune .anim-tune-hints{flex:none;color:var(--tt-fg);font-size:0.85em;font-weight:600;padding:0.3em 0 0.1em;border-top:1px solid var(--tt-line);display:flex;flex-wrap:wrap;gap:0.2em 0.8em;align-items:center;min-height:2.2em}
.anim-tune .anim-tune-hints .tt-h1{display:inline-flex;align-items:center;gap:0.25em;white-space:nowrap}
.anim-tune .anim-tune-hints .glyph{height:1.55em;min-width:1.55em;font-size:0.85em}
.anim-tune .anim-tune-hints .glyph.round{width:1.55em}
.anim-tune .tt-pad,.anim-tune .tt-keys{display:contents}
body.input-gamepad .anim-tune .tt-keys{display:none}
body:not(.input-gamepad) .anim-tune .tt-pad{display:none}
body:not(.input-gamepad) .anim-tune .tt-bump{display:none}
.anim-tune .tt-focus{outline:none!important;background:linear-gradient(90deg,rgba(var(--tt-acc-rgb),0.34) 0,rgba(var(--tt-acc-rgb),0.12) 70%,rgba(var(--tt-acc-rgb),0.04) 100%)!important;box-shadow:inset 3px 0 0 var(--tt-acc)!important;color:var(--tt-hi)}
.anim-tune .tt-focus .tt-name,.anim-tune label.tt-focus,.anim-tune .tt-btn.tt-focus{color:var(--tt-hi);-webkit-text-fill-color:var(--tt-hi);font-weight:700}
.anim-tune .tt-edit{outline:none!important;background:linear-gradient(90deg,rgba(240,180,59,0.32) 0,rgba(240,180,59,0.1) 80%)!important;box-shadow:inset 3px 0 0 var(--tt-warn)!important}
.anim-tune textarea{width:100%;height:8em}
body.tt-studio .hud,body.tt-studio .hud-world,body.tt-studio .mouse-capture-hint{display:none!important}
body.tt-docked #game{width:calc(100% - var(--tt-dock-w,0px))!important;right:auto!important}
.anim-tune .tt-handle{display:none}
.anim-tune.tt-phone{--tt-t:30px;overflow-y:auto;touch-action:pan-y;-webkit-overflow-scrolling:touch;padding:0 max(0.5em,env(safe-area-inset-right)) max(0.25em,env(safe-area-inset-bottom)) max(0.5em,env(safe-area-inset-left))}
.anim-tune .tt-top{flex:none}
.anim-tune.tt-phone .tt-top{position:sticky;top:0;z-index:4;background:#040607;margin:0 -0.5em;padding:max(0px,env(safe-area-inset-top)) 0.5em 0}
.anim-tune.tt-phone .tt-head{flex-wrap:nowrap;gap:0.3em;padding:0 0 0.1em}
.anim-tune.tt-phone .tt-title,.anim-tune.tt-phone .anim-tune-fold{display:none}
.anim-tune.tt-phone .anim-tune-tabs{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;margin-bottom:0.2em;overscroll-behavior-x:contain}
.anim-tune.tt-phone .anim-tune-tabs::-webkit-scrollbar{display:none}
.anim-tune.tt-phone .anim-tune-playbar{margin-bottom:0.15em}
.anim-tune.tt-phone .anim-tune-playbar .tt-bar{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
.anim-tune.tt-phone .anim-tune-playbar .tt-bar::-webkit-scrollbar{display:none}
.anim-tune.tt-phone .anim-tune-mouse{display:none}
.anim-tune.tt-phone.tt-folded .anim-tune-info{display:none}
.anim-tune.tt-phone .tt-handle{display:flex;align-items:center;justify-content:center;gap:0.6em;flex:1;min-width:0;min-height:var(--tt-t);-webkit-appearance:none;appearance:none;background:transparent;border:none;cursor:pointer;color:var(--tt-fg);-webkit-text-fill-color:var(--tt-fg);font-weight:600;letter-spacing:0.08em;text-transform:uppercase;font-size:0.85em}
.anim-tune.tt-phone .tt-handle::before{content:'';width:3em;height:4px;border-radius:2px;background:rgba(214,223,219,0.55)}
.anim-tune.tt-phone .anim-tune-body{flex:none;overflow:visible;min-height:auto;touch-action:pan-y}
.anim-tune.tt-phone .anim-tune-hints{min-height:0;font-size:0.8em}
.anim-tune.tt-phone .tt-bar{gap:0.25em 0.35em;margin:0.15em 0}
.anim-tune.tt-phone .tt-btn,.anim-tune.tt-phone .tt-tab,.anim-tune.tt-phone .tt-opt,.anim-tune.tt-phone .tt-grp,.anim-tune.tt-phone .tt-more-h,.anim-tune.tt-phone .tt-field,.anim-tune.tt-phone input[type=number],.anim-tune.tt-phone input[type=text]{min-height:var(--tt-t)}
.anim-tune.tt-phone .tt-btn{min-width:var(--tt-t);padding:0 0.5em;white-space:nowrap;flex:none}
.anim-tune.tt-phone .tt-tab{padding:0 0.45em}
.anim-tune.tt-phone input[type=range]{height:var(--tt-t);touch-action:none}
.anim-tune.tt-phone input[type=checkbox]{width:calc(var(--tt-t) * 0.55);height:calc(var(--tt-t) * 0.55)}
.anim-tune.tt-phone .tt-x{min-width:var(--tt-t);min-height:var(--tt-t);font-size:1.15em}
.anim-tune.tt-phone .tt-row{grid-template-columns:minmax(0,1fr) 4.6em auto var(--tt-t);grid-template-areas:"name val unit x" "range range range range";gap:0 0.25em;padding:0 0 0.15em}
.anim-tune.tt-phone .tt-row>.tt-name{grid-area:name}
.anim-tune.tt-phone .tt-row>input[type=range]{grid-area:range}
.anim-tune.tt-phone .tt-row>.anim-tune-num{grid-area:val}
.anim-tune.tt-phone .tt-row>.tt-unit{grid-area:unit}
.anim-tune.tt-phone .tt-row>.tt-x{grid-area:x}
.anim-tune.tt-drawer{top:0;bottom:0;right:0;left:auto;max-height:100dvh}
.anim-tune.tt-drawer.tt-folded{bottom:auto;overflow:visible}
.anim-tune.tt-sheet{top:auto;left:0;right:0;bottom:0;border-left:none;border-top:1px solid var(--tt-line);background:rgba(4,6,7,0.95)}
.anim-tune.tt-sheet.tt-folded{height:auto!important;overflow:visible}
body.tt-docked-b #game{height:calc(100% - var(--tt-dock-h,0px))!important;bottom:auto!important}
`;

let cssDone = false;
function injectCss(): void {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  const s = document.createElement('style');
  s.dataset.tuner = 'ui';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** A pad glyph for the hint strip (every pad style; CSS shows the one in use). */
function padGlyph(b: PromptButton | 'DPAD' | 'VIEW' | 'R3' | 'LSTICK'): string {
  if (b === 'DPAD' || b === 'VIEW' || b === 'R3' || b === 'LSTICK') {
    const t = b === 'DPAD' ? ['D-pad', 'D-pad', 'D-pad'] : b === 'VIEW' ? ['View', 'Create', '−'] : b === 'R3' ? ['R3', 'R3', 'RS'] : ['L stick', 'L stick', 'L stick'];
    return `<span class="glyph g-pad g-xbox pill">${t[0]}</span><span class="glyph g-pad g-ps pill">${t[1]}</span><span class="glyph g-pad g-nin pill">${t[2]}</span>`;
  }
  return promptHtml(b).replace(/<span class="glyph g-key">[^<]*<\/span>/, '');
}

/** One hint: the glyphs, then the words. */
function hint(glyphs: (PromptButton | 'DPAD' | 'VIEW' | 'R3' | 'LSTICK')[], words: string): string {
  return `<span class="tt-h1">${glyphs.map(padGlyph).join('')}<span>${words}</span></span>`;
}

/**
 * (anim-tuner; tuner-ui layout pass) The animation tuner panel (F3 > Anim, Pause > Animation tuner, Settings > Graphics,
 * docked in the Anim Studio). Tabs across the top (LB / RB, or a click): View, Body, Hands & feet, Weapon, Stepping,
 * Weight, Camera, Keys, Co-op, then any section a later file registers, then Settings (`tunerLayout.ts`). A tab shows
 * one thing at a time: a drop-down list for the part (when the tab holds more than one section), one for the state (and
 * one per further level of its group ids: weapon then state, clip then key), then that group's sliders, each with its
 * value always shown. Every list opens as a visible drop-down (A or a click; D-pad moves, A picks, B backs out). The
 * hint strip is reserved space at the bottom (pad glyphs with a pad, keys otherwise). Reset per slider (X, or x), per
 * group and all; Export downloads `anim-tune-<date>.json`; the values save to the tuner's own IndexedDB store.
 *
 * Pad (`TunePadCtl`, map in `docs/archive/anim-tuner/STATE.md` "Pad map"): LB / RB tabs, D-pad rows, A open / pick / edit, B back,
 * X reset row, Y the more menu, View hands the pad to the game (or the free view) and back, Menu closes. With "Pause game
 * while tuning" on (default) the game holds still while the panel has the pad (not in the Anim Studio, where the loop
 * player's Play / Pause rules, nor in co-op). While the pause menu is open the menus get the pad. The barrel marker is a
 * 2D overlay (no scene meshes).
 */
export class AnimTunePanel {
  readonly el: HTMLDivElement;
  private open = false;
  private folded = false;
  private body: HTMLDivElement;
  private tabBar: HTMLDivElement;
  private foldBtn: HTMLButtonElement;
  private shareOut: HTMLTextAreaElement;
  /** Told when the panel opens or closes (the overlay's Anim button state). */
  onOpenChange: ((open: boolean) => void) | null = null;
  private follow = true;
  private followBox: HTMLInputElement;
  private markerBox: HTMLInputElement;
  /** A slider is held (mouse or touch): follow never rebuilds the rows under it. */
  private pressing = false;
  /** Follow's pending state per section and since when (ms): it switches once the state has held FOLLOW_HOLD_MS. */
  private cand: string[] = [];
  private candAt: number[] = [];
  private changedOnly = false;
  private marker = false;
  private now: HTMLDivElement;
  private info: HTMLDivElement;
  private sections: Section[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private scene: Scene | null = null;
  private nextInfo = 0;
  /** (anim-bake-1022) A Reset baked notice waiting for the panel to open ('' none). */
  private bakedNotice = '';
  private nextDrops = 0;
  /** The local player's rig (set by the debug overlay). */
  rig: (() => TuneRigView | null) | null = null;
  /** (tuner-camera) The loop the time controls drive (set by the debug overlay). */
  loop: TuneLoopView | null = null;
  // --- tabs (tuner-ui)
  private tabs: TunerTab[] = [];
  private tabIdx = 0;
  private readonly tabEls = new Map<string, HTMLDivElement>();
  private readonly tabBtns = new Map<string, HTMLButtonElement>();
  /** The part (section id) each multi-section tab shows, and its part picker. */
  private readonly partOf = new Map<string, string>();
  private readonly partSel = new Map<string, HTMLSelectElement>();
  // --- (marlow-bays item 24, track A) "Who": Wren's rows or the guards' (the Body, Stepping and Weight tabs' what-row)
  private whoSel: HTMLSelectElement;
  /** A grey line in a tab with no guard rows while Who is Guard ("these are Wren's"). */
  private whoNote: HTMLDivElement;
  // --- drop-down lists (tuner-ui)
  private readonly dropSel = new WeakMap<HTMLElement, HTMLSelectElement>();
  private readonly dropBtns: HTMLButtonElement[] = [];
  private readonly drop = new DropNav();
  private dropBtn: HTMLButtonElement | null = null;
  private dropList: HTMLDivElement;
  // --- pad
  private readonly pad = new TunePadCtl();
  private padLine: HTMLSpanElement;
  private hint: HTMLDivElement;
  private hintKey = '';
  /** The focused control's `data-pad` key, its index in the focus list, the element and its mark. */
  private padKey = '';
  private padIdx = 0;
  private padEl: HTMLElement | null = null;
  private padMark: HTMLElement | null = null;
  /** Left stick adjust carried between frames (value units, below one step). */
  private stickAcc = 0;
  /** The section the focus was last in (LT / RT, Reset group). */
  private lastSec = 0;
  /** The Y menu, the focus key before it opened, Reset all armed (A again confirms). */
  private menu: HTMLDivElement;
  private menuOpen = false;
  private menuBack = '';
  private confirmAll = false;
  private readonly rowShow = new WeakMap<HTMLElement, () => void>();
  private readonly changeEv = new Event('change');
  private readonly inputEv = new Event('input');
  // --- time and free view
  private freeSel: HTMLSelectElement;
  /** (pass 2) The game speed slider (0.1-1x) and its value. */
  private speedIn: HTMLInputElement;
  private speedVal: HTMLSpanElement;
  private stepBtn: HTMLButtonElement;
  private coopNote: HTMLDivElement;
  private lockLine: HTMLSpanElement;
  /** (item 29 phase 2) The orbit sliders (around her, tilt, distance) and the values they show (rounded; NaN none). */
  private readonly orbitIn: HTMLInputElement[] = [];
  private readonly orbitVal: HTMLSpanElement[] = [];
  private readonly orbitShown = [Number.NaN, Number.NaN, Number.NaN];
  private unlockBtn: HTMLButtonElement;
  private readonly snapBtns = new Map<FreeSnap, HTMLButtonElement>();
  /** (pass 2) Whether a co-op session runs (set by the app): the time controls are off then. */
  coop: (() => boolean) | null = null;
  /** (tuner-ui) Whether the pause menu is open (set by the app): the menus get the pad meanwhile. */
  menuPaused: (() => boolean) | null = null;
  /** (G1) Whether the tuner may open here (set by the app: the Test Chamber only, `tunerGate.ts`); unset = never. */
  allowed: (() => boolean) | null = null;
  /** (G2c) Whether the animation stage runs in this match (set by the app): the pause menu's tuner row needs it. */
  stageOn: (() => boolean) | null = null;
  private coopOn = false;
  /** (fix round) When the pad was last polled (ms): the free view's pad input clears once it goes stale. */
  private lastPoll = 0;
  /** (pass 2) The bypass held by pad (R3) and by key (Backquote). */
  private padBypass = false;
  private keyBypass = false;
  private fileIn: HTMLInputElement;
  private readonly rowNum = new WeakMap<HTMLElement, HTMLInputElement>();
  private hudBox: HTMLInputElement;
  /** (tuner-ui) "Pause game while tuning" (the old "freeze on View", on by default). */
  private freezeBox: HTMLInputElement;
  private pauseBtn: HTMLButtonElement;
  private sizeSel: HTMLSelectElement;
  private size: TunerSize = 'M';
  /** The game is frozen (time scale 0), by the tuner holding the pad (auto) or by Pause; the running scale to go back to. */
  private frozen = false;
  private autoFrozen = false;
  private tuneWant = false;
  private runScale = 1;
  // --- barrel marker (2D overlay)
  private markCanvas: HTMLCanvasElement | null = null;
  private markRectAt = 0;
  private markW = 0;
  private markH = 0;
  private readonly markA = new Vector3();
  private readonly markB = new Vector3();
  private readonly markDir = new Vector3();
  private readonly markSA = { x: 0, y: 0, z: 0 };
  private readonly markSB = { x: 0, y: 0, z: 0 };
  // --- (marlow-bays item 9) the mouse mode (drag view / game camera) with keyboard and mouse
  mouseHost: TuneMouseHost | null = null;
  /** (mocap-trial) The game's "Mocap locomotion" setting (set by `App`; null: the box stays off and disabled). */
  mocapHost: { get(): boolean; set(on: boolean): void } | null = null;
  /** (mixamo-retarget Toggle) The game's Animation source setting (set by `App`; null: the Studio's switch is disabled). */
  animSourceHost: { get(): string; set(s: string): void } | null = null;
  private mocapBox: HTMLInputElement | null = null;
  private readonly mouseCtl = new TunerMouseCtl();
  private mouseBtn: HTMLButtonElement;
  // --- (marlow-bays item 13) "Loop on the spot" in the header (the studio), and a loop picked from a tab's state list
  private spotBtn: HTMLButtonElement;
  private loopFromTab = false;
  // --- (marlow-bays T1a, items 15 and 18) the Keys tab: its buttons, readout, Mirror box, and the key the picker shows
  private keyPicking = false;
  private keyShown = -1;
  private keyClipShown = '';
  private keyReadoutEl: HTMLDivElement | null = null;
  private keyMirrorBox: HTMLInputElement | null = null;
  private keyBackBtn: HTMLButtonElement | null = null;
  private keyFwdBtn: HTMLButtonElement | null = null;
  private nextKeys = 0;
  // --- (marlow-bays item 23) the Keys tab's timing control: earlier / later, the slider, the readout
  private keyEarlyBtn: HTMLButtonElement | null = null;
  private keyLateBtn: HTMLButtonElement | null = null;
  private keyTimeRange: HTMLInputElement | null = null;
  private keyTimeEl: HTMLDivElement | null = null;
  // --- (marlow-bays item 25) the Keys tab's "Add key" / "Delete key"
  private keyAddBtn: HTMLButtonElement | null = null;
  private keyDelBtn: HTMLButtonElement | null = null;
  // --- (marlow-bays item 30) the Keys tab's key tools (wave, apply to keys, smooth between, compare)
  private keyTools: TunerKeyTools | null = null;
  // --- (marlow-bays item 10) the selected row (its pad key), its target on the body and the scene marker
  private selKey = '';
  /** The pad focus last taken as the selection. */
  private selPadKey = '';
  private selSec = '';
  private selRow: HTMLElement | null = null;
  private selLine: HTMLDivElement | null = null;
  private readonly selTarget = emptyTarget();
  /** The selection marker as last drawn (overlay pixels; the test hook). */
  private readonly selMark = { shown: false, ax: 0, ay: 0, bx: 0, by: 0 };
  // --- (anim-studio) snapshots (undo / redo, A/B, presets) and the studio section
  private readonly snaps: TuneSnapshotsUi;
  readonly studioUi: StudioPanel;
  /** The game speed slider's top: 1x, 2x inside the studio. */
  private speedMax: number = GAME_SPEED.max;
  private readonly loopOut: LoopGroups = { body: '', clip: '', team: '', trav: '', step: '', weight: '' };
  private readonly carryOut: BodyCarry = { joint: '', ik: '', handState: '', gunState: '', step: '', weight: '' };
  /** (tuner-ui) The Anim Studio was on at the last look: leaving it turns follow back on (a loop pick turned it off). */
  private wasStudio = false;
  // --- (marlow-bays T2) the part last picked on her (item 29: it selects its first slider, never filters), row groups,
  // the dock
  private bodyPart: BodyPart = '';
  // --- (marlow-bays item 29) "More" (collapsed): presets, files, playback extras, the panel's settings; the highlight
  private more: HTMLDivElement;
  private moreHead: HTMLButtonElement;
  private moreBody: HTMLDivElement;
  private moreOpen = false;
  private highlightBox: HTMLInputElement;
  /** The highlight on her (a small dot on the joint); off: nothing is drawn on her. Saved with the panel's settings. */
  private highlight = true;
  /** A row group opened or closed by hand (`<section>|<label>`). */
  private readonly grpOpen = new Map<string, boolean>();
  private readonly rowScratch = emptyTarget();
  /** The width the studio's canvas gives up to the docked panel (px; 0 none). */
  private dockW = 0;
  /** (phase 2) The game HUD hidden: the Anim Studio is on (not in co-op). */
  private studioHud = false;
  /** (T2 fix round) The engine kept across scenes (the dock's resize), and a resize owed while no scene was set. */
  private engine: { resize(): void } | null = null;
  private resizePending = false;
  /** The panel width set by `applySize` (px). */
  private panelW = 0;
  private readonly down = { on: false, x: 0, y: 0, t: 0 };
  // --- (marlow-bays item 26) the phone layout (drawer / sheet), the touch camera and the debug readout toggle
  private readonly layout: TunerPhoneLayout = emptyPhoneLayout();
  /** The viewport and size the layout was last made for. */
  private sizeKey = '';
  private handle: HTMLButtonElement;
  /** The height the studio's canvas gives up to the bottom sheet (px; 0 none). */
  private dockH = 0;
  private readonly gesture = new TouchGesture();
  /** (item 29 phase 2) More's "View aids" block (the studio only). */
  private aidsB!: HTMLElement;
  /** (item 29 phase 2) The header, tabs and playback bar (sticky together on a drawer / sheet). */
  private top!: HTMLDivElement;
  /** (item 29) How the shown state plays now (the greyed rows follow it). */
  private effMode: EffectMode = 'procedural';
  // --- (tuner-clarity S4) the Now playing line: the key last seen and since when (ms), the key and entry shown, the text
  private playEl: HTMLDivElement;
  private playKey = PLAY_NONE;
  private playKeyAt = 0;
  private playEnt = '';
  private playShown = PLAY_NONE;
  private playShownEnt = '';
  private playClip: KeyedClip | null = null;
  private playShownClip: KeyedClip | null = null;
  private playText = '';
  /** What plays now as `tunerReach.ts` reads it (one object, mutated each frame) and the band last applied to the badges. */
  private readonly reachNow: ReachNow = { state: null, mocapShare: 0, band: 'handMade', switchOn: false, drawn: false };
  private reachBand = -1;
  /** The edit warning: the header strip, the strip under the edited row, its timer, the text shown, the More > Panel box. */
  private warnEl: HTMLDivElement;
  private rowWarnEl: HTMLDivElement;
  private warnTimer: ReturnType<typeof setTimeout> | null = null;
  private warnText = '';
  private warnBox: HTMLInputElement | null = null;
  /** The touch camera's last move (the test hook). */
  private readonly touchLast = { kind: '', taps: 0 };
  /** The F3 readout (the debug overlay sets it). */
  debugHost: TuneDebugHost | null = null;
  private debugBox: HTMLInputElement;
  /** On a touch device (any layout): the readout the tuner's toggle chose (saved; default off). */
  private phoneDebug = false;

  constructor() {
    injectCss();
    const el = (this.el = document.createElement('div'));
    el.className = 'anim-tune';
    el.hidden = true;
    // (pass 2) the panel's own pointer / touch / wheel input never reaches the game, the menus' focus or the look
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'wheel', 'touchstart', 'touchmove', 'touchend', 'contextmenu']) {
      el.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
    }
    const kit: PanelKit = { btn: (l, f, k, c) => this.mkBtn(l, f, k, c), check: (p, l, on, f, k, c) => this.mkCheck(p, l, on, f, k, c), sel: (p, l, o, f, k, c) => this.mkSel(p, l, o, f, k, c), bar: () => this.mkBar() };
    this.snaps = new TuneSnapshotsUi(kit, { rebuild: () => this.rebuildAll(), info: (t) => this.flashInfo(t) });
    this.studioUi = new StudioPanel(kit, {
      freeze: (on) => {
        if (on !== this.frozen) this.setFrozen(on);
      },
      frozen: () => this.frozen,
      setSpeed: (v) => this.setTimeScale(v),
      speed: () => this.runScale,
      setFreeMode: (m) => this.setFreeMode(m),
      busy: (e) => document.activeElement === e,
      lock: (s) => this.lockSnap(s),
      picked: (id) => this.applyLoop(id),
      saveUi: () => this.saveUi(),
      animSource: () => this.animSourceHost?.get() ?? null,
      setAnimSource: (s) => this.animSourceHost?.set(s),
    });
    // header: title, the pad line, fold, close (folded, the panel is this one line)
    const head = document.createElement('div');
    head.className = 'tt-head';
    const title = document.createElement('span');
    title.className = 'tt-title';
    title.textContent = 'Anim tuner';
    this.padLine = document.createElement('span');
    this.padLine.className = 'anim-tune-pad';
    this.foldBtn = this.mkBtn('_', () => this.setFolded(!this.folded), 'fold', 'anim-tune-fold');
    this.foldBtn.title = 'Fold';
    delete this.foldBtn.dataset.pad;
    const close = this.mkBtn('×', () => this.hide(), 'close', 'anim-tune-close');
    close.title = 'Close';
    delete close.dataset.pad;
    // (marlow-bays item 9) the mouse mode, shown and toggled (also the key)
    this.mouseBtn = this.mkBtn(TUNER_MOUSE_LABEL.drag, () => this.toggleMouse(), 'mouse', 'anim-tune-mouse');
    this.mouseBtn.title = `Mouse mode (${TUNER_MOUSE_KEY}): drag view (drag the scene to turn the camera, wheel zooms, the panel takes clicks) or game camera (mouse look; the panel ignores the mouse)`;
    delete this.mouseBtn.dataset.pad;
    // (marlow-bays item 13) loop on the spot from every tab (the studio only; also the key and L3); (T1a, item 16) in the
    // playback bar docked under the tabs (it was the header's)
    this.spotBtn = this.mkBtn('On the spot: on', () => this.toggleSpot(), 'pb:spot', 'anim-tune-spot');
    this.spotBtn.title = `Loop on the spot (${TUNER_SPOT_KEY}, pad L3): a moving state runs in place, or off: she really moves`;
    this.spotBtn.hidden = true;
    this.studioUi.bar.firstElementChild?.append(this.spotBtn);
    // (marlow-bays item 26) on a phone: the grab handle over the header (a tap collapses / expands the drawer or sheet)
    this.handle = document.createElement('button');
    this.handle.type = 'button';
    this.handle.className = 'tt-handle anim-tune-handle';
    this.handle.textContent = 'Hide panel';
    this.handle.addEventListener('click', () => {
      this.setFolded(!this.folded);
      this.handle.blur();
    });
    head.append(this.handle, title, this.padLine, this.mouseBtn, this.foldBtn, close);
    this.tabBar = document.createElement('div');
    this.tabBar.className = 'anim-tune-tabs';
    // (pass 2) the Y menu: the rarer actions, by pad
    const menu = (this.menu = document.createElement('div'));
    menu.className = 'anim-tune-menu';
    const body = (this.body = document.createElement('div'));
    body.className = 'anim-tune-body';
    // (marlow-bays item 29, the pad drop-down bug) an open list closes when the person scrolls the panel (the wheel, a
    // swipe) outside it, never on a scroll event: the pad's own focus scroll (or the list's) fired one and closed the
    // list it had just opened or moved in. The list sits in the panel's scrolled content, so a scroll of the whole
    // panel (the phone layout) carries it along.
    const userScroll = (ev: Event): void => {
      if (!this.drop.open) return;
      const t = ev.target as Node | null;
      if (t && this.dropList.contains(t)) return;
      this.dropBack();
    };
    el.addEventListener('wheel', userScroll, { passive: true });
    el.addEventListener('touchmove', userScroll, { passive: true });
    // (marlow-bays item 10) a press or a focus in a slider row selects it (the mouse and the keys; the pad selects by
    // its focus)
    const pickFrom = (ev: Event): void => {
      const row = (ev.target as Element | null)?.closest?.('[data-pad-row]');
      const key = row?.querySelector<HTMLElement>('input[type=range][data-pad]')?.dataset.pad;
      if (key && key !== this.selKey) this.pickRow(key);
    };
    body.addEventListener('pointerdown', pickFrom, true);
    body.addEventListener('focusin', pickFrom);
    // --- View tab: the loop player (studio), the camera, time
    const view = this.tabEl('view');
    const cam = this.block(view, 'Camera');
    const cb = this.mkBar();
    this.freeSel = this.mkSel(cb, 'Free view', FREE_MODES, (v) => this.setFreeMode(v as FreeMode), 'free', 'anim-tune-free');
    for (const o of Array.from(this.freeSel.options)) o.textContent = FREE_LABEL[o.value as FreeMode];
    const sb = this.mkBar();
    for (const s of SNAPS) {
      const b = this.mkBtn(plainWords(s), () => this.lockSnap(s), `snap:${s}`, `anim-tune-snap-${s} studio-snap-${s}`);
      this.snapBtns.set(s, b);
      sb.append(b);
    }
    this.unlockBtn = this.mkBtn('Unlock', () => this.unlockSnap(), 'unlock', 'anim-tune-unlock');
    this.lockLine = document.createElement('span');
    this.lockLine.className = 'tt-note anim-tune-lock';
    sb.append(this.unlockBtn, this.lockLine);
    const db = this.mkBar();
    const demo = this.mkSel(db, 'Fly demo', FREE_DEMOS, (v) => (FREE_VIEW.demo = v as FreeDemo), 'demo', 'anim-tune-demo');
    for (const o of Array.from(demo.options)) o.textContent = plainWords(o.value);
    this.hudBox = this.mkCheck(db, 'Hide HUD', false, (v) => document.body.classList.toggle('tune-hide-hud', v), 'hidehud', 'anim-tune-hidehud');
    // (marlow-bays item 29 phase 2) the orbit by hand: around her (0 behind, 90 her right, 180 her front), the tilt and
    // the distance; they follow the stick, the drag, the touch orbit and the snaps
    const ob = this.mkBar();
    const orbitRow = (label: string, min: number, max: number, step: number, unit: string, key: string, k: 0 | 1 | 2): void => {
      const l = document.createElement('label');
      l.className = 'tt-field tt-grow';
      const r = document.createElement('input');
      r.type = 'range';
      r.min = String(min);
      r.max = String(max);
      r.step = String(step);
      r.className = `anim-tune-orbit-${key}`;
      r.dataset.pad = `orbit:${key}`;
      l.style.flexBasis = '100%';
      const v = document.createElement('span');
      v.className = 'tt-val';
      v.textContent = '–';
      r.addEventListener('input', () => this.setOrbit(k, Number(r.value)));
      r.addEventListener('change', () => r.blur());
      l.append(label, r, v);
      v.dataset.unit = unit;
      this.orbitIn[k] = r;
      this.orbitVal[k] = v;
      ob.append(l);
    };
    orbitRow('Around her', 0, 359, 1, '°', 'angle', 0);
    orbitRow('Camera tilt', -80, 80, 1, '°', 'tilt', 1);
    orbitRow('Distance', FREE_CFG.distMin, FREE_CFG.distMax, 0.05, ' m', 'dist', 2);
    cam.append(cb, sb, ob, db);
    const time = this.block(view, 'Time');
    const tb = this.mkBar();
    this.pauseBtn = this.mkBtn('Pause', () => this.setFrozen(!this.frozen), 'pause', 'anim-tune-pause');
    this.stepBtn = this.mkBtn('Step', () => this.stepFrame(), 'step', 'anim-tune-step');
    tb.append(this.pauseBtn, this.stepBtn);
    {
      // (pass 2) the game speed: slow motion in normal play and in the free view (the loop's time scale; local only)
      const l = document.createElement('label');
      l.className = 'tt-field tt-grow';
      const r = (this.speedIn = document.createElement('input'));
      r.type = 'range';
      r.min = String(GAME_SPEED.min);
      r.max = String(GAME_SPEED.max);
      r.step = String(GAME_SPEED.step);
      r.value = '1';
      r.className = 'anim-tune-speed';
      r.dataset.pad = 'speed';
      this.speedVal = document.createElement('span');
      this.speedVal.className = 'tt-val';
      this.speedVal.textContent = '1×';
      r.addEventListener('input', () => this.setTimeScale(Number(r.value)));
      r.addEventListener('change', () => r.blur());
      l.append('Game speed', r, this.speedVal);
      tb.append(l);
    }
    this.coopNote = document.createElement('div');
    this.coopNote.className = 'anim-tune-coop tt-note';
    this.coopNote.hidden = true;
    this.coopNote.textContent = 'Co-op: game speed, pause and step are off.';
    time.append(tb, this.coopNote);
    view.prepend(this.studioUi.el);
    // --- (marlow-bays item 29) "More" under the sliders of every tab, collapsed: the panel's settings (the Settings tab
    // is gone), undo and presets, files, the playback extras (the studio's time and speed)
    const more = (this.more = document.createElement('div'));
    more.className = 'anim-tune-more';
    this.moreHead = document.createElement('button');
    this.moreHead.type = 'button';
    this.moreHead.className = 'tt-more-h anim-tune-more-btn';
    this.moreHead.dataset.pad = 'more';
    this.moreHead.textContent = 'More';
    this.moreHead.addEventListener('click', () => {
      this.setMore(!this.moreOpen);
      this.moreHead.blur();
    });
    const set = (this.moreBody = document.createElement('div'));
    set.className = 'anim-tune-more-body anim-tune-tab-settings';
    set.hidden = true;
    more.append(this.moreHead, set);
    // the studio's time scrub and speed (the playback bar keeps Play, the key steps, the gun and on the spot)
    const playB = this.block(set, 'Playback');
    playB.classList.add('anim-tune-more-play');
    const p2 = this.studioUi.bar.children[1];
    if (p2) playB.append(p2);
    // (item 29 phase 2) the studio's view aids (skeleton, feet, ghost poses; off by default), the studio only
    this.aidsB = this.block(set, 'View aids');
    this.aidsB.classList.add('anim-tune-more-aids');
    this.aidsB.append(this.studioUi.aids);
    this.aidsB.hidden = true;
    const panelB = this.block(set, 'Panel');
    const pb = this.mkBar();
    this.sizeSel = this.mkSel(pb, 'Size', TUNER_SIZES, (v) => this.setSize(v as TunerSize, true), 'size', 'anim-tune-size');
    for (const o of Array.from(this.sizeSel.options)) o.textContent = o.value === 'S' ? 'Small' : o.value === 'M' ? 'Medium' : 'Large';
    this.sizeSel.value = this.size;
    this.freezeBox = this.mkCheck(pb, 'Pause game while tuning', true, () => {
      this.saveUi();
      this.syncTuneFreeze();
    }, 'freezeview', 'anim-tune-freezeview anim-tune-pausetuning');
    const pb2 = this.mkBar();
    this.followBox = this.mkCheck(pb2, 'Follow my state', true, (v) => this.setFollow(v), 'follow', 'anim-tune-follow');
    this.mkCheck(pb2, 'Changed only', false, (v) => {
      this.changedOnly = v;
      this.rebuildAll();
    }, 'changed', 'anim-tune-changed');
    const pb3 = this.mkBar();
    this.mkCheck(pb3, 'Wide ranges', false, (v) => {
      TUNE_FLAGS.wide = v;
      this.rebuildAll();
    }, 'wide', 'anim-tune-wide');
    this.markerBox = this.mkCheck(pb3, 'Barrel line', false, (v) => {
      this.marker = v;
      if (!v) this.clearMarker();
    }, 'marker', 'anim-tune-marker');
    // (item 29) the highlight on her: a small dot on the selected joint, or off entirely
    this.highlightBox = this.mkCheck(pb3, 'Highlight on her', true, (v) => {
      this.highlight = v;
      if (!v) this.clearMarker();
      this.saveUi();
    }, 'highlight', 'anim-tune-highlight');
    // (marlow-bays item 26) the F3 debug readout (off by default on a touch device; F3 still toggles it with a keyboard)
    this.debugBox = this.mkCheck(pb3, 'Debug readout (F3)', false, (v) => {
      this.debugHost?.set(v);
      if (this.touchDevice) {
        this.phoneDebug = v;
        this.saveUi();
      }
    }, 'debugreadout', 'anim-tune-debugreadout');
    // (mocap-trial) the rollback switch, the same setting as Settings > Gameplay > "Mocap locomotion"
    const pb4 = this.mkBar();
    this.mocapBox = this.mkCheck(pb4, MOCAP_BOX_LABEL, false, (v) => this.mocapHost?.set(v), 'mocaploco', 'anim-tune-mocap');
    // (tuner-clarity S4, BRIEF A4) the edit warning's switch (on by default; saved with the panel's settings)
    this.warnBox = this.mkCheck(pb4, CLARITY_WARN_LABEL, true, (v) => {
      if (!v) this.clearWarn();
      this.saveUi();
    }, 'claritywarn', 'anim-tune-claritywarn');
    panelB.append(pb, pb2, pb3, pb4);
    const snapB = this.block(set, 'Undo and presets');
    snapB.append(this.snaps.bar, this.snaps.pbar);
    const fileB = this.block(set, 'Files');
    const fb = this.mkBar();
    const fileIn = (this.fileIn = document.createElement('input'));
    fileIn.type = 'file';
    fileIn.accept = '.json,application/json';
    fileIn.hidden = true;
    fileIn.className = 'anim-tune-file';
    fileIn.addEventListener('change', () => void this.importFile());
    fb.append(
      this.mkBtn('Export', () => this.exportFile(), 'export', 'anim-tune-export'),
      this.mkBtn('Share / Copy', () => void this.shareFile(), 'share', 'anim-tune-share'),
      this.mkBtn('Import', () => this.importPick(), 'import', 'anim-tune-import'),
      // (anim-bake-1022; v3: the button under More) sliders still holding a value the game now has built in go back
      this.mkBtn('Reset baked', () => this.resetBaked(true), 'resetbaked', 'anim-tune-resetbaked'),
      fileIn,
    );
    const fb2 = this.mkBar();
    fb2.append(
      // (item 29) the shown part's group (the "what" row had its own Reset group button)
      this.mkBtn('Reset this group', () => this.resetShownGroup(), 'resetgroup', 'anim-tune-resetgroup'),
      this.mkBtn('Reset all', () => {
        if (!confirm('Reset every animation value to its default?')) return;
        tuneResetAll();
        this.rebuildAll();
      }, 'resetall', 'anim-tune-resetall'),
      this.mkBtn('Clear change log', () => tuneClearLog(), 'clearlog', 'anim-tune-clearlog'),
    );
    this.shareOut = document.createElement('textarea');
    this.shareOut.readOnly = true;
    this.shareOut.hidden = true;
    this.shareOut.className = 'anim-tune-json';
    this.shareOut.addEventListener('focus', () => this.shareOut.select());
    fileB.append(fb, fb2, this.shareOut);
    // the Y menu's items
    const mItem = (label: string, fn: () => void, key: string): void => {
      const b = this.mkBtn(label, fn, key);
      menu.append(b);
    };
    mItem('Undo', () => this.menuDo(() => this.snaps.undo()), 'm:undo');
    mItem('Redo', () => this.menuDo(() => this.snaps.redo()), 'm:redo');
    mItem('Store A', () => this.menuDo(() => this.snaps.abStore('A')), 'm:abA');
    mItem('Store B', () => this.menuDo(() => this.snaps.abStore('B')), 'm:abB');
    mItem('Flip A / B', () => this.menuDo(() => this.snaps.abToggle()), 'm:ab');
    mItem('Reset this group', () => this.menuDo(() => this.resetFocusedGroup()), 'm:resetgroup');
    mItem('Reset all (A twice)', () => this.armResetAll(), 'm:resetall');
    mItem('Reset baked', () => this.menuDo(() => this.resetBaked(true)), 'm:resetbaked');
    mItem('Export file', () => this.menuDo(() => this.exportFile()), 'm:export');
    mItem('Share / Copy', () => this.menuDo(() => void this.shareFile()), 'm:share');
    mItem('Import file', () => this.menuDo(() => this.importPick()), 'm:import');
    mItem('Clear change log', () => this.menuDo(() => tuneClearLog()), 'm:clearlog');
    // (anim-studio) Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) while the panel is open and no text box has the keys: undo / redo;
    // taken before the game's keyboard (Z is the knockout)
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.open) return;
        // (tuner-ui) an open list takes the arrows, Enter and Esc
        if (this.drop.open && this.dropKey(e)) return;
        const a = document.activeElement as HTMLInputElement | null;
        const typing = !!a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && (a.type === 'text' || a.type === 'search' || a.type === 'number')));
        // (marlow-bays item 29) the arrows move through the panel (up / down) and change the focused slider (left / right)
        // while the pointer is free (drag view); Enter presses the focused control. Never while a text box has the keys.
        if (!typing && this.mouseCtl.free && !e.ctrlKey && !e.metaKey && !e.altKey && this.arrowKey(e)) return;
        if (!(e.ctrlKey || e.metaKey) || (e.code !== 'KeyZ' && e.code !== 'KeyY')) return;
        if (typing) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.repeat) return;
        if (e.code === 'KeyY' || e.shiftKey) this.snaps.redo();
        else this.snaps.undo();
      },
      true,
    );
    // (tuner-ui) a click outside an open list closes it (nothing changes)
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.drop.open) return;
        const t = e.target as Node | null;
        if (t && (this.dropList.contains(t) || this.dropBtn?.contains(t))) return;
        this.dropBack();
      },
      true,
    );
    // (marlow-bays item 9) the mouse mode key while the panel is open (the game never sees it)
    window.addEventListener(
      'keydown',
      (e) => {
        // (marlow-bays T1a, item 16) the playback bar's keys in the studio: F9 play / pause, F1 / F2 one key back / forward
        const barKey = e.code === TUNER_SPOT_KEY || e.code === TUNER_PLAY_KEY || e.code === TUNER_KEY_BACK || e.code === TUNER_KEY_FWD;
        if (!this.open || (e.code !== TUNER_MOUSE_KEY && !barKey)) return;
        // the browser never sees the tuner's keys while the panel is open (F1 is Chromium's help), studio or not
        e.preventDefault();
        e.stopImmediatePropagation();
        if (barKey && !STUDIO.active) return;
        // a held key steps on (the key buttons repeat), the toggles do not
        if (e.repeat && e.code !== TUNER_KEY_BACK && e.code !== TUNER_KEY_FWD) return;
        if (e.code === TUNER_MOUSE_KEY) this.toggleMouse();
        else if (e.code === TUNER_PLAY_KEY) this.studioUi.playPause();
        else if (e.code === TUNER_KEY_BACK) this.studioUi.stepKey(-1);
        else if (e.code === TUNER_KEY_FWD) this.studioUi.stepKey(1);
        else this.toggleSpot();
      },
      true,
    );
    // (pass 2) Backquote held: the bypass (the untuned animation and camera) while the panel is open
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote' && this.open && !e.repeat) this.setKeyBypass(true);
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Backquote') this.setKeyBypass(false);
    });
    window.addEventListener('blur', () => this.setKeyBypass(false));
    window.addEventListener('resize', () => this.applySize());
    // (item 29) a tablet's toolbars change the visible viewport without a window resize
    window.visualViewport?.addEventListener('resize', () => this.applySize());
    // (fix round) a pad disconnect never leaves the free view's sticks held
    window.addEventListener('gamepaddisconnected', () => this.clearFreeIn());
    // the mouse wheel zooms the orbit (the panel's own wheel stops at the panel)
    window.addEventListener(
      'wheel',
      (e) => {
        if (!this.open || e.deltaY === 0) return;
        // (marlow-bays item 9) drag view: the wheel on the scene zooms, starting the orbit from the game view if it is off
        if (FREE_VIEW.mode === 'off' && this.mouseCtl.free && e.target === this.scene?.getEngine().getRenderingCanvas()) this.setFreeMode('orbit', false);
        if (FREE_VIEW.mode === 'orbit') FREE_IN.wheel += e.deltaY < 0 ? 1 : -1;
      },
      { passive: true },
    );
    // (marlow-bays item 26) the touch camera on the scene: one finger orbits, a pinch zooms, two fingers pan, a tap picks
    // a part. Only touches that start on the canvas (the panel stops its own); the pad and the mouse are untouched.
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType !== 'touch' || !this.open || this.mouseCtl.mode !== 'drag') return;
        if (e.target !== this.scene?.getEngine().getRenderingCanvas()) return;
        this.gesture.down(e.pointerId, e.clientX, e.clientY, performance.now());
      },
      true,
    );
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' && this.gesture.count > 0) this.touchMove(e.pointerId, e.clientX, e.clientY);
    }, true);
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'touch' || this.gesture.count === 0) return;
      if (this.gesture.up(e.pointerId, e.clientX, e.clientY, performance.now()) && this.open) {
        this.touchLast.taps++;
        this.pickAtScreen(this.gesture.tapX, this.gesture.tapY);
      }
    }, true);
    window.addEventListener('pointercancel', (e) => {
      if (e.pointerType === 'touch') this.gesture.up(e.pointerId, e.clientX, e.clientY, performance.now(), false);
    }, true);
    this.now = document.createElement('div');
    this.info = document.createElement('div');
    const infoEl = document.createElement('div');
    infoEl.className = 'anim-tune-info';
    const selLine = (this.selLine = document.createElement('div'));
    selLine.className = 'anim-tune-sel';
    selLine.hidden = true;
    infoEl.append(selLine, this.now, this.info);
    // (tuner-ui) the hints: reserved space at the bottom, never over a row
    this.hint = document.createElement('div');
    this.hint.className = 'anim-tune-hints';
    this.dropList = document.createElement('div');
    this.dropList.className = 'anim-tune-drop-list';
    this.dropList.hidden = true;
    // a click on her in the scene (drag view, no drag): the nearest joint's part
    window.addEventListener(
      'pointerdown',
      (e) => {
        this.down.on = false;
        // (item 26) a touch is the touch camera's (its own tap)
        if (!this.open || e.button !== 0 || !this.mouseCtl.free || e.pointerType === 'touch') return;
        if (e.target !== this.scene?.getEngine().getRenderingCanvas()) return;
        this.down.on = true;
        this.down.x = e.clientX;
        this.down.y = e.clientY;
        this.down.t = performance.now();
      },
      true,
    );
    window.addEventListener(
      'pointerup',
      (e) => {
        const d = this.down;
        if (!d.on || e.pointerType === 'touch') return;
        d.on = false;
        if (!this.open || e.button !== 0 || Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 6 || performance.now() - d.t > 450) return;
        this.pickAtScreen(e.clientX, e.clientY);
      },
      true,
    );
    // (item 29) one column: the tabs, the playback bar (studio), the quick menu, the tab (its "what" row and sliders, then
    // More), the info line, the hints
    // (item 29 phase 2, the phone bug: the tabs and the playback bar scrolled away under the sticky header) the header,
    // the tabs and the playback bar are one top block: sticky as a whole on a drawer / sheet, so they always show
    const top = (this.top = document.createElement('div'));
    top.className = 'tt-top';
    // (tuner-clarity S4) the Now playing line (`playFrame`) and the edit warning strip, under the tabs
    const playEl = (this.playEl = document.createElement('div'));
    playEl.className = 'anim-tune-playing';
    const warnEl = (this.warnEl = document.createElement('div'));
    warnEl.className = 'anim-tune-warn';
    warnEl.hidden = true;
    const rowWarn = (this.rowWarnEl = document.createElement('div'));
    rowWarn.className = 'tt-warn';
    rowWarn.hidden = true;
    top.append(head, this.tabBar, playEl, warnEl, this.studioUi.bar);
    el.append(top, menu, body, infoEl, this.hint, this.dropList);
    // a scroll that brings a row into view keeps it clear of the sticky top block
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.syncTopPad()).observe(top);
    // (marlow-bays item 24, track A) "Who": the what-row's first list in the tabs with guard rows (moved there on a show)
    {
      const wb = this.mkBar();
      this.whoSel = this.mkSel(wb, 'Who', ['wren', 'guard'], (v) => this.setWho(v === 'guard' ? 'guard' : 'wren'), 'who', 'anim-tune-who');
      for (const o of Array.from(this.whoSel.options)) o.textContent = o.value === 'guard' ? 'Guard' : 'Wren';
      this.whoSel.value = TUNE_WHO.who;
      this.whoSel.title = 'Whose rows these sliders tune: Wren, or every guard (guards have Joints, Stepping and Weight rows)';
      this.whoNote = document.createElement('div');
      this.whoNote.className = 'tt-note anim-tune-who-note';
      this.whoNote.textContent = "Wren's sliders: guards have Joints (Body tab), Stepping and Weight only.";
      this.whoNote.hidden = true;
    }
    // (tuner-camera) every registered section, in registration order, into its tab
    for (const r of TUNE_SECTIONS) this.addSection(r, false);
    TUNE_REGISTRY_HOOKS.added = (r) => this.addSection(r, true);
    this.buildTabBar();
    this.setTab(this.tabs.findIndex((t) => t.id === 'body'), false);
    document.body.appendChild(el);
    this.applySize();
    TUNE_HOOKS.changed = () => {
      this.scheduleSave();
      // (anim-studio) an undo step, and the onion skin's cached keys are stale
      this.snaps.note(performance.now());
      STUDIO.poseVer++;
    };
    // load the saved values (skipped if a slider already moved); the undo history starts from what loaded
    void loadAnimTune().then((s) => {
      if (TUNE_LOG.length !== 0 || tuneChanged().length !== 0) return;
      if (s) tuneLoad(s);
      // (anim-bake-1022) once per bake: the sliders the code now holds go back to their defaults (no store: nothing to
      // reset, the bakes are only recorded)
      this.resetBaked(false, s ?? null);
      if (s) {
        this.rebuildAll();
        this.snaps.reset();
      }
    });
    // (tuner-ui) the panel's own settings
    void loadAnimTuneUi().then((u) => {
      if (!u || typeof u !== 'object') return;
      // (item 29) an old `pins` list is ignored (the pins are gone)
      const o = u as { size?: unknown; pauseTuning?: unknown; stageLight?: unknown; phoneDebug?: unknown; highlight?: unknown; clarityWarn?: unknown };
      if (o.size === 'S' || o.size === 'M' || o.size === 'L') this.setSize(o.size, false);
      if (typeof o.pauseTuning === 'boolean') this.freezeBox.checked = o.pauseTuning;
      if (typeof o.stageLight === 'number') this.studioUi.setStage(o.stageLight);
      // (tuner-clarity S4) absent = on
      if (typeof o.clarityWarn === 'boolean' && this.warnBox) this.warnBox.checked = o.clarityWarn;
      if (typeof o.highlight === 'boolean') {
        this.highlight = this.highlightBox.checked = o.highlight;
        if (!o.highlight) this.clearMarker();
      }
      // (marlow-bays item 26) the touch device's readout choice (applied now if the panel is already open)
      if (typeof o.phoneDebug === 'boolean') {
        this.phoneDebug = o.phoneDebug;
        if (this.open && this.touchDevice && this.debugHost && this.debugHost.visible() !== o.phoneDebug) this.debugHost.set(o.phoneDebug);
      }
    });
    // (test hook) e2e and the console read and set values through this
    (window as unknown as { __animTune: unknown }).__animTune = {
      body: TUNE_BODY,
      gun: TUNE_GUN,
      cur: TUNE_CUR,
      local: TUNE_LOCAL,
      state: TUNE_STATE,
      // (tuner-camera) the camera values, the free view, the time controls and the sections
      cam: TUNE_CAM,
      camCur: TUNE_CAM_CUR,
      sections: () => TUNE_SECTIONS.map((x) => x.id),
      free: (m: FreeMode) => this.setFreeMode(m),
      freeState: () => ({ mode: FREE_VIEW.mode, demo: FREE_VIEW.demo, pad: this.pad.mode, folded: this.folded, lock: FREE_VIEW.lock }),
      demo: (d: FreeDemo) => (FREE_VIEW.demo = d),
      freeze: (on: boolean) => this.setFrozen(on),
      speed: (v: number) => this.setTimeScale(v),
      bypass: (on: boolean) => this.setKeyBypass(on),
      flags: TUNE_FLAGS,
      importJson: (data: unknown, name?: string) => {
        const r = tuneImport(data, name);
        this.rebuildAll();
        return r;
      },
      step: () => this.stepFrame(),
      marker: (on: boolean) => {
        if (this.markerBox.checked !== on) this.markerBox.click();
      },
      get: tuneGet,
      set: (g: string, id: string, v: number) => {
        const ok = tuneSet(g, id, v);
        this.rebuildAll();
        return ok;
      },
      changed: tuneChanged,
      // (anim-bake-1022) the Y menu's Reset baked, the applied bake hashes, the info line
      bakedReset: () => this.resetBaked(true),
      bakedApplied: () => tuneBakedApplied().slice(),
      infoText: () => this.info.textContent ?? '',
      exportJson: () => tuneExport(),
      log: TUNE_LOG,
      // (anim-studio) snapshots: undo / redo (`settle` closes the open run now), A/B, presets
      settle: () => this.snaps.history.settle(performance.now(), true),
      undo: () => this.snaps.undo(),
      redo: () => this.snaps.redo(),
      undoCount: () => this.snaps.history.undoCount,
      abStore: (slot: 'A' | 'B') => this.snaps.abStore(slot),
      abToggle: () => this.snaps.abToggle(),
      presetSave: (name: string) => this.snaps.save(name),
      presetLoad: (name: string) => this.snaps.load(name),
      presetDelete: (name: string) => this.snaps.del(name),
      presets: () => this.snaps.presets.map((p) => p.name),
      presetsLoaded: () => this.snaps.loaded,
      timeScale: () => (this.loop ? this.loop.timeScale : 1),
      // (tuner-ui) tabs, size, the camera lock, a section's shown group
      tabs: () => this.tabs.map((t) => t.id),
      tab: (id: string) => this.setTab(this.tabs.findIndex((t) => t.id === id)),
      size: (s: TunerSize) => this.setSize(s, false),
      lock: (s: FreeSnap) => this.lockSnap(s),
      unlock: () => this.unlockSnap(),
      group: (sec: string) => this.sections.find((s) => s.reg.id === sec)?.group ?? '',
      // (marlow-bays T1a) a section's level picked as the panel's list would (a click on a choice)
      pickLevel: (sid: string, level: number, v: string) => {
        const s = this.sections.find((x) => x.reg.id === sid);
        if (s) this.pickLevel(s, level, v);
      },
      // (T1a, items 15 and 18) the Keys tab: its readout, Mirror box and key list; its buttons
      keys: () => {
        const s = this.sections.find((x) => x.reg.id === 'keys');
        return {
          group: s?.group ?? '',
          readout: this.keyReadoutEl?.textContent ?? '',
          mirror: this.keyMirrorBox?.checked ?? true,
          mirrorDisabled: this.keyMirrorBox?.disabled ?? true,
          list: s ? Array.from(s.levels[1]?.options ?? []).map((o) => o.value) : [],
          hint: s?.wrap.querySelector('.anim-tune-keys-hint')?.textContent ?? '',
        };
      },
      keysStep: (dir: number) => this.keysStep(dir),
      // (marlow-bays item 23) the timing control: slide the key the readout names (bake frames, + later), as the buttons
      keysRetime: (delta: number) => this.keysRetime(delta),
      keysTime: () => {
        const k = this.keysTimeKey();
        const i = k ? tuneKeysTimeInfo(k[0], k[1]) : null;
        return {
          clip: k?.[0] ?? '',
          key: k?.[1] ?? -1,
          info: i,
          readout: this.keyTimeEl?.textContent ?? '',
          slider: this.keyTimeRange ? { value: Number(this.keyTimeRange.value), min: Number(this.keyTimeRange.min), max: Number(this.keyTimeRange.max), disabled: this.keyTimeRange.disabled } : null,
        };
      },
      keysMirror: (on: boolean) => {
        const b = this.keyMirrorBox;
        if (b && !b.disabled && b.checked !== on) b.click();
      },
      // (marlow-bays item 25) "Add key" / "Delete key" (as the buttons) and what they would do on the key now
      keysAdd: () => this.keysAdd(),
      keysDelete: () => this.keysDelete(),
      keysEdit: () => {
        const k = this.keysTimeKey();
        return {
          clip: k?.[0] ?? '',
          key: k?.[1] ?? -1,
          info: k ? tuneKeysEditInfo(k[0], k[1]) : null,
          add: this.keyAddBtn ? { disabled: this.keyAddBtn.disabled, title: this.keyAddBtn.title } : null,
          del: this.keyDelBtn ? { disabled: this.keyDelBtn.disabled, title: this.keyDelBtn.title } : null,
        };
      },
      // (marlow-bays item 30) the key tools: their state, set as the controls would, a tool's button
      keyTools: () => this.keyTools?.state() ?? null,
      keyToolsSet: (o: Parameters<TunerKeyTools['set']>[0]) => this.keyTools?.set(o),
      keyToolsRun: (t: 'wave' | 'apply' | 'smooth') => this.keyTools?.run(t),
      // (marlow-bays item 9) the mouse mode
      mouse: () => ({ mode: this.mouseCtl.mode, free: this.mouseCtl.free, locked: this.mouseHost?.locked() ?? false, dragging: this.mouseHost?.dragging() ?? false, button: this.mouseBtn.textContent ?? '' }),
      mouseMode: (m: TunerMouseMode) => {
        if (m !== this.mouseCtl.mode) this.toggleMouse();
      },
      // (marlow-bays item 10) the selected row, its target and the scene marker
      select: (key: string) => this.pickRow(key),
      // (marlow-bays item 24, track A) Who (Wren / Guard), as the what-row's list sets it, and what it shows
      who: (w: TuneWho) => {
        this.whoSel.value = w;
        this.whoSel.dispatchEvent(new Event('change'));
      },
      whoState: () => {
        const s = this.shownSection();
        return { who: TUNE_WHO.who, section: s?.reg.id ?? '', group: s?.group ?? '', shown: !!this.whoSel.parentElement && this.whoSel.parentElement.offsetParent !== null, note: !this.whoNote.hidden, entry: STUDIO.entry };
      },
      // (marlow-bays T2) the part filter, a click on her in the scene, row groups, pinned and recent sliders, the dock
      part: (p: BodyPart) => this.pickPart(p),
      partState: () => {
        const s = this.shownSection();
        return {
          part: this.bodyPart,
          label: partLabel(this.bodyPart),
          section: s?.reg.id ?? '',
          rows: s ? Array.from(s.rows.querySelectorAll<HTMLElement>('input[type=range][data-pad]')).filter((e) => e.offsetParent !== null).map((e) => e.dataset.pad ?? '') : [],
          dock: this.dockW,
        };
      },
      clickAt: (x: number, y: number) => this.pickAtScreen(x, y),
      // (marlow-bays item 26) the phone layout, the dock, the readout and the touch camera's last gesture
      phone: () => ({
        mode: this.layout.mode,
        font: this.layout.font,
        target: this.layout.target,
        width: this.layout.width,
        height: this.layout.height,
        dockW: this.dockW,
        dockH: this.dockH,
        folded: this.folded,
        debug: this.debugHost?.visible() ?? false,
        debugBox: this.debugBox.checked,
        gesture: this.touchLast.kind,
        taps: this.touchLast.taps,
      }),
      fold: (v: boolean) => this.setFolded(v),
      // (marlow-bays item 29) the loop's mode and, per section shown, the greyed rows (ids) and the reason line
      effect: () => ({
        mode: this.effMode,
        sections: this.sections
          .filter((s) => s.wrap.offsetParent !== null)
          .map((s) => ({ id: s.reg.id, group: s.group, off: Array.from(s.rows.querySelectorAll<HTMLElement>('.tt-row.tt-off input[type=range]')).map((i) => i.dataset.id ?? ''), note: s.eff.hidden ? '' : (s.eff.textContent ?? '') })),
      }),
      // (tuner-clarity S4) what the Now playing line says and the graph's shares and move; the header warning's text
      playing: () => ({ text: this.playText, mocap: NOW_PLAYING.mocap, keyed: NOW_PLAYING.keyed, code: NOW_PLAYING.code, move: NOW_PLAYING.move }),
      warn: () => (this.warnEl.hidden ? '' : this.warnText),
      reveal: (key: string) => this.revealRow(key),
      // (item 29) More open / closed
      more: (open?: boolean) => {
        if (open !== undefined && open !== this.moreOpen) this.setMore(open);
        return this.moreOpen;
      },
      highlight: (on: boolean) => {
        if (this.highlightBox.checked !== on) this.highlightBox.click();
      },
      selected: () => ({
        key: this.selKey,
        section: this.selSec,
        kind: this.selTarget.kind,
        a: this.selTarget.a,
        b: this.selTarget.b,
        label: this.selTarget.label,
        row: !!this.selRow?.isConnected && this.selRow.classList.contains('tt-sel'),
        line: this.selLine?.textContent ?? '',
        mark: { ...this.selMark },
      }),
      // (tuner-pad) the pad mode, the focused control and its edit state
      pad: () => {
        const e = this.padEl;
        const s = this.sections[this.lastSec];
        return {
          mode: this.pad.mode,
          key: this.padKey,
          group: e?.dataset.group ?? '',
          id: e?.dataset.id ?? '',
          editing: false,
          menu: this.menuOpen,
          section: s?.reg.id ?? '',
          sectionGroup: s?.group ?? '',
          frozen: this.frozen,
          tab: this.tabs[this.tabIdx]?.id ?? '',
          list: this.drop.open,
          listIndex: this.drop.index,
          listLength: this.drop.count,
          hint: this.hint.textContent ?? '',
        };
      },
    };
    this.setPadLine();
  }

  // ------------------------------------------------------------------------------------------
  // Control makers (every control has explicit colours from the panel's CSS)
  // ------------------------------------------------------------------------------------------

  private mkBtn(label: string, fn: () => void, key: string, cls = ''): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = cls ? `tt-btn ${cls}` : 'tt-btn';
    b.dataset.pad = key;
    b.addEventListener('click', () => {
      fn();
      // (the keys stay the game's: WASD and Space never press a panel button)
      b.blur();
    });
    return b;
  }

  private mkCheck(parent: HTMLElement, label: string, on: boolean, fn: (v: boolean) => void, key: string, cls: string): HTMLInputElement {
    const l = document.createElement('label');
    l.className = 'tt-field';
    const c = document.createElement('input');
    c.type = 'checkbox';
    c.checked = on;
    c.className = cls;
    c.dataset.pad = key;
    c.addEventListener('change', () => {
      fn(c.checked);
      // (pass 3) the keys stay the game's
      c.blur();
    });
    l.append(c, label);
    parent.append(l);
    return c;
  }

  /**
   * (tuner-ui) A drop-down: a hidden native select holds the choices and the value (code and tests read and set it as
   * before); a button shows the choice and opens the panel's own list (A or a click; the D-pad or arrows move, A /
   * Enter / a click picks, B / Esc backs out).
   */
  private mkSel(parent: HTMLElement, label: string, opts: readonly (string | number)[], fn: (v: string) => void, key: string, cls: string): HTMLSelectElement {
    const l = document.createElement('label');
    l.className = 'tt-field';
    const c = document.createElement('select');
    c.className = cls;
    c.hidden = true;
    for (const v of opts) {
      const o = document.createElement('option');
      o.value = String(v);
      o.textContent = String(v);
      c.append(o);
    }
    c.addEventListener('change', () => {
      fn(c.value);
      this.refreshDrop(b);
    });
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tt-btn tt-drop ${cls}-btn`;
    b.dataset.pad = key;
    b.append(document.createElement('span'));
    b.addEventListener('click', () => {
      if (this.drop.open && this.dropBtn === b) this.dropBack();
      else this.openDrop(b);
      b.blur();
    });
    this.dropSel.set(b, c);
    this.dropBtns.push(b);
    if (label) l.append(label);
    l.append(c, b);
    parent.append(l);
    this.refreshDrop(b);
    return c;
  }

  private mkBar(): HTMLDivElement {
    const b = document.createElement('div');
    b.className = 'tt-bar';
    return b;
  }

  /** A titled block inside a tab. */
  private block(parent: HTMLElement, title: string): HTMLDivElement {
    const d = document.createElement('div');
    d.className = 'tt-block';
    const h = document.createElement('b');
    h.className = 'tt-h';
    h.textContent = title;
    d.append(h);
    parent.append(d);
    return d;
  }

  /** The drop-down button shows its select's choice (and greys out with it). */
  private refreshDrop(b: HTMLButtonElement): void {
    const s = this.dropSel.get(b);
    if (!s) return;
    const t = s.selectedOptions[0]?.textContent ?? '-';
    const span = b.firstElementChild as HTMLElement | null;
    if (span && span.textContent !== t) span.textContent = t;
    if (b.disabled !== s.disabled) b.disabled = s.disabled;
  }

  // ------------------------------------------------------------------------------------------
  // The drop-down list
  // ------------------------------------------------------------------------------------------

  private openDrop(b: HTMLButtonElement): void {
    const s = this.dropSel.get(b);
    if (!s || s.disabled || !s.options.length) return;
    this.closeDrop();
    const list = this.dropList;
    list.replaceChildren();
    for (let i = 0; i < s.options.length; i++) {
      const o = document.createElement('div');
      o.className = i === s.selectedIndex ? 'tt-opt cur' : 'tt-opt';
      o.textContent = s.options[i]!.textContent;
      o.addEventListener('click', () => this.dropPick(i));
      list.append(o);
    }
    this.drop.openAt(Math.max(0, s.selectedIndex), s.options.length);
    this.dropBtn = b;
    list.hidden = false;
    // under the button (above it when there is no room), inside the panel
    const pr = this.el.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    const below = pr.bottom - br.bottom - 6;
    const above = br.top - pr.top - 6;
    const roomBelow = below >= Math.min(160, above);
    const maxH = Math.max(80, roomBelow ? below : above);
    list.style.maxHeight = `${maxH}px`;
    list.style.left = `${Math.max(2, br.left - pr.left)}px`;
    list.style.minWidth = `${Math.max(br.width, 120)}px`;
    list.style.maxWidth = `${Math.max(120, pr.right - br.left - 4)}px`;
    // (marlow-bays item 26) the phone panel scrolls as a whole: the list sits in its scrolled content (0 on desktop)
    const st = this.el.scrollTop;
    if (roomBelow) {
      list.style.top = `${br.bottom - pr.top + 2 + st}px`;
      list.style.bottom = '';
    } else {
      list.style.top = '';
      list.style.bottom = `${pr.bottom - br.top + 2 - st}px`;
    }
    this.markDrop();
    this.setHint();
  }

  /** The highlight on the list's current row (kept in view). */
  private markDrop(): void {
    const kids = this.dropList.children;
    for (let i = 0; i < kids.length; i++) kids[i]!.classList.toggle('hi', i === this.drop.index);
    // (marlow-bays item 29, the bug) only the list scrolls: `scrollIntoView` also scrolled the panel around it (on the
    // phone layout, with its scroll padding under the sticky header, for a row near the top: Up), and that panel
    // scroll closed the list
    const o = kids[this.drop.index] as HTMLElement | undefined;
    const l = this.dropList;
    if (o) {
      const st = listScrollFor(l.scrollTop, l.clientHeight, o.offsetTop, o.offsetHeight);
      if (st !== l.scrollTop) l.scrollTop = st;
    }
  }

  private dropMove(d: number): void {
    this.drop.move(d);
    this.markDrop();
  }

  /** Pick a choice (`i`, else the highlighted one): the select changes (its handler runs), the list closes, and by pad the
   *  focus steps on (the next picker, or the first slider). */
  private dropPick(i?: number): void {
    const b = this.dropBtn;
    const s = b ? this.dropSel.get(b) : undefined;
    const idx = i ?? this.drop.pick();
    this.closeDrop();
    if (!b || !s) return;
    if (idx !== s.selectedIndex) {
      s.selectedIndex = idx;
      s.dispatchEvent(this.changeEv);
    }
    this.refreshDrop(b);
    this.stepOn(b.dataset.pad ?? '');
  }

  /** B / Esc / a click outside: the list closes, nothing changes. */
  private dropBack(): void {
    this.drop.back();
    this.closeDrop();
  }

  private closeDrop(): void {
    if (!this.drop.open && this.dropList.hidden) return;
    this.drop.open = false;
    this.dropBtn = null;
    this.dropList.hidden = true;
    this.dropList.replaceChildren();
    this.setHint();
  }

  /** The keyboard on an open list: arrows move, Enter picks, Esc backs out. True: taken. */
  private dropKey(e: KeyboardEvent): boolean {
    const k = e.key;
    if (k !== 'ArrowUp' && k !== 'ArrowDown' && k !== 'Enter' && k !== 'Escape') return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (k === 'ArrowUp') this.dropMove(-1);
    else if (k === 'ArrowDown') this.dropMove(1);
    else if (k === 'Enter') this.dropPick();
    else this.dropBack();
    return true;
  }

  /** After a pick by pad: one step on (a part: its first picker; a level: the next level, or the first slider). */
  private stepOn(key: string): void {
    let next = '';
    if (key.startsWith('part:')) {
      const sid = this.partOf.get(key.slice(5));
      if (sid) next = `lv:${sid}:0`;
    } else if (key.startsWith('lv:')) {
      const [, sid, k] = key.split(':');
      const sec = this.sections.find((s) => s.reg.id === sid);
      if (sec) {
        const n = Number(k) + 1;
        // (marlow-bays T2) the first slider that shows (not a group's header)
        const first = Array.from(sec.rows.querySelectorAll<HTMLElement>('input[type=range][data-pad]')).find((e) => e.offsetParent !== null);
        next = n < sec.levels.length && !sec.levels[n]!.disabled ? `lv:${sid}:${n}` : (first?.dataset.pad ?? '');
      }
    }
    if (next) this.padKey = next;
    this.markPadFocus();
  }

  // ------------------------------------------------------------------------------------------
  // Tabs and sections
  // ------------------------------------------------------------------------------------------

  /** A tab's container (made on first use, hidden unless active). */
  private tabEl(id: string): HTMLDivElement {
    let t = this.tabEls.get(id);
    if (!t) {
      t = document.createElement('div');
      t.className = `anim-tune-tab anim-tune-tab-${id.replace(/[^a-z0-9_-]/gi, '-')}`;
      t.dataset.tab = id;
      t.hidden = true;
      this.tabEls.set(id, t);
      this.body.append(t);
    }
    return t;
  }

  /** The tab bar from the registered sections (`tunerLayout.buildTabs`), the LB / RB glyphs at its ends. */
  private buildTabBar(): void {
    const cur = this.tabs[this.tabIdx]?.id;
    this.tabs = buildTabs(
      this.sections.map((s) => s.reg.id),
      (id) => this.sections.find((s) => s.reg.id === id)?.reg.label ?? id,
    );
    const bar = this.tabBar;
    bar.replaceChildren();
    const lb = document.createElement('span');
    lb.className = 'tt-bump';
    lb.innerHTML = padGlyph('LB');
    bar.append(lb);
    for (let i = 0; i < this.tabs.length; i++) {
      const t = this.tabs[i]!;
      let b = this.tabBtns.get(t.id);
      if (!b) {
        b = document.createElement('button');
        b.type = 'button';
        b.className = 'tt-tab';
        b.dataset.tabBtn = t.id;
        b.textContent = t.label;
        const id = t.id;
        b.addEventListener('click', () => {
          this.setTab(this.tabs.findIndex((x) => x.id === id));
          b?.blur();
        });
        this.tabBtns.set(t.id, b);
      }
      bar.append(b);
      // the part picker of a tab with more than one section
      this.syncPartPicker(t);
    }
    const rb = document.createElement('span');
    rb.className = 'tt-bump';
    rb.innerHTML = padGlyph('RB');
    bar.append(rb);
    // (item 29) More last in the body, under every tab
    this.body.append(this.more);
    if (cur) {
      const i = this.tabs.findIndex((t) => t.id === cur);
      if (i >= 0) this.tabIdx = i;
    }
    this.showTab();
  }

  /** A multi-section tab's part picker: made on first need, its choices the tab's sections in order. */
  private syncPartPicker(t: TunerTab): void {
    if (t.sections.length < 2) return;
    const tabEl = this.tabEl(t.id);
    let sel = this.partSel.get(t.id);
    if (!sel) {
      const bar = this.mkBar();
      bar.classList.add('anim-tune-partbar');
      sel = this.mkSel(bar, 'Part', [], (v) => this.setPart(t.id, v), `part:${t.id}`, `anim-tune-part-${t.id}`);
      tabEl.prepend(bar);
      this.partSel.set(t.id, sel);
    }
    // (item 24, track A) the parts Who shows (Wren's, or the guards'); one part: the list hides
    const secs = whoSections(t.sections, TUNE_WHO.who);
    const want = secs.join(',');
    if (sel.dataset.opts !== want) {
      sel.dataset.opts = want;
      sel.replaceChildren();
      for (const id of secs) {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = plainSection(id, this.sections.find((s) => s.reg.id === id)?.reg.label ?? id);
        sel.append(o);
      }
    }
    const field = sel.parentElement;
    if (field) field.hidden = secs.length < 2;
    const cur = this.partOf.get(t.id);
    if (!cur || !secs.includes(cur)) this.partOf.set(t.id, secs[0] ?? t.sections[0]!);
    sel.value = this.partOf.get(t.id)!;
    this.showParts(t.id);
    for (const b of this.dropBtns) if (this.dropSel.get(b) === sel) this.refreshDrop(b);
  }

  /** (item 24, track A) The section a tab shows: its picked part among the parts Who shows, else its first. */
  private tabPart(t: TunerTab): string {
    const secs = whoSections(t.sections, TUNE_WHO.who);
    const p = this.partOf.get(t.id);
    return secs.length > 1 && p && secs.includes(p) ? p : (secs[0] ?? t.sections[0] ?? '');
  }

  /**
   * (item 24, track A) Who: Wren's rows or the guards'. Every tab shows that one's parts (a tab with no guard rows keeps
   * Wren's, under a grey line); in the Anim Studio the guard puppet plays (a guard loop) or Wren again.
   */
  private setWho(w: TuneWho): void {
    if (this.whoSel.value !== w) {
      this.whoSel.value = w;
      for (const d of this.dropBtns) if (this.dropSel.get(d) === this.whoSel) this.refreshDrop(d);
    }
    if (TUNE_WHO.who === w) return;
    TUNE_WHO.who = w;
    for (const t of this.tabs) this.syncPartPicker(t);
    this.showTab();
    const t = this.tabs[this.tabIdx];
    const k = t ? this.sections.findIndex((s) => s.reg.id === this.tabPart(t)) : -1;
    if (k >= 0) this.lastSec = k;
    if (STUDIO.active && !this.loopFromTab) {
      const guardLoop = STUDIO.entry.startsWith('guard:');
      const id = w === 'guard' && !guardLoop ? 'guard:idle' : w === 'wren' && guardLoop ? 'state:idle' : '';
      if (id) {
        this.loopFromTab = true;
        try {
          this.studioUi.play(id);
        } finally {
          this.loopFromTab = false;
        }
      }
    }
    this.markPadFocus();
    this.refreshSel();
  }

  /** (item 24, track A) The Who list at the head of the shown section's what-row (a tab with guard rows), the note
   *  in a tab without them while Who is Guard. A DOM move on a change only. */
  private placeWho(): void {
    const t = this.tabs[this.tabIdx];
    const field = this.whoSel.parentElement;
    if (!t || !field) return;
    const has = t.sections.some(isGuardSection);
    const head = has ? this.sections.find((x) => x.reg.id === this.tabPart(t))?.wrap.querySelector<HTMLElement>('.tt-what') : null;
    if (head) {
      if (field.parentElement !== head || head.firstElementChild !== field) head.prepend(field);
      field.hidden = false;
    } else field.hidden = true;
    const note = TUNE_WHO.who === 'guard' && !has;
    this.whoNote.hidden = !note;
    if (note) {
      const el = this.tabEl(t.id);
      if (this.whoNote.parentElement !== el) el.prepend(this.whoNote);
    }
  }

  /** Switch a tab's part (section). */
  private setPart(tabId: string, sid: string): void {
    this.partOf.set(tabId, sid);
    const sel = this.partSel.get(tabId);
    if (sel && sel.value !== sid) sel.value = sid;
    this.showParts(tabId);
    const k = this.sections.findIndex((s) => s.reg.id === sid);
    if (k >= 0) this.lastSec = k;
    this.markPadFocus();
    this.refreshSel();
  }

  /** Only the tab's chosen part shows. */
  private showParts(tabId: string): void {
    const t = this.tabs.find((x) => x.id === tabId);
    if (!t) return;
    const part = this.tabPart(t);
    for (const id of t.sections) {
      const s = this.sections.find((x) => x.reg.id === id);
      if (s) s.wrap.hidden = id !== part;
    }
    // (marlow-bays item 29) one "what" row: the tab's Part list moves to the head of the shown section, before its
    // State / Weapon lists (a DOM move on a change only)
    const field = this.partSel.get(tabId)?.parentElement;
    const head = this.sections.find((x) => x.reg.id === part)?.wrap.querySelector<HTMLElement>('.tt-what');
    if (field && head && field.parentElement !== head) head.prepend(field);
    // (item 24, track A) Who before the Part list
    if (this.tabs[this.tabIdx]?.id === tabId) this.placeWho();
  }

  /** Show tab `i` (LB / RB or a click): one tab's content at a time; the pad focus on its first control. */
  private setTab(i: number, focus = true): void {
    if (i < 0 || i >= this.tabs.length) return;
    this.closeDrop();
    if (this.menuOpen) this.closeMenu();
    this.tabIdx = i;
    this.showTab();
    if (focus) {
      this.padKey = '';
      this.padIdx = 0;
      // (T1a) the tab's own first control (the playback bar above it is reached with D-pad up)
      const items = this.padItems();
      const first = this.firstTabItem(items);
      this.padKey = first?.dataset.pad ?? '';
    }
    const t = this.tabs[i]!;
    const sid = this.tabPart(t);
    const k = this.sections.findIndex((s) => s.reg.id === sid);
    if (k >= 0) this.lastSec = k;
    this.markPadFocus();
    this.refreshSel();
  }

  private showTab(): void {
    const cur = this.tabs[this.tabIdx]?.id;
    for (const [id, el] of this.tabEls) el.hidden = id !== cur;
    for (const [id, b] of this.tabBtns) b.classList.toggle('active', id === cur);
    const b = cur ? this.tabBtns.get(cur) : undefined;
    if (b && this.open) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.placeWho(); // (item 24, track A)
    this.body.scrollTop = 0;
    // (marlow-bays item 26) the phone panel scrolls as a whole: a new tab starts at its top (the tabs in view)
    if (this.layout.mode !== 'desktop') this.el.scrollTop = 0;
  }

  private addSection(reg: TuneSection, rebuildBar: boolean): void {
    const kind = reg.id;
    const groups = reg.groups;
    const first = groups[0] ?? '';
    const tabId = tabOfSection(kind);
    const wrap = document.createElement('div');
    wrap.dataset.padSec = kind;
    wrap.className = `anim-tune-sec anim-tune-sec-${kind}`;
    if (reg.note) {
      const n = document.createElement('div');
      n.className = 'anim-tune-note tt-note';
      n.textContent = reg.note;
      wrap.append(n);
    }
    const prefix = sharedPrefix(groups);
    const nLev = levelCount(groups, prefix);
    const head = this.mkBar();
    // (marlow-bays item 29) the "what" row: the Part list (multi-section tabs), then this section's State / Weapon lists
    head.classList.add('tt-what');
    // the hidden picker of every group id (tests, the console)
    const pick = document.createElement('select');
    pick.className = `anim-tune-pick-${kind}`;
    pick.hidden = true;
    for (const g of groups) {
      const o = document.createElement('option');
      o.value = g;
      o.textContent = g;
      pick.append(o);
    }
    pick.value = first;
    head.append(pick);
    const rows = document.createElement('div');
    rows.className = `anim-tune-rows-${kind}`;
    rows.style.display = 'grid';
    rows.style.gap = '1px';
    // (item 29) the rows that do nothing in the loop playing now are greyed, this line says why
    const eff = document.createElement('div');
    eff.className = 'tt-note anim-tune-effect';
    eff.hidden = true;
    const sum = document.createElement('div');
    sum.className = 'tt-note tt-reach-sum';
    sum.hidden = true;
    const sec: Section = { reg, pick, levels: [], rows, wrap, group: first, prefix, eff, sum };
    for (let k = 0; k < nLev; k++) {
      const lv = k;
      sec.levels.push(this.mkSel(head, levelName(kind, k), [], (v) => this.pickLevel(sec, lv, v), `lv:${kind}:${k}`, `anim-tune-level anim-tune-level-${kind}-${k}`));
    }
    pick.addEventListener('change', () => {
      // (pass 3) a manual pick turns follow off (else the next state change would take it away again)
      this.setFollow(false);
      sec.group = pick.value;
      this.rebuild(sec);
    });
    // (tuner-clarity S4, BRIEF A1) the fixed note at the top of the Keys tab (the hint below it stays as it was)
    if (kind === 'keys') {
      const mn = document.createElement('div');
      mn.className = 'anim-tune-keys-mocap tt-note';
      mn.textContent = KEYS_MOCAP_NOTE;
      wrap.append(mn);
    }
    wrap.append(head);
    // (marlow-bays T1a, items 15 and 18) the Keys tab: key back / forward (the picker follows), the readout, the Mirror
    // box and the hint, between the pickers and the sliders
    if (kind === 'keys') wrap.append(this.keysBlock());
    wrap.append(eff, sum, rows);
    this.tabEl(tabId).append(wrap);
    this.sections.push(sec);
    this.cand.push('');
    this.candAt.push(0);
    this.rebuild(sec);
    if (rebuildBar) this.buildTabBar();
  }

  /** A level picked: the group under the new path (follow off, as any manual pick). (fix round) A state picked on the
   *  Body part carries to the sections keyed by the same state (`carryBody`); a pick in any other section stays local. */
  private pickLevel(sec: Section, level: number, v: string): void {
    const path = groupPath(sec.group, sec.prefix);
    path[level] = v;
    const g = groupForPath(sec.reg.groups, sec.prefix, path);
    if (!g) return;
    this.setFollow(false);
    sec.group = g;
    this.rebuild(sec);
    if (sec.reg.id === 'body') this.carryBody(g);
    // (marlow-bays item 13) in the studio a state picked here plays its loop (the tab and its part stay)
    if (STUDIO.active) {
      const sid = sec.reg.id;
      // (marlow-bays T1a, item 16) a weapon picked (Hands & feet, Gun in hand, the gun hold): every armed loop takes it
      const w = sid === 'hand' || sid === 'weapon' || sid === 'gun' ? (groupPath(g, sec.prefix)[0] ?? '') : '';
      if (w === 'rifle' || w === 'pistol') this.studioUi.setWeapon(w);
      // (T1a, item 15) a clip or key picked in the Keys tab: that clip on the spot, paused on that key
      const kg = sid === 'keys' ? tuneKeysIdOf(g) : null; // (item 25) an added key too
      if (kg) {
        this.loopFromTab = this.keyPicking = true;
        try {
          this.studioUi.showKey(kg[0], kg[1]);
        } finally {
          this.loopFromTab = this.keyPicking = false;
        }
        // the picker stays on the picked key (the stage lands on it next frame)
        this.keyShown = kg[1];
        this.keyClipShown = kg[0];
        return;
      }
      let id = loopForGroup(sid, g, STUDIO.entry);
      // a gun picked while a holstered loop plays: its low ready (the stance shows the gun)
      if (!id && (w === 'rifle' || w === 'pistol') && !studioEntry(STUDIO.entry).drawn) id = 'state:lowReady';
      if (id && studioEntry(id).id === id) {
        this.loopFromTab = true;
        try {
          this.studioUi.play(id);
        } finally {
          this.loopFromTab = false;
        }
      }
    }
  }

  /** (fix round) A body state onto Joints, Limb reach, Hands & feet, Gun in hand, the gun hold (where it maps), Stepping
   *  and Weight; each section keeps its other levels (the weapon) and only takes a group it has. */
  private carryBody(b: string): void {
    // (marlow-bays T1a) the gun shown (the studio's pick, else the Hands & feet part's weapon): its own Joints row
    const hs = this.sections.find((s) => s.reg.id === 'hand');
    const w = STUDIO.active ? STUDIO.weapon : hs ? (groupPath(hs.group, hs.prefix)[0] ?? '') : '';
    const c = bodyCarry(b, this.carryOut, w);
    this.showGroup('joint', c.joint);
    this.showGroup('ik', c.ik);
    this.showLast('hand', c.handState);
    this.showLast('weapon', c.handState);
    this.showLast('gun', c.gunState);
    this.showGroup('step', c.step);
    this.showGroup('weight', c.weight);
  }

  /** (fix round) A section's last level set to `seg` (the other levels kept), when it has that group. */
  private showLast(sid: string, seg: string): void {
    if (!seg) return;
    const sec = this.sections.find((s) => s.reg.id === sid);
    if (!sec) return;
    const path = groupPath(sec.group, sec.prefix);
    path[path.length - 1] = seg;
    const g = groupForPath(sec.reg.groups, sec.prefix, path);
    const gp = g ? groupPath(g, sec.prefix) : [];
    if (g && gp[gp.length - 1] === seg) this.showGroup(sid, g);
  }

  /** The level pickers' choices for the section's group (plain words; a changed group marked with a dot). */
  private fillLevels(sec: Section): void {
    const groups = sec.reg.groups;
    const path = groupPath(sec.group, sec.prefix);
    const last = ownLevel(sec);
    for (let k = 0; k < sec.levels.length; k++) {
      const sel = sec.levels[k]!;
      let opts = levelOptions(groups, sec.prefix, path, k);
      // (marlow-bays T1a, item 18) the Keys tab's key list: the keys only (not the Mirror box's group); with the Mirror
      // box on, a mirrored clip's own keys (its mirrored half follows them)
      // (item 25) live keys only, in phase order (added keys among them)
      const keysLevel = sec.reg.id === 'keys' && k === 1;
      if (keysLevel) {
        const clip = path[0] ?? '';
        const c = keyClip(clip);
        opts = opts.filter((s) => keyListed(clip, s));
        if (c) opts.sort((x, y) => keyPhase(c, keySegId(clip, x)) - keyPhase(c, keySegId(clip, y)));
      }
      sel.replaceChildren();
      for (const seg of opts) {
        const o = document.createElement('option');
        o.value = seg;
        let t = keysLevel ? keyPickLabel(path[0] ?? '', seg) : plainGroupWord(sec.reg.id, k, seg);
        if (sec.reg.id.startsWith('team_') && (seg === 'a' || seg === 'b')) {
          const note = sec.reg.notes?.(`${groups[0]!.split('.').slice(0, sec.prefix).join('.')}.${seg}`, '')[0];
          if (note) t = note.replace(/^([AB]) /, 'Role $1: ');
        }
        if (k === last) {
          const p = path.slice(0, k);
          p.push(seg);
          const g = groupForPath(groups, sec.prefix, p);
          if (g && tuneGroupChanged(g)) t += ' •';
        }
        o.textContent = t;
        sel.append(o);
      }
      sel.disabled = opts.length === 0;
      // (marlow-bays T2) a level with no choice here does not show
      const lab = sel.parentElement;
      if (lab && lab.hidden !== sel.disabled) lab.hidden = sel.disabled;
      if (path[k] !== undefined) sel.value = path[k]!;
    }
    for (const b of this.dropBtns) {
      const s = this.dropSel.get(b);
      if (s && sec.levels.includes(s)) this.refreshDrop(b);
    }
  }

  private rebuildAll(): void {
    for (const s of this.sections) this.rebuild(s);
  }

  /** The slider rows of one section's group and its pickers (the pad's focus mark is put back on). */
  private rebuild(sec: Section): void {
    // (marlow-bays item 29 phase 2, Michael: "when changing keys it returned the window to the top") a rebuild (a key
    // stepped or picked, added or deleted, another state) keeps the panel's scroll and the focused slider
    const sc = this.scroller();
    const st = sc.scrollTop;
    const act = document.activeElement as HTMLElement | null;
    const fk = act && sec.rows.contains(act) ? act.dataset.pad : undefined;
    this.buildRows(sec);
    this.fillLevels(sec);
    if (fk) sec.rows.querySelector<HTMLElement>(`[data-pad="${globalThis.CSS.escape(fk)}"]`)?.focus({ preventScroll: true });
    this.markPadFocus();
    if (sc.scrollTop !== st) sc.scrollTop = st;
  }

  /**
   * The slider rows of one section's group (filtered by "Changed only"), in groups by what they move (slice T's
   * targets), each group a header that folds. A group shows open when it is the first, holds the selected row or a short
   * list leaves little to show; a header click (A) opens or closes it and that choice holds (item 29: the panel keeps its
   * scroll and brings the opened group into view).
   */
  private buildRows(sec: Section): void {
    sec.rows.replaceChildren();
    if (sec.pick.value !== sec.group) sec.pick.value = sec.group;
    const group = sec.group;
    const kind = sec.reg.id;
    const all = tunablesFor(group);
    // (item 29) every slider of the group shows (no search, no part filter); "Changed only" stays in More
    const list = all.filter(
      (t) =>
        (!this.changedOnly || tuneGet(group, t.id) !== t.def) &&
        // (marlow-bays item 23) a key's time has its own control in the Keys block (clamped between its neighbours)
        !(kind === 'keys' && (t.id === KEY_TIME_ID || t.id === KEY_DEL_ID || t.id === KEY_AT_ID)), // (item 25) add / delete: the Keys block's buttons
    );
    if (!list.length) {
      const none = document.createElement('div');
      none.className = 'tt-note';
      none.textContent = this.changedOnly ? 'Nothing changed here.' : 'No sliders.';
      sec.rows.append(none);
      sec.eff.hidden = true;
      sec.sum.hidden = true;
      this.refreshSel();
      return;
    }
    const labels: string[] = [];
    const byLabel = new Map<string, TuneTunable[]>();
    // (item 29 phase 2) an armed row names the hands by their job (gun hand, support hand)
    const roles = handRoles(kind, group);
    for (const t of list) {
      const l = roleWords(tuneTarget(kind, t.id, this.rowScratch).label || plainSection(kind, sec.reg.label), roles);
      let g = byLabel.get(l);
      if (!g) {
        g = [];
        byLabel.set(l, g);
        labels.push(l);
      }
      g.push(t);
    }
    const many = labels.length > 1;
    const sel = rowKeyParts(this.selKey);
    for (let gi = 0; gi < labels.length; gi++) {
      const l = labels[gi]!;
      const rows = byLabel.get(l)!;
      let parent: HTMLElement = sec.rows;
      if (many) {
        const gk = `${kind}|${l}`;
        const hasSel = !!sel && sel.section === kind && rows.some((t) => t.id === sel.id);
        const open = groupOpen(this.grpOpen.get(gk), { first: gi === 0, hasSel, rows: list.length });
        const h = document.createElement('button');
        h.type = 'button';
        h.className = open ? 'tt-grp open' : 'tt-grp';
        h.dataset.pad = `g:${kind}:${l}`;
        const name = document.createElement('span');
        name.textContent = l.replace(/\s*\(key\)$/, '');
        const n = document.createElement('span');
        n.className = 'n';
        const chg = rows.some((t) => tuneGet(group, t.id) !== t.def);
        n.textContent = `${rows.length}`;
        if (chg) {
          const dot = document.createElement('span');
          dot.className = 'chg';
          dot.textContent = ' •';
          n.append(dot);
        }
        h.append(name, n);
        const body = document.createElement('div');
        body.className = 'tt-gbody';
        body.hidden = !open;
        h.addEventListener('click', () => {
          const o = !!body.hidden;
          this.grpOpen.set(gk, o);
          body.hidden = !o;
          h.classList.toggle('open', o);
          h.blur();
          // (item 29, Michael's iPad) the panel keeps its scroll (the focus mark no longer scrolls it) and an opened
          // group comes into view: its rows below the header, or as much as fits with the header kept at the top
          this.markPadFocus();
          if (o) this.scrollGroupIntoView(h, body);
        });
        sec.rows.append(h, body);
        parent = body;
      }
      for (const t of rows) this.buildRow(sec, t, parent);
    }
    // (marlow-bays item 10) the rows are new: the selected one is marked again
    this.refreshSel();
    this.applyEffect(sec);
  }

  /**
   * (marlow-bays item 29) The rows of `sec` that change nothing in the loop playing now (`tunerEffect.ts`, from the
   * effect probe) greyed, with the reason in one line over them; they stay editable (the value applies to the other way
   * of playing the state). No rebuild: classes only.
   */
  private applyEffect(sec: Section): void {
    const why: string[] = [];
    const reaches: Reach[] = [];
    // (tuner-clarity S4) the badges: each row's reach, or "Not playing now" by the live band (`ReachNow`)
    const states = rowStates(sec.reg.id, sec.group);
    let n = 0;
    for (const inp of Array.from(sec.rows.querySelectorAll<HTMLInputElement>('input[type=range][data-id]'))) {
      const row = inp.closest<HTMLElement>('.tt-row');
      if (!row) continue;
      const reach = rowReach(sec.reg.id, sec.group, inp.dataset.id ?? '');
      reaches.push(reach);
      this.showReach(row, rowNow(reach, states, this.reachNow));
      const r = sliderEffect(sec.reg.id, sec.group, inp.dataset.id ?? '', this.effMode);
      row.classList.toggle('tt-off', r !== '');
      if (r) {
        row.dataset.off = r;
        n++;
        if (!why.includes(r)) why.push(r);
      } else delete row.dataset.off;
    }
    sec.eff.hidden = n === 0;
    sec.eff.textContent = n ? `Greyed (${n}): ${why.join('; ')}.` : '';
    const sum = reachSummary(reaches);
    sec.sum.hidden = sum === '';
    if (sec.sum.textContent !== sum) sec.sum.textContent = sum;
  }

  /** (S4) One row's badge: words and colour from `tunerReach.ts` (none: no badge). Classes and text only. */
  private showReach(row: HTMLElement, shown: ReachShown): void {
    const b = row.querySelector<HTMLElement>('.tt-reach');
    if (!b) return;
    const w = REACH_WORDS[shown];
    b.hidden = w === '';
    if (b.textContent !== w) b.textContent = w;
    const cls = `tt-reach tt-reach-${shown}`;
    if (b.className !== cls) {
      b.className = cls;
      b.title = REACH_TITLES[shown];
    }
  }

  /**
   * (S4, BRIEF A4) An edit of row `id` in `sec`: when it changes nothing on screen (`editWarning`), the one line shows
   * for 5 s in the header strip and in a strip under the edited row (one per panel: it moves). Off with the More > Panel box.
   */
  private editWarn(sec: Section, id: string, row: HTMLElement | null): void {
    if (this.warnBox && !this.warnBox.checked) return;
    const w = editWarning(sec.reg.id, sec.group, id, this.reachNow);
    if (!w) return;
    if (this.warnText !== w || this.warnEl.hidden) {
      this.warnText = w;
      this.warnEl.textContent = w;
      this.rowWarnEl.textContent = w;
    }
    this.warnEl.hidden = false;
    if (row && row.isConnected) {
      if (this.rowWarnEl.previousElementSibling !== row) row.after(this.rowWarnEl);
      this.rowWarnEl.hidden = false;
    }
    if (this.warnTimer) clearTimeout(this.warnTimer);
    this.warnTimer = setTimeout(() => this.clearWarn(), WARN_MS);
  }

  private clearWarn(): void {
    if (this.warnTimer) clearTimeout(this.warnTimer);
    this.warnTimer = null;
    this.warnText = '';
    this.warnEl.hidden = true;
    this.rowWarnEl.hidden = true;
    this.rowWarnEl.remove();
  }

  /** (S4) A Keys key tool ran (Wave, Apply to keys, Smooth between): the warning for the field it changed. */
  private keyToolWarn(): void {
    const sec = this.sections.find((s) => s.reg.id === 'keys');
    const kt = this.keyTools;
    if (!sec || !kt) return;
    const p = rowKeyParts(this.selKey);
    const sel = p && p.section === 'keys' ? p.id : '';
    const st = kt.state();
    // Wave names its channel; the other tools the picked slider, none picked: no warning (not the trunk's)
    const id = keyToolField(st.tool, st.chan, sel);
    if (!id) return;
    const row = sec.rows.querySelector<HTMLElement>(`input[data-id="${globalThis.CSS.escape(id)}"]`)?.closest<HTMLElement>('.tt-row') ?? null;
    this.editWarn(sec, id, row);
  }

  /** One slider row: name, slider, value (type a value, Enter), unit, reset; the grey notes under it. */
  private buildRow(sec: Section, t: TuneTunable, parent: HTMLElement): void {
    const group = sec.group;
    const kind = sec.reg.id;
    // (anim-skeleton S4 note) the leg FK weight only matters on a clip whose key file sets `legs`: not shown elsewhere
    if (kind === 'keys' && /^leg[LR]_w$/.test(t.id) && !keyClipLegs(group)) return;
    const row = document.createElement('div');
    row.dataset.padRow = '1';
    row.className = 'tt-row';
    // (tuner-clarity S4) a Body slider the capture ignores adds its note to the hover text (no extra line)
    const hmNote = rowNote(kind, group, t.id);
    row.title = `${t.label} (${t.id}, default ${t.def} ${t.unit})${hmNote ? `\n${hmNote}` : ''}`;
    const name = document.createElement('span');
    name.className = 'tt-name';
    // the name's text is the first child (the selection line reads it); in its own span so the ellipsis cuts the name, never the badge
    const nameText = document.createElement('span');
    nameText.className = 'tt-name-text';
    nameText.textContent = roleWords(plainLabel(kind, t.id, t.label), handRoles(kind, group));
    name.append(nameText);
    // (S4) the reach badge: words plus colour (`applyEffect` fills it; no tag: hidden); not focusable, not a touch target
    const badge = document.createElement('span');
    badge.className = 'tt-reach';
    badge.hidden = true;
    name.append(badge);
    // (item 29 phase 2) the value in plain units (cm, degrees): `su.k` scales the stored value for the field only
    const su = shownUnit(t.unit);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(tuneMin(t));
    input.max = String(tuneMax(t));
    input.step = String(t.step);
    input.dataset.group = group;
    input.dataset.id = t.id;
    input.dataset.pad = `s:${kind}:${t.id}`;
    // (pass 2) the value as a number field: type a value (clamped to the active range), Enter applies
    const val = document.createElement('input');
    val.type = 'number';
    val.step = 'any';
    val.className = 'anim-tune-num';
    // (typing: the field keeps what is typed until Enter or blur; otherwise it shows the value)
    val.addEventListener('input', () => (val.dataset.typing = '1'));
    val.addEventListener('change', () => {
      delete val.dataset.typing;
      const v = Number(val.value);
      if (val.value.trim() !== '' && Number.isFinite(v)) {
        tuneSet(group, t.id, v / su.k);
        this.editWarn(sec, t.id, row);
      }
      show();
    });
    val.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') val.blur();
    });
    this.rowNum.set(input, val);
    const unit = document.createElement('span');
    unit.className = 'tt-unit';
    unit.textContent = su.unit;
    const x = document.createElement('button');
    x.type = 'button';
    x.textContent = '↺';
    x.title = 'Back to default';
    x.className = 'tt-x';
    const show = (): void => {
      const v = tuneGet(group, t.id);
      input.value = String(v);
      if (val.dataset.typing !== '1') val.value = valueText(v * su.k, t.step * su.k);
      val.classList.toggle('chg', v !== t.def);
    };
    this.rowShow.set(input, show);
    show();
    input.addEventListener('input', () => {
      tuneSet(group, t.id, Number(input.value));
      this.editWarn(sec, t.id, row);
      show();
    });
    // (the slider lets go of the keyboard, so the arrow keys and Space stay the game's)
    input.addEventListener('change', () => input.blur());
    // (pass 3) held: follow waits; released: the keys go back to the game
    input.addEventListener('pointerdown', () => (this.pressing = true));
    input.addEventListener('touchstart', () => (this.pressing = true), { passive: true });
    const release = (): void => {
      this.pressing = false;
      input.blur();
    };
    for (const ev of ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'lostpointercapture']) input.addEventListener(ev, release);
    x.addEventListener('click', (e) => {
      e.preventDefault();
      tuneReset(group, t.id);
      show();
    });
    row.append(name, input, val, unit, x);
    parent.append(row);
    // (pass 3) the real-world target, (tuner-camera) the game's value today: small grey lines under the slider
    for (const note of tuneNotes(group, t.id)) {
      const hl = document.createElement('div');
      hl.className = note.startsWith('today:') ? 'anim-tune-hint anim-tune-today' : 'anim-tune-hint';
      hl.textContent = note;
      parent.append(hl);
    }
  }

  // ------------------------------------------------------------------------------------------
  // (marlow-bays T2) The part filter: the body map, a click on her in the scene, pinned and recent sliders
  // ------------------------------------------------------------------------------------------

  /** The section the shown tab shows (its picked part in a multi-section tab). */
  private shownSection(): Section | undefined {
    const t = this.tabs[this.tabIdx];
    if (!t) return undefined;
    const sid = this.tabPart(t);
    return this.sections.find((s) => s.reg.id === sid);
  }

  /**
   * A part picked on her (a click or a tap): the shown tab when it has a slider that moves `p`, else the first section
   * that does (Joints, Body, Hands & feet, Limb reach, Keys; the weapon: Gun in hand, Gun hold); its first such slider is
   * selected (the scene marker lands on it). (item 29) The rows are never filtered.
   */
  private pickPart(p: BodyPart): void {
    this.bodyPart = p;
    const has = (s: Section): boolean => tunablesFor(s.group).some((t) => rowHasPart(s.reg.id, t.id, p));
    const cur = this.shownSection();
    let target = cur && (!p || has(cur)) ? cur : undefined;
    if (!target && p) {
      // (item 24, track A) Who is Guard: the guard's joints
      const order = TUNE_WHO.who === 'guard' ? ['guardJoint'] : p === 'weapon' ? ['weapon', 'gun', 'hand'] : p === 'body' ? ['body', 'joint'] : ['joint', 'body', 'hand', 'ik', 'keys'];
      for (const id of order) {
        const s = this.sections.find((x) => x.reg.id === id);
        if (s && has(s)) {
          target = s;
          break;
        }
      }
    }
    if (target && target !== cur) {
      const tabId = tabOfSection(target.reg.id);
      const ti = this.tabs.findIndex((t) => t.id === tabId);
      if (ti >= 0 && ti !== this.tabIdx) this.setTab(ti, false);
      const tab = this.tabs[ti];
      if (tab && tab.sections.length > 1) this.setPart(tab.id, target.reg.id);
    }
    // (item 29) no filter: the part's first slider is selected, its group opened and scrolled to (the pad focus on it)
    const tg = target;
    if (tg && p) {
      const first = tunablesFor(tg.group).find((t) => rowHasPart(tg.reg.id, t.id, p));
      if (first) {
        const key = `s:${tg.reg.id}:${first.id}`;
        this.grpOpen.set(`${tg.reg.id}|${tuneTarget(tg.reg.id, first.id, this.rowScratch).label}`, true);
        this.selKey = key;
        this.rebuild(tg);
        this.revealRow(key);
        this.padKey = key;
        this.markPadFocus(true);
      }
    }
    this.refreshSel();
  }

  /** (T2) A click on the scene at (x, y) (page px): the nearest joint of hers, or the gun, within 48 px picks its part.
   *  True: picked. */
  private pickAtScreen(x: number, y: number): boolean {
    const rig = this.rig?.();
    const scene = this.scene;
    const cam = scene?.activeCamera as unknown as MarkerCam | null | undefined;
    const gc = scene?.getEngine().getRenderingCanvas();
    if (!rig || !cam || !cam.rotation || !gc) return false;
    const r = gc.getBoundingClientRect();
    const n = RIG_JOINTS.length;
    const xs = new Float32Array(n + 1);
    const ys = new Float32Array(n + 1);
    const ok: boolean[] = [];
    const o = this.markSA;
    const near = Math.max(0.05, cam.minZ);
    for (let i = 0; i < n; i++) {
      const node = rig[RIG_JOINTS[i]!];
      ok[i] = false;
      if (!node) continue;
      const p = node.getAbsolutePosition();
      projectPoint(cam, p.x, p.y, p.z, r.width, r.height, o);
      xs[i] = o.x + r.left;
      ys[i] = o.y + r.top;
      ok[i] = o.z > near;
    }
    ok[n] = false;
    const w = rig.heldWeapon;
    if (w) {
      Vector3.TransformCoordinatesFromFloatsToRef(0, rig.gunSpan.bore, rig.gunSpan.z1 * 0.5, w.getWorldMatrix(), this.markA);
      projectPoint(cam, this.markA.x, this.markA.y, this.markA.z, r.width, r.height, o);
      xs[n] = o.x + r.left;
      ys[n] = o.y + r.top;
      ok[n] = o.z > near;
    }
    const i = pickOnBody(xs, ys, ok, RIG_BONES, x, y);
    if (i < 0) return false;
    const part: BodyPart = i === n ? 'weapon' : RIG_JOINTS[i]!;
    this.pickPart(part);
    this.flashInfo(`Picked on her: ${partLabel(part)}`);
    return true;
  }

  /** Open the group of a row (pad key) and scroll it into view. True: the row shows. */
  private revealRow(key: string): boolean {
    const inp = this.el.querySelector<HTMLElement>(`input[data-pad="${globalThis.CSS.escape(key)}"]`);
    if (!inp) return false;
    const body = inp.closest<HTMLElement>('.tt-gbody');
    if (body?.hidden) {
      const h = body.previousElementSibling as HTMLButtonElement | null;
      h?.click();
    }
    inp.closest<HTMLElement>('[data-pad-row]')?.scrollIntoView({ block: 'nearest' });
    return inp.offsetParent !== null;
  }

  /** The element that scrolls the panel's content: the body on the desktop dock, the whole panel on a drawer / sheet. */
  private scroller(): HTMLElement {
    return this.layout.mode === 'desktop' ? this.body : this.el;
  }

  /**
   * (marlow-bays item 29, Michael's iPad: "opening a group that needs scrolling jumps the panel back to the top") A group
   * (its header `h` and rows `body`) just opened: the panel scrolls down only as far as needed to show its rows, never
   * past its header (kept under the sticky header on a phone); nothing moves when it already shows.
   */
  private scrollGroupIntoView(h: HTMLElement, body: HTMLElement): void {
    const sc = this.scroller();
    const cr = sc.getBoundingClientRect();
    let top = cr.top;
    if (sc === this.el) top = Math.max(top, this.top.getBoundingClientRect().bottom);
    const over = body.getBoundingClientRect().bottom - cr.bottom;
    if (over <= 0) return;
    const d = Math.min(over, Math.max(0, h.getBoundingClientRect().top - top));
    if (d > 0) sc.scrollTop += d;
  }

  /** (item 29 phase 2) A drawer / sheet scrolls as a whole: a row brought into view stops under the sticky top block. */
  private syncTopPad(): void {
    this.el.style.scrollPaddingTop = this.layout.mode === 'desktop' ? '' : `${Math.ceil(this.top.getBoundingClientRect().height)}px`;
  }

  /** (item 29) More opened or closed (its header, A on it, the hook). */
  private setMore(open: boolean): void {
    this.moreOpen = open;
    this.moreBody.hidden = !open;
    this.moreHead.classList.toggle('open', open);
    this.markPadFocus();
    if (open) this.scrollGroupIntoView(this.moreHead, this.moreBody);
  }

  /** (item 29) More > Reset this group: the shown part's group back to its defaults. */
  private resetShownGroup(): void {
    const s = this.shownSection();
    if (!s) return;
    tuneResetGroup(s.group);
    this.rebuildAll();
  }

  /** (item 29) A touch screen as the main pointer (a device default, never a layout rule): the F3 readout starts off. */
  get touchDevice(): boolean {
    return flags.phone;
  }

  /**
   * (item 29) The keyboard on the panel (the drag view): up / down the previous / next control, left / right one step of
   * the focused slider (Shift: 5), Enter presses the focused control. True: taken (the game never sees it).
   */
  private arrowKey(e: KeyboardEvent): boolean {
    const k = e.key;
    if (k !== 'ArrowUp' && k !== 'ArrowDown' && k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Enter') return false;
    if (this.pad.mode !== 'tuner' || (this.menuPaused?.() ?? false)) return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (k === 'Enter') {
      if (!e.repeat) this.padSelect();
      return true;
    }
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      this.padNav(k === 'ArrowUp' ? -1 : 1);
      return true;
    }
    const d = k === 'ArrowLeft' ? -1 : 1;
    const f = this.padEl;
    if (f instanceof HTMLInputElement && f.type === 'range' && !this.menuOpen) this.padAdjust(f, d * (e.shiftKey ? 5 : 1));
    else this.padNav(d);
    return true;
  }

  /**
   * (item 29) The pad's right stick and triggers: ALWAYS the camera while the tuner has the pad (no camera mode). A push
   * starts the orbit from the game view (as the wheel and a touch drag do); right stick orbit, RT in, LT out. In the fly
   * view (View tab > Free view > Fly) the right stick looks and RT / LT fly forward / back. No allocation.
   */
  private padCam(pad: Gamepad): void {
    const ax = pad.axes;
    const b = pad.buttons;
    const rx = freeAxis(ax[2] ?? 0);
    const ry = -freeAxis(ax[3] ?? 0);
    let zoom = (b[PAD.RT]?.value ?? 0) - (b[PAD.LT]?.value ?? 0);
    if (Math.abs(zoom) < 0.08) zoom = 0;
    if ((rx !== 0 || ry !== 0 || zoom !== 0) && FREE_VIEW.mode === 'off') this.setFreeMode('orbit', false);
    const fly = FREE_VIEW.mode === 'fly';
    FREE_IN.rx = rx;
    FREE_IN.ry = ry;
    FREE_IN.zoom = fly ? 0 : zoom;
    FREE_IN.ly = fly ? zoom : 0;
    FREE_IN.lx = FREE_IN.rise = FREE_IN.nudge = 0;
  }

  /**
   * (T2) In the Anim Studio the canvas gives up the docked panel's width, so she stands in the middle of the free area
   * (the camera centres her in the canvas). Open, unfolded and in the studio only; one resize per change.
   */
  /** (T2 phase 2) The Anim Studio hides the game HUD (health, compass, objective, weapon and ammo); not in co-op. */
  private syncStudioHud(): void {
    const want = STUDIO.active && !(this.coop?.() ?? false);
    if (want === this.studioHud) return;
    this.studioHud = want;
    document.body.classList.toggle('tt-studio', want);
  }

  private syncDock(): void {
    // (phase 2) never over live co-op play: the canvas is the session's
    const on = this.open && !this.folded && STUDIO.active && !this.coopOn;
    // (marlow-bays item 26) the phone's bottom sheet: the canvas gives up its height instead (she stands above it)
    const sheet = this.layout.mode === 'sheet';
    const want = on && !sheet ? this.panelW : 0;
    const wantH = on && sheet ? this.layout.height : 0;
    if (want === this.dockW && wantH === this.dockH) return;
    this.dockW = want;
    this.dockH = wantH;
    document.documentElement.style.setProperty('--tt-dock-w', `${want}px`);
    document.body.classList.toggle('tt-docked', want > 0);
    document.documentElement.style.setProperty('--tt-dock-h', `${wantH}px`);
    document.body.classList.toggle('tt-docked-b', wantH > 0);
    // (T2 fix round) through the kept engine: a scene released mid-change (a restart from the studio) must not leave
    // the next match rendering at the docked width; with no engine yet the resize waits for the next scene
    const eng = this.scene?.getEngine() ?? this.engine;
    if (eng) {
      this.resizePending = false;
      eng.resize();
    } else this.resizePending = true;
  }

  /** (tuner-ui) Show a section on a group (if it has it). */
  private showGroup(sid: string, g: string): void {
    if (!g || !isTuneGroup(g)) return;
    const sec = this.sections.find((s) => s.reg.id === sid);
    if (!sec || !sec.reg.groups.includes(g) || sec.group === g) return;
    sec.group = g;
    this.rebuild(sec);
  }

  /**
   * (tuner-ui) A loop picked in the Anim Studio: every section shows the group that loop plays through (the body
   * state, its joints, reach, hands and gun for the weapon in the picker, stepping, weight, the keyed clip's keys, the
   * co-op move's role A, the climb move), and follow goes off (an in-place clip stands, so follow would show idle). Off:
   * follow comes back on.
   */
  private applyLoop(id: string): void {
    // (item 24, track A) a guard loop: Who goes to Guard and the guard sections show its row; any other loop: Wren
    const guard = id.startsWith('guard:');
    if (guard || (TUNE_WHO.who === 'guard' && id !== 'off')) {
      const was = this.loopFromTab;
      this.loopFromTab = true;
      try {
        this.setWho(guard ? 'guard' : 'wren');
      } finally {
        this.loopFromTab = was;
      }
    }
    if (guard) {
      this.setFollow(false);
      const g = guardLoopGroups(id);
      this.showGroup('guardJoint', g.joint);
      this.showGroup('guardStep', g.step);
      this.showGroup('guardWeight', g.weight);
      return;
    }
    if (id === 'off') {
      this.setFollow(true);
      return;
    }
    const lg = loopGroups(id, this.loopOut);
    this.setFollow(false);
    const b = lg.body;
    if (b) {
      this.showGroup('body', b);
      this.carryBody(b);
    }
    // the loop's own gait wins (the crouch run's stepping)
    this.showGroup('step', lg.step);
    this.showGroup('weight', lg.weight);
    if (lg.clip && !this.keyPicking) {
      const keys = this.sections.find((s) => s.reg.id === 'keys');
      if (keys) {
        const g = groupForPath(keys.reg.groups, keys.prefix, [lg.clip, '0']);
        if (g && groupPath(g, keys.prefix)[0] === lg.clip) this.showGroup('keys', g);
      }
    }
    if (lg.team) {
      const sid = `team_${lg.team.split('.')[1]}`;
      this.showGroup(sid, lg.team);
      if (this.sections.some((s) => s.reg.id === sid)) this.setPart('coop', sid);
    }
    if (lg.trav) {
      this.showGroup('trav', lg.trav);
      if (!b && !this.loopFromTab) this.setPart('body', 'trav');
    } else if (b && !this.loopFromTab) this.setPart('body', 'body');
  }

  private setFollow(v: boolean): void {
    this.follow = v;
    this.followBox.checked = v;
    if (v) this.syncFollow(true);
  }

  /** A slider or picker of the panel is in use (follow must not rebuild it away). */
  private busy(): boolean {
    const a = document.activeElement;
    // (tuner-pad) the pad tuning too: the rows stay under the pad's focus
    return this.pressing || this.drop.open || this.pad.mode === 'tuner' || (!!a && this.el.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'SELECT'));
  }

  /**
   * Follow the local player's current state (when on): a new state takes over once it has held FOLLOW_HOLD_MS, never
   * while a slider is held or focused (`force`: now, as on opening).
   */
  private syncFollow(force = false): void {
    if (!this.follow) return;
    if (!force && this.busy()) return;
    const now = performance.now();
    for (let k = 0; k < this.sections.length; k++) {
      const s = this.sections[k]!;
      const cur = s.reg.select?.(TUNE_STATE) ?? null;
      if (!cur) continue;
      if (force) {
        this.cand[k] = '';
        if (s.group !== cur) {
          s.group = cur;
          this.rebuild(s);
        }
        continue;
      }
      if (cur === s.group) {
        this.cand[k] = '';
        continue;
      }
      if (this.cand[k] !== cur) {
        this.cand[k] = cur;
        this.candAt[k] = now;
      } else if (now - this.candAt[k]! >= FOLLOW_HOLD_MS) {
        this.cand[k] = '';
        s.group = cur;
        this.rebuild(s);
      }
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void saveAnimTune(tuneSnapshot());
    }, SAVE_DELAY);
  }

  private saveUi(): void {
    // (marlow-bays item 14) the Anim Studio's Stage light goes with the panel's own settings; (item 29) the highlight
    void saveAnimTuneUi({ size: this.size, pauseTuning: this.freezeBox.checked, stageLight: STUDIO_LIGHT.scale, phoneDebug: this.phoneDebug, highlight: this.highlight, clarityWarn: this.warnBox ? this.warnBox.checked : true });
  }

  /** (tuner-ui) The panel size (S / M / L) scaled to the screen (`tunerLayout.tunerScale`). */
  private setSize(s: TunerSize, save: boolean): void {
    this.size = s;
    if (this.sizeSel.value !== s) this.sizeSel.value = s;
    for (const b of this.dropBtns) if (this.dropSel.get(b) === this.sizeSel) this.refreshDrop(b);
    this.applySize();
    if (save) this.saveUi();
  }

  /**
   * The layout from the viewport size alone (`tunerPhone.tunerPhoneLayout`; item 29: never from touch or the input):
   * the desktop dock, the side drawer or the bottom sheet, one density each. The visible viewport's size where the
   * browser has one (a tablet's toolbars), else the window's.
   */
  private applySize(): void {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const vw = Math.round(vv?.width ?? window.innerWidth);
    const vh = Math.round(vv?.height ?? window.innerHeight);
    // nothing changed (a repeated resize event): the open list and the layout stay
    const key = `${vw}x${vh}|${this.size}`;
    if (key === this.sizeKey) return;
    this.sizeKey = key;
    const lay = tunerPhoneLayout(vw, vh, this.layout);
    const el = this.el;
    el.classList.toggle('tt-phone', lay.mode !== 'desktop');
    el.style.setProperty('--tt-t', lay.target ? `${lay.target}px` : '');
    el.classList.toggle('tt-drawer', lay.mode === 'drawer');
    el.classList.toggle('tt-sheet', lay.mode === 'sheet');
    const sc = tunerScale(this.size, vw, vh);
    el.style.fontSize = `${lay.font || sc.font}px`;
    if (lay.mode === 'desktop') {
      el.style.width = `${sc.width}px`;
      el.style.height = '';
      this.panelW = sc.width;
    } else {
      el.style.width = lay.mode === 'drawer' ? `${lay.width}px` : '';
      // (item 29, Michael's iPad) never taller than the visible viewport (100dvh), so no gap and nothing under a toolbar
      el.style.height = lay.mode === 'sheet' ? `min(${lay.height}px, 100dvh)` : '';
      this.panelW = lay.width;
    }
    el.style.maxHeight = '';
    this.syncTopPad();
    this.closeDrop();
    this.syncDock();
  }

  private exportFile(): void {
    const now = new Date();
    const blob = new Blob([JSON.stringify(tuneExport(now), null, 2)], { type: 'application/json' });
    download(blob, tuneExportName(now));
  }

  /** The Anim tool button: open or close. Returns whether it is open now. */
  toggle(): boolean {
    if (this.open) this.hide();
    else this.show();
    return this.open;
  }

  /** (tuner-ui) Out of the Anim Studio: follow is back on. */
  private studioLeft(): void {
    if (this.wasStudio && !STUDIO.active) this.setFollow(true);
    this.wasStudio = STUDIO.active;
  }

  /** (G1) The tuner may open here (the Test Chamber only; the pause and Settings rows ask this to list themselves). */
  get canOpen(): boolean {
    return this.allowed?.() ?? false;
  }

  /** (G2c) The pause menu lists its tuner row: the tuner may open here and the animation stage is on (the plain Test Chamber
   *  and the co-op room keep F3 > Anim and the Settings row, not the pause one). */
  get pauseRow(): boolean {
    return this.canOpen && (this.stageOn?.() ?? false);
  }

  /** (G1) A new game state is in: a panel left open where it may not be goes away. */
  recheck(): void {
    if (this.open && !this.canOpen) this.hide();
  }

  /** Open (F3 > Anim, Pause or Settings): stays open over play until closed. Nothing happens off the Test Chamber (G1). */
  show(): void {
    if (this.canOpen) this.reveal();
  }

  /** (G1) Open without asking `allowed`: only the studio stage, which exists on the Test Chamber alone and opens as it loads
   *  (before the app's state is set, so the map is not readable yet). */
  reveal(): void {
    this.open = true;
    this.studioLeft();
    // (fix round) the co-op lock is read live (a fold or a close never leaves it stale)
    this.refreshCoop();
    this.el.hidden = false;
    this.applySize();
    // (marlow-bays item 26; item 29: a device default, any layout) on a touch device the F3 readout is off unless the
    // tuner's toggle chose it (it covered her)
    if (this.touchDevice && this.debugHost && this.debugHost.visible() !== this.phoneDebug) this.debugHost.set(this.phoneDebug);
    this.debugShown(this.debugHost?.visible() ?? false);
    // (mocap-trial) the box shows the stored setting (changed in Settings meanwhile)
    if (this.mocapBox) {
      this.mocapBox.checked = this.mocapHost?.get() ?? false;
      this.mocapBox.disabled = !this.mocapHost;
    }
    // (anim-studio) in the studio the loop player shows, and the pad starts on the loop list in the View tab
    this.studioUi.sync();
    if (STUDIO.active) this.setTab(this.tabs.findIndex((t) => t.id === 'view'), false);
    // (tuner-pad) opening takes the pad focus (once the press that opened it is released)
    this.pad.open();
    this.stickAcc = 0;
    this.syncFollow(true);
    const first = this.firstTabItem(this.padItems());
    this.padKey = STUDIO.active ? 'st:entry' : (first?.dataset.pad ?? '');
    this.setPadLine();
    this.markPadFocus();
    this.syncTuneFreeze();
    // (anim-bake-1022) a Reset baked notice from while the panel was closed
    if (this.bakedNotice) {
      this.flashInfo(this.bakedNotice, BAKED_NOTICE_MS);
      this.bakedNotice = '';
    }
    // (marlow-bays item 9) open: the pointer free (drag view) by default
    this.mouseCtl.setOpen(true);
    this.applyMouse();
    this.refreshSel();
    this.onOpenChange?.(true);
  }

  /** (marlow-bays item 26) The debug overlay shown or hidden (F3, the settings, the toggle): the Settings box follows. */
  debugShown(on: boolean): void {
    if (this.debugBox && this.debugBox.checked !== on) this.debugBox.checked = on;
  }

  /** (item 26) The layout the panel took (`tunerPhone.tunerPhoneLayout`). */
  get layoutMode(): 'desktop' | 'drawer' | 'sheet' {
    return this.layout.mode;
  }

  hide(): void {
    this.gesture.reset();
    // (tuner-camera) closing ends the free view, the freeze and the slow motion, and shows the HUD
    this.setFreeMode('off');
    if (this.hudBox.checked) {
      this.hudBox.checked = false;
      document.body.classList.remove('tune-hide-hud');
    }
    this.closeDrop();
    if (this.frozen) this.setFrozen(false);
    this.tuneWant = false;
    if (this.runScale !== 1) this.setTimeScale(1);
    if (this.menuOpen) this.closeMenu();
    this.open = false;
    this.padBypass = this.keyBypass = false;
    this.applyBypass();
    this.el.hidden = true;
    this.syncDock();
    this.pad.close();
    this.markPadFocus();
    this.clearMarker();
    this.selMark.shown = false;
    this.studioUi.panelClosed();
    // (marlow-bays item 9) closed: play's own pointer lock again
    this.mouseCtl.setOpen(false);
    this.applyMouse();
    this.onOpenChange?.(false);
  }

  // ------------------------------------------------------------------------------------------
  // Pad
  // ------------------------------------------------------------------------------------------

  /**
   * (tuner-pad) The gamepad source's hook, every poll (seconds): returns true while the pad is the tuner's (the game and
   * the menus then get none of it). No allocation unless the focus, a value or the mode changes.
   */
  padPoll(pad: Gamepad, _now: number, dt: number): boolean {
    // (item 29 phase 2) the left stick's value change runs on real time: `dt` is the game's (0 while "Pause game while
    // tuning" holds it, so the stick changed nothing in play)
    const pnow = performance.now();
    const rdt = this.lastPoll > 0 ? Math.min(0.1, Math.max(0, (pnow - this.lastPoll) / 1000)) : dt;
    this.lastPoll = pnow;
    // (tuner-ui) the pause menu is open: the menus get the pad (every held button stays swallowed once it closes)
    if (this.open && this.menuPaused?.()) {
      this.pad.hold();
      this.clearFreeIn();
      return false;
    }
    let mask = 0;
    const btns = pad.buttons;
    const n = Math.min(btns.length, 17);
    for (let i = 0; i < n; i++) {
      const b = btns[i]!;
      if (b.pressed || b.value > 0.5) mask |= 1 << i;
    }
    const o = this.pad.update(mask, pad.axes[0] ?? 0, pad.axes[1] ?? 0, pnow / 1000, rdt);
    if (!this.open) return o.consume;
    // (pass 2) R3 held: the bypass
    if (o.bypass !== this.padBypass) {
      this.padBypass = o.bypass;
      this.applyBypass();
    }
    if (o.close) {
      this.hide();
      return true;
    }
    // (marlow-bays item 13) L3: loop on the spot
    if (o.spot && STUDIO.active) this.toggleSpot();
    if (o.toggled) {
      this.clearFreeIn();
      this.onPadToggled();
      return o.consume;
    }
    if (this.pad.mode !== 'tuner') {
      this.clearFreeIn();
      return o.consume;
    }
    // (marlow-bays item 29) the right stick and the triggers are always the camera, whatever is open
    this.padCam(pad);
    // an open list: up / down (the stick or the D-pad) move the highlight, A picks, B backs out
    if (this.drop.open) {
      if (o.nav !== 0) this.dropMove(o.nav);
      if (o.select) this.dropPick();
      else if (o.back) this.dropBack();
      return o.consume;
    }
    if (o.menu) {
      if (this.menuOpen) this.closeMenu();
      else this.openMenu();
      return o.consume;
    }
    if (o.back) {
      if (this.menuOpen) this.closeMenu();
      else this.backStep();
      return o.consume;
    }
    if (o.nav !== 0) this.padNav(o.nav);
    // the focused slider: the left stick left / right (analogue) or the D-pad left / right (steps); elsewhere the D-pad
    // left / right moves along the row like up / down
    const f = this.padEl;
    const range = f instanceof HTMLInputElement && f.type === 'range' && !this.menuOpen ? f : null;
    if (o.side !== 0) {
      if (range) this.padAdjust(range, o.side);
      // (merge, CT Core #90 padGroup) on a State / Move picker left / right step its choice (v3 gives LT / RT the zoom)
      else if (this.padKey.startsWith('lv:')) this.padGroup(o.side < 0 ? -1 : 1);
      else this.padNav(o.side < 0 ? -1 : 1);
    }
    if (range && o.stick !== 0) this.padStick(range, o.stick);
    else this.stickAcc = 0;
    if (!this.menuOpen) {
      if (o.section !== 0) this.setTab(cycleTab(this.tabIdx, o.section, this.tabs.length));
      if (o.reset) this.padReset();
    }
    if (o.select) this.padSelect();
    return o.consume;
  }

  /** View moved the pad: to the tuner (the panel unfolds; the game holds still with "Pause game while tuning") or to the
   *  game (an automatic pause ends). */
  private onPadToggled(): void {
    this.refreshCoop();
    this.stickAcc = 0;
    this.closeDrop();
    if (this.menuOpen) this.closeMenu();
    if (this.pad.mode === 'tuner') this.setFolded(false);
    this.syncTuneFreeze();
    this.setPadLine();
    this.markPadFocus();
  }

  /**
   * (tuner-ui) "Pause game while tuning": the game holds still while the panel has the pad (a pad in use, the panel in
   * the tuner mode); not in the Anim Studio (the loop player's Play / Pause rules), co-op or under the pause menu. Edge
   * triggered: a Resume by hand meanwhile stays.
   */
  private syncTuneFreeze(): void {
    const want =
      this.open &&
      this.pad.mode === 'tuner' &&
      this.freezeBox.checked &&
      !STUDIO.active &&
      !this.coopOn &&
      !(this.menuPaused?.() ?? false) &&
      document.body.classList.contains('input-gamepad');
    if (want === this.tuneWant) return;
    this.tuneWant = want;
    if (want) {
      if (!this.frozen) this.setFrozen(true, true);
    } else if (this.autoFrozen) this.setFrozen(false);
  }

  private setPadLine(): void {
    const m = this.pad.mode;
    let t = m === 'game' ? 'Pad: game' : m === 'tuner' ? 'Pad: tuner' : '';
    if (this.frozen) t += ' · paused';
    if (TUNE_FLAGS.bypass) t += ' · untuned';
    this.padLine.textContent = t;
    this.setHint();
  }

  /** The hints for the moment, in the reserved strip at the bottom: pad glyphs with a pad, keys and mouse otherwise (the
   *  layout is the same either way; item 29: only these glyphs follow the input). */
  private setHint(): void {
    const m = this.pad.mode;
    let pad: string;
    let keys: string;
    const cam = hint([], 'Right stick: camera') + hint(['LT', 'RT'], 'zoom');
    if (m === 'game') {
      pad = hint(['VIEW'], 'back to the tuner') + hint(['START'], 'pause menu');
      keys = 'Click the panel to tune. ` held: untuned.';
    } else if (this.drop.open) {
      pad = hint(['LSTICK'], 'move') + hint(['A'], 'pick') + hint(['B'], 'back') + cam;
      keys = 'Arrows or wheel: move. Enter or click: pick. Esc: back.';
    } else if (this.menuOpen) {
      pad = hint(['LSTICK'], 'move') + hint(['A'], 'choose') + hint(['B'], 'close');
      keys = 'Click an item.';
    } else {
      pad =
        hint(['LSTICK'], 'up / down: move, left / right: value') +
        hint(['A'], 'open') +
        hint(['B'], 'back') +
        hint(['X'], 'reset') +
        hint(['LB', 'RB'], 'tab') +
        cam +
        hint(['Y'], 'more') +
        hint(['VIEW'], 'game');
      keys = 'Wheel: scroll. Arrows: move / value. Drag a slider. Right or middle drag on her: camera. Click on her: her part.';
      // (marlow-bays T1a) the playback bar's keys in the studio
      if (STUDIO.active) {
        pad += hint([], 'L3: on the spot');
        keys += ` ${TUNER_PLAY_KEY}: play / pause. ${TUNER_KEY_BACK} / ${TUNER_KEY_FWD}: key back / forward. ${TUNER_SPOT_KEY}: on the spot.`;
      }
    }
    const k = `${m}|${pad}|${keys}`;
    if (k === this.hintKey) return;
    this.hintKey = k;
    this.hint.innerHTML = m === 'off' ? '' : `<span class="tt-pad">${pad}</span><span class="tt-keys"><span>${keys}</span></span>`;
  }

  /** The focusable controls of the active tab (the menu's while it is open), in order, that show now: the playback bar
   *  (the studio), the tab's "what" row and sliders, then More. */
  private padItems(): HTMLElement[] {
    const root = this.menuOpen ? this.menu : this.tabEls.get(this.tabs[this.tabIdx]?.id ?? '');
    const out: HTMLElement[] = [];
    if (!root) return out;
    const take = (p: HTMLElement): void => {
      for (const e of Array.from(p.querySelectorAll<HTMLElement>('[data-pad]'))) if (e.offsetParent !== null && !(e as HTMLButtonElement).disabled) out.push(e);
    };
    const bar = this.studioUi.bar;
    if (!this.menuOpen && !bar.hidden) take(bar);
    take(root);
    if (!this.menuOpen) take(this.more);
    return out;
  }

  /** (T2) The first control of the tab itself (past the playback bar): a tab change's focus. */
  private firstTabItem(items: HTMLElement[]): HTMLElement | undefined {
    // (item 24, track A) the Who list heads the what-row, but the part picker keeps the first focus (Who is one D-pad up)
    return items.find((e) => !this.studioUi.bar.contains(e) && e.dataset.pad !== 'who') ?? items[0];
  }

  /**
   * Mark the pad's focused control (only while the pad is the tuner's), keeping the focus by its key across rebuilds.
   * `scroll` (a move by the pad or the keys): the panel scrolls to it. (item 29) A rebuild, a group opened by a tap or a
   * click never scrolls the panel (it jumped to the top on Michael's iPad), and nothing scrolls while a list is open
   * (that scroll closed the list).
   */
  private markPadFocus(scroll = false): void {
    if (this.padMark) {
      this.padMark.classList.remove('tt-focus', 'tt-edit');
      this.padMark = null;
    }
    if (!this.open || this.pad.mode !== 'tuner') {
      this.padEl = null;
      this.setHint();
      return;
    }
    const items = this.padItems();
    if (!items.length) {
      this.padEl = null;
      this.setHint();
      return;
    }
    let i = this.padKey ? items.findIndex((e) => e.dataset.pad === this.padKey) : -1;
    if (i < 0) i = Math.max(0, Math.min(items.length - 1, this.padIdx));
    const e = items[i]!;
    this.padIdx = i;
    this.padEl = e;
    this.padKey = e.dataset.pad ?? '';
    const mark = e.closest<HTMLElement>('[data-pad-row]') ?? e.closest<HTMLElement>('label') ?? e;
    mark.classList.add('tt-focus');
    if (scroll && !this.drop.open) mark.scrollIntoView({ block: 'nearest' });
    this.padMark = mark;
    const sid = e.closest<HTMLElement>('[data-pad-sec]')?.dataset.padSec;
    const k = this.sections.findIndex((s) => s.reg.id === sid);
    if (k >= 0) this.lastSec = k;
    // (marlow-bays item 10) the pad's focus moved onto a slider: that row is selected (a rebuild keeps a mouse pick)
    if (this.padKey.startsWith('s:') && this.padKey !== this.selPadKey) {
      this.selPadKey = this.padKey;
      this.selKey = this.padKey;
      this.refreshSel();
    }
    this.setHint();
  }

  /** Up / down: the previous / next control (wraps); the panel scrolls to it. */
  private padNav(d: number): void {
    const items = this.padItems();
    if (!items.length) return;
    const at = this.padEl ? items.indexOf(this.padEl) : -1;
    const i = ((at < 0 ? this.padIdx : at) + d + items.length) % items.length;
    this.padKey = items[i]!.dataset.pad ?? '';
    this.padIdx = i;
    this.disarmResetAll();
    this.markPadFocus(true);
  }

  /** (tuner-ui) B with nothing open: from a slider back to its section's state picker (one step back). */
  private backStep(): void {
    const key = this.padKey;
    if (!key.startsWith('s:')) return;
    const sid = key.split(':')[1] ?? '';
    const sec = this.sections.find((s) => s.reg.id === sid);
    if (!sec) return;
    this.padKey = `lv:${sid}:${ownLevel(sec)}`;
    this.markPadFocus(true);
  }

  /** (v3: D-pad left / right on a State / Move picker; LT / RT are the zoom) The focused section's previous / next choice at its group's own level (follow off, as a manual pick); the same
   *  slider stays focused when the new group has it. */
  private padGroup(d: number): void {
    const sec = this.sections[this.lastSec];
    if (!sec) return;
    const k = ownLevel(sec);
    const path = groupPath(sec.group, sec.prefix);
    const opts = levelOptions(sec.reg.groups, sec.prefix, path, k);
    if (opts.length < 2) return;
    const at = Math.max(0, opts.indexOf(path[k] ?? ''));
    this.pickLevel(sec, k, opts[(at + d + opts.length) % opts.length]!);
  }

  /** X: the focused slider back to its default. */
  private padReset(): void {
    const e = this.padEl;
    if (!(e instanceof HTMLInputElement) || e.type !== 'range' || !e.dataset.group) return;
    tuneReset(e.dataset.group, e.dataset.id ?? '');
    this.rowShow.get(e)?.();
  }

  /** A (or Enter): open a list, press a button, tick a box; on a slider nothing to start (the stick changes it). */
  private padSelect(): void {
    const e = this.padEl;
    if (!e || (e as HTMLInputElement).disabled) return;
    const key = e.dataset.pad ?? '';
    if (key === 'resetall' || key === 'm:resetall') {
      this.armResetAll();
      return;
    }
    if (e instanceof HTMLButtonElement && this.dropSel.has(e)) {
      this.openDrop(e);
      return;
    }
    if (e instanceof HTMLInputElement && e.type === 'range') {
      this.flashInfo('Left stick left / right (or the D-pad, the arrows) changes the value');
      return;
    }
    e.click();
    this.markPadFocus();
  }

  /** `steps` steps of the slider `e` (the D-pad, the arrows). */
  private padAdjust(e: HTMLInputElement, steps: number): void {
    const unit = Number(e.step) || 1;
    const g = e.dataset.group;
    if (!g) {
      // a plain range (the game speed, the loop's time): through its own input handler
      e.value = String(Math.max(Number(e.min), Math.min(Number(e.max), Number(e.value) + steps * unit)));
      e.dispatchEvent(this.inputEv);
      return;
    }
    const id = e.dataset.id ?? '';
    tuneSet(g, id, tuneGet(g, id) + steps * unit);
    this.rowShow.get(e)?.();
  }

  /** The left stick on the slider `e`: a share of its range per frame, applied in whole steps. */
  private padStick(e: HTMLInputElement, share: number): void {
    const unit = Number(e.step) || 1;
    this.stickAcc += share * (Number(e.max) - Number(e.min));
    const steps = Math.trunc(this.stickAcc / unit);
    if (steps !== 0) {
      this.stickAcc -= steps * unit;
      this.padAdjust(e, steps);
    }
  }

  private openMenu(): void {
    this.menuBack = this.padKey;
    this.menuOpen = true;
    this.menu.style.display = 'flex';
    this.padKey = 'm:undo';
    this.disarmResetAll();
    this.markPadFocus();
  }

  private closeMenu(): void {
    this.menuOpen = false;
    this.menu.style.display = 'none';
    this.padKey = this.menuBack;
    this.disarmResetAll();
    this.markPadFocus();
  }

  /** A menu action, then the menu closes. */
  private menuDo(fn: () => void): void {
    fn();
    if (this.menuOpen) this.closeMenu();
  }

  /** Reset all by pad: the first A arms it, the second resets (the mouse button keeps its confirm dialog). */
  private armResetAll(): void {
    if (!this.confirmAll) {
      this.confirmAll = true;
      this.info.textContent = 'Reset all: press A again to reset every value';
      return;
    }
    this.confirmAll = false;
    tuneResetAll();
    this.rebuildAll();
    this.info.textContent = 'Every value reset.';
    if (this.menuOpen) this.closeMenu();
  }

  private disarmResetAll(): void {
    this.confirmAll = false;
  }

  /** (anim-studio) A short line in the info row (undo, A/B, presets), held 2.5 s (or `ms`) before the counts come back. */
  private flashInfo(text: string, ms = 2500): void {
    this.info.textContent = text;
    this.nextInfo = performance.now() + ms;
  }

  /**
   * (anim-bake-1022) Reset baked (`anim/tuneBakedReset.ts`): the sliders holding a value the bundled ledger says is now
   * in the code go back to their defaults; the notice shows in the info line (closed: when the panel next opens).
   * `force` (the Y menu): every bake, applied or not. Auto (the store's load): once per bake, silent when nothing reset.
   */
  private resetBaked(force: boolean, saved?: unknown): BakedResetResult {
    // the load passes the record as saved (a value past the normal range is clamped by the load); the menu, the registry
    const r = tuneBakedReset(bakeLedger, { force, saved });
    if (r.reset > 0) {
      this.rebuildAll();
      void saveAnimTune(tuneSnapshot());
    }
    if (r.notice && (force || r.reset > 0)) {
      console.info(`[anim tuner] ${r.notice}`);
      if (this.open) this.flashInfo(r.notice, BAKED_NOTICE_MS);
      else this.bakedNotice = r.notice;
    }
    return r;
  }

  private resetFocusedGroup(): void {
    const s = this.sections[this.lastSec];
    if (!s) return;
    tuneResetGroup(s.group);
    this.rebuildAll();
  }

  private clearFreeIn(): void {
    FREE_IN.lx = FREE_IN.ly = FREE_IN.rx = FREE_IN.ry = FREE_IN.zoom = FREE_IN.rise = FREE_IN.nudge = 0;
  }

  /**
   * (marlow-bays item 26) A touch moved on the scene: the gesture's orbit, pinch or pan into the free view's touch sums
   * (the game consumes them per frame). A drag starts the orbit from the game view if the free view is off, as the
   * wheel does. No allocation.
   */
  private touchMove(id: number, x: number, y: number): void {
    const g = this.gesture;
    const k = g.move(id, x, y);
    if (k === 'none' || !this.open) return;
    this.touchLast.kind = k;
    if (FREE_VIEW.mode === 'off') this.setFreeMode('orbit', false);
    const h = Math.max(1, window.innerHeight);
    if (k === 'orbit') {
      FREE_IN.tlx += g.dx * GESTURE.orbitRadPerPx;
      FREE_IN.tly -= g.dy * GESTURE.orbitRadPerPx;
    } else if (k === 'pinch') FREE_IN.tzoom += g.zoom;
    else if (k === 'pan') {
      // the scene follows the fingers: the circled point moves the other way
      FREE_IN.tpx -= g.px / h;
      FREE_IN.tpy += g.py / h;
    }
  }

  // ------------------------------------------------------------------------------------------
  // Free view, camera lock and time
  // ------------------------------------------------------------------------------------------

  /**
   * (tuner-camera) Free view off / orbit / fly: the game reads FREE_VIEW each frame. Off or fly ends a held snap.
   * (marlow-bays item 29) The pad stays on the panel either way: the right stick and the triggers are always the
   * camera (`padCam`); `_takePad` is kept for the callers.
   */
  setFreeMode(m: FreeMode, _takePad = true): void {
    const was = FREE_VIEW.mode;
    FREE_VIEW.mode = m;
    if (m !== 'orbit') FREE_VIEW.lock = '';
    if (this.freeSel.value !== m) this.freeSel.value = m;
    for (const b of this.dropBtns) if (this.dropSel.get(b) === this.freeSel) this.refreshDrop(b);
    this.clearFreeIn();
    FREE_IN.wheel = 0;
    // (item 26) the touch sums: a drag that started the orbit keeps its own; off drops them
    if (m === 'off') clearTouchIn();
    if (m === 'off' && was !== 'off' && this.folded) this.setFolded(false);
    this.showLock();
    this.setPadLine();
    this.markPadFocus();
  }

  /** (tuner-ui) A camera snap that holds: the orbit keeps this angle to her facing until Unlock or another snap. The pad
   *  stays on the panel (View hands it to the camera). */
  private lockSnap(s: FreeSnap): void {
    // (marlow-bays item 29 phase 2) Side pressed again swaps to her other side
    if (s === 'side' && FREE_VIEW.lock === 'side') s = 'left';
    else if (s === 'side' && FREE_VIEW.lock === 'left') s = 'side';
    FREE_VIEW.lock = s;
    FREE_VIEW.snap = s;
    if (FREE_VIEW.mode !== 'orbit') this.setFreeMode('orbit', false);
    FREE_VIEW.lock = s;
    this.showLock();
  }

  private unlockSnap(): void {
    FREE_VIEW.lock = '';
    this.showLock();
  }

  private showLock(): void {
    const l = FREE_VIEW.lock;
    this.lockLine.textContent = l ? `Locked: ${l === 'side' ? 'right side' : l === 'left' ? 'left side' : plainWords(l).toLowerCase()}` : FREE_VIEW.mode === 'orbit' ? 'Not locked' : '';
    this.unlockBtn.disabled = !l;
    for (const [s, b] of this.snapBtns) b.classList.toggle('on', s === l || (s === 'side' && l === 'left'));
    const sb = this.snapBtns.get('side');
    if (sb) sb.textContent = l === 'side' ? 'Side (right)' : l === 'left' ? 'Side (left)' : 'Side';
  }

  /** (item 29 phase 2) An orbit slider moved: the orbit starts if off, the game takes the value next frame. */
  private setOrbit(k: 0 | 1 | 2, v: number): void {
    if (FREE_VIEW.mode !== 'orbit') this.setFreeMode('orbit', false);
    if (k === 0) FREE_SET.angle = v;
    else if (k === 1) FREE_SET.tilt = v;
    else FREE_SET.dist = v;
    this.orbitShown[k] = Number.NaN;
  }

  /** (item 29 phase 2) The orbit sliders follow the orbit (a write only when the shown value changes; none while one is
   *  held). */
  private showOrbit(): void {
    const on = FREE_ORBIT.on;
    for (let k = 0; k < 3; k++) {
      const r = this.orbitIn[k]!;
      if (document.activeElement === r || this.pressing) continue;
      const raw = !on ? Number.NaN : k === 0 ? FREE_ORBIT.angle : k === 1 ? FREE_ORBIT.tilt : FREE_ORBIT.dist;
      const v = Number.isNaN(raw) ? Number.NaN : k === 2 ? Math.round(raw * 20) / 20 : Math.round(raw) % (k === 0 ? 360 : 1000);
      if (v === this.orbitShown[k] || (Number.isNaN(v) && Number.isNaN(this.orbitShown[k]!))) continue;
      this.orbitShown[k] = v;
      const val = this.orbitVal[k]!;
      if (Number.isNaN(v)) {
        val.textContent = '–';
        continue;
      }
      r.value = String(v);
      val.textContent = `${k === 2 ? v.toFixed(2) : v}${val.dataset.unit ?? ''}`;
    }
  }

  /** (tuner-camera) Slow motion: the running time scale (the fixed step stays). Frozen, it applies on resume. */
  private setTimeScale(v: number): void {
    this.refreshCoop();
    const s = this.coopOn ? 1 : freeTimeScale(v, this.speedMax);
    this.runScale = s;
    if (this.loop && !this.frozen) this.loop.timeScale = s;
    this.showSpeed();
  }

  private showSpeed(): void {
    const s = String(Number(this.runScale.toFixed(2)));
    if (this.speedIn.value !== s && this.padEl !== this.speedIn) this.speedIn.value = s;
    this.speedVal.textContent = `${s}×`;
  }

  /** (fix round) Read the co-op state now (setCoop is a no-op when it has not changed). */
  private refreshCoop(): void {
    this.setCoop(this.coop?.() ?? false);
  }

  /** (pass 2) Co-op: the time controls are off (never on the wire; the local sim drives the session). */
  private setCoop(on: boolean): void {
    if (on === this.coopOn) return;
    this.coopOn = on;
    this.coopNote.hidden = !on;
    this.speedIn.disabled = this.pauseBtn.disabled = this.stepBtn.disabled = this.freezeBox.disabled = on;
    if (on) {
      if (this.frozen) this.setFrozen(false);
      this.setTimeScale(1);
    }
  }

  /** (pass 2) The bypass: every section reads identity while R3 or Backquote is held. */
  private setKeyBypass(on: boolean): void {
    if (on === this.keyBypass) return;
    this.keyBypass = on;
    this.applyBypass();
  }

  private applyBypass(): void {
    TUNE_FLAGS.bypass = this.open && (this.padBypass || this.keyBypass);
    this.setPadLine();
  }

  /** (pass 2) Import: the file picker (a pad press may not count as a user gesture for it: then use the mouse). */
  private importPick(): void {
    this.fileIn.value = '';
    this.fileIn.click();
  }

  private async importFile(): Promise<void> {
    const f = this.fileIn.files?.[0];
    if (!f) return;
    let data: unknown;
    try {
      data = JSON.parse(await f.text());
    } catch {
      this.info.textContent = `Import refused: ${f.name} is not JSON.`;
      return;
    }
    const r = tuneImport(data, f.name);
    this.rebuildAll();
    this.info.textContent = r.ok ? `Imported ${f.name}: ${r.applied} values${r.pending ? `, ${r.pending} kept for later sections` : ''}.` : `Import refused: ${r.error}.`;
    this.nextInfo = performance.now() + 4000;
  }

  /** (pass 2) Freeze: time scale 0 (the sim stops, rendering, the camera tuning and the free view go on). `auto`: by the
   *  tuner holding the pad (giving the pad back resumes). */
  setFrozen(on: boolean, auto = false): void {
    if (on) this.refreshCoop();
    const lp = this.loop;
    if (!lp || (on && this.coopOn)) return;
    if (on) {
      if (!this.frozen && lp.timeScale > 0) this.runScale = freeTimeScale(lp.timeScale, this.speedMax);
      lp.timeScale = 0;
      this.frozen = true;
      this.autoFrozen = auto;
    } else {
      if (this.frozen) lp.timeScale = this.runScale;
      this.frozen = false;
      this.autoFrozen = false;
    }
    this.pauseBtn.textContent = this.frozen ? 'Resume' : 'Pause';
    this.setPadLine();
  }

  /** (pass 2) One sim step (1/60 s) on a frozen game (freezes it first). */
  private stepFrame(): void {
    this.refreshCoop();
    if (this.coopOn) return;
    if (!this.frozen) this.setFrozen(true);
    this.loop?.stepHeadless?.(STEP_S);
  }

  /** Folded: only the header bar shows (a short phone screen). */
  setFolded(v: boolean): void {
    this.folded = v;
    this.body.hidden = this.tabBar.hidden = v;
    this.el.classList.toggle('tt-folded', v);
    this.closeDrop();
    this.foldBtn.textContent = v ? '+' : '_';
    this.handle.textContent = v ? 'Show panel' : 'Hide panel';
    this.handle.setAttribute('aria-expanded', String(!v));
    this.syncDock();
  }

  /**
   * Share / Copy the export: the share sheet with the file where the browser can share files, else the clipboard, else
   * the JSON in a text box to select by hand. Each step feature-detected and guarded.
   */
  private async shareFile(): Promise<void> {
    const now = new Date();
    const json = JSON.stringify(tuneExport(now), null, 2);
    const name = tuneExportName(now);
    this.shareOut.hidden = true;
    try {
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (typeof File !== 'undefined' && typeof nav.share === 'function' && nav.canShare) {
        const file = new File([json], name, { type: 'application/json' });
        if (nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: name });
          this.info.textContent = 'Shared.';
          return;
        }
      }
    } catch (e) {
      // the user closing the share sheet is not a failure worth a fallback
      if (e instanceof Error && e.name === 'AbortError') return;
    }
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(json);
        this.info.textContent = 'Copied to the clipboard.';
        return;
      }
    } catch {
      // fall through to the text box
    }
    this.shareOut.value = json;
    this.shareOut.hidden = false;
    this.shareOut.focus();
    this.shareOut.select();
  }

  get isOpen(): boolean {
    return this.open;
  }

  setScene(scene: Scene | null): void {
    this.clearMarker();
    this.scene = scene;
    if (scene) this.engine = scene.getEngine();
    if (this.resizePending && this.engine) {
      this.resizePending = false;
      this.engine.resize();
    }
  }

  /**
   * (tuner-clarity S4, PLAN 2(b)) The Now playing line, every frame the panel is open: one integer key from the graph's
   * `NOW_PLAYING`, the body state and the switch (no allocation); a changed key starts a hold and the text is built (the
   * one allocation) once the key has held `PLAY_HOLD_MS`. Who: Guard shows the guard's loop (hand-made always). The Anim
   * Studio's Loop player shows the same text. The reach badges follow the live band (`syncReach`).
   */
  private playFrame(nowMs: number): void {
    const body = TUNE_STATE.body;
    const idx = (BODY_GROUPS as readonly string[]).indexOf(body);
    const guard = TUNE_WHO.who === 'guard';
    const k = guard ? -2 - idx : nowPlayingKey(NOW_PLAYING, idx, LOCO.mocap);
    // (mixamo-retarget Toggle) the player line follows the Animation source too (a module string: no allocation)
    const ent = guard ? STUDIO.entry : ANIM_SOURCE.source;
    // the clip's hash in the key can collide: the clip reference itself is compared too (no allocation)
    const clip = guard ? null : NOW_PLAYING.clip;
    if (k !== this.playKey || ent !== this.playEnt || clip !== this.playClip) {
      this.playKey = k;
      this.playEnt = ent;
      this.playClip = clip;
      this.playKeyAt = nowMs;
    }
    if ((k !== this.playShown || ent !== this.playShownEnt || clip !== this.playShownClip) && (this.playShown === PLAY_NONE || nowMs - this.playKeyAt >= PLAY_HOLD_MS)) {
      this.playShown = k;
      this.playShownEnt = ent;
      this.playShownClip = clip;
      this.setPlayText(guard ? nowPlayingGuardText(this.guardLoopWord(body)) : nowPlayingSourceText(nowPlayingText(NOW_PLAYING, body, LOCO.mocap), ANIM_SOURCE.source));
    }
    this.syncReach();
  }

  /** The Who: Guard line's loop: the studio's guard loop ("idle"), else the shown body state. */
  private guardLoopWord(body: string): string {
    if (STUDIO.active && STUDIO.entry.startsWith('guard:')) return STUDIO.entry.slice(6).split('_').join(' ');
    return body === '' ? 'idle' : bodyWord(body as BodyGroup);
  }

  private setPlayText(t: string): void {
    this.playText = t;
    this.playEl.textContent = t;
    this.playEl.title = t;
    this.studioUi.setPlaying(t);
  }

  /**
   * (S4) Fill the live `ReachNow` (state, capture share, switch) and, when it crosses a band (the playing state, the
   * share over 0.9 / under 0.1, the switch), refresh every section's badges (classes and text only). No allocation unless
   * a band changed.
   */
  private syncReach(): void {
    const n = this.reachNow;
    const body = TUNE_STATE.body;
    n.state = body === '' ? null : body;
    n.mocapShare = NOW_PLAYING.mocap;
    n.switchOn = LOCO.mocap;
    // a gun in her hands: the game's gun group, or a studio loop that draws one (the same reading as `effectMode`'s `armed`; no allocation)
    n.drawn = !!TUNE_STATE.gun || (STUDIO.active && !!studioEntry(STUDIO.entry).drawn);
    // the latched band (`reachBand`, hysteresis): a share hovering at a band's edge does not flip the badges; the
    // badges, the edit warning and the greyed rows' mode all read it, never the raw share
    n.band = reachBand(n.band, n.switchOn ? n.mocapShare : 0);
    const band = (n.band === 'capture' ? 1 : n.band === 'handMade' ? 2 : 0) | ((n.switchOn ? 1 : 0) << 2) | (((BODY_GROUPS as readonly string[]).indexOf(body) + 1) << 3);
    if (band === this.reachBand) return;
    this.reachBand = band;
    for (const s of this.sections) this.applyEffect(s);
  }

  /** Every frame (driven by the debug overlay whether or not it is shown). */
  frame(nowMs: number): void {
    // (marlow-bays T2) the studio hides the game HUD, open or not
    this.syncStudioHud();
    if (!this.open) return;
    // (fix round) every frame, folded or not: one property read
    this.refreshCoop();
    // (26b) the last input changed (touch / mouse <-> pad) on a phone: the layout's density follows, live (one class
    // read per frame, no allocation; the layout changes only on a change)
    if (this.wasStudio !== STUDIO.active) this.studioLeft();
    // (fix round) the free view's pad input stops when the pad stops being polled (a disconnect)
    if (FREE_VIEW.mode !== 'off' && performance.now() - this.lastPoll > PAD_STALE_MS) this.clearFreeIn();
    this.syncFollow();
    // a level load (or a slow beat's end) resets the loop's time scale: the freeze is over, the speed back to 1
    const lp = this.loop;
    if (this.frozen && lp && lp.timeScale !== 0) {
      this.frozen = this.autoFrozen = false;
      this.tuneWant = false;
      this.pauseBtn.textContent = 'Pause';
      this.setPadLine();
    }
    // (tuner-ui) pause while tuning follows the input device and the pause menu
    this.syncTuneFreeze();
    // (anim-studio) the game speed may go to 2x inside the studio only (back to 1x at most on leaving it)
    const mx = STUDIO.active ? STUDIO_SPEED.max : GAME_SPEED.max;
    if (mx !== this.speedMax) {
      this.speedMax = mx;
      this.speedIn.max = String(mx);
      if (this.runScale > mx) this.setTimeScale(mx);
    }
    if (!this.frozen && lp && lp.timeScale !== this.runScale) {
      this.runScale = freeTimeScale(lp.timeScale, this.speedMax);
      this.showSpeed();
    }
    this.snaps.frame(nowMs);
    this.showOrbit();
    this.studioUi.frame(nowMs, this.scene);
    if (this.aidsB.hidden === STUDIO.active) this.aidsB.hidden = !STUDIO.active;
    this.keysFrame(nowMs);
    this.playFrame(nowMs);
    this.showSpot();
    // (marlow-bays T2) the studio's canvas beside the docked panel
    this.syncDock();
    if (!this.folded && nowMs >= this.nextDrops) {
      // the drop-down buttons follow their selects (a value set in code: the studio, presets)
      this.nextDrops = nowMs + 250;
      for (const b of this.dropBtns) if (b.offsetParent !== null) this.refreshDrop(b);
      this.showLock();
    }
    if (!this.folded && nowMs >= this.nextInfo) {
      this.nextInfo = nowMs + 250;
      // (marlow-bays T2) the stance really playing: in the studio the loop and the picked gun, drawn or holstered
      const se = STUDIO.active ? studioEntry(STUDIO.entry) : null;
      const st = se ? { loop: plainLoop(se.id, se.label), drawn: !!se.drawn || !!TUNE_STATE.gun, weapon: TUNE_STATE.gun ? (TUNE_STATE.gun.split('.')[0] ?? STUDIO.weapon) : STUDIO.weapon } : null;
      this.now.textContent = `Now: ${stanceText(TUNE_STATE.body, TUNE_STATE.gun, st)}${this.follow ? '' : ' · follow off'}${this.frozen ? ' · paused' : ''}`;
      if (!this.confirmAll) this.info.textContent = `${tuneChanged().length} changed`;
      // (marlow-bays item 29) the loop playing now: one of her keyed clips (the studio), a gun in hand or not; a change
      // greys the rows that do nothing in it
      // (tuner-clarity S4) `mocap`: no studio keyed clip pins the body and the capture's latched band (`syncReach`) is 90 % or more
      // (mixamo-retarget M5) a motion capture in the studio plays as the game plays it (the mocap share, studioDrive): the
      // rows the game keeps off a capture grey here too
      const capPin = !!se && se.kind === 'keyed' && se.clip !== null && mocapSource(se.clip.name) !== null;
      const keyedPin = !capPin && !!se && se.kind === 'keyed' && studioBodyPin(se) !== '';
      const m = effectMode(keyedPin, se ? !!se.drawn || !!TUNE_STATE.gun : !!TUNE_STATE.gun, STUDIO.spot, capPin || (!keyedPin && this.reachNow.band === 'capture'));
      if (m !== this.effMode) {
        this.effMode = m;
        for (const s of this.sections) this.applyEffect(s);
      }
    }
    // (marlow-bays item 10) the barrel and the selection share the overlay
    const k = this.selTarget.kind;
    if (this.marker || (this.highlight && (k === 'joint' || k === 'body' || k === 'weapon'))) this.drawMarker(nowMs);
    else if (this.selMark.shown || (this.markCanvas && !this.markCanvas.hidden)) {
      this.selMark.shown = false;
      this.clearMarker();
    }
  }

  // ------------------------------------------------------------------------------------------
  // (marlow-bays item 9) The mouse mode
  // ------------------------------------------------------------------------------------------

  /** (marlow-bays item 13) Loop on the spot on / off (the header button, its key, L3; the studio only). */
  private toggleSpot(): void {
    if (!STUDIO.active) return;
    const on = this.studioUi.toggleSpot();
    this.showSpot();
    this.flashInfo(on ? 'Loop on the spot: a moving state runs in place' : 'Loop on the spot off: she moves');
  }

  /**
   * (marlow-bays T1a, items 15 and 18) The Keys tab's block: "◀ Key" / "Key ▶" (in the studio the clip steps key by key
   * and the picker follows), the readout ("jog - key 2 of 8 (mirror of 6), frame 4"), the Mirror box (on: an edit shows
   * on the mirror key too, the other arm half a cycle on; off: this key only) and the hint.
   */
  private keysBlock(): HTMLDivElement {
    const d = document.createElement('div');
    d.className = 'anim-tune-keys-block';
    const b = this.mkBar();
    this.keyBackBtn = this.mkBtn('◀ Key', () => this.keysStep(-1), 'k:back', 'anim-tune-keys-back');
    this.keyFwdBtn = this.mkBtn('Key ▶', () => this.keysStep(1), 'k:fwd', 'anim-tune-keys-fwd');
    this.keyBackBtn.title = `The previous key (${TUNER_KEY_BACK}; pad: right stick left)`;
    this.keyFwdBtn.title = `The next key (${TUNER_KEY_FWD}; pad: right stick right)`;
    b.append(this.keyBackBtn, this.keyFwdBtn);
    this.keyMirrorBox = this.mkCheck(b, 'Mirror', true, (v) => this.keysMirror(v), 'k:mirror', 'anim-tune-keys-mirror');
    this.keyMirrorBox.title = 'On: an edit to this key also shows on its mirror key (the other arm, half a cycle on). Off: this key and this arm only (the bake writes the clip in full).';
    const r = (this.keyReadoutEl = document.createElement('div'));
    r.className = 'anim-tune-keys-readout tt-note';
    // (marlow-bays item 23) the key's timing: one bake frame (1/48 of the cycle) earlier / later, or the slider
    const tb = this.mkBar();
    tb.classList.add('anim-tune-keys-timebar');
    this.keyEarlyBtn = this.mkBtn('◀ Earlier', () => this.keysRetime(-1), 'k:early', 'anim-tune-keys-early');
    this.keyLateBtn = this.mkBtn('Later ▶', () => this.keysRetime(1), 'k:late', 'anim-tune-keys-late');
    this.keyEarlyBtn.title = 'Slide this key one bake frame (1/48 of the cycle) earlier; never past the key before it';
    this.keyLateBtn.title = 'Slide this key one bake frame (1/48 of the cycle) later; never past the key after it';
    const tr = (this.keyTimeRange = document.createElement('input'));
    tr.type = 'range';
    tr.className = 'anim-tune-keys-time';
    tr.min = '0';
    tr.max = String(KEY_SPAN - 1);
    tr.step = '1';
    tr.title = 'The key\'s time in its clip (bake frames, 48 a cycle), between the keys either side';
    tr.addEventListener('input', () => {
      const k = this.keysTimeKey();
      const i = k ? tuneKeysTimeInfo(k[0], k[1]) : null;
      if (i) this.keysRetime(Number(tr.value) - i.pos);
    });
    // (the slider lets go of the keyboard, so the arrow keys stay the game's)
    tr.addEventListener('change', () => tr.blur());
    tb.append(this.keyEarlyBtn, tr, this.keyLateBtn);
    // (marlow-bays item 25) insert a key after this one (midway to the next, the pose as it plays there) or remove it
    const eb = this.mkBar();
    eb.classList.add('anim-tune-keys-editbar');
    this.keyAddBtn = this.mkBtn('+ Add key', () => this.keysAdd(), 'k:add', 'anim-tune-keys-add');
    this.keyDelBtn = this.mkBtn('Delete key', () => this.keysDelete(), 'k:del', 'anim-tune-keys-del');
    eb.append(this.keyAddBtn, this.keyDelBtn);
    const te = (this.keyTimeEl = document.createElement('div'));
    te.className = 'anim-tune-keys-timing tt-note';
    const h = document.createElement('div');
    h.className = 'anim-tune-keys-hint anim-tune-keyhint tt-note';
    h.textContent = 'Key edits change one pose; whole-cycle changes go in the state tabs.';
    d.append(b, r, tb, te, eb, h);
    // (marlow-bays item 30) the key tools: Compare (the ghost and the values diff) and the Key tools fold (Wave, Apply
    // to keys, Smooth between), each one undo step
    const tools = (this.keyTools = new TunerKeyTools(
      { btn: (l, f, k, c) => this.mkBtn(l, f, k, c), check: (p, l, on, f, k, c) => this.mkCheck(p, l, on, f, k, c), sel: (p, l, o, f, k, c) => this.mkSel(p, l, o, f, k, c), bar: () => this.mkBar(), refresh: (s) => this.refreshSel2(s) },
      {
        shown: () => this.keysTimeKey(),
        selField: () => {
          const p = rowKeyParts(this.selKey);
          return p && p.section === 'keys' ? p.id : '';
        },
        fieldName: (id) => plainLabel('keys', id, id),
        info: (t) => this.flashInfo(t),
        settle: () => this.snaps.history.settle(performance.now(), true),
        rebuild: () => {
          const sec = this.sections.find((s) => s.reg.id === 'keys');
          if (sec) this.rebuild(sec);
          this.keyToolWarn(); // (tuner-clarity S4) a tool's edit that changes nothing on screen
        },
        showKey: (clip, k) => {
          this.loopFromTab = this.keyPicking = true;
          try {
            this.studioUi.showKey(clip, k);
          } finally {
            this.loopFromTab = this.keyPicking = false;
          }
        },
        ghostReady: () => this.studioUi.overlay.compareReady(),
        frozen: () => this.frozen,
      },
    ));
    d.append(tools.el);
    return d;
  }

  /** (item 30) A drop-down's button shows its select's choice again (its options changed). */
  private refreshSel2(s: HTMLSelectElement): void {
    for (const b of this.dropBtns) if (this.dropSel.get(b) === s) this.refreshDrop(b);
  }

  /**
   * (marlow-bays item 25) "Add key": a key midway to the next one (wrapping; with Mirror on in the own half, mirrored
   * half a cycle on), its pose the one playing there, so nothing changes until it is edited. The picker and (paused)
   * the studio go to the new key.
   */
  private keysAdd(): void {
    const k = this.keysTimeKey();
    if (!k) return;
    const id = tuneKeysAdd(k[0], k[1]);
    if (id < 0) {
      const i = tuneKeysEditInfo(k[0], k[1]);
      this.flashInfo(`${k[0]}: no key added (${i?.addWhy || 'not a key'})`);
      return;
    }
    this.keysGoTo(k[0], id);
    const c = keyClip(k[0]);
    this.flashInfo(`${k[0]}: key added at frame ${c ? Math.round(keyPhase(c, id) * c.frames) % c.frames : '?'} (the pose as it plays there; edit it, or Delete key)`);
  }

  /** (marlow-bays item 25) "Delete key": the key removed (never key 1, never below the fewest keys); the picker goes to the key before it. */
  private keysDelete(): void {
    const k = this.keysTimeKey();
    if (!k) return;
    const c = keyClip(k[0]);
    if (!c) return;
    const prev = keyStep(c, keyPhase(c, k[1]), -1);
    if (!tuneKeysDelete(k[0], k[1])) {
      const i = tuneKeysEditInfo(k[0], k[1]);
      this.flashInfo(`${k[0]}: not deleted (${i?.delWhy || 'not a key'})`);
      return;
    }
    this.keysGoTo(k[0], keyIsLive(c, prev) ? prev : 0);
    this.flashInfo(`${k[0]}: key deleted, ${tuneKeysEditInfo(k[0], 0)?.count ?? '?'} keys a cycle (Undo brings it back)`);
  }

  /** (item 25) The Keys picker (and in the studio, paused, the clip) to key id `k` of `clip`. */
  private keysGoTo(clip: string, k: number): void {
    const sec = this.sections.find((s) => s.reg.id === 'keys');
    const g = tuneKeysGroupOf(clip, k);
    if (sec && g) {
      sec.group = '';
      this.showGroup('keys', g);
    }
    if (STUDIO.active) {
      this.loopFromTab = this.keyPicking = true;
      try {
        this.studioUi.showKey(clip, k);
      } finally {
        this.loopFromTab = this.keyPicking = false;
      }
      this.keyShown = k;
      this.keyClipShown = clip;
    }
    this.nextKeys = 0;
  }

  /** (marlow-bays item 23) The key the timing control moves: the one the readout names (the studio's key when it stands on one). */
  private keysTimeKey(): [string, number] | null {
    const p = this.keysShown();
    if (!p) return null;
    const playing = STUDIO.active && STUDIO.entry === `keyed:${p[0]}`;
    return [p[0], playing && STUDIO.onKey && STUDIO.key >= 0 ? STUDIO.key : p[1]];
  }

  /**
   * (marlow-bays item 23) Slide the key `delta` bake frames (+ later), clamped between its neighbours (with the Mirror
   * box on its mirror key moves too). Paused in the studio, the clip lands on the key at its new time at once.
   */
  private keysRetime(delta: number): void {
    const k = this.keysTimeKey();
    if (!k) return;
    if (!tuneKeysRetime(k[0], k[1], delta)) {
      const i = tuneKeysTimeInfo(k[0], k[1]);
      if (i?.fixed) this.flashInfo(`${k[0]}: key 1 starts the cycle; its time is fixed`);
      else if (i) this.flashInfo(`${k[0]}: key ${keyRank(keyClip(k[0])!, k[1]) + 1} is against the next key; it cannot move further`);
      return;
    }
    if (STUDIO.active && (this.frozen || STUDIO.entry !== `keyed:${k[0]}`)) this.studioUi.showKey(k[0], k[1]);
    this.nextKeys = 0;
  }

  /** The clip and key the Keys section shows (null: none). */
  private keysShown(): [string, number] | null {
    const sec = this.sections.find((s) => s.reg.id === 'keys');
    return sec ? tuneKeysIdOf(sec.group) : null; // (item 25) [clip, key id]: an added key too
  }

  /** (T1a) "◀ Key" / "Key ▶": in the studio the shown clip steps a key (it plays first if another loop does); outside it
   *  the picker moves to the clip's previous / next key. */
  private keysStep(dir: number): void {
    const p = this.keysShown();
    if (!p) return;
    if (STUDIO.active) {
      if (STUDIO.entry !== `keyed:${p[0]}`) this.studioUi.showKey(p[0], p[1]);
      this.studioUi.stepKey(dir);
      return;
    }
    const c = keyClip(p[0]);
    if (!c) return;
    // (item 25) the listed keys in phase order (live keys only, added keys among them)
    const T = keyTimeCount(c);
    const ids: number[] = [];
    for (let k = 0; k < T + KEY_ADD_SLOTS; k++) if (keyListed(p[0], k < T ? String(k) : `a${k - T}`)) ids.push(k);
    if (!ids.length) return;
    ids.sort((x, y) => keyPhase(c, x) - keyPhase(c, y));
    const at = Math.max(0, ids.indexOf(p[1]));
    const n = ids.length;
    this.showGroup('keys', tuneKeysGroupOf(p[0], ids[(((at + dir) % n) + n) % n]!));
  }

  /** (T1a, item 18) The Mirror box: the shown clip's mirrored half follows its own keys (on) or is edited on its own. */
  private keysMirror(on: boolean): void {
    const p = this.keysShown();
    if (!p) return;
    tuneKeysMirror(p[0], on);
    const c = keyClip(p[0]);
    // on again: a mirrored-half key shows as the own key it follows
    if (on && c && p[1] >= c.phases.length && p[1] < keyTimeCount(c)) this.showGroup('keys', keyGroupId(p[0], p[1] - c.phases.length));
    // (item 25) an added key the box now hides (Mirror on: added keys sit in the own half) shows key 1
    else if (c && !keyListed(p[0], p[1] < keyTimeCount(c) ? String(p[1]) : `a${p[1] - keyTimeCount(c)}`)) this.showGroup('keys', keyGroupId(p[0], 0));
    const sec = this.sections.find((s) => s.reg.id === 'keys');
    if (sec) this.rebuild(sec);
    this.flashInfo(on ? `${p[0]}: Mirror on, an edit shows on both arms half a cycle apart` : `${p[0]}: Mirror off, each key and arm on its own`);
  }

  /**
   * (T1a, item 15) Every 100 ms with the panel open: in the studio the Keys picker follows the key the clip stands on
   * (a mirrored-half key shows as the own key it mirrors while the Mirror box is on); the readout and the box follow.
   */
  private keysFrame(nowMs: number): void {
    if (!this.keyReadoutEl || nowMs < this.nextKeys) return;
    this.nextKeys = nowMs + 100;
    const p = this.keysShown();
    const c = p ? keyClip(p[0]) : null;
    if (!p || !c) {
      this.keyReadoutEl.textContent = '';
      if (this.keyTimeEl) this.keyTimeEl.textContent = '';
      return;
    }
    const n = c.phases.length;
    const mirrorOn = tuneKeysMirrorOn(p[0]);
    const playing = STUDIO.active && STUDIO.entry === `keyed:${p[0]}`;
    // (item 30) the compare ghost's visit to the compared key moves the studio: the picker stays
    if (this.keyTools?.priming) {
      this.keyTools.frame();
      return;
    }
    if (playing && STUDIO.onKey && STUDIO.key >= 0 && (STUDIO.key !== this.keyShown || p[0] !== this.keyClipShown)) {
      this.keyShown = STUDIO.key;
      this.keyClipShown = p[0];
      const g = tuneKeysGroupOf(p[0], STUDIO.key); // (item 25) an added key's group too
      if (!this.pressing && !this.drop.open) this.showGroup('keys', g);
    }
    const k = playing && STUDIO.key >= 0 ? STUDIO.key : p[1];
    let t = keyReadout(c, k);
    if (playing && !STUDIO.onKey) t = `${t} (between keys)`;
    const T = keyTimeCount(c);
    if (c.mirror && mirrorOn && k >= n && k < T) t += `: the sliders edit key ${keyRank(c, k - n) + 1} (this key is its mirror, the arms swapped)`;
    // (item 25) an added key's mirror half a cycle on
    if (c.mirror && mirrorOn && k >= T + KEY_ADD_SLOTS) t += `: the sliders edit key ${keyRank(c, k - KEY_ADD_SLOTS) + 1} (this key is its mirror, the arms swapped)`;
    this.keysEditShow(p[0], playing && STUDIO.onKey && STUDIO.key >= 0 ? STUDIO.key : p[1]);
    if (keysClipCaptured(p[0])) t += ` ${KEYS_CAPTURED_NOTE}`; // (tuner-clarity S4)
    if (!STUDIO.active) t += ' (open the Anim Studio to see the key)';
    if (this.keyReadoutEl.textContent !== t) this.keyReadoutEl.textContent = t;
    const box = this.keyMirrorBox!;
    if (box.checked !== mirrorOn) box.checked = mirrorOn;
    if (box.disabled !== !c.mirror) box.disabled = !c.mirror;
    this.keysTimeShow(p[0], playing && STUDIO.onKey && STUDIO.key >= 0 ? STUDIO.key : p[1]);
    this.keyTools?.frame(); // (item 30)
  }

  /** (marlow-bays item 25) "Add key" / "Delete key" follow the key: off (with why in the tooltip) when they cannot. */
  private keysEditShow(clip: string, k: number): void {
    const i = tuneKeysEditInfo(clip, k);
    const a = this.keyAddBtn;
    const d = this.keyDelBtn;
    if (!a || !d) return;
    const aOff = !i || i.addAt < 0;
    const dOff = !i || !i.canDelete;
    if (a.disabled !== aOff) a.disabled = aOff;
    if (d.disabled !== dOff) d.disabled = dOff;
    const at = i && i.addAt >= 0 ? `Add a key at bake frame ${i.addAt} of ${KEY_SPAN} (midway to the next key), posed as the clip plays there (the preview blends linearly; after the clip rebakes the pose can shift slightly)` : `Add key: ${i?.addWhy || 'pick a key'}`;
    const del = i && i.canDelete ? `Delete this key (${i.count} keys a cycle now; at least ${i.min}); Undo brings it back. After the clip rebakes the pose can shift slightly` : `Delete key: ${i?.delWhy || 'pick a key'}`;
    if (a.title !== at) a.title = at;
    if (d.title !== del) d.title = del;
  }

  /** (marlow-bays item 23) The timing control follows the key: its time, phase, how far it moved, its range. */
  private keysTimeShow(clip: string, k: number): void {
    const el = this.keyTimeEl;
    const tr = this.keyTimeRange;
    if (!el || !tr) return;
    const i = tuneKeysTimeInfo(clip, k);
    let t = '';
    if (i) {
      const d = i.pos - i.base;
      // (item 25) an added key has no baked time; key numbers count in phase order
      const moved = i.added ? 'an added key' : d === 0 ? 'as baked' : `moved ${d > 0 ? '+' : ''}${d} (baked at ${i.base})`;
      const kc = keyClip(clip);
      const mir = i.partner >= 0 && kc ? `; key ${keyRank(kc, i.partner) + 1} (its mirror) moves with it` : '';
      t = i.fixed
        ? `Time: frame ${i.frame} of ${i.frames}, phase 0.000. Key 1 starts the cycle: its time is fixed.`
        : `Time: frame ${i.frame} of ${i.frames}, phase ${i.phase.toFixed(3)} (bake frame ${i.pos} of ${KEY_SPAN}, ${moved}; ${i.lo}-${i.hi} between its neighbours${mir})`;
      const v = String(i.pos);
      const lo = String(i.lo);
      const hi = String(i.hi);
      if (tr.min !== lo) tr.min = lo;
      if (tr.max !== hi) tr.max = hi;
      if (tr.value !== v && document.activeElement !== tr) tr.value = v;
    }
    const off = !i || i.fixed;
    if (tr.disabled !== off) tr.disabled = off;
    if (this.keyEarlyBtn && this.keyEarlyBtn.disabled !== (off || i.pos <= i.lo)) this.keyEarlyBtn.disabled = off || i.pos <= i.lo;
    if (this.keyLateBtn && this.keyLateBtn.disabled !== (off || i.pos >= i.hi)) this.keyLateBtn.disabled = off || i.pos >= i.hi;
    if (el.textContent !== t) el.textContent = t;
  }

  /** The header button follows the studio and the switch (cheap compares, every frame). */
  private showSpot(): void {
    const b = this.spotBtn;
    const hide = !STUDIO.active;
    if (b.hidden !== hide) b.hidden = hide;
    if (hide) return;
    const t = STUDIO.spot ? 'On the spot: on' : 'On the spot: off';
    if (b.textContent !== t) b.textContent = t;
    if (b.classList.contains('on') !== STUDIO.spot) b.classList.toggle('on', STUDIO.spot);
  }

  /** The key or the header button: drag view <-> game camera. */
  private toggleMouse(): void {
    this.mouseCtl.toggle();
    this.applyMouse();
    this.flashInfo(this.mouseCtl.mode === 'drag' ? `Drag view: drag the scene to turn the camera, the wheel zooms (${TUNER_MOUSE_KEY}: game camera)` : `Game camera: mouse look (${TUNER_MOUSE_KEY} or Esc: back to the panel)`);
  }

  /** The mode onto the mouse source, the panel's pointer events and the button. */
  private applyMouse(): void {
    this.mouseHost?.setFree(this.mouseCtl.free);
    this.el.classList.toggle('tt-gamecam', !this.mouseCtl.panelMouse);
    const t = TUNER_MOUSE_LABEL[this.mouseCtl.mode];
    if (this.mouseBtn.textContent !== t) this.mouseBtn.textContent = t;
    this.mouseBtn.classList.toggle('on', this.mouseCtl.open && this.mouseCtl.mode === 'game');
  }

  /** The pointer lock was lost in play (Esc, alt-tab): in game camera the panel takes the mouse back (no pause). */
  mouseLockLost(): boolean {
    const handled = this.mouseCtl.lockLost();
    if (handled) {
      this.applyMouse();
      this.flashInfo('Drag view (the mouse capture ended)');
    }
    return handled;
  }

  // ------------------------------------------------------------------------------------------
  // (marlow-bays item 10) The selection: the row being edited, its target, the "Selected" line
  // ------------------------------------------------------------------------------------------

  private pickRow(key: string): void {
    this.selKey = key;
    this.refreshSel();
  }

  /**
   * The selection from the tab shown: the picked row when it is in the shown part, else the part as a whole; the row
   * marked (`tt-sel`), the target for the scene marker, the "Selected" line. Only on a change of tab, part, rows or
   * pick (DOM work, never per frame).
   */
  private refreshSel(): void {
    const line = this.selLine;
    if (!line) return;
    const t = this.tabs[this.tabIdx];
    const sid = t ? this.tabPart(t) : '';
    const parts = rowKeyParts(this.selKey);
    const id = parts && parts.section === sid ? parts.id : '';
    this.selSec = sid;
    tuneTarget(sid, id, this.selTarget);
    let row: HTMLElement | null = null;
    if (id) {
      const inp = this.el.querySelector<HTMLElement>(`input[data-pad="${globalThis.CSS.escape(this.selKey)}"]`);
      row = inp?.closest<HTMLElement>('[data-pad-row]') ?? null;
    }
    if (row !== this.selRow) {
      this.selRow?.classList.remove('tt-sel');
      this.selRow = row;
    }
    row?.classList.add('tt-sel');
    const sec = this.sections.find((s) => s.reg.id === sid);
    if (!sec || this.selTarget.kind === 'none') {
      line.textContent = '';
      line.hidden = true;
      return;
    }
    const state = sec.group ? plainWords(sec.group.split('.').slice(1).join(' ')) : '';
    // (S4) the row's name only: its first child holds the text, the reach badge sits after it
    const what = row?.querySelector('.tt-name')?.firstChild?.textContent ?? 'whole part';
    line.hidden = false;
    line.textContent = `▶ ${sec.reg.label}${state ? ` · ${state}` : ''} · ${what} → ${this.selTarget.label}`;
  }

  // ------------------------------------------------------------------------------------------
  // Barrel marker: a 2D overlay over the game canvas (no scene meshes)
  // ------------------------------------------------------------------------------------------

  private clearMarker(): void {
    const c = this.markCanvas;
    if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    c.hidden = true;
  }

  /** Project a world point through the rendered camera (vertical FOV, Euler yaw / pitch; the shake's roll ignored) to
   *  overlay pixels: out.z is the view depth (m). No allocation. */
  private project(cam: MarkerCam, p: Vector3, out: { x: number; y: number; z: number }): void {
    projectPoint(cam, p.x, p.y, p.z, this.markW, this.markH, out);
  }

  /** The barrel ray: the muzzle to MARK_DIST m out along the bore, drawn on the overlay. Hidden with no weapon or with
   *  the muzzle behind the camera; the far end is clipped to the near plane. */
  private drawMarker(nowMs: number): void {
    const scene = this.scene;
    const rig = this.rig?.();
    const w = rig?.heldWeapon;
    const cam = scene?.activeCamera as unknown as MarkerCam | null | undefined;
    let c = this.markCanvas;
    if (!c) {
      c = this.markCanvas = document.createElement('canvas');
      c.className = 'anim-tune-marker-overlay';
      c.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:140;';
      document.body.appendChild(c);
    }
    const g = c.getContext('2d');
    if (!g) return;
    // follow the game canvas's place and size (checked twice a second)
    if (scene && nowMs >= this.markRectAt) {
      this.markRectAt = nowMs + 500;
      const gc = scene.getEngine().getRenderingCanvas();
      if (gc) {
        const r = gc.getBoundingClientRect();
        c.style.left = `${r.left}px`;
        c.style.top = `${r.top}px`;
        c.style.width = `${r.width}px`;
        c.style.height = `${r.height}px`;
        const W = Math.max(1, Math.round(r.width));
        const H = Math.max(1, Math.round(r.height));
        if (c.width !== W || c.height !== H) {
          c.width = W;
          c.height = H;
        }
        this.markW = W;
        this.markH = H;
      }
    }
    c.hidden = false;
    g.clearRect(0, 0, c.width, c.height);
    this.selMark.shown = false;
    if (!scene || !rig || !cam || !cam.rotation || !(this.markW > 0)) return;
    if (this.highlight) this.drawSel(g, rig, cam);
    if (!this.marker || !w) return;
    const m = w.getWorldMatrix();
    Vector3.TransformCoordinatesFromFloatsToRef(0, rig.gunSpan.bore, rig.gunSpan.z1, m, this.markA);
    Vector3.TransformNormalFromFloatsToRef(0, 0, 1, m, this.markDir);
    this.markDir.normalize();
    this.markA.addToRef(this.markDir.scaleInPlace(MARK_DIST), this.markB);
    const near = Math.max(0.05, cam.minZ);
    const a = this.markSA;
    const b = this.markSB;
    this.project(cam, this.markA, a);
    if (a.z <= near) return;
    this.project(cam, this.markB, b);
    if (b.z <= near) {
      // clip the far end to the near plane along the bore
      const f = (a.z - near) / Math.max(1e-6, a.z - b.z);
      this.markB.set(this.markA.x + (this.markB.x - this.markA.x) * f, this.markA.y + (this.markB.y - this.markA.y) * f, this.markA.z + (this.markB.z - this.markA.z) * f);
      this.project(cam, this.markB, b);
    }
    g.strokeStyle = 'rgb(255,51,230)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
    g.fillStyle = 'rgb(255,51,230)';
    g.beginPath();
    g.arc(b.x, b.y, 4, 0, Math.PI * 2);
    g.fill();
  }

  /**
   * (marlow-bays item 10; item 29, Michael: "too distracting and blocks the animation, it needs to be more subtle and
   * have an option to be disabled entirely") The selection marker: the selected row's joint(s), bone, whole body or
   * weapon on the local player's rig, drawn on the overlay: a small dot on the joint (a thin dark edge reads on light and
   * dark), a hairline along a bone or the gun; no ring and no label over her. More > "Highlight on her" turns it off. A
   * dev visual: nothing reads it back but the test hook. No allocation (the points go through the preallocated vectors).
   */
  private drawSel(g: CanvasRenderingContext2D, rig: TuneRigView, cam: MarkerCam): void {
    const t = this.selTarget;
    const sm = this.selMark;
    const near = Math.max(0.05, cam.minZ);
    const a = this.markSA;
    const b = this.markSB;
    let hasB = false;
    if (t.kind === 'weapon') {
      const w = rig.heldWeapon;
      if (!w) return;
      const m = w.getWorldMatrix();
      Vector3.TransformCoordinatesFromFloatsToRef(0, 0, 0, m, this.markA);
      Vector3.TransformCoordinatesFromFloatsToRef(0, rig.gunSpan.bore, rig.gunSpan.z1, m, this.markB);
      hasB = true;
    } else if (t.kind === 'joint' || t.kind === 'body') {
      const na = t.a ? rig[t.a] : undefined;
      if (!na) return;
      this.markA.copyFrom(na.getAbsolutePosition());
      const nb = t.b ? rig[t.b] : undefined;
      if (nb) {
        this.markB.copyFrom(nb.getAbsolutePosition());
        hasB = true;
      }
    } else return;
    this.project(cam, this.markA, a);
    if (a.z <= near) return;
    if (hasB) {
      this.project(cam, this.markB, b);
      if (b.z <= near) hasB = false;
    }
    const line = hasB && (t.line || t.kind === 'weapon');
    g.lineCap = 'round';
    if (line) {
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokeStyle = 'rgba(255,230,0,0.55)';
      g.lineWidth = 1.5;
      g.stroke();
    }
    this.selDot(g, a.x, a.y);
    if (hasB && !line) this.selDot(g, b.x, b.y);
    sm.shown = true;
    sm.ax = a.x;
    sm.ay = a.y;
    sm.bx = hasB ? b.x : a.x;
    sm.by = hasB ? b.y : a.y;
  }

  /** (item 29) The subtle highlight: a 3 px dot with a 1 px dark edge. */
  private selDot(g: CanvasRenderingContext2D, x: number, y: number): void {
    g.beginPath();
    g.arc(x, y, 3, 0, Math.PI * 2);
    g.fillStyle = '#ffe600';
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.8)';
    g.lineWidth = 1;
    g.stroke();
  }
}
