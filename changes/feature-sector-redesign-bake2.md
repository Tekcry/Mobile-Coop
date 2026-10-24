# Saltmarsh Park section bake hardening
kind: patch
- Saltmarsh Park's per-section lamp bake is sturdier: a lamp whose bake fails is retried once on the worker pool, then
  on the main thread only while no worker job runs (one lamp per task, so frames keep running), and a job stuck past
  60 s counts as failed instead of hanging the load. A failed lamp is never cached, so the next load bakes it again. A
  failed map load no longer leaks bake workers, finished batches no longer re-upload the whole light atlas, and lamps
  of the live section jump to the front of the queue. Picture, light meter and guards read the same light as before.
