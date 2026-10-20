// GENERATED from scripts/anim-keys/keys/*.json (tuner-v2 item 4): each keyed clip's own keys (the mirrored half is
// made by the bake). tests/tuneKeys.test.ts checks it against the JSON files; regenerate when a key file changes.
export interface KeyClipMeta {
  readonly name: string;
  readonly frames: number;
  readonly mirror: boolean;
  readonly phases: readonly number[];
}

export const KEY_CLIPS: readonly KeyClipMeta[] = [
  { name: 'crouch_idle', frames: 64, mirror: false, phases: [0, 0.08333333333333333, 0.16666666666666666, 0.25, 0.3333333333333333, 0.4166666666666667, 0.5, 0.5833333333333334, 0.6666666666666666, 0.75, 0.8333333333333334, 0.9166666666666666] },
  { name: 'crouch_run', frames: 32, mirror: true, phases: [0, 0.125, 0.25, 0.375] },
  { name: 'crouch_walk', frames: 32, mirror: true, phases: [0, 0.125, 0.25, 0.375] },
  { name: 'glide_back', frames: 32, mirror: true, phases: [0, 0.125, 0.25, 0.375] },
  { name: 'glide_fwd', frames: 32, mirror: true, phases: [0, 0.125, 0.25, 0.375] },
  { name: 'glide_strafe', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },
  { name: 'guard_choke_sag', frames: 48, mirror: false, phases: [0, 0.020833333333333332, 0.10416666666666667, 0.20833333333333334, 0.2916666666666667, 0.375, 0.4583333333333333, 0.5833333333333334, 0.6875, 0.8333333333333334, 0.9791666666666666] },
  { name: 'guard_held_hands', frames: 48, mirror: true, phases: [0, 0.125, 0.25, 0.375] },
  { name: 'guard_held_stumble', frames: 32, mirror: true, phases: [0, 0.125, 0.25, 0.375] },
  { name: 'guard_knife_collapse', frames: 48, mirror: false, phases: [0, 0.020833333333333332, 0.0625, 0.10416666666666667, 0.16666666666666666, 0.22916666666666666, 0.3125, 0.4166666666666667, 0.5208333333333334, 0.6041666666666666, 0.8333333333333334, 0.9791666666666666] },
  { name: 'hold_back', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },
  { name: 'hold_choke', frames: 48, mirror: false, phases: [0, 0.020833333333333332, 0.10416666666666667, 0.20833333333333334, 0.2916666666666667, 0.375, 0.4583333333333333, 0.5833333333333334, 0.6875, 0.8333333333333334, 0.9791666666666666] },
  { name: 'hold_fwd', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },
  { name: 'hold_idle', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },
  { name: 'hold_knife', frames: 48, mirror: false, phases: [0, 0.020833333333333332, 0.0625, 0.10416666666666667, 0.16666666666666666, 0.22916666666666666, 0.3125, 0.4166666666666667, 0.5208333333333334, 0.6041666666666666, 0.8333333333333334, 0.9791666666666666] },
  { name: 'hold_side', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },
  { name: 'idle', frames: 64, mirror: false, phases: [0, 0.08333333333333333, 0.16666666666666666, 0.25, 0.3333333333333333, 0.4166666666666667, 0.5, 0.5833333333333334, 0.6666666666666666, 0.75, 0.8333333333333334, 0.9166666666666666] },
  { name: 'jog', frames: 32, mirror: true, phases: [0, 0.125, 0.25, 0.375] },
  { name: 'ready_stance', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },
  { name: 'run', frames: 32, mirror: true, phases: [0, 0.125, 0.25, 0.375] },
  { name: 'sneak', frames: 32, mirror: true, phases: [0, 0.125, 0.25, 0.375] },
  { name: 'walk', frames: 32, mirror: true, phases: [0, 0.125, 0.25, 0.375] },
  { name: 'wall_crouch_idle', frames: 64, mirror: false, phases: [0, 0.08333333333333333, 0.16666666666666666, 0.25, 0.3333333333333333, 0.4166666666666667, 0.5, 0.5833333333333334, 0.6666666666666666, 0.75, 0.8333333333333334, 0.9166666666666666] },
  { name: 'wall_crouch_peek', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },
  { name: 'wall_crouch_slide', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },
  { name: 'wall_idle', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },
  { name: 'wall_peek', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },
  { name: 'wall_slide', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },
];
