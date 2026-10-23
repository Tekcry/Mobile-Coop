# settings-rt-hide - state

## Now
Built (2026-10-23): `src/ui/screens/settingsScreen.ts` only. tsc 0, eslint clean, vitest settings / graphics / ui /
settingsCover pass, build clean. Pushed; no PR yet (base is feature/voxel-retire, #236).

## Next
1. Laptop e2e on the pushed commit: e2e-menus, e2e-desktop (`E2E_GPU=1`).
2. After #236 merges: rebase onto master, open the PR (batch with other small jobs if the orchestrator prefers).

## Open
- `rtRes`, `gi` and `'rt'` stay in the settings shape (A1); deleting them needs a SAVE_VERSION migration (later sweep).

## Done
- 2026-10-23: brief and plan; rows hidden; checks green.
