# For feature/camera-range (from sector-redesign slice 0)

Sector-redesign slice 0 (G1) moved the camera cap from "12 per map" to "12 live at once per Sector section" without
touching `src/security/camera.ts` or the `CAMERA` table. What changed, so the camera-range merge expects it:
- `src/security/data.ts`: the last check of `validateSecurity` (the SN60 line) now reads `liveCameraPeak(devices)`
  (untagged cameras plus the busiest section's own) against `SECURITY_LIMITS.cameras` (12, unchanged), and adds a per-map
  check against `WIRE_CAMERAS` 16 (the co-op `sec.ck` clock list, `SEC_CAMS` in `net/protocol.ts`). Two new exports
  below the function: `WIRE_CAMERAS`, `liveCameraPeak`. Your hunks in the same file (the `camRange` import, the range
  and aim checks) do not overlap; a merge should apply cleanly.

The one hunk left for you (`src/config/security.ts`, the file with the `CAMERA` table, which this job does not edit):
the comment above `SECURITY_LIMITS` still says "per map". Suggested:

```ts
/** SN60 limits: cameras live at once (per Sector Ops section; the whole map when no camera is tagged with a section).
 *  A map also stays within the co-op wire's 16 camera clocks (`WIRE_CAMERAS`, `security/data.ts`). */
export const SECURITY_LIMITS = {
  cameras: 12,
} as const;
```
