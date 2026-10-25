status: blocked waiting for campus-greybox-s3-r5 done (the lead sets open)
# campus-greybox s3 join (cloud): merge r1-r4 into r5, apply the join list J1-J6

Lead: Night Shift | Sector Ops Build. Job campus-greybox (J17). `docs/campus-greybox/briefs/S3.md` section 2: "the lead
merges r1-r4 into r5 before R5's nav tests"; the lead hands that merge to this brief. Sub-lanes r1-r4 each passed their
checker (r1 Sonnet PASS; r2-r4 Opus PASS 2026-10-25 ~23:20, one checker, join list below).

- Base: `origin/feature/campus-greybox-s3-r5` at its done head (the r5 brief's `status: done` line). Branch: keep
  building on `feature/campus-greybox-s3-r5` (push to it only). Guard:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s3-r5`.
- Merge, in this order, with `git merge --no-ff` (never master, never rebase): `origin/feature/campus-greybox-s3-r1` @
  5d7da838c, `origin/feature/campus-greybox-s3-r2` @ 107f42653, `origin/feature/campus-greybox-s3-r3` @ 4dd20af19,
  `origin/feature/campus-greybox-s3-r4` @ e37b26565 (rev-parse each to its full sha and confirm it is still the branch
  head; if a head moved, stop and set `status: blocked <which head moved>`). The checker's trial merge of r1-r4 had no
  textual conflicts (every lane owns its files); a conflict with r5's files: keep both sides and log it.
- Then apply the join items, one commit each, only in the files they name.

## Join list (from the r2-r4 checker; line numbers at each lane's head: re-find them by content after the merge)
**J1 - stair rooms into S3_ROOMS (r3 F1), with the overlap exemption.**
- `src/world/maps/campusV2/s3.ts:10`: `import { buildS3Stairs, S3_ROOMS_STAIRS } from './s3Stairs';`
- `s3.ts:31`: `export const S3_ROOMS: RoomDef[] = [...S3_ROOMS_G, ...S3_ROOMS_L1, ...S3_ROOMS_STAIRS];` and the comment at
  :30 "none overlap" -> "none overlap but the stair cores (smallest room wins in `roomAt`)".
- `tests/campusV2S3Shell.test.ts:258` and `tests/campusV2S3L1.test.ts:488`, inside the inner loop before the `ox` line:
  `if (['s3-wstair', 's3-nstair', 's3-estair'].includes(a.id) || ['s3-wstair', 's3-nstair', 's3-estair'].includes(c.id)) continue;`

**J2 - the corridor plenum is open over the north core (softlock: void -> corridor ceiling deck -> east lobby -> sealed
chase x 52..53, z -18..-11, no way out).**
- `src/world/maps/campusV2/s3L1.ts:314-315`: replace the two lines with `wall(b, true, -7, 10, S3_BOX.eCore[0], C, R, []);`
  (keep :316).
- `tests/campusV2S3L1.test.ts:456`: `if ((x > 29.9 && x < 33.6) || (x > 57.9 && x < 61.6)) continue;` ->
  `if (x > 57.9 && x < 61.6) continue;`
- Add one assertion that no walkable cell at y >= 7.5 connects to the chase x 52..53, z -18..-11 (or, if the lane's
  nav helper cannot express it, that the z -7 plenum wall spans x 10 .. eCore[0] without a gap).

**J3 - L1 slab holes vs the moved core walls (r3 F3).**
- `s3L1.ts:94` and `:95`: last element `S3_BOX.nCore[3] - T / 2` / `S3_BOX.eCore[3] - T / 2` -> `-T`.
- `tests/campusV2S3L1.test.ts:151-152`: `-0.65` -> `-0.3` (both rows).

**J4 - duplicate core-slot strips (r3 F2).**
- `s3L1.ts:239`: delete the line (fix the step-4 comment at :231-233).
- `tests/campusV2S3L1.test.ts:289`: `.toBeDefined()` -> `.toBeUndefined()` (the slot is now R3's wall), keep :290.

**J5 - wire r4's exports in `s3Data.ts` (r4 finding 2)**, unless r5 already did: delete the local `S3_CAMERAS` /
`S3_ALARMS` / `S3_DESKS` and import them with `S3_KEYPADS`, `S3_INTEL` from `./s3Devices` and `S3_BOARDS` from
`./s3Lights`; `S3_PARTS.boards: S3_BOARDS`; `S3_SECTOR` gets `keypads: S3_KEYPADS, intel: S3_INTEL`.

**J6 - run on the merged head:** `npm run typecheck:fast`; `npx vitest run --maxWorkers=2 tests/campusV2S3*.test.ts
tests/campusS3*.test.ts tests/campusV2.test.ts tests/campusRuntimeNav.test.ts`. Then R5's nav tests (the r5 brief's
"after the merge" part, if r5 left them pending). Any red test: fix only if the cause is one of J1-J5; otherwise
`status: blocked <test, cause>`.

## Done
r1-r4 merged into r5, J1-J5 applied, J6 green (counts in the report), report `docs/campus-greybox/checks/s3-join.md`
(merge shas, each J item with its commit, test counts, anything that differed from the line numbers), this brief
`status: done feature/campus-greybox-s3-r5 <sha>` with a short "## Report". Pending PC runs: e2e-sectorops:1..6 flag
off at the S3-e head; v2 walk of the stairs and the plenum after S3-f.
