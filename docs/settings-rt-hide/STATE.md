# settings-rt-hide - state

## Now
Built (2026-10-23): `src/ui/screens/settingsScreen.ts` only. tsc 0, eslint clean, vitest settings / graphics / ui /
settingsCover pass, build clean. Pushed; no PR yet (base is feature/voxel-retire, #236).

Fresh Sonnet checker PASS on 5e752abd (2026-10-23 ~18:25): no UI path sets rtRes / gi / 'rt'; saved 'rt' shows as
Screen space (settingsScreen.ts:372) and the row writes 'off' / 'ssr'; tsc + eslint clean; fragment ok.

## Next
1. Laptop e2e on 5e752abd queued (Test Runner chain-1023sr, runs/settingsrthide-5e752abd): e2e-menus, e2e-desktop.

## Polish list (checker)
- settingsScreen.ts:5 missing space in the import (`ReflectionMode,type ShadowQuality`).
- Branch-tagged comments at settingsScreen.ts:60 and :370 could be trimmed.
2. After #236 merges: rebase onto master, open the PR (batch with other small jobs if the orchestrator prefers).

## Open
- `rtRes`, `gi` and `'rt'` stay in the settings shape (A1); deleting them needs a SAVE_VERSION migration (later sweep).

## Done
- 2026-10-23: brief and plan; rows hidden; checks green.
