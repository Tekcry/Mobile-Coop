# Co-op over the internet: relay, connection readout, no public room list
kind: minor
- Co-op connects across home networks: when two players' networks cannot reach each other directly (strict routers,
  a VPN, a phone hotspot, a firewall), the game now goes through a relay server (TURN, a free plan) instead of failing.
  A direct link is still tried first.
- The co-op lobby and the pause menu show the connection: "Connecting...", "Connected - direct, 45 ms",
  "Connected - via relay, 120 ms" or "Failed - ..." with the reason.
- A join that cannot work now says why, in plain words, instead of "No host found" after a long wait: no network path
  to the partner (shown at once, with what to try), nobody answered in that room (check the code), the room is full, or
  the two players run different game versions (both reload). A different version used to fail silently: the joiner
  sat in the host's lobby and the host never saw them. Co-op protocol 91.
- Co-op > Connection log lists this device's connection attempts (direct or via relay, how long each took, why any
  failed) with a count, so failed joins can be reported.
- The public room list (Co-op > Browse rooms and the lobby's Room: Public / Private) is gone: a room is joined by its
  code or the host's invite link.
- The joiner waits up to 25 s for the host (was 15 s), as a relayed link can take a little longer to set up.
