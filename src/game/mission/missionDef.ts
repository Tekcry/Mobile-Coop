/**
 * (mission-framework EN1) Mission data model (PLAN section 2; pure, Babylon-free, no net imports).
 *
 * A mission is 3-6 steps on a beat chart (a DAG through `after`), run by team ('a' / 'b' in Sector Ops, 'all' in the
 * campaign), with up to 2 strict rules per scope (ghost counts as one). A fact is a flag: a step's `gives` names the
 * flag an interrogation code, a joint read, a board or an overheard line already sets (`onIntelCode`), and a step's
 * `needs` opens only once that flag is held (intel -> exploit). Missions attach as optional `MapDef.missions` (A7); the
 * runner (`missionRunner.ts`) and the rule tracker (`ruleTracker.ts`) read these defs and never write them.
 */

/** Campaign: 'all' only (2 players move as one team). Sector Ops: Team A high / upstairs, B ground / service (A16). */
export type TeamId = 'a' | 'b' | 'all';
export type StepKind = 'reach' | 'interact' | 'intel' | 'exploit' | 'interrogate' | 'carry' | 'plant' | 'sync' | 'extract';
/** A step's done condition: StepCond's shape (courseDef.ts StepCond) over flags only. */
export type MissionCond = { flag: string } | { all: MissionCond[] } | { any: MissionCond[] };
export type RewardKind = 'gadget' | 'syringe' | 'medkit';

export interface MissionStep {
  id: string;
  /** SectorDef.id (sectors.ts SectorDef). */
  section: string;
  team: TeamId;
  kind: StepKind;
  /** The objective line; names the place ("the records room, second floor"), <= MISSION_TEXT_MAX characters. */
  text: string;
  /** Hint layer only (Settings > Gameplay > Hints, off by default). */
  hint?: string;
  /** DAG edges: every listed step done first; none = open at section start. */
  after?: string[];
  /**
   * Done when this holds (latched). Default: an `intel` step with `gives` is done when its fact flag is set; a `sync`
   * step only through `MissionRunner.syncHalf` / `complete`; any other step on the flag named by its own id (an
   * interactable `<step>`, a pass zone, the mode's extraction).
   */
  done?: MissionCond;
  /** Intel -> exploit: the fact flag this step gives (set when it is done) ... */
  gives?: string;
  /** ... and the fact flag a step needs before it opens. */
  needs?: string;
  /** Interrogate: the named guard (SectorGuard id) and the wrong ones that spook him to `bolt`. */
  target?: string;
  decoys?: string[];
  bolt?: [number, number, number];
  /** Carry / plant: the item id and the place it goes (plant-not-take). */
  item?: string;
  site?: string;
  /** Sync: both halves within `window` s; one player alone gets `soloWindow` (named in the briefing). */
  window?: number;
  soloWindow?: number;
  twist?: boolean;
  /** Paid through section-rating's Grant (`rewardsFor` caps), never a new currency. Never blocks the section. */
  optional?: { reward: RewardKind };
}

export type RuleKind = 'ghost' | 'noKills' | 'noAlarms' | 'noBodies' | 'namedTarget' | 'noGadgets' | 'plantNotTake' | 'oneChance' | 'window';
export type RuleScope = 'mission' | 'a' | 'b';

export interface MissionRule {
  kind: RuleKind;
  scope: RuleScope;
  /** The signposted line (briefing and objective list). */
  text: string;
  /** namedTarget: the interrogate step; window: the timed step; oneChance: the one-try step (none: any restart). */
  step?: string;
  /** window: seconds from the step opening to it being done. */
  seconds?: number;
}

/** A team's track (Sector Ops, A9 / A16): SectorGuard.zone tags and plan boxes [x0, z0, x1, z1] (either corner order). */
export interface MissionTrack {
  team: 'a' | 'b';
  zones: string[];
  boxes: [number, number, number, number][];
}

export interface MissionDef {
  id: string;
  mode: 'campaign' | 'sector';
  /** Campaign [2]; Sector Ops [1, 2, 3, 4] (A1). */
  players: number[];
  /** SectorDef ids in run order. */
  sections: string[];
  briefing: string[];
  steps: MissionStep[];
  /** <= 2 per scope (a team's scope counts the mission's rules too); ghost counts as one; a solo player carries a's and b's. */
  rules: MissionRule[];
  /** Sector Ops: team A high / upstairs, B ground / service (A16). */
  tracks?: MissionTrack[];
}

