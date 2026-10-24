// mission-validate: the mission checks of the level validator (docs/level-validator/mission-schema.md; mission-framework
// PLAN section 5 row VAL, "Validator detail (VAL)"; MISSION-DESIGN-AUDIT-2026-10-24 section 4; BRIEF M1-M5, A16, A17).
// Not a CLI: `scripts/level-validate.mjs` calls `checkMission` from `validate()` on the merged graph, so a mission is
// validated with its map's files in one run:
//   node scripts/level-validate.mjs <map files ...> <mission.json>
// The mission checks run only when the graph has a `mission` node; without one, a `syncs[]` list (Sector Ops' layout
// data, A16) gets its field checks and `objectives[]` / `rules[]` are an ERROR (they belong to a mission).
// Numbers (the step budget, rules per team, Sector Ops parallel objectives and syncs) come from the metrics JSON
// (`docs/design/metrics.json`, scale-sheet section 8); counts that are the standard's wording (one twist, one optional,
// one intel -> exploit pair, at most one new mechanic per step) live here.
import { COOP_KINDS, collector, isOneWay } from './level-validate.mjs';

export const MISSION_MODES = new Set(['campaign', 'sector']);
/** MissionDef StepKind (PLAN section 2). */
export const STEP_KINDS = new Set(['reach', 'interact', 'intel', 'exploit', 'interrogate', 'carry', 'plant', 'sync', 'extract']);
/** MissionDef RuleKind (PLAN section 2). */
export const RULE_KINDS = new Set(['ghost', 'noKills', 'noAlarms', 'noBodies', 'namedTarget', 'noGadgets', 'plantNotTake',
  'oneChance', 'window']);
/** Sector Ops sync-node contract (BRIEF A16). */
export const SYNC_KINDS = new Set(['power_cut', 'camera_loop', 'code_source', 'code_sink', 'pair_door']);
/** Optional objective rewards, paid through section-rating's Grant (PLAN section 2). */
export const REWARDS = new Set(['gadget', 'syringe', 'medkit']);
const TEAMS = new Set(['a', 'b', 'all']);
const SCOPES = new Set(['mission', 'a', 'b']);
const SYNC_ID = /^sync-s(\d+)-[a-z0-9][a-z0-9-]*$/;
const SECTION_NUM = /^[A-Za-z]+(\d+)$/;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const fmt = (n) => String(Math.round(n * 100) / 100);

// ---------------------------------------------------------------------------------------------------------------
// Graph helpers (two-player and solo walks)

/** Directed arcs [from, to] of `links`. Two players (default): every link, a `bolted` link both ways (the partner who
 *  got to its far side unbolts it). `solo`: no co-op kind (unless `passGate` lets that link through), and a `bolted`
 *  link only from its `to` end (one player cannot open it from the near side). `keep` filters links first. */
function arcsOf(links, { solo = false, keep = null, passGate = null } = {}) {
  const out = [];
  for (const l of links) {
    if (keep && !keep(l)) continue;
    if (solo && COOP_KINDS.has(l.kind) && !(passGate && passGate(l))) continue;
    const bolted = solo && l.bolted === true;
    if (!bolted) out.push([l.from, l.to]);
    if (!isOneWay(l)) out.push([l.to, l.from]);
  }
  return out;
}

function adjOf(arcs) {
  const adj = new Map();
  for (const [a, b] of arcs) {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  }
  return adj;
}

/** Ids reachable from `start` over `adj`, never entering `blocked` (a Set or one id). */
function reach(adj, start, blocked = null) {
  const stop = typeof blocked === 'string' ? new Set([blocked]) : blocked;
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const n = queue.shift();
    for (const m of adj.get(n) ?? []) {
      if (seen.has(m) || stop?.has(m)) continue;
      seen.add(m);
      queue.push(m);
    }
  }
  return seen;
}

