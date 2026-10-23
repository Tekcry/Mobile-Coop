Status: triaged, no fix committed (Opus triage agent, 2026-10-24). e2e-lightbake on the LR16 + master branches
(f85ef736 flake, 606630ed 900 s kill, 9a79b5a5 solo laptop GPU fail at 257 s). Triage worktree at 9a79b5a5, node only,
no GPU, no e2e, no build.

# LR16 x master: e2e-lightbake triage

## Cause

The failing assert (lead's excerpt, PR #291, solo laptop GPU rerun on 9a79b5a5, 257 s): `gfx=epic: no console errors`:

    [warning] smooth body e1-smooth: body shader compile stuck, recompiling (1/3)
    [warning] smooth body e1-smooth: body shader program disposed, recompiling (2/3)

Every bake, key and hash check passed (18 lamps, 9.6 MB). Not the bake, not the time cap, not a hang.

Two things meet only on the merged branch:

1. **Master's body compile watchdog** (guard-ai carry fix, master d704098e / d7a3b887):
   `src/player/bodyEffectRecovery.ts:18-19` `STUCK_MS = 8000`, `STUCK_FRAMES = 30`. Each render for each smooth body
   mesh (`src/player/smoothBody.ts:313`), an effect still unready after 8 s and 30 frames counts as "compile stuck":
   it logs `console.warn`, disposes the effect and its program and compiles again (up to 3 times per variant).
   e2e-lightbake counts any console warning as an error. The second line ("program disposed", right after the
   first recompile) suggests the recompile path itself catches the fresh program disposed; worth a look by the owner.
   A cold compile that takes longer than 8 s is restarted instead of left to finish.
2. **LR16's lamp plugin makes the body's Epic fragment shader about 5-6x bigger than master's.** Master's
   default lamp falloff is `linear`, so `shadowAccuracyOn()` is false there: no `LAMP_DOORS8` and no `LAMP_TORCH`.
   Its character shadow is a 4-tap PCF with no loop. LR16 has all of them on, plus more.

   | in the body's lamp code (Epic) | master cacd0c7e | LR16 (9a79b5a5) |
   |---|---|---|
   | lamp grid slots (loop trip count) | 8 | 24 (LR16b) |
   | doors per lamp | 4 | 4 + 4 (`LAMP_DOORS8`) |
   | character shadow per slot lamp | 4-tap PCF, no loop | PCSS: 8-tap blocker loop + 16-tap filter loop (LR16f) |
   | flashlights | none (linear) | 4-slot loop, each with door test + 8 + 16-tap PCSS (`LAMP_TSHADOW`, LR16t) |
   | fill | `nsGrid` (1 tap) | `nsGrid2` (8 texelFetch, LR16-1 bounce) |
   | fetch sites, lamp loop body once | ~29 | ~59 |
   | fetch sites, lamp body + torches + fill | ~30 | ~163 (5.4x) |
   | if fxc unrolls the lamp loop too | ~232 | ~1520 (6.5x) |

   (Fetch sites counted from the GLSL: lamp texels, the visibility tap, door / capsule texels, shadow kernel taps.)
   On ANGLE D3D11, fxc compiles this on the CPU, and the suite runs three browsers at once.
   `docs/systems/testing-tools.md` already notes the characters' skin shader compiling "seconds after spawn" on D3D11.

Consistent with every run:
- 809c25f4 (LR16, before the merge): passed. Same big shader, but no watchdog, so a slow compile just finishes.
- Master alone (train 41, 8fb9952e): passed on the laptop. It has the watchdog, but its small body shader compiles in
  under 8 s.
- f85ef736 / 9a79b5a5 (both): fails or flakes depending on how long the cold compile takes under load.
- The 606630ed 900 s kill had no excerpt. It probably came from the same recompile loop stalling frames on a loaded
  machine. Not proven.

## Bake cost (node, single thread, `bakeLamps` on the canonical light set, as `World.create` + `bakeLevelLight`)

e2e-lightbake bakes only the **Warehouse** (`autostart=warehouse&mode=clear`), cold, once per preset in three browsers
side by side (min, low, epic). Each browser has its own profile, so the lamp cache (`LAMP_VERSION` 7 key) never hits,
by design. Marlow (ctcourse) is not baked by this suite.

| map @ commit | lamps | box cells | lamp bake ms (vis / bounce) | penumbra share | moon ms |
|---|---|---|---|---|---|
| warehouse @ master cacd0c7e | 18 | 4.11 M | 3824 | - | 68 |
| warehouse @ 809c25f4 (LR16) | 18 | 9.55 M | 11588 (10849 / 735) | ~1.2 s | 73 |
| warehouse @ 9a79b5a5 | 18 | 9.55 M | 14252 (13224 / 1023) | ~2.7 s | 100 |
| ctcourse @ master | 149 | 17.1 M | 7399 | - | 443 |
| ctcourse @ 809c25f4 (old map) | 31 | 13.4 M | 9347 (8786 / 558) | ~1.1 s | 65 |
| ctcourse @ 9a79b5a5 (new map) | 149 | 46.9 M | 34590 (31527 / 3035) | ~1.5 s | 372 |

The reach x1.6 photometric model makes the boxes about 2.3x bigger (warehouse 4.1 M -> 9.6 M cells; ctcourse 17 M -> 47 M).
The bake runs on `hardwareConcurrency - 4` workers in the browser. It was not this failure: the bake checks passed
and the suite ended at 257 s. Marlow's 35 s single-thread bake matters for e2e-ctcourse / sectorops boot time, not here.

## Class

None of (a) / (b-bake) / (c). It is a render-side compile-cost regression (LR16 shader growth on body materials)
exposed by master's new 8 s body compile watchdog. The bake and the suite budget are fine.

## Why no fix in this round

Every way to cut the body shader is a GLSL restructure: dynamic loop bounds so fxc cannot unroll the torch / PCSS
loops, a body-only `LAMP_CSHADOW` / `LAMP_TSHADOW` drop, or hoisting the character-shadow PCSS out of the 24-slot loop.
Whether any of them gets the cold D3D11 compile under 8 s, or compiles at all, can only be shown on ANGLE D3D11. The
nsGrid2 X3504 / X3696 failure (lr16-laptop-triage.md) was exactly an untested restructure of this kind. This round
allowed no GPU work, so I committed no shader change.
- Body-only `LAMP_TSHADOW` off would fall back to the reach-cut torch path. Its `ta.w` is written for the shadowed
  mode, so a guard's torch could light a character through a wall: a visible stealth regression. Not recommended.
- Body-only `LAMP_CSHADOW` off would drop silhouettes cast onto characters (capsules stay). It is picture only and
  smaller, but the size of the gain is unknown.

## Recommendation

1. Watchdog (master's code, guard-ai carry fix owner): 8 s of "not yet compiled" is normal for a cold parallel
   compile of a big PBR variant on D3D11. Recompiling restarts it. Suggested: under `KHR_parallel_shader_compile`,
   leave an incomplete program to Babylon's own timeout and recover only on timed out / failed / disposed. Or raise
   `STUCK_MS` to 30-60 s. Also check why the fresh program reads disposed right after a recompile. Lowest risk: it
   touches no lighting and needs no picture parity.
2. LR16 shader cost (sector-redesign, needs one laptop GPU probe): measure the body variant's compile time at Epic,
   then try dynamic-bounded torch / PCSS loops first. That keeps parity, with the same iterations and the same picture.
3. Rerun after 1 (or 2): `E2E_GPU=1 node scripts/run-e2e.mjs e2e-lightbake` solo on the laptop, then `e2e-desktop:3`
   (it boots Epic bodies too) on the PC GPU list.

Marlow (PR #291) needs no change for this. Whatever lands for 1 or 2 reaches it through lr16-entry.