export const STEP_KINDS: readonly StepKind[] = ['reach', 'interact', 'intel', 'exploit', 'interrogate', 'carry', 'plant', 'sync', 'extract'];
export const RULE_KINDS: readonly RuleKind[] = ['ghost', 'noKills', 'noAlarms', 'noBodies', 'namedTarget', 'noGadgets', 'plantNotTake', 'oneChance', 'window'];
export const TEAM_IDS: readonly TeamId[] = ['a', 'b', 'all'];
export const RULE_SCOPES: readonly RuleScope[] = ['mission', 'a', 'b'];
export const REWARD_KINDS: readonly RewardKind[] = ['gadget', 'syringe', 'medkit'];

/** Mission limits (BRIEF M2, audit section 4). */
export const MISSION = {
  stepsMin: 3,
  stepsMax: 6,
  /** Strict rules per scope (a team's own plus the mission's). */
  rulesPerScope: 2,
  /** Every objective / hint / rule line. */
  textMax: 90,
  /** Facts travel as bits of one wire number. */
  factsMax: 30,
  /** Steps travel as bits of one wire number. */
  stepsWireMax: 30,
} as const;

function cond(c: unknown, path: string, out: string[], flags?: string[]): void {
  if (typeof c !== 'object' || c === null) {
    out.push(`${path}: condition is not an object`);
    return;
  }
  const o = c as Record<string, unknown>;
  if (typeof o.flag === 'string') {
    if (!o.flag) out.push(`${path}: empty flag`);
    flags?.push(o.flag);
    return;
  }
  const list = Array.isArray(o.all) ? o.all : Array.isArray(o.any) ? o.any : null;
  if (!list) {
    out.push(`${path}: condition needs flag, all or any`);
    return;
  }
  if (list.length === 0) out.push(`${path}: empty all / any`);
  for (let i = 0; i < list.length; i++) cond(list[i], `${path}[${i}]`, out, flags);
}

/**
 * Structural checks (PLAN section 2): ids unique, sections known, 3-6 steps (campaign: the mission; Sector Ops: each
 * team's steps plus the shared 'all' ones; at most 30 in all, wire bits), the DAG acyclic and in section order,
 * every `needs` given by a step that is not after it, the last step the one `extract` (in the last section), interrogate
 * targets and decoys among `guards` (SectorGuard ids), sync windows, at most 2 rules per scope (a team's scope counts the
 * mission's rules too), rule steps that exist and fit, tracks. Returns error lines (empty = ok).
 */
