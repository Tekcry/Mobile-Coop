# Night Shift - Unreal research (ten decisions)
Owner: the orchestrator. Status: current (Unreal re-plan run, 2026-11-03; research notes outside the repo in `D:/## Claude AI ##/Night Shift/research_notes/`).

Every "PROVE ON LAPTOP" item is checked in Phase 1 or the phase that first needs it (`MASTER-PLAN-UNREAL.md`).

## Bottom line
- Install UE 5.8.4; C++ project from the Third Person C++ template, thin Blueprints.
- The agent can build, script, test and render hidden; Michael does a few one-time visible steps.
- Epic's animation sample for movement, Steam listen server, State Tree guards with our own light check, free assets, local git plus nightly Drive backup.

## 1. Engine version and project base
- **Answer:**
  - UE 5.8.4 (2026-10-20) is newest; 5.8 adds Python Blueprint editing, an official MCP and an asset-to-JSON reader. Fallback 5.7.4.
  - C++ is plain text the agent writes and compiles; Blueprints are binary.
  - Game Animation Sample (GASP) and Lyra are donors only: GASP is Blueprint-only without official multiplayer; Lyra is too big.
- **Recommended:** UE 5.8.4, C++ plus thin Blueprints, Third Person C++ template.
- **PROVE ON LAPTOP:** first launch and shader compile finish (users report extra RAM and shader crashes).
- **Source:** [UE 5.8 release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes), [5.8.4 hotfix](https://forums.unrealengine.com/t/5-8-4-hotfix-released/2842775)

## 2. Unattended hidden work
- **Answer:**
  - Go. Compile, Python asset scripts, tests, packaging and hidden GPU runs (`-game -RenderOffscreen -unattended`, with screenshots and frame traces) are all command line.
  - Two-player test: two hidden processes (host `?listen`, client joins 127.0.0.1) and our own C++ driver injecting input and logging PASS/FAIL. Unreal's functional tests cannot span client and server.
  - Visible only: UE and Visual Studio installs, Fab/sample downloads, creating the project, Live Coding, hand-editing animation graphs.
- **Recommended:** everything via `UnrealEditor-Cmd.exe`; Michael creates the project once.
- **PROVE ON LAPTOP:** no window and the RTX (not Iris Xe) is used; rendering with screen locked; editor tests hidden; crash dialogs suppressed; two instances connect; build command syntax.
- **Source:** [Epic command-line reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-command-line-arguments-reference), [Epic testing networked games](https://dev.epicgames.com/documentation/unreal-engine/testing-and-debugging-networked-games-in-unreal-engine)

## 3. MCP servers
- **Answer:**
  - Not needed: the command line covers everything without a running editor or open ports.
  - Epic's Unreal MCP is free but Experimental, has no login security and sends usage data by default. Community ones are stale; paid ones are off budget.
- **Recommended:** no MCP; maybe trial Epic's later, started hidden.
- **PROVE ON LAPTOP (if trialled):** no window, localhost only, no firewall prompt.
- **Source:** [Epic Unreal MCP](https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor?lang=en-US)

## 4. Text versus binary
- **Answer:**
  - Text: C++, config, project file, Python, CSV/JSON data.
  - Binary (levels, Blueprints, data tables, materials, input): Python scripts create and change them. UnrealAssetStringify reads any asset as JSON for checking; it cannot write.
  - Weakest: animation state machines, AI graphs, effects. Keep thin or borrowed.
- **Recommended:** gameplay rules in tested C++; Blueprints hold only asset links and CSV-fed tuning.
- **PROVE ON LAPTOP:** UnrealAssetStringify ships in the Launcher build; scripted materials and input assets.
- **Source:** [UE 5.8 release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes), [BlueprintGraphEditor API](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/BlueprintGraphEditor)

## 5. Animation
- **Answer:**
  - In-place Mixamo clips with no root bone defeat Unreal's anti-slide tools. Use root motion: re-download with "In Place" unticked, add a root bone with the free mixamo_converter Blender add-on, retarget with IK Retargeter.
  - GASP has motion-matched walk/run, starts, stops, pivots, turn-in-place, crouch, vault, climb, simple aim offset. No weapons; remote players jitter under lag. Upper body: layered blend from spine_01 up, hand IK.
  - Round 1: built in - upright stand, run lean. Settings - foot planting (GASP), starts, stops, camera, blends, speeds, footsteps, crouch hips, idle sway, broken arm (likely). Custom - gun holds, aim, draw, sling, networked vault/climb.
- **Recommended:** GASP locomotion for players, Mixamo only for weapon layers; guards on a cheaper state machine.
- **PROVE ON LAPTOP:** no jitter in a 2-process lag test; converter on current Blender; arm retarget; 30 guards' CPU cost.
- **Source:** [Epic GASP docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/game-animation-sample-project-in-unreal-engine), [Epic Pose Warping](https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine)

## 6. Two-player online co-op
- **Answer:**
  - Free: one player hosts over Steam Sockets, with lobbies, invites and Valve's relay. No port forwarding.
  - EOS is also free but adds a portal and logins.
  - No Valve Friend's Pass feature; Steam demos cannot matchmake with the full game.
- **Recommended:** Steam listen server; test app ID 480, own ID after the fee; Friend's Pass after launch.
- **PROVE ON LAPTOP:** packaged Steam join with a second PC and account.
- **Source:** [Epic Steam Sockets](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-steam-sockets-in-unreal-engine), [Steam Datagram Relay](https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay)

## 7. Stealth guards
- **Answer:**
  - AI sight ignores light; we add darkness ourselves.
  - Epic calls State Tree its general-purpose state machine; Behavior Trees still work.
  - Only placed lights count (Lumen bounce is unreadable). Fixed exposure and a low fill light keep the picture readable.
- **Recommended:** server-side sight and hearing, filtered by a per-player light value traced 4-10 times a second; State Tree brains; EQS search points.
- **PROVE ON LAPTOP:** 30 guards in a packaged build; darkness picture checks.
- **Source:** [Epic AI Perception](https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-perception-in-unreal-engine), [Epic State Tree](https://dev.epicgames.com/documentation/en-us/unreal-engine/state-tree-in-unreal-engine)

## 8. Free assets and licences
- **Answer:**
  - Free for Steam: Fab free Standard items, Epic samples, Mixamo, Poly Haven, ambientCG (CC0).
  - Limits: "UE-Only" content stays in Unreal; never share raw files; Megascans mostly paid; 5% royalty only above USD 1M.
- **Recommended:** CREDITS.md ledger: asset, link, licence, date, files, credit.
- **PROVE ON LAPTOP:** nothing.
- **Source:** [Fab licences](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab), [Epic Content License](https://www.unrealengine.com/eula/content)

## 9. Storage and backup
- **Answer:**
  - Local git, ignoring Binaries, Intermediate, Saved and DerivedDataCache. No Git LFS: bundles skip LFS files.
  - Never keep the live project in a synced Drive folder. The 15 GB includes Gmail and Photos.
- **Recommended:** nightly scheduled git bundle plus zip of Config, Content, Source, Plugins to dated Drive folders, kept under ~10 GB.
- **PROVE ON LAPTOP:** project size with and without caches; weekly repo growth; backup with the editor open.
- **Source:** [Cleaning Your Project](https://unrealcommunity.wiki/Cleaning%20Your%20Project), [UE gitignore template](https://pkg.go.dev/github.com/imwithye/gitignore/template/github/unrealengine)

## 10. Performance and players' PCs
- **Answer:**
  - Software Lumen is cheaper; Low and Medium turn Lumen off. 5.8 adds Lumen Lite (Beta, twice as fast) and MegaLights for many lights.
  - Suggested minimum: 6-core, 16 GB RAM, RTX 2060 class, 1080p Low. Recommended: RTX 3060 8 GB, 1080p High 60 fps.
  - Estimates: first shader compile tens of minutes, C++ builds seconds to minutes, cold package 10-45 minutes.
- **Recommended:** software Lumen and Virtual Shadow Maps at High; Lumen Lite as low preset and Steam Deck target (30 fps).
- **PROVE ON LAPTOP:** time opens, compiles, packages; frame budget on Iris Xe; many-light shadow cost.
- **Source:** [Epic Lumen Performance Guide](https://dev.epicgames.com/documentation/unreal-engine/lumen-performance-guide-for-unreal-engine), [UE 5.8 release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes)

## Unconfirmed
- Epic never states `-RenderOffscreen` opens no window; no official create-project command.
- 5.8.4 problems are single-user reports.
- GASP multiplayer, jog gait, licence type; Motion Matching and State Tree maturity.
- Friend's Pass app Steam fee; Unreal EULA credit wording.
- Bundles skipping LFS files; Lumen Lite on Iris Xe; Michael's Visual Studio licence.
