# Joint interrogation (G148)
kind: minor
- Co-op joint interrogation (G148, CT: both players question one captive; some intel comes only this way). Beside a
  guard your partner holds, hold A: a guard with joint information lists BLUFF above TEAM TAKEDOWN. The host accepts the
  bluff and both see "Bluff on. Read his face now."; when the holder's INTERROGATE ends within 6 s of the bluff, with the
  bluffer alive and within 3 m, the guard also gives his joint-only lines to both players (radio subtitle and feed) and
  sets his joint flag. A solo read gives only his usual lines and spends the joint part too. Speech only: no strike, no
  threat, no pose. Single player is unchanged.
- Marlow Yard A8: the duty officer has two joint lines (the request-to-exit button in the lobby; night two's grille stop,
  5 s every 40 s) and the flag `a8-joint`; the radio teaches it as A reaches the gallery ("Two of you, he might say more.").
- Wire-semantics change: a client's bluff is a `td` message with kind `bluff` (the field existed; protocol.ts is not
  edited), and an older host would take it as a takedown and seize the guard. The branch touches `src/net`, so the train
  bumps `PROTOCOL_VERSION` once.
