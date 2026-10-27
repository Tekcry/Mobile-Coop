/**
 * (mission NET) The co-op client's copy of the host's mission (PLAN section 3: host-authoritative). Each `sector` message's
 * `ms` (`missionWire.ts`) is applied to a `MissionRunner` built from the map's own missions by `ms.id`; the client never
 * evaluates steps or rules. The rule-break line `rl`: the host already sends it as a radio line (`radioLine`, a `feed`
 * event) the moment a rule breaks, so the client never barks it again; only a late joiner, whose first `ms` already has
 * breaks (`rb` > 0), gets the last line shown once (its feed). Pure (no net imports beyond types).
 */
import { MissionRunner } from '../game/mission/missionRunner';
import { applyMissionWire, rulesKeptCount, wireDoneBits, type MissionWire } from '../game/mission/missionWire';
import type { MissionDef, MissionStep } from '../game/mission/missionDef';
import { entryForRoom, type CampaignKey } from '../game/mission/campaignOrder';
import { campaignResultRows, campaignResultView, optionalDone, type CampaignResultView } from '../game/mission/campaignRating';

/** The co-op sector modes take two players (P1 host, P2 client). */
const COOP_PLAYERS = 2;

export class MissionMirror {
  /** The applied mission (null: none running, or not one of this map's). */
  runner: MissionRunner | null = null;
  /** The host's rule-break counter as last seen (-1: no `ms` yet) and its last line. */
  rb = -1;
  line = '';
  /** Rules kept per scope ([mission, a, b] bits), as last seen. */
  readonly kept = [0, 0, 0];

  /**
   * Apply one `ms` (from the map's `missions`). `section`: the host's live section id (the map sector of the message's
   * `ls`; undefined keeps the current one). The runner enters it as the host's does (`snapshot`), so that section's
   * steps open from the DAG; without it the runner stays at section -1, no step opens and the client's objective list
   * has no rows (wharf e2e fix). Returns the line to show now (a late joiner's first `ms` with breaks), else null.
   */
  take(missions: readonly MissionDef[] | undefined, w: MissionWire, section?: string): string | null {
    if (!this.runner || this.runner.def.id !== w.id) {
      const def = missions?.find((m) => m.id === w.id) ?? null;
      this.runner = def ? new MissionRunner(def, COOP_PLAYERS) : null;
      this.rb = -1;
      this.line = '';
    }
    if (!this.runner) return null;
    if (section !== undefined) {
      const si = this.runner.def.sections.indexOf(section);
      if (si !== this.runner.section) this.runner.snapshot(si);
    }
    applyMissionWire(this.runner, w);
    for (let i = 0; i < 3; i++) this.kept[i] = w.rk[i] ?? 0;
    const first = this.rb < 0;
    const moved = w.rb !== this.rb;
    this.rb = w.rb;
    if (moved) this.line = w.rl;
    return first && moved && w.rb > 0 && w.rl !== '' ? w.rl : null;
  }
}

/** (campaign-mode CM5) The co-op client's own campaign finish, read from the host's last `ms` (its `pc`). */
export interface CampaignFinish {
  key: CampaignKey;
  pct: number;
  /** The results panel: the percent, PERFECT at 100, and the rows this page knows (optional objectives, rules kept). */
  view: CampaignResultView;
  /** The mission's steps and the wire's done bits (the record's intel count, `intelDone`). */
  steps: readonly MissionStep[];
  doneBits: number;
}

/**
 * (campaign-mode CM5, bible 5.8 "records it, with its rating, for both players") The client's record of a campaign
 * mission's end: with `on` (`flags.campaign`), a `pc` on the wire and the mission a campaign entry on this map
 * (`entryForRoom`). `def`: the mirrored mission (null: no steps known, rows without optional and rules). Null: nothing
 * to record (no `pc`: every send before the end, and every older host).
 */
export function campaignFinishFromWire(on: boolean, mapId: string, w: MissionWire, def: MissionDef | null): CampaignFinish | null {
  if (!on || w.pc === undefined) return null;
  const e = entryForRoom('sector', mapId, w.id);
  if (!e) return null;
  const steps = def?.id === w.id ? def.steps : [];
  const doneBits = wireDoneBits(w);
  const rows = campaignResultRows({ tally: null, optional: optionalDone(steps, doneBits), rules: { kept: rulesKeptCount(w), total: def?.id === w.id ? def.rules.length : 0 } });
  return { key: e.key, pct: w.pc, view: campaignResultView(e.title, { pct: w.pc, perfect: w.pc === 100 }, rows), steps, doneBits };
}
