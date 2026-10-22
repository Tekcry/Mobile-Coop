# Load fixes: e2e-coop strike and offline
kind: patch
- Tests: e2e-coop's latent load failures fixed without weaker limits: the client elbow strike pins the host's guard on
  every host sim step (a fixedUpdate wrapper with a generation token, always ended), strikes in the client frame its
  pick is that guard within 6 s of its match clock, and waits for the knock-out on the host's clock; the denied strike
  is sent only once the client can strike and its start is asserted; the offline check waits for the service worker to
  control the page (120 s, a timeout fails) and gives its screens 30 s.
