import type { MissionDef, MissionGuardList } from '../../game/mission/missionDef';
import { WHARF_GUARD_MISSIONS } from './tallowWharfSectors';

/**
 * Tallow Wharf's missions (mission-framework GB5), from `docs/missions/prototypes/{three-grey-coats,two-key-ledger}/graph.json`
 * and `BEAT.md` (ids, kinds, `after` / `gives` / `needs`, texts and hints character for character; the briefing is the BEAT's
 * screen text). The flags the steps read come from `tallowWharfSectors.ts`: the intel `grants` (`tgc-1`, `tgc-tally`, `tgc-tea`,
 * `tgc-opt`, `tkl-gate-code`, `tkl-4-yard`, `tkl-opt`), `<section>-obj`, `W3-key0` (the keypad) and `W3-gate0` (the pair gate).
 */

/** `MissionDef.guards` from `WHARF_GUARD_MISSIONS`: `'all'` = every guard of the section (no `slots`), a list = those indexes. */
function guardList(id: keyof typeof WHARF_GUARD_MISSIONS): MissionGuardList[] {
  const out: MissionGuardList[] = [];
  const m = WHARF_GUARD_MISSIONS[id];
  for (const section in m) {
    const v = m[section]!;
    out.push(v === 'all' ? { section } : { section, slots: [...v] });
  }
  return out;
}

/**
 * Three Grey Coats: W1 market, W2 lofts, W3 crossed with no step and no guards (down the roof fire escape, the passage and the
 * chute to the coal yard and out the cartway), W4 sheds and the boat. Teale (W2:6) is the courier; Fenn (W2:7) and Garrow
 * (W2:8) are decoys that spook him to the clock loft's back door. Pell's minders (W4 4, 5, zone `tgc-minders`) walk when the
 * chest is found.
 */
export const THREE_GREY_COATS: MissionDef = {
  id: 'threeGreyCoats',
  mode: 'campaign',
  players: [2],
  start: 'W1',
  sections: ['W1', 'W2', 'W3', 'W4'],
  guards: guardList('threeGreyCoats'),
  briefing: [
    'Tallow Wharf. A canal market by night, lofts over the arcade, sheds on the wharf.',
    'Pell moves his weekly cipher by hand now. He trusts paper more than fibre.',
    'Three couriers leave the market tonight in the same grey coat. One is his.',
    'Find out which, question him quietly, and take what he carries.',
    "Rule: question only Pell's courier. The wrong one warns him, and he runs.",
  ],
  steps: [
    {
      id: 'tgc-1',
      section: 'W1',
      team: 'all',
      kind: 'reach',
      text: 'Find the three grey coats under the fish hall clock',
      hint: 'The fish hall clock is the tallest light in the market. The coats stand under it.',
      done: { flag: 'tgc-1' },
    },
    {
      id: 'tgc-2',
      section: 'W1',
      team: 'all',
      kind: 'intel',
      text: "Learn which grey coat is Pell's: the warden's tally book, the tea stall talk",
      hint: 'Tally book: the warden\'s desk, gallery level. Tea stall: by the canal steps.',
      after: ['tgc-1'],
      gives: 'tgc-courier',
      done: { all: [{ flag: 'tgc-tally' }, { flag: 'tgc-tea' }] },
    },
    {
      id: 'tgc-3',
      section: 'W2',
      team: 'all',
      kind: 'interrogate',
      text: 'Take the grey coat with the black umbrella in the reading room loft',
      hint: "He went up the arcade stair to the reading room loft. Climb, don't take the stair.",
      after: ['tgc-2'],
      needs: 'tgc-courier',
      gives: 'tgc-chest',
      target: 'W2:6',
      decoys: ['W2:7', 'W2:8'],
      bolt: [65, 4.5, 76.75],
    },
    {
      id: 'tgc-opt',
      section: 'W2',
      team: 'all',
      kind: 'interact',
      text: "Optional: read Pell's courier rota in the pawnbroker's loft",
      hint: 'The lit desk beside the pawnbroker\'s walkway door. Fenn sits with his back to it.',
      after: ['tgc-2'],
      optional: { reward: 'gadget' },
      done: { flag: 'tgc-opt' },
    },
    {
      id: 'tgc-4',
      section: 'W4',
      team: 'all',
      kind: 'exploit',
      text: 'Find the chest stencilled with a candle in shed three',
      hint: 'Shed three has the lit loading door. The chest has a candle stencilled on the lid.',
      after: ['tgc-3'],
      needs: 'tgc-chest',
      twist: true,
      done: { flag: 'W4-obj' },
      events: [{ name: 'mindersArrive', guardTag: 'tgc-minders', postId: 'w4-quay' }],
    },
    {
      id: 'tgc-5',
      section: 'W4',
      team: 'all',
      kind: 'extract',
      text: 'Both of you, over the gangway to the boat under the crane',
      // the graph's hint ends 'Both of you must be aboard.' (109 characters): trimmed to the 90-character limit (the text says it already)
      hint: 'The boat waits at the jetty under the crane. The gangway is the quiet way aboard.',
      after: ['tgc-4'],
    },
  ],
  rules: [{ kind: 'namedTarget', scope: 'mission', step: 'tgc-3', text: "Rule - question only Pell's courier" }],
};

