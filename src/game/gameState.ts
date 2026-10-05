import type { App, AppState } from '../core/app';
import type { Scene } from '../core/babylon';
import { World } from '../world/world';
import type { MapDef } from '../world/mapDef';
import { Player } from '../player/player';
import { defaultLook, type AvatarLook } from '../cosmetics/avatarLook';
import { PauseScreen } from '../ui/screens/pauseScreen';

export interface GameOptions {
  map: MapDef;
  mode: 'sandbox' | 'wave' | 'mission';
  seed: number;
  look?: AvatarLook;
}

/** A play session on one map. Modes plug in via `GameMode` (Phase 5). */
export class GameState implements AppState {
  readonly scene: Scene;
  readonly player: Player;
  private paused = false;

  private constructor(
    readonly app: App,
    readonly world: World,
    readonly opts: GameOptions,
    private onQuit: () => void,
  ) {
    this.scene = world.scene;
    const spawn = world.layout.playerSpawns[0]!;
    this.player = new Player(world, opts.look ?? defaultLook(), spawn, () => app.settings.get());
    app.debug.extra.set('player', () => {
      const c = this.player.controller;
      return `${c.grounded ? 'ground' : 'air'} spd ${c.speed.toFixed(1)}${c.crouched ? ' crouch' : ''}${c.isRolling ? ' roll' : ''}`;
    });
  }

  static async create(app: App, opts: GameOptions, onQuit: () => void): Promise<GameState> {
    const v = app.settings.get().video;
    const world = await World.create(app.engine, opts.map, {
      seed: opts.seed,
      shadows: v.shadows && v.quality !== 'low',
      shadowMapSize: v.quality === 'high' ? 2048 : 1024,
    });
    return new GameState(app, world, opts, onQuit);
  }

  get simulating(): boolean {
    return !this.paused;
  }

  enter(): void {
    this.app.input.setGameplayActive(true);
  }

  exit(): void {
    this.app.input.setGameplayActive(false);
    this.app.debug.extra.delete('player');
    this.player.dispose();
    this.world.dispose();
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.app.input.setGameplayActive(false);
    this.app.screens.push(
      new PauseScreen(
        this.app,
        () => {
          this.paused = false;
          this.app.input.setGameplayActive(true);
        },
        () => this.onQuit(),
      ),
    );
  }

  fixedUpdate(dt: number): void {
    const inp = this.app.input.state;
    if (inp.pressed('pause')) {
      this.pause();
      return;
    }
    this.player.fixedUpdate(dt, inp);
  }

  frameUpdate(dt: number, alpha: number): void {
    const look = this.app.input.state.consumeLook();
    this.app.input.setAds(this.player.ads);
    this.player.frameUpdate(dt, alpha, look);
  }
}