export function checkMission(d: MissionDef, guards: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const tag = `mission ${d.id || '?'}`;
  if (!d.id) out.push(`${tag}: no id`);
  if (d.mode !== 'campaign' && d.mode !== 'sector') out.push(`${tag}: mode must be campaign or sector`);
  const campaign = d.mode === 'campaign';
  if (!Array.isArray(d.players) || d.players.length === 0) out.push(`${tag}: no players`);
  else {
    for (const p of d.players) if (!Number.isInteger(p) || p < 1 || p > 4) out.push(`${tag}: players ${p} not in 1-4`);
    if (campaign && (d.players.length !== 1 || d.players[0] !== 2)) out.push(`${tag}: a campaign mission is players [2]`);
  }
  const solo = d.players.includes(1);
  if (d.sections.length === 0) out.push(`${tag}: no sections`);
  if (new Set(d.sections).size !== d.sections.length) out.push(`${tag}: duplicate section ids`);
  for (const line of d.briefing) if (!line) out.push(`${tag}: empty briefing line`);

  const n = d.steps.length;
  // step budget: the campaign counts the whole mission; Sector Ops each team's steps plus the shared 'all' steps
  if (campaign) {
    if (n < MISSION.stepsMin || n > MISSION.stepsMax) out.push(`${tag}: ${n} steps (${MISSION.stepsMin}-${MISSION.stepsMax})`);
  } else {
    for (const t of ['a', 'b'] as const) {
      let k = 0;
      for (const s of d.steps) if (s.team === t || s.team === 'all') k++;
      if (k < MISSION.stepsMin || k > MISSION.stepsMax) out.push(`${tag}: team ${t} has ${k} steps with the shared ones (${MISSION.stepsMin}-${MISSION.stepsMax})`);
    }
  }
  const idx = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const s = d.steps[i]!;
    if (!s.id) out.push(`${tag}: step ${i} has no id`);
    else if (idx.has(s.id)) out.push(`${tag}: duplicate step id ${s.id}`);
    else idx.set(s.id, i);
  }
  const secOf = (s: MissionStep): number => d.sections.indexOf(s.section);
  const givers = new Map<string, number>();
  let extracts = 0;
  for (let i = 0; i < n; i++) {
    const s = d.steps[i]!;
    const p = `${tag} step ${s.id || i}`;
    if (secOf(s) < 0) out.push(`${p}: section ${s.section} is not in sections`);
    if (!TEAM_IDS.includes(s.team)) out.push(`${p}: team ${String(s.team)}`);
    else if (campaign && s.team !== 'all') out.push(`${p}: campaign steps are team all`);
    if (!STEP_KINDS.includes(s.kind)) out.push(`${p}: kind ${String(s.kind)}`);
    if (!s.text) out.push(`${p}: no objective text`);
    else if (s.text.length > MISSION.textMax) out.push(`${p}: text over ${MISSION.textMax} characters`);
    if (s.hint !== undefined && (!s.hint || s.hint.length > MISSION.textMax)) out.push(`${p}: hint empty or over ${MISSION.textMax} characters`);
    if (s.done !== undefined) cond(s.done, `${p} done`, out);
    if (s.gives !== undefined) {
      if (!s.gives) out.push(`${p}: empty gives`);
      else if (givers.has(s.gives)) out.push(`${p}: fact ${s.gives} given twice`);
      else givers.set(s.gives, i);
    }
    if (s.kind === 'extract') extracts++;
    if (s.kind === 'interrogate') {
      if (!s.target) out.push(`${p}: interrogate has no target`);
      else if (!guards.has(s.target)) out.push(`${p}: target ${s.target} is not a guard`);
      for (const g of s.decoys ?? []) {
        if (!guards.has(g)) out.push(`${p}: decoy ${g} is not a guard`);
        if (g === s.target) out.push(`${p}: decoy ${g} is the target`);
      }
      if ((s.decoys?.length ?? 0) > 0 && !s.bolt) out.push(`${p}: decoys need a bolt point`);
    } else if (s.target !== undefined || s.decoys !== undefined || s.bolt !== undefined) out.push(`${p}: target / decoys / bolt on a ${s.kind} step`);
    if ((s.kind === 'carry' || s.kind === 'plant') && (!s.item || !s.site)) out.push(`${p}: ${s.kind} needs item and site`);
    if (s.kind === 'sync') {
      if (!(typeof s.window === 'number' && s.window > 0)) out.push(`${p}: sync needs window > 0`);
      if (solo && !(typeof s.soloWindow === 'number' && s.soloWindow > 0)) out.push(`${p}: sync needs soloWindow > 0 (players include 1)`);
    } else if (s.window !== undefined || s.soloWindow !== undefined) out.push(`${p}: window on a ${s.kind} step`);
    if (s.optional) {
      if (!REWARD_KINDS.includes(s.optional.reward)) out.push(`${p}: optional reward ${String(s.optional.reward)}`);
      if (s.kind === 'extract') out.push(`${p}: the extraction cannot be optional`);
    }
  }
  if (extracts !== 1) out.push(`${tag}: ${extracts} extract steps (exactly 1)`);
  const last = d.steps[n - 1];
  if (last && last.kind !== 'extract') out.push(`${tag}: the last step is not the extraction`);
  if (last && d.sections.length > 0 && last.section !== d.sections[d.sections.length - 1]) out.push(`${tag}: the extraction is not in the last section`);
  if (n > MISSION.stepsWireMax) out.push(`${tag}: over ${MISSION.stepsWireMax} steps (wire bits)`);
  if (givers.size > MISSION.factsMax) out.push(`${tag}: over ${MISSION.factsMax} facts (wire bits)`);

  // edges: known, in section order, a required step never waits on an optional one
  for (let i = 0; i < n; i++) {
    const s = d.steps[i]!;
    for (const a of s.after ?? []) {
      const j = idx.get(a);
      if (j === undefined) {
        out.push(`${tag} step ${s.id}: after ${a} is not a step`);
        continue;
      }
      if (j === i) out.push(`${tag} step ${s.id}: after itself`);
      const pre = d.steps[j]!;
      if (secOf(pre) > secOf(s)) out.push(`${tag} step ${s.id}: after ${a} in a later section`);
      if (pre.optional && !s.optional) out.push(`${tag} step ${s.id}: a required step after the optional ${a}`);
      if (pre.kind === 'extract') out.push(`${tag} step ${s.id}: after the extraction`);
    }
    if (s.needs !== undefined) {
      const g = givers.get(s.needs);
      if (g === undefined) out.push(`${tag} step ${s.id}: needs ${s.needs}, no step gives it`);
      else if (g === i) out.push(`${tag} step ${s.id}: needs its own fact`);
      else if (secOf(d.steps[g]!) > secOf(s)) out.push(`${tag} step ${s.id}: needs ${s.needs}, given in a later section`);
    }
  }
  // acyclic over after + needs (Kahn's algorithm)
  const indeg = new Array<number>(n).fill(0);
  const next: number[][] = [];
  for (let i = 0; i < n; i++) next.push([]);
  for (let i = 0; i < n; i++) {
    const s = d.steps[i]!;
    for (const a of s.after ?? []) {
      const j = idx.get(a);
      if (j === undefined || j === i) continue;
      next[j]!.push(i);
      indeg[i]!++;
    }
    const g = s.needs !== undefined ? givers.get(s.needs) : undefined;
    if (g !== undefined && g !== i) {
      next[g]!.push(i);
      indeg[i]!++;
    }
  }
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
  let seen = 0;
  while (queue.length > 0) {
    const j = queue.pop()!;
    seen++;
    for (const k of next[j]!) if (--indeg[k]! === 0) queue.push(k);
  }
  if (seen < n) out.push(`${tag}: the steps have a cycle (after / needs)`);

  // rules
  const perScope = { mission: 0, a: 0, b: 0 };
  for (let i = 0; i < d.rules.length; i++) {
    const r = d.rules[i]!;
    const p = `${tag} rule ${i} (${String(r.kind)})`;
    if (!RULE_KINDS.includes(r.kind)) out.push(`${p}: unknown kind`);
    if (!RULE_SCOPES.includes(r.scope)) out.push(`${p}: scope ${String(r.scope)}`);
    else {
      perScope[r.scope]++;
      if (campaign && r.scope !== 'mission') out.push(`${p}: campaign rules are mission scope`);
    }
    if (!r.text) out.push(`${p}: no text`);
    else if (r.text.length > MISSION.textMax) out.push(`${p}: text over ${MISSION.textMax} characters`);
    const si = r.step !== undefined ? idx.get(r.step) : undefined;
    if (r.step !== undefined && si === undefined) out.push(`${p}: step ${r.step} is not a step`);
    const st = si !== undefined ? d.steps[si] : undefined;
    if (r.kind === 'namedTarget' && (!st || st.kind !== 'interrogate')) out.push(`${p}: needs an interrogate step`);
    if (r.kind === 'window') {
      if (!st) out.push(`${p}: needs a step`);
      if (!(typeof r.seconds === 'number' && r.seconds > 0)) out.push(`${p}: needs seconds > 0`);
    }
    if (r.kind === 'plantNotTake' && !d.steps.some((s) => s.kind === 'plant')) out.push(`${p}: no plant step`);
    for (let j = 0; j < i; j++) {
      const o = d.rules[j]!;
      if (o.kind === r.kind && o.scope === r.scope && o.step === r.step) out.push(`${p}: duplicate rule`);
    }
  }
  if (perScope.mission + perScope.a > MISSION.rulesPerScope) out.push(`${tag}: team a carries ${perScope.mission + perScope.a} rules (max ${MISSION.rulesPerScope})`);
  if (perScope.mission + perScope.b > MISSION.rulesPerScope) out.push(`${tag}: team b carries ${perScope.mission + perScope.b} rules (max ${MISSION.rulesPerScope})`);
  if (!campaign && perScope.a + perScope.b > 0 && !d.tracks) out.push(`${tag}: team rules need tracks (attribution, A9)`);

  // tracks
  if (d.tracks) {
    if (campaign) out.push(`${tag}: tracks are Sector Ops only`);
    const teams = new Set<string>();
    for (const t of d.tracks) {
      if (t.team !== 'a' && t.team !== 'b') out.push(`${tag}: track team ${String(t.team)}`);
      else if (teams.has(t.team)) out.push(`${tag}: two tracks for team ${t.team}`);
      teams.add(t.team);
      for (const b of t.boxes) if (b.length !== 4 || !b.every(Number.isFinite)) out.push(`${tag}: track ${t.team} has a bad box`);
    }
  }
  return out;
}

