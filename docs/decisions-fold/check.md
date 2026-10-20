# decisions-fold - wording check

Fresh checker, 2026-10-21. Source: `git show origin/feature/menu:docs/ROADMAP.md` "## Decided" (54 entries).

## Findings
- Quotes: every quoted string in G192-G228 is in the source verbatim (scripted check, whitespace-normalised). Relayed
  items (G192-G196, G201, G206, G208, G218, G221, G225, G228) are marked paraphrased; G192 / G196 cite their relays
  (ct-prototype DECISIONS 2026-10-19 row, operators D36). Dates and order are right (~23:40 is 10-20, per the 10-21 entries).
- Skips (17): all process or bug reports; none design-relevant dropped; no topic already had a G (grep of master
  DECISIONS: purple, toggle aim, LB hold, flicker, voxels, laser grid, letterbox, carousel, keyframed: no hits).
- G210: faithful. "Can you ignore CT movement references" plus docs/anim-rework/BRIEF.md ("Movement and animation no
  longer follow the CT footage. G1 (pure CT) still holds for the rest of the game") support dropping the footage as the
  movement / animation reference. Bible 5.12 change is justified; G1 / G5 look lines untouched. Not blocking.
- G199 no clipping, G214 no toggle aim, G196 purple, G208 Blender clips: bible lines match Michael's words.
- Borderline calls: keep G200 (map readiness and light), G224 (warehouse parked is design), G227 (ends G150's
  tune-until-sign-off). G202 camera numbers stay: BRIEF says "The camera stays the explore camera".

## Verdict: FIX (one round)
1. Bible 5.3 intro still opens "CT movement, measured from Michael's footage", contradicting the new G210 sentence.
   Done looks like: first sentence says the movement was first measured from CT footage and G210 drops that reference.
2. G210 scope. Done looks like: G210 adds "G1 still holds for the rest of the game (BRIEF)" and lists G208's
   "keyed with the footage as reference" among what it replaces.
3. G227 widens "Priority overnight" to a standing rule and omits the "replaces G150" the bible claims. Done looks like:
   rule says the animation system was the overnight priority (2026-10-21); G227 carries "(Replaces G150's
   tune-until-sign-off.)"; bible 5.14 "the core-feel job tunes movement on her (G150)" points to G227.
4. G220 tuner by touch conflicts with G182 "No touch controls". Done looks like: G220 notes "(an exception to G182's
   no touch work)"; bible section 8 phone line says the anim tuner is the one touch exception (G220).
5. G225 "open floor at 0.30" is unclear. Done looks like: G225 and bible section 7 say the open floor's light level
   stays 0.30 (just above the 0.28 shadow line, marlow-yard-audit).
6. Bible 5.4 grab bullet (already edited) still says "CT's grab menu then offers knock out, kill or interrogate",
   which G203 contradicts. Done looks like: that clause points to G203 (interrogate in the menu; RT / LT knock out or
   kill).
7. G211 vs G167 ("no MPFB code"). Done looks like: G211 adds "(the add-on is a tool only; G167's no MPFB code in the
   game stands)".
