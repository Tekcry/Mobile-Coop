# Co-op dual takedown counted for section-rating
- Co-op host: a dual takedown (two players' takedowns within 1.5 s) is now counted in `StealthRating.duals` and emitted as a
  `dualTakedown` event, as the input for section-rating's "synced takedowns reward more than shooting". It no longer adds a
  knockout of its own. The banner and the wire are unchanged.
