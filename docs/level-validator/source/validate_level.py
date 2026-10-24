#!/usr/bin/env python3
"""Validate a stealth level JSON spec against the level design standard.

Usage: python validate_level.py level.json
Exit code 1 if any ERROR is found. No third-party dependencies.
"""
import json
import sys
from collections import defaultdict, deque

# Room size ranges in metres: (min_w, min_l, max_w, max_l). Width is the short side.
ROOM_CLASSES = {
    "private_office": (3, 4, 4, 5),
    "open_office": (10, 15, 30, 40),
    "meeting_room": (4, 6, 6, 10),
    "restroom": (3, 5, 6, 8),
    "break_room": (5, 6, 8, 10),
    "server_room": (6, 8, 15, 20),
    "security_room": (4, 5, 6, 8),
    "lobby": (10, 12, 25, 30),
    "warehouse": (25, 40, 60, 120),
    "loading_dock": (15, 20, 30, 40),
    "hotel_room": (4, 8, 5, 10),
    "corridor": (1.5, 3, 3, 80),
    "ship_corridor": (1.2, 3, 1.8, 60),
    "stair_core": (3, 5, 6, 8),
    "plant_room": (6, 8, 20, 30),
    "storage": (2, 3, 15, 25),
}

MIN_OPENINGS = {  # kind: (min_width, min_height)
    "door": (0.9, 2.0),
    "double_door": (1.8, 2.0),
    "corridor": (1.5, 2.2),
    "stairs": (1.2, 2.2),
    "vent": (0.9, 0.9),
    "crawlspace": (0.9, 0.9),
}

COOP_KINDS = {"coop_boost", "split_jump", "coop_rope"}
KNOWN_KINDS = set(MIN_OPENINGS) | COOP_KINDS | {
    "lift", "ledge", "pipe", "window", "ladder", "drop", "rappel", "zipline"}
ROUTE_TYPES = {"ground", "vertical", "utility", "aggressive"}
ONE_WAY_KINDS = {"drop", "rappel", "zipline"}

errors, warns = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warns.append(msg)


def build_graph(links, mode_filter):
    """Directed adjacency list: node -> list of (neighbour, link_index)."""
    adj = defaultdict(list)
    for i, l in enumerate(links):
        if not mode_filter(l):
            continue
        adj[l["from"]].append((l["to"], i))
        if not l.get("one_way", l.get("kind") in ONE_WAY_KINDS):
            adj[l["to"]].append((l["from"], i))
    return adj


def reachable(adj, start):
    seen, q = {start}, deque([start])
    while q:
        n = q.popleft()
        for m, _ in adj[n]:
            if m not in seen:
                seen.add(m)
                q.append(m)
    return seen


def edge_disjoint_paths(links, mode_filter, src, dst):
    """Max number of link-disjoint paths src->dst (unit-capacity max flow)."""
    cap = defaultdict(int)
    adj = defaultdict(set)
    for l in links:
        if not mode_filter(l):
            continue
        a, b = l["from"], l["to"]
        cap[(a, b)] += 1
        if not l.get("one_way", l.get("kind") in ONE_WAY_KINDS):
            cap[(b, a)] += 1
        adj[a].add(b)
        adj[b].add(a)
    flow = 0
    while True:
        parent = {src: None}
        q = deque([src])
        while q and dst not in parent:
            u = q.popleft()
            for v in adj[u]:
                if v not in parent and cap[(u, v)] > 0:
                    parent[v] = u
                    q.append(v)
        if dst not in parent:
            return flow
        v = dst
        while parent[v] is not None:
            u = parent[v]
            cap[(u, v)] -= 1
            cap[(v, u)] += 1
            v = u
        flow += 1