/** Space ids a `tracks` value names as an extraction: `exfil` (an id or a list of ids) on the tracks object itself
 *  (Sector Ops: `tracks.exfil`), on each of its track objects (`tracks.A.exfil`), or on each entry of a track list; a
 *  merged list of several files' values is walked the same way. A section op whose extraction is not the map's last
 *  section names it here instead of tagging the space (a mid-map `exfil` tag breaks the map's spine checks). */
export function trackExfils(tracks) {
  const out = new Set();
  const add = (v) => {
    for (const id of Array.isArray(v) ? v : [v]) if (isStr(id)) out.add(id);
  };
  const walk = (t, top) => {
    if (Array.isArray(t)) {
      for (const x of t) walk(x, top);
      return;
    }
    if (!isObj(t)) return;
    add(t.exfil);
    if (top) for (const v of Object.values(t)) if (isObj(v)) walk(v, false);
  };
  walk(tracks, true);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Field checks

/** `syncs[]` fields (A16): id `sync-s<N>-<name>` unique, kind, space, src, lead, solo. Returns the sound syncs. */
function checkSyncFields(c, graph, byId) {
  const syncs = graph.syncs;
  if (syncs === undefined) return [];
  if (!Array.isArray(syncs)) {
    c.err('syncs: must be an array');
    return [];
  }
  const ok = [];
  const ids = new Set();
  syncs.forEach((s, i) => {
    const name = isStr(s?.id) ? `sync ${s.id}` : `syncs[${i}]`;
    let sound = true;
    const bad = (m) => {
      c.err(`${name}: ${m}`);
      sound = false;
    };
    if (!isObj(s)) return bad('must be an object');
    const m = isStr(s.id) ? SYNC_ID.exec(s.id) : null;
    if (!m) bad(`id '${s.id ?? ''}' is not sync-s<N>-<name> (A16)`);
    else if (ids.has(s.id)) bad('duplicate sync id');
    else ids.add(s.id);
    if (!SYNC_KINDS.has(s.kind)) bad(`kind '${s.kind}' is not ${[...SYNC_KINDS].join(' | ')}`);
    if (!byId.has(s.space)) bad(`space '${s.space}' is not a space`);
    if (!isStr(s.src)) bad('src missing (device code file:line, or "planned")');
    if (!isStr(s.lead)) bad('lead missing (the space of its in-world lead)');
    else if (!byId.has(s.lead)) bad(`lead '${s.lead}' is not a space`);
    if (s.solo !== undefined && !isStr(s.solo) && !(typeof s.solo === 'number' && s.solo > 0)) {
      bad('solo must be the solo timer in seconds (> 0) or a line saying how one player does it');
    }
    if (m && byId.has(s.space)) {
      const sec = SECTION_NUM.exec(byId.get(s.space).section);
      if (sec && Number(sec[1]) !== Number(m[1])) {
        c.warn(`${name}: id names section ${m[1]} but its space '${s.space}' is in ${byId.get(s.space).section}`);
      }
    }
    if (sound) ok.push(s);
  });
  return ok;
}

/** Mission, objective and rule fields. Returns { mission, objectives, rules } when sound, else null. */
function checkMissionFields(c, graph, byId) {
  const { meta } = graph;
  const mission = graph.mission;
  const before = c.r.errors.length;
  if (Array.isArray(mission)) {
    c.err(`mission: ${mission.length} mission nodes in one run (validate one mission at a time with its map files)`);
    return null;
  }
  if (!isObj(mission)) {
    c.err('mission: must be an object');
    return null;
  }
  const mName = `mission ${isStr(mission.id) ? mission.id : '(no id)'}`;
  if (!isStr(mission.id)) c.err('mission: id missing');
  if (meta.mode === 'training') {
    c.err(`${mName}: a training map carries no mission (M1: Marlow keeps its course objectives)`);
  } else if (!MISSION_MODES.has(mission.mode)) {
    c.err(`${mName}: mode '${mission.mode}' is not campaign or sector`);
  } else if (mission.mode !== meta.mode) {
    c.err(`${mName}: mode '${mission.mode}' differs from the map's meta.mode '${meta.mode}'`);
  }
  const players = mission.players;
  if (!Array.isArray(players) || !players.length || !players.every((p) => Number.isInteger(p) && p > 0)
    || new Set(players).size !== players.length) {
    c.err(`${mName}: players must list the player counts, e.g. [2]`);
  } else if (mission.mode === 'campaign' && (players.length !== 1 || players[0] !== 2)) {
    c.err(`${mName}: a campaign mission is two players, [2] (M3, A2), not [${players.join(', ')}]`);
  } else if (mission.mode === 'sector' && players.some((p) => p > 4)) {
    c.err(`${mName}: Sector Ops is 1-4 players (A1), not [${players.join(', ')}]`);
  } else if (Array.isArray(meta.players)) {
    const off = players.filter((p) => !meta.players.includes(p));
    if (off.length) c.warn(`${mName}: players ${off.join(', ')} not in meta.players [${meta.players.join(', ')}]`);
  }
  if (mission.start !== undefined && !byId.has(mission.start)) c.err(`${mName}: start '${mission.start}' is not a space`);
  if (typeof mission.budget !== 'number' || !(mission.budget > 0)) c.err(`${mName}: budget missing (planned minutes)`);

  const objectives = graph.objectives;
  const rules = graph.rules ?? [];
  if (!Array.isArray(objectives) || !objectives.length) {
    c.err(`${mName}: objectives[] missing or empty`);
    return null;
  }
  if (!Array.isArray(rules)) {
    c.err('rules: must be an array');
    return null;
  }
  const sections = new Set(meta.sections);
  const ids = new Set();
  objectives.forEach((o, i) => {
    const name = isStr(o?.id) ? `objective ${o.id}` : `objectives[${i}]`;
    if (!isObj(o)) {
      c.err(`${name}: must be an object`);
      return;
    }
    if (!isStr(o.id)) c.err(`${name}: id missing`);
    else if (ids.has(o.id)) c.err(`${name}: duplicate objective id`);
    else ids.add(o.id);
    if (!sections.has(o.section)) c.err(`${name}: section '${o.section}' is not in meta.sections`);
    if (!byId.has(o.space)) c.err(`${name}: space '${o.space}' is not a space`);
    else if (sections.has(o.section) && byId.get(o.space).section !== o.section) {
      c.err(`${name}: space '${o.space}' is in ${byId.get(o.space).section}, not ${o.section}`);
    }
    if (!TEAMS.has(o.team)) c.err(`${name}: team '${o.team}' is not a, b or all`);
    else if (mission.mode === 'campaign' && o.team !== 'all') c.err(`${name}: a campaign mission moves as one team (team 'all', M3), not '${o.team}'`);
    if (!STEP_KINDS.has(o.kind)) c.err(`${name}: kind '${o.kind}' is not ${[...STEP_KINDS].join(' | ')}`);
    if (o.after !== undefined && (!Array.isArray(o.after) || !o.after.every(isStr))) c.err(`${name}: after must be a list of objective ids`);
    for (const k of ['gives', 'needs', 'lead', 'seen_from']) {
      if (o[k] !== undefined && !isStr(o[k])) c.err(`${name}: ${k} must be a string`);
    }
    if (typeof o.minutes !== 'number' || !(o.minutes > 0)) c.err(`${name}: minutes missing (planned play time of the step)`);
    const nm = o.new_mechanic;
    if (nm !== undefined && !isStr(nm) && !(Array.isArray(nm) && nm.every(isStr))) c.err(`${name}: new_mechanic must name the mechanic`);
    if (o.twist !== undefined && typeof o.twist !== 'boolean') c.err(`${name}: twist must be true or false`);
    if (o.optional !== undefined && !(isObj(o.optional) && REWARDS.has(o.optional.reward))) {
      c.err(`${name}: optional must be { "reward": ${[...REWARDS].join(' | ')} } (paid through section-rating's Grant)`);
    }
  });
  rules.forEach((r, i) => {
    const name = `rule ${i + 1}${isObj(r) && isStr(r.kind) ? ` (${r.kind})` : ''}`;
    if (!isObj(r)) {
      c.err(`${name}: must be an object`);
      return;
    }
    if (!RULE_KINDS.has(r.kind)) c.err(`${name}: kind '${r.kind}' is not ${[...RULE_KINDS].join(' | ')}`);
    if (!SCOPES.has(r.scope)) c.err(`${name}: scope '${r.scope}' is not mission, a or b`);
    else if (mission.mode === 'campaign' && r.scope !== 'mission') c.err(`${name}: a campaign rule has scope 'mission' (one team), not '${r.scope}'`);
    if (!isStr(r.text)) c.err(`${name}: text missing (rules are signposted in the briefing and the objective list)`);
    if (r.kind === 'window' && !(typeof r.seconds === 'number' && r.seconds > 0)) c.err(`${name}: a window rule needs seconds (named, never hidden; A4)`);
    if (r.step !== undefined && !isStr(r.step)) c.err(`${name}: step must be an objective id`);
  });
  if (c.r.errors.length > before) return null;
  return { mission, objectives, rules };
}

// ---------------------------------------------------------------------------------------------------------------
// The mission checks

/** Every mission check on a merged graph that passed `checkStructure`. Returns { errors, warns, infos }. */
export function checkMission(graph, metrics) {
  const c = collector(metrics);
  const { meta, spaces, links } = graph;
  const byId = new Map(spaces.map((s) => [s.id, s]));
  const syncs = checkSyncFields(c, graph, byId);

  if (graph.mission === undefined) {
    for (const k of ['objectives', 'rules']) {
      if (Array.isArray(graph[k]) ? graph[k].length : graph[k] !== undefined) c.err(`${k}: given without a mission node`);
    }
    return c.r;
  }
  const sound = checkMissionFields(c, graph, byId);
  if (!sound) return c.r;
  const { mission, objectives, rules } = sound;
  const mName = `mission ${mission.id}`;
  const objById = new Map(objectives.map((o) => [o.id, o]));
  const startId = mission.start ?? spaces.find((s) => Array.isArray(s.tags) && s.tags.includes('start'))?.id;

  // DAG: `after` names known objectives, no cycle; ancestors per objective.
  let dagOk = true;
  for (const o of objectives) {
    for (const a of o.after ?? []) {
      if (!objById.has(a)) {
        c.err(`objective ${o.id}: after '${a}' is not an objective`);
        dagOk = false;
      } else if (a === o.id) {
        c.err(`objective ${o.id}: after names itself`);
        dagOk = false;
      }
    }
  }
  const ancestors = new Map();
  if (dagOk) {
    const state = new Map();
    const visit = (id, trail) => {
      if (state.get(id) === 'done') return true;
      if (state.get(id) === 'open') {
        c.err(`${mName}: steps form a cycle (${[...trail.slice(trail.indexOf(id)), id].join(' -> ')})`);
        return false;
      }
      state.set(id, 'open');
      const anc = new Set();
      for (const a of objById.get(id).after ?? []) {
        if (!visit(a, [...trail, id])) return false;
        anc.add(a);
        for (const x of ancestors.get(a)) anc.add(x);
      }
      ancestors.set(id, anc);
      state.set(id, 'done');
      return true;
    };
    for (const o of objectives) {
      if (!visit(o.id, [])) {
        dagOk = false;
        break;
      }
    }
  }
  const ordered = (x, y) => ancestors.get(x)?.has(y) || ancestors.get(y)?.has(x);

  // Extraction: exactly one extract step, required, after every other required step (the last step).
  const extracts = objectives.filter((o) => o.kind === 'extract');
  const extract = extracts.length === 1 ? extracts[0] : null;
  if (!extracts.length) c.err(`${mName}: no extract step (the last step is the extraction)`);
  else if (extracts.length > 1) c.err(`${mName}: ${extracts.length} extract steps (${extracts.map((o) => o.id).join(', ')}); one extraction ends the mission`);
  if (extract && extract.optional) c.err(`objective ${extract.id}: the extraction cannot be optional`);
  if (extract && dagOk) {
    const late = objectives.filter((o) => o !== extract && !o.optional && !ancestors.get(extract.id).has(o.id)).map((o) => o.id);
    if (late.length) c.err(`objective ${extract.id}: the extraction is not after ${late.join(', ')} (the last step is the extraction)`);
  }
  if (extract && !(byId.get(extract.space)?.tags ?? []).includes('exfil') && !trackExfils(graph.tracks).has(extract.space)) {
    c.warn(`objective ${extract.id}: extraction space '${extract.space}' is not tagged exfil (or named in a track's exfil)`);
  }

  // Intel -> exploit: every `needs` has a `gives` step before it; at least one pair.
  const givers = new Map();
  for (const o of objectives) if (o.gives) givers.set(o.gives, [...(givers.get(o.gives) ?? []), o.id]);
  let pairs = 0;
  for (const o of objectives) {
    if (!o.needs) continue;
    const from = givers.get(o.needs) ?? [];
    if (!from.length) {
      c.err(`objective ${o.id}: needs '${o.needs}' but no step gives it`);
      continue;
    }
    if (dagOk && !from.some((g) => ancestors.get(o.id).has(g))) {
      c.err(`objective ${o.id}: needs '${o.needs}' from ${from.join(', ')}, which is not before it (after)`);
      continue;
    }
    pairs += 1;
  }
  if (!pairs) c.err(`${mName}: no intel -> exploit pair (one step gives a fact a later step needs)`);

  // One twist, one optional objective with a reward; at most one new mechanic per step.
  const twists = objectives.filter((o) => o.twist === true);
  if (!twists.length) c.err(`${mName}: no twist step`);
  else if (twists.length > 1) c.warn(`${mName}: ${twists.length} twist steps (${twists.map((o) => o.id).join(', ')}); the beat chart has one`);
  const optionals = objectives.filter((o) => o.optional);
  if (!optionals.length) c.err(`${mName}: no optional objective (one, with a reward)`);
  else if (optionals.length > 1) c.warn(`${mName}: ${optionals.length} optional objectives (${optionals.map((o) => o.id).join(', ')}); the beat chart has one`);
  for (const o of objectives) {
    if (Array.isArray(o.new_mechanic) && o.new_mechanic.length > 1) {
      c.err(`objective ${o.id}: ${o.new_mechanic.length} new mechanics (${o.new_mechanic.join(', ')}); at most one per step`);
    }
  }

  // Step budget per team track (a team's steps plus the shared 'all' ones): 3-6 steps, 2-5 min each, the required
  // steps at least the total's low end, every step at most its high end.
  const stepsR = c.range('rules.mission_steps', 'the step count check');
  const stepMin = c.range('rules.mission_step_min', 'the step minutes check');
  const totalMin = c.range('rules.mission_total_min', 'the mission length check');
  if (stepMin) {
    for (const o of objectives) {
      if (o.minutes < stepMin[0] || o.minutes > stepMin[1]) {
        c.err(`objective ${o.id}: ${fmt(o.minutes)} min outside the ${fmt(stepMin[0])}-${fmt(stepMin[1])} min step`);
      }
    }
  }
  const teamsUsed = ['a', 'b'].filter((t) => objectives.some((o) => o.team === t));
  const tracks = teamsUsed.length ? teamsUsed : ['all'];
  let longest = null;
  for (const t of tracks) {
    const steps = objectives.filter((o) => o.team === t || o.team === 'all');
    const label = t === 'all' ? '' : ` (team ${t})`;
    if (stepsR && (steps.length < stepsR[0] || steps.length > stepsR[1])) {
      c.err(`${mName}${label}: ${steps.length} steps, outside ${fmt(stepsR[0])}-${fmt(stepsR[1])}`);
    }
    const req = steps.filter((o) => !o.optional).reduce((n, o) => n + o.minutes, 0);
    const all = steps.reduce((n, o) => n + o.minutes, 0);
    if (totalMin && req < totalMin[0]) c.err(`${mName}${label}: required steps ${fmt(req)} min, under ${fmt(totalMin[0])} min`);
    if (totalMin && all > totalMin[1]) c.err(`${mName}${label}: every step ${fmt(all)} min, over ${fmt(totalMin[1])} min`);
    if (!longest || all > longest.all) longest = { req, all };
  }
  if (totalMin && (mission.budget < totalMin[0] || mission.budget > totalMin[1])) {
    c.err(`${mName}: budget ${fmt(mission.budget)} min outside ${fmt(totalMin[0])}-${fmt(totalMin[1])} min`);
  } else if (longest && (mission.budget < longest.req || mission.budget > longest.all)) {
    c.warn(`${mName}: budget ${fmt(mission.budget)} min, but the steps add up to ${fmt(longest.req)}-${fmt(longest.all)} min`);
  }

  // Rules: at most N per team (mission scope plus the team's own; ghost counts as one), no kind twice per team, a
  // named target names an interrogate step; a solo player carries every team's rules.
  const rulesMax = c.num('rules.mission_rules_max', 'the rules-per-team check');
  const scopes = mission.mode === 'campaign' ? [['mission', ['mission']]] : [['team a', ['mission', 'a']], ['team b', ['mission', 'b']]];
  for (const [label, keep] of scopes) {
    const mine = rules.filter((r) => keep.includes(r.scope));
    if (rulesMax !== undefined && mine.length > rulesMax) {
      c.err(`${mName}: ${mine.length} rules for ${label} (${mine.map((r) => r.kind).join(', ')}); at most ${fmt(rulesMax)}`);
    }
    const kinds = mine.map((r) => r.kind);
    const twice = [...new Set(kinds.filter((k, i) => kinds.indexOf(k) !== i))];
    if (twice.length) c.err(`${mName}: rule ${twice.join(', ')} given twice for ${label}`);
  }
  if (mission.mode === 'sector' && mission.players.includes(1) && rulesMax !== undefined) {
    const solo = new Set(rules.map((r) => r.kind));
    if (solo.size > rulesMax) c.warn(`${mName}: a solo player carries ${solo.size} rules (${[...solo].join(', ')}); more than ${fmt(rulesMax)}`);
  }
  rules.forEach((r, i) => {
    if (r.kind === 'namedTarget') {
      const step = r.step !== undefined ? objById.get(r.step) : undefined;
      if (!step || step.kind !== 'interrogate') c.err(`rule ${i + 1} (namedTarget): step must name an interrogate objective`);
    } else if (r.step !== undefined && !objById.has(r.step)) {
      c.err(`rule ${i + 1} (${r.kind}): step '${r.step}' is not an objective`);
    }
    if (r.kind === 'plantNotTake' && !objectives.some((o) => o.kind === 'plant')) c.warn(`rule ${i + 1} (plantNotTake): no plant step`);
    if (r.kind === 'oneChance') c.info(`rule ${i + 1} (oneChance): opt-in only; breaking it ends the mission (A12)`);
  });

  // Every objective has an in-world lead, and the goal is seen before it is reached: `lead` and `seen_from` are other
  // spaces a player reaches from the mission start without passing the objective's space (the extraction is exempt).
  const pairAdj = adjOf(arcsOf(links));
  if (!byId.has(startId)) {
    c.err(`${mName}: no start space (mission.start or a space tagged start)`);
    return c.r;
  }
  for (const o of objectives) {
    if (o.kind === 'extract') continue;
    for (const [k, what] of [['lead', 'in-world lead'], ['seen_from', 'view of the goal']]) {
      const at = o[k];
      if (at === undefined) {
        c.err(`objective ${o.id}: ${k} missing (the space of its ${what})`);
        continue;
      }
      if (!byId.has(at)) c.err(`objective ${o.id}: ${k} '${at}' is not a space`);
      else if (at === o.space) c.err(`objective ${o.id}: ${k} is the objective's own space (found before it is reached)`);
      else if (!reach(pairAdj, startId, o.space).has(at)) {
        c.err(`objective ${o.id}: ${k} '${at}' is not reachable from ${startId} before ${o.space}`);
      }
    }
  }

  // Ghost and pacifist runs: start -> every objective -> extraction over no `loud` link, and over no `requires_kill`
  // link (two players: co-op moves count).
  const exfil = extract?.space;
  for (const [run, keep, why] of [
    ['ghost', (l) => l.route !== 'loud', "a 'loud' link"],
    ['pacifist', (l) => l.requires_kill !== true, 'a requires_kill link'],
  ]) {
    const adj = adjOf(arcsOf(links, { keep }));
    const from = reach(adj, startId);
    for (const o of objectives) {
      if (!from.has(o.space)) c.err(`${run} run: objective ${o.id} (${o.space}) is not reachable from ${startId} without ${why}`);
      else if (exfil && o.space !== exfil && !reach(adj, o.space).has(exfil)) {
        c.err(`${run} run: no way from objective ${o.id} (${o.space}) to the extraction ${exfil} without ${why}`);
      }
    }
  }

  // Choke node per section (audit 4): a space other than entry and exit, or a link, every entry -> exit path passes.
  // WARN: the two-route rule (checkRedundancy) and Sector Ops' two tracks meeting at the exit (A16) pull against it;
  // justify a section without one in the design doc. Only the mission's own sections (`mission.sections` when given,
  // else its objectives' sections): a mission merged over a whole map is not judged on sections it never uses.
  const chokeSecs = Array.isArray(mission.sections) ? new Set(mission.sections) : new Set(objectives.map((o) => o.section));
  for (const sec of meta.sections) {
    if (!chokeSecs.has(sec)) continue;
    const inSec = spaces.filter((s) => s.section === sec);
    const entry = inSec.filter((s) => s.tags.includes('entry'));
    const exit = inSec.filter((s) => s.tags.includes('exit'));
    if (entry.length !== 1 || exit.length !== 1 || entry[0].id === exit[0].id) continue;
    const inner = links.filter((l) => l.route !== 'spine' && byId.get(l.from).section === sec && byId.get(l.to).section === sec);
    const e = entry[0].id;
    const x = exit[0].id;
    if (!reach(adjOf(arcsOf(inner)), e).has(x)) continue; // checkRedundancy reports it
    const spaceChoke = inSec.some((s) => s.id !== e && s.id !== x && !reach(adjOf(arcsOf(inner)), e, s.id).has(x));
    const linkChoke = !spaceChoke && inner.some((l) => !reach(adjOf(arcsOf(inner.filter((m) => m !== l))), e).has(x));
    if (!spaceChoke && !linkChoke) c.warn(`section ${sec}: no choke node (no space or link that every route from '${e}' to '${x}' passes)`);
  }

  if (mission.mode === 'campaign') {
    // Forced co-op (M3): in every section, without its co-op moves (and with bolted links only from their far side) the
    // entry does not reach the exit. The no-solo-twin ERR is checkCoop's.
    for (const sec of meta.sections) {
      const inSec = spaces.filter((s) => s.section === sec);
      const entry = inSec.filter((s) => s.tags.includes('entry'));
      const exit = inSec.filter((s) => s.tags.includes('exit'));
      if (entry.length !== 1 || exit.length !== 1) continue;
      const inner = links.filter((l) => l.route !== 'spine' && byId.get(l.from).section === sec && byId.get(l.to).section === sec);
      const solo = reach(adjOf(arcsOf(inner, { solo: true })), entry[0].id);
      if (solo.has(exit[0].id)) {
        c.err(`section ${sec}: one player gets from '${entry[0].id}' to '${exit[0].id}' with no co-op move (M3: every campaign section forces one)`);
      }
    }
    return c.r;
  }

  // Sector Ops.
  const missionSecs = new Set(objectives.map((o) => o.section));
  const mySyncs = syncs.filter((s) => missionSecs.has(byId.get(s.space).section));
  // Parallel objectives: required team a and team b steps that neither waits on (an optional step is no split).
  const parallelMin = c.num('rules.sector_parallel_min', 'the parallel objectives check');
  if (parallelMin !== undefined && dagOk) {
    const par = new Set();
    for (const x of objectives) {
      for (const y of objectives) {
        if (x.team === 'a' && y.team === 'b' && !x.optional && !y.optional && !ordered(x.id, y.id)) {
          par.add(x.id);
          par.add(y.id);
        }
      }
    }
    if (par.size < parallelMin) {
      c.err(`${mName}: ${par.size} parallel objectives (required team a and team b steps neither waits on); need ${fmt(parallelMin)}+ so two teams can split`);
    }
  }
  // Sync nodes: 2+ per mission (ERR) and per mission section (A16, WARN); a pair sync has its solo fallback; a code
  // sink has a code source in its section; a `sync` step stands at a sync node.
  const syncMin = c.num('rules.sector_syncs_min', 'the sync node check');
  if (syncMin !== undefined) {
    if (mySyncs.length < syncMin) c.err(`${mName}: ${mySyncs.length} sync nodes in its sections; need ${fmt(syncMin)}+`);
    for (const sec of missionSecs) {
      const n = mySyncs.filter((s) => byId.get(s.space).section === sec).length;
      if (n < syncMin) c.warn(`section ${sec}: ${n} sync nodes (A16: ${fmt(syncMin)}+ per section)`);
    }
  }
  for (const s of mySyncs) {
    if (s.kind === 'pair_door' && s.solo === undefined) c.err(`sync ${s.id}: a pair sync needs solo (the solo timer fallback named in the briefing, A16)`);
    if (s.kind === 'code_sink') {
      const sec = byId.get(s.space).section;
      if (!syncs.some((t) => t.kind === 'code_source' && byId.get(t.space).section === sec)) c.err(`sync ${s.id}: code sink with no code_source in ${sec}`);
    }
  }
  for (const o of objectives) {
    if (o.kind === 'sync' && !syncs.some((s) => s.space === o.space)) c.err(`objective ${o.id}: a sync step with no sync node in '${o.space}'`);
  }
  // Solo: one player reaches every objective and sync node in sequence (no co-op move; a bolted link from its far
  // side; a pair_gate at a pair_door sync with a solo fallback counts).
  if (mission.players.includes(1)) {
    const soloGate = new Set(syncs.filter((s) => s.kind === 'pair_door' && s.solo !== undefined).map((s) => s.space));
    const soloAdj = adjOf(arcsOf(links, { solo: true, passGate: (l) => l.kind === 'pair_gate' && (soloGate.has(l.from) || soloGate.has(l.to)) }));
    const from = reach(soloAdj, startId);
    for (const o of objectives) if (!from.has(o.space)) c.err(`solo: objective ${o.id} (${o.space}) is not reachable by one player from ${startId}`);
    for (const s of mySyncs) if (!from.has(s.space)) c.err(`solo: sync ${s.id} (${s.space}) is not reachable by one player from ${startId}`);
    // The solo run is every step in sequence: longer, rated lower, never impossible (audit 4), so its length is an INFO
    // even past the total's high end; the step budget above is per team track.
    const total = objectives.reduce((n, o) => n + o.minutes, 0);
    const over = totalMin && total > totalMin[1] ? ` (over ${fmt(totalMin[1])} min: allowed solo)` : '';
    c.info(`${mName}: a solo player runs all ${objectives.length} steps, ${fmt(total)} min planned${over}`);
  }
  return c.r;
}