/**
 * Two-Key Ledger: starts at W2 (the arcade), W3 counting house (the east gate by the code, the west wing from the roof, the
 * two keys together, then the coal chute), W4 sheds and the boat. The lodge porter (W3:2, zone `w3-lodge-porter`) walks when
 * the second key turns.
 */
export const TWO_KEY_LEDGER: MissionDef = {
  id: 'twoKeyLedger',
  mode: 'campaign',
  players: [2],
  start: 'W2',
  sections: ['W2', 'W3', 'W4'],
  guards: guardList('twoKeyLedger'),
  briefing: [
    'Tallow Wharf. Gaunt & Lisle, a counting house older than the canal it sits on.',
    "Someone paid for Halcyon's failover hardware through their books. We want the ledger.",
    'It sleeps in the strongroom. The door wants two keys, turned at once, a wing apart.',
    'The staff are clerks and porters on night rates. They go home tonight.',
    'Rule: no kills. Knock them down if you must. They wake up with a headache.',
  ],
  steps: [
    {
      id: 'tkl-1',
      section: 'W2',
      team: 'all',
      kind: 'intel',
      text: 'Listen to the night clerk on his supper break in the pie shop loft',
      hint: 'The night clerk eats in the pie shop loft. Listen from the loft walkway outside.',
      gives: 'tkl-gate-code',
    },
    {
      id: 'tkl-2',
      section: 'W3',
      team: 'all',
      kind: 'exploit',
      text: 'Into the counting house: the east gate by the yard, the west wing from the roof',
      hint: 'The founding year is on the brass plate over the front door. The east gate takes it.',
      after: ['tkl-1'],
      needs: 'tkl-gate-code',
      done: { flag: 'W3-key0' },
    },
    {
      id: 'tkl-3',
      section: 'W3',
      team: 'all',
      kind: 'sync',
      text: 'Turn both strongroom keys together: the east wing and the west wing key posts',
      hint: 'Each of you holds a key. Turn when the count says turn, not before.',
      after: ['tkl-2'],
      window: 1.0,
      done: { flag: 'W3-gate0' },
      events: [{ name: 'telltale', guardTag: 'w3-lodge-porter', postId: 'w3-passage' }],
    },
    {
      id: 'tkl-4',
      section: 'W3',
      team: 'all',
      kind: 'carry',
      text: 'Take the ledger from the strongroom and leave by the coal chute to the yard',
      // the graph's hint is 126 characters: trimmed to the 90-character limit
      hint: 'Coal chute, strongroom passage: one boosts, the other crawls out and unbars the yard door.',
      after: ['tkl-3'],
      twist: true,
      item: 'tkl-ledger',
      // the graph names the step's space (`w3-coal-yard`); the runner reads no site yet (EN1)
      site: 'w3-coal-yard',
      done: { all: [{ flag: 'W3-obj' }, { flag: 'tkl-4-yard' }] },
    },
    {
      id: 'tkl-opt',
      section: 'W3',
      team: 'all',
      kind: 'interact',
      text: "Optional: copy the partners' day book in the east wing office",
      hint: "The partners' office is one door from the east key post. Its desk lamp is the warm one.",
      after: ['tkl-2'],
      optional: { reward: 'syringe' },
      done: { flag: 'tkl-opt' },
    },
    {
      id: 'tkl-5',
      section: 'W4',
      team: 'all',
      kind: 'extract',
      text: 'Both of you, through the wharf sheds to the boat at the jetty steps',
      hint: 'The boat waits at the jetty steps under the crane. The shed shutter is the way through.',
      after: ['tkl-4'],
    },
  ],
  rules: [{ kind: 'noKills', scope: 'mission', text: 'Rule - no kills.' }],
};

/** Tallow Wharf's missions (`MapDef.missions`). */
export const WHARF_MISSIONS: MissionDef[] = [THREE_GREY_COATS, TWO_KEY_LEDGER];