/** Every flag a condition reads, in order (setup-time helper; allocates). */
export function condFlags(c: MissionCond, out: string[] = []): string[] {
  if ('flag' in c) out.push(c.flag);
  else for (const k of 'all' in c ? c.all : c.any) condFlags(k, out);
  return out;
}

/** The facts (distinct `gives`) in step order: the wire's fact bit k is `factsOf(d)[k]`. */
export function factsOf(d: MissionDef): string[] {
  const out: string[] = [];
  for (const s of d.steps) if (s.gives && !out.includes(s.gives)) out.push(s.gives);
  return out;
}

/** The step's done condition with its defaults (see `MissionStep.done`); null: a sync step (only `syncHalf`). */
export function stepCond(s: MissionStep): MissionCond | null {
  if (s.done) return s.done;
  if (s.kind === 'intel' && s.gives) return { flag: s.gives };
  if (s.kind === 'sync') return null;
  return { flag: s.id };
}

/**
 * A9: the team a player slot plays for. Slots 0 and 2 Team A, 1 and 3 Team B (with three players the third joins A);
 * one player, or the campaign, carries both ('all').
 */
export function teamForSlot(slot: number, players: number, mode: MissionDef['mode']): TeamId {
  if (mode === 'campaign' || players <= 1) return 'all';
  return (slot & 1) === 0 ? 'a' : 'b';
}
