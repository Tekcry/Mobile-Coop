# Campaign mode: lobby, briefing, Continue, autosave and results (preview only)
kind: minor
- In the preview, a co-op host's campaign mission is shared through the lobby, a saved campaign mission can resume at the section it was saved at (both players spawn there, with the earlier objectives, alarms, rule breaks and revives used kept), and "Resume hosting" a Sector Ops match picks up at its current section.
- In the preview, the co-op lobby offers Prologue (Marlow Yard) or Mission 1 (Three Grey Coats or Two-Key Ledger) with a briefing for both players, Continue from a save with its difficulty locked, and a "Continue campaign" main-menu item when a save exists.
- In the preview, a campaign mission saves at each section, ends with "MISSION COMPLETE" and a 0-100% rating (PERFECT at 100) with every category on the results, records it for both players (no Sector Ops stars), and Marlow Yard's finish records the prologue as completed.
- Tests: a new e2e-coop part `campaign` plays the campaign lobby to the end with two players.