def main(path):
    with open(path) as f:
        lvl = json.load(f)

    meta = lvl.get("meta", {})
    spaces = lvl.get("spaces", [])
    links = lvl.get("links", [])
    mode = meta.get("mode", "campaign")
    players = meta.get("players", [1])
    has_coop = 2 in players
    has_solo = 1 in players

    # --- Structure ---
    ids = [s["id"] for s in spaces]
    sp = {s["id"]: s for s in spaces}
    if len(ids) != len(set(ids)):
        err("Duplicate space ids.")
    for i, l in enumerate(links):
        for end in ("from", "to"):
            if l.get(end) not in sp:
                err(f"Link {i} references unknown space '{l.get(end)}'.")
        if l.get("kind") not in KNOWN_KINDS:
            warn(f"Link {i} ({l.get('from')}->{l.get('to')}): unknown kind '{l.get('kind')}'.")
        if l.get("route") and l["route"] not in ROUTE_TYPES:
            warn(f"Link {i}: unknown route type '{l['route']}'.")
    if errors:
        return report()

    starts = [s["id"] for s in spaces if "start" in s.get("tags", [])]
    exfils = [s["id"] for s in spaces if "exfil" in s.get("tags", [])]
    if not starts:
        err("No space tagged 'start'.")
    if mode == "campaign" and not exfils:
        err("No space tagged 'exfil'.")
    if errors:
        return report()
    start = starts[0]

    solo_f = lambda l: l.get("solo", True)
    coop_f = lambda l: l.get("coop", True)
    any_f = lambda l: True

    # --- Dimensions ---
    for s in spaces:
        rc, size = s.get("room_class"), s.get("size")
        if not size or len(size) < 2:
            warn(f"{s['id']}: missing size [w, l, h].")
            continue
        w, l_ = sorted(size[:2])
        if rc in ROOM_CLASSES:
            mnw, mnl, mxw, mxl = ROOM_CLASSES[rc]
            if w < mnw or l_ < mnl:
                err(f"{s['id']}: {w}x{l_} m too small for {rc} (min {mnw}x{mnl}).")
            if w > mxw or l_ > mxl:
                warn(f"{s['id']}: {w}x{l_} m larger than typical {rc} (max {mxw}x{mxl}).")
        elif rc != "custom":
            warn(f"{s['id']}: room_class '{rc}' not in table; use a known class or 'custom'.")
        for v in size:
            if (v * 2) != int(v * 2):
                warn(f"{s['id']}: dimension {v} is off the 0.5 m grid.")
        if s.get("type") != "exterior" and len(size) > 2 and size[2] < 2.4:
            err(f"{s['id']}: ceiling {size[2]} m is below 2.4 m.")
    for i, l in enumerate(links):
        k = l.get("kind")
        if k in MIN_OPENINGS:
            mw, mh = MIN_OPENINGS[k]
            if l.get("width", mw) < mw or l.get("height", mh) < mh:
                err(f"Link {l['from']}->{l['to']} ({k}): opening "
                    f"{l.get('width')}x{l.get('height')} below {mw}x{mh}.")
        if k == "corridor" and l.get("width", 1.5) > 3.0:
            warn(f"Link {l['from']}->{l['to']}: corridor wider than 3 m.")

    # --- Reachability ---
    all_adj = build_graph(links, any_f)
    unreached = set(ids) - reachable(all_adj, start)
    if unreached:
        err(f"Unreachable from start: {sorted(unreached)}.")

    must = [s["id"] for s in spaces
            if {"objective_primary", "exfil"} & set(s.get("tags", []))]
    if has_solo:
        solo_reach = reachable(build_graph(links, solo_f), start)
        missing = [m for m in must if m not in solo_reach]
        if missing:
            err(f"Solo cannot reach {missing} (co-op-only link on critical path without fallback).")
        for o in [m for m in must if m not in exfils]:
            back = reachable(build_graph(links, solo_f), o)
            if exfils and not any(e in back for e in exfils):
                err(f"Solo cannot reach exfil from objective '{o}'.")
    if has_coop:
        coop_reach = reachable(build_graph(links, coop_f), start)
        missing = [m for m in must if m not in coop_reach]
        if missing:
            err(f"Co-op cannot reach {missing}.")

    # --- Degree, dead ends, rule of three ---
    deg = defaultdict(int)
    routes = defaultdict(set)
    for l in links:
        for a in (l["from"], l["to"]):
            deg[a] += 1
            if l.get("route"):
                routes[a].add(l["route"])
    for s in spaces:
        sid, tags = s["id"], set(s.get("tags", []))
        if mode == "deniable_ops" and deg[sid] < 2:
            err(f"{sid}: arena spaces need 2+ connections (no dead ends).")
        elif deg[sid] == 1 and not ({"reward", "start", "exfil", "objective_secondary"} & tags) \
                and s.get("type") != "reward":
            err(f"{sid}: dead end with no reward tag.")
        if s.get("type") == "encounter":
            if deg[sid] < 3:
                err(f"{sid}: encounter has {deg[sid]} approaches (rule of three needs 3+).")
            if len(routes[sid]) < 2:
                err(f"{sid}: encounter approaches use {len(routes[sid])} route type(s); need 2+.")
            sh = s.get("shadow_pct")
            if sh is None:
                warn(f"{sid}: no shadow_pct.")
            elif not 0.4 <= sh <= 0.6:
                warn(f"{sid}: shadow_pct {sh} outside 0.4-0.6.")
            g = s.get("guards", {})
            for k_, v in (g.items() if isinstance(g, dict) else [("solo", g)]):
                if v > 10:
                    err(f"{sid}: {v} {k_} guards exceeds 10.")
                if v < 2:
                    warn(f"{sid}: only {v} {k_} guard(s) in an encounter space.")
            if has_coop and isinstance(g, dict) and g.get("coop", 0) <= g.get("solo", 0):
                warn(f"{sid}: co-op guard count does not scale above solo.")

    # --- Redundancy ---
    targets = [m for m in must if m != start]
    for t in targets:
        n = edge_disjoint_paths(links, solo_f if has_solo else coop_f, start, t)
        if n < 2:
            warn(f"Only {n} independent route(s) from start to '{t}'; aim for 2+.")
    if mode == "deniable_ops":
        for i in range(len(links)):
            rest = links[:i] + links[i + 1:]
            if len(reachable(build_graph(rest, any_f), start)) < len(ids):
                err(f"Link {links[i]['from']}->{links[i]['to']} is a bridge; arena must be loops.")

    # --- Co-op coverage and splits ---
    if has_coop and mode == "campaign":
        enc = [s["id"] for s in spaces if s.get("type") == "encounter"]
        with_coop = {l["from"] for l in links if l.get("kind") in COOP_KINDS} | \
                    {l["to"] for l in links if l.get("kind") in COOP_KINDS}
        covered = [e for e in enc if e in with_coop]
        if enc and len(covered) < len(enc) / 2:
            err(f"Co-op routes in {len(covered)}/{len(enc)} encounters; need at least half.")
        for l in links:
            if l.get("kind") in COOP_KINDS and l.get("solo", False):
                warn(f"{l['from']}->{l['to']}: co-op kind marked solo:true; check intent.")
        a = sum(sp[x].get("size", [0, 0])[1] for x in ids if "split_a" in sp[x].get("tags", []))
        b = sum(sp[x].get("size", [0, 0])[1] for x in ids if "split_b" in sp[x].get("tags", []))
        if a and b and abs(a - b) / max(a, b) > 0.2:
            warn(f"Split paths differ by more than 20% in length ({a} m vs {b} m).")
        if (a or b) and not any("coop_overwatch" in s.get("tags", []) for s in spaces):
            warn("Split section has no space tagged coop_overwatch.")

    # --- Pacing ---
    beats = meta.get("beats", [])
    run = 0
    for i, b in enumerate(beats):
        run = run + 1 if b >= 4 else 0
        if run >= 3:
            err(f"Beat chart: 3+ high-intensity beats in a row ending at index {i}.")
            break
    if beats and beats[0] > 2:
        warn("Beat chart should open low (1-2).")

    return report()


def report():
    for e in errors:
        print(f"ERROR: {e}")
    for w in warns:
        print(f"WARN:  {w}")
    print(f"\n{len(errors)} error(s), {len(warns)} warning(s).")
    return 1 if errors else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
