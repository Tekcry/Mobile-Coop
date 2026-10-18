# Research agent brief (shared rules)

Topic: the 2-player co-op mode of Tom Clancy's Splinter Cell: Chaos Theory (2005), all platforms.

## Established so far (from Splinter Cell Fandom wiki via API + Wikipedia + Xbox.com news)
- Xbox/PC co-op story missions: Training Facility, Panama (PCA building), Seoul ("Seoul 3"), Chemical Bunker (North Korea, Nampo), Train Station (Grand Central, NYC), plus two later downloadable/patch missions Nuclear Plant (Yongbyon) and UN Headquarters (NYC) released ~Aug 2005 (Xbox Live; PC via patch - order of the two reportedly swapped on PC). Wikipedia calls it a seven-mission story mode.
- PS2/GameCube co-op is a different build: Team Training, Seoul (Streets, Rooftops, Gardens, Fish Market, Cyber-Cafe), Chemical Bunker (Silo, Laboratories, Cryogenic Chamber, Storage Room, The Docks), Train Station (Train Repair Station, Hydro Tunnel, Subway, The Station), Panama (The Alley, East Wing, Archives, Server Room). Missions split into sub-levels; reportedly 3 alarms = failure per sub-level.
- Agents: "Agent One" and "Agent Two" (blue vs red goggle lights), Splinter Cells in training, Shadownet/Third Echelon. Antagonist arc: Jong Pom-chu (chemist), Colonel Kim, Jin Soo.
- Named co-op moves seen so far: Short Scale (boost over wall), Tomoe Nage (throw partner over laser/gap), Hangover (one hangs partner down? used to hack computer), Dual Rappelling, human ladder, back-to-back climbing, climbing on partner's shoulders, share equipment (cut content), simultaneous dual retinal scan, simultaneous bomb wire cut.
- Raw wiki text is cached in /home/user/raw/wiki/*.txt (read freely). Fandom pages 403 in WebFetch, but the MediaWiki API works with curl:
  curl -sS -A "Mozilla/5.0" -G "https://splintercell.fandom.com/api.php" --data-urlencode action=parse --data-urlencode "page=PAGE TITLE" --data-urlencode prop=wikitext --data-urlencode format=json --data-urlencode redirects=1
  Search: ...api.php?action=query&list=search&srsearch=TERMS&format=json&srlimit=50
  Helper: /home/user/raw/wget.sh "Page Title" -> /home/user/raw/wiki/<slug>.txt
- YouTube search works via /home/user/raw/yt.sh "search terms" (prints URL | title | channel | length; pipe to head).
- web.archive.org is blocked (connection reset). GameFAQs, GameSpot, MobyGames return 403 to curl; try WebFetch on them anyway, and try mirrors (gamerevolution.com/guides, supercheats, neoseeker, cheatcc, ign.com/guides or ign.com/wikis, gamespy, eurogamer, 1up, co-optimus, steamcommunity.com works, reddit via WebFetch/WebSearch).

## Rules (mandatory)
1. Paraphrase everything in your own words. Never paste walkthrough/wiki/review text. Quotes only if essential: under 15 words, max one per source.
2. Tag every factual claim: [VERIFIED - 2+ sources], [SINGLE SOURCE] or [UNCERTAIN]. Count the Fandom wiki as one source. Two pages of the same site = one source.
3. Never invent mission details, room sequences, moves or mechanics. If you cannot find it, write it under "Gaps" - do not fill it in.
4. Record every URL you used (and what it covered) in a "Sources" section at the bottom. Also record useful URLs that failed (blocked) with the error.
5. Write ONLY your assigned output file(s) under /home/user/docs/research_notes/. Do not edit other files. Do not git commit.
6. Write findings to the file as you go (not all at the end), so work survives interruption.
7. Be thorough: aim for depth (multiple independent sources per topic, differently-worded searches, alternate names).
8. End your final reply with a 10-line summary: what you found, confidence, biggest gaps.
