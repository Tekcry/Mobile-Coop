/**
 * (mission-framework EN4) The objective list HUD's mount, shared by the host / solo (`SectorMode`) and the co-op client
 * (`CoopClient`, from its mission mirror): the panel is built on the first mission frame, `show`n when a mission (a new
 * def) starts, `update`d every frame (its own change key returns early, no allocation), hidden once no mission runs (none
 * yet, or it is over) and removed on `dispose` (mode exit). The panel itself is `MissionHud`; tests pass a fake.
 */
import { teamForSlot, type MissionDef, type TeamId } from '../../game/mission/missionDef';
import type { MissionRunner } from '../../game/mission/missionRunner';

/** What the mount drives (`MissionHud` fits it). */
export interface MissionHudView {
  show(def: MissionDef): void;
  update(runner: MissionRunner, viewer: TeamId, hints: boolean): void;
  hide(): void;
  dispose(): void;
}

/** A9: the team whose rows this machine's player sees: player slot -> team (slots 0, 2 A; 1, 3 B); solo or campaign 'all'. */
export function missionViewerTeam(def: MissionDef, slot: number, players: number): TeamId {
  return teamForSlot(slot, players, def.mode);
}

export class MissionHudMount {
  private hud: MissionHudView | null = null;
  /** The def on show (null: hidden). */
  private shown: MissionDef | null = null;

  constructor(private readonly make: () => MissionHudView) {}

  /** The panel is up (tests). */
  get visible(): boolean {
    return this.shown !== null;
  }

  /** Per frame: `runner` the mission running here (null: none, or it is over). No allocation once shown. */
  frame(runner: MissionRunner | null, viewer: TeamId, hints: boolean): void {
    if (!runner) {
      if (this.shown) {
        this.hud?.hide();
        this.shown = null;
      }
      return;
    }
    if (runner.def !== this.shown) {
      if (!this.hud) this.hud = this.make();
      this.hud.show(runner.def);
      this.shown = runner.def;
    }
    this.hud!.update(runner, viewer, hints);
  }

  dispose(): void {
    this.hud?.dispose();
    this.hud = null;
    this.shown = null;
  }
}
