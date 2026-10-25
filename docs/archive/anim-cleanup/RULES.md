# Animation clean-up - rules

- Branch `feature/anim-cleanup`, folder `C:/NightShift/Mobile-Coop-anim-cleanup`; built on feature/weapons (PR #7) and
  feature/ct-prototype (the posture fix, 59a6846 / 61607ca): merges after both (A1). Branch guard before every write.
- Audit before fixing: contact sheets and measured contacts on Wren's body for each state, a ranked list, then fixes.
- Reference: CT footage (C:/NightShift/Mobile-Coop-locomotion/pc/ct-ref, local only) and docs/locomotion/research.
- Prototype level: believable, accurate contacts, no clipping; no feel tuning (CT Core's, G150).
- Checks: an independent check per slice (blocks only on broken, clipping, unbelievable), at most one fix round;
  `npm run check`; software-GL e2e on 4191; GPU screenshots on this laptop (Michael allowed it) on 4189.
- Gameplay never reads render state; hot paths allocate nothing; Babylon only through core/babylon.ts.
