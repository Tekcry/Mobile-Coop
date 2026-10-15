"""2D garment patterns: panels with named corners, seams between corner-to-corner runs, panel meshing, and the
pattern-space -> 3D surface lookup used to place stitches, patches and hardware after the cloth simulation.

Pattern space is metres on the flat fabric, viewed from the outside of the garment (x right, y up). The UV layer of
every garment mesh is its pattern space, so procedural materials follow the fabric grain.
"""
import math

import numpy as np
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt


def bezier(p0, p1, p2, n=24):
    """Quadratic Bezier polyline from p0 to p2 (p1 the control point)."""
    t = np.linspace(0.0, 1.0, n)[:, None]
    p0, p1, p2 = (np.asarray(p, dtype=np.float64) for p in (p0, p1, p2))
    return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2


def polyline_length(pts):
    return float(np.linalg.norm(np.diff(pts, axis=0), axis=1).sum())


def resample(pts, n):
    """n + 1 points at equal arc length along a polyline (endpoints kept)."""
    pts = np.asarray(pts, dtype=np.float64)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    targets = np.linspace(0.0, cum[-1], n + 1)
    out = np.empty((n + 1, 2))
    for k in range(2):
        out[:, k] = np.interp(targets, cum, pts[:, k])
    return out


class Panel:
    """A closed outline (counter-clockwise from outside) made of edges between named corners.

    `edges` is a list of (corner_name, polyline) where the polyline runs from that corner to the next corner in the
    list (its last point is the next corner's position).
    """

    def __init__(self, name, material, edges, grain=(0.0, 1.0)):
        self.name = name
        self.material = material
        self.edges = edges
        self.grain = grain
        self.corners = [c for c, _ in edges]
        self.corner_pos = {c: np.asarray(pl[0], dtype=np.float64) for c, pl in edges}

    def run(self, a, b):
        """Polyline from corner a to corner b along the outline, the shorter way round (forward or backward)."""
        n = len(self.corners)
        ia, ib = self.corners.index(a), self.corners.index(b)
        fwd = (ib - ia) % n
        bwd = (ia - ib) % n
        if fwd <= bwd:
            pts = [np.asarray(self.edges[(ia + k) % n][1]) for k in range(fwd)]
            pl = np.concatenate([p[:-1] for p in pts] + [pts[-1][-1:]])
            return pl, [(ia + k) % n for k in range(fwd)], True
        pts = [np.asarray(self.edges[(ib + k) % n][1]) for k in range(bwd)]
        pl = np.concatenate([p[:-1] for p in pts] + [pts[-1][-1:]])
        return pl[::-1].copy(), [(ib + k) % n for k in range(bwd)], False

    def area(self):
        pts = np.concatenate([np.asarray(pl)[:-1] for _, pl in self.edges])
        x, y = pts[:, 0], pts[:, 1]
        return 0.5 * float(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


class Pattern:
    def __init__(self, panels, seams, h):
        """seams: list of (name, (panelA, a0, a1), (panelB, b0, b1), style); a0 meets b0, a1 meets b1."""
        self.panels = {p.name: p for p in panels}
        self.seams = seams
        self.h = h

    def mesh(self):
        """Mesh every panel. Returns verts2d (pattern coords), panel id per vertex, triangles, seam vertex pairs
        and, per seam, the ordered vertex lists of both sides (for stitches)."""
        h = self.h
        # 1. Sample every outline edge. Seam runs get the same count on both sides; free edges sample at h.
        edge_samples = {}  # (panel, edge index) -> polyline samples (forward direction)
        seam_runs = []
        for name, (pa, a0, a1), (pb, b0, b1), style in self.seams:
            A, B = self.panels[pa], self.panels[pb]
            la, ea, fa = A.run(a0, a1)
            lb, eb, fb = B.run(b0, b1)
            n = max(2, int(math.ceil(max(polyline_length(la), polyline_length(lb)) / h)))
            ra, rb = resample(la, n), resample(lb, n)
            seam_runs.append((name, pa, ra, pb, rb, style))
            for panel, r, edges, fwd in ((A, ra, ea, fa), (B, rb, eb, fb)):
                # Split the run's samples back onto its outline edges (a reversed view: corner snaps write through).
                self._assign(panel, edges, r if fwd else r[::-1], edge_samples)
        for p in self.panels.values():
            for i, (_, pl) in enumerate(p.edges):
                if (p.name, i) not in edge_samples:
                    n = max(1, int(math.ceil(polyline_length(pl) / h)))
                    edge_samples[(p.name, i)] = resample(pl, n)

        verts, panel_of, tris = [], [], []
        boundary_index = {}  # (panel, rounded x, rounded y) -> vertex index
        for p in self.panels.values():
            outline = []
            for i in range(len(p.edges)):
                outline.extend(edge_samples[(p.name, i)][:-1].tolist())
            outline = np.array(outline)
            interior = self._lattice(outline, h)
            pts2 = np.concatenate([outline, interior]) if len(interior) else outline
            nb = len(outline)
            cdt = delaunay_2d_cdt([Vector(q) for q in pts2.tolist()], [], [list(range(nb))], 1, 1e-7)
            out_v, _, out_f, orig_v = cdt[0], cdt[1], cdt[2], cdt[3]
            base = len(verts)
            for k, v in enumerate(out_v):
                verts.append((v.x, v.y))
                panel_of.append(p.name)
                for o in orig_v[k]:
                    if o < nb:
                        boundary_index[(p.name, round(outline[o][0], 6), round(outline[o][1], 6))] = base + k
            for f in out_f:
                tris.append([base + i for i in f])
        verts = np.array(verts)

        def vid(panel, q):
            return boundary_index[(panel, round(q[0], 6), round(q[1], 6))]

        pairs, seam_lines = [], []
        for name, pa, sa, pb, sb, style in seam_runs:
            ia = [self._nearest_boundary(boundary_index, pa, q) for q in sa]
            ib = [self._nearest_boundary(boundary_index, pb, q) for q in sb]
            pairs.extend(zip(ia, ib))
            seam_lines.append({'name': name, 'style': style, 'a': (pa, ia), 'b': (pb, ib)})
        return verts, panel_of, tris, pairs, seam_lines

    @staticmethod
    def _nearest_boundary(index, panel, q):
        best, bd = None, 1e9
        for (pn, x, y), v in index.items():
            if pn != panel:
                continue
            d = (x - q[0]) ** 2 + (y - q[1]) ** 2
            if d < bd:
                best, bd = v, d
        if bd > 1e-8:
            raise RuntimeError(f'seam sample off the {panel} outline by {math.sqrt(bd):.2e} m')
        return best

    @staticmethod
    def _assign(panel, edges, pts, edge_samples):
        """Distribute run samples over the outline edges the run covers (forward order)."""
        if len(edges) == 1:
            key = (panel.name, edges[0])
            edge_samples[key] = pts
            return
        # Find the corner positions inside the run and split there (snapping the nearest sample to the corner).
        start = 0
        for k, e in enumerate(edges):
            if k == len(edges) - 1:
                seg = pts[start:]
            else:
                corner = np.asarray(panel.edges[edges[k + 1]][1][0])
                j = start + 1 + int(np.argmin(np.linalg.norm(pts[start + 1:-1] - corner, axis=1)))
                pts[j] = corner
                seg = pts[start:j + 1]
                start = j
            edge_samples[(panel.name, e)] = seg

    @staticmethod
    def _lattice(outline, h):
        """Hexagonal lattice points inside the outline, at least 0.6 h from it."""
        lo, hi = outline.min(axis=0), outline.max(axis=0)
        pts = []
        dy = h * math.sqrt(3) / 2
        row = 0
        y = lo[1] + dy / 2
        while y < hi[1]:
            x = lo[0] + (h / 2 if row % 2 else 0.0) + h / 2
            while x < hi[0]:
                pts.append((x, y))
                x += h
            y += dy
            row += 1
        pts = np.array(pts)
        if not len(pts):
            return pts
        inside = _points_in_polygon(pts, outline)
        pts = pts[inside]
        d = _distance_to_polyline(pts, np.concatenate([outline, outline[:1]]))
        return pts[d > 0.6 * h]


def rounded_rect(c, size, r, n=6, angle=0.0, pivot=None):
    """Rounded rectangle outline (counter-clockwise) centred at c, rotated by angle degrees about pivot (default c)."""
    cx, cy = c
    w, h = size[0] / 2, size[1] / 2
    pts = []
    for (sx, sy), a0 in (((1, -1), -90), ((1, 1), 0), ((-1, 1), 90), ((-1, -1), 180)):
        ccx, ccy = cx + sx * (w - r), cy + sy * (h - r)
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append((ccx + r * math.cos(a), ccy + r * math.sin(a)))
    pts = np.array(pts)
    if angle:
        pv = np.asarray(pivot if pivot is not None else c, dtype=np.float64)
        ca, sa = math.cos(math.radians(angle)), math.sin(math.radians(angle))
        pts = (pts - pv) @ np.array([[ca, sa], [-sa, ca]]) + pv
    return pts


def _points_in_polygon(pts, poly):
    x, y = pts[:, 0][:, None], pts[:, 1][:, None]
    x0, y0 = poly[:, 0][None, :], poly[:, 1][None, :]
    x1, y1 = np.roll(poly[:, 0], -1)[None, :], np.roll(poly[:, 1], -1)[None, :]
    cond = (y0 > y) != (y1 > y)
    xin = (x1 - x0) * (y - y0) / np.where(y1 - y0 == 0, 1e-12, y1 - y0) + x0
    return (cond & (x < xin)).sum(axis=1) % 2 == 1


def _distance_to_polyline(pts, pl):
    a, b = pl[:-1][None, :, :], pl[1:][None, :, :]
    p = pts[:, None, :]
    ab = b - a
    t = np.clip(((p - a) * ab).sum(-1) / np.maximum((ab * ab).sum(-1), 1e-12), 0.0, 1.0)
    q = a + t[..., None] * ab
    return np.linalg.norm(p - q, axis=-1).min(axis=1)


distance_to_polyline = _distance_to_polyline
points_in_polygon = _points_in_polygon


class SurfaceLookup:
    """Maps (panel, pattern point) to a 3D surface: position and normal, by barycentric lookup in the triangles of
    that panel in pattern space. tri_uv (T, 3, 2), tri_panel (T,), tri_v (T, 3) vertex indices, co / normals (V, 3)."""

    def __init__(self, tri_uv, tri_panel, tri_v, co, normals, cell=0.01):
        self.tri_uv, self.tri_v, self.co, self.n = tri_uv, tri_v, co, normals
        self.cell = cell
        self.grid = {}
        lo = np.floor(tri_uv.min(axis=1) / cell).astype(int)
        hi = np.floor(tri_uv.max(axis=1) / cell).astype(int)
        for t in range(len(tri_uv)):
            pn = tri_panel[t]
            for i in range(lo[t, 0], hi[t, 0] + 1):
                for j in range(lo[t, 1], hi[t, 1] + 1):
                    self.grid.setdefault((pn, i, j), []).append(t)

    def __call__(self, panel, q):
        q = np.asarray(q, dtype=np.float64)
        i, j = int(math.floor(q[0] / self.cell)), int(math.floor(q[1] / self.cell))
        best = None
        for t in self.grid.get((panel, i, j), ()):
            a, b, c = self.tri_uv[t]
            v0, v1, v2 = b - a, c - a, q - a
            den = v0[0] * v1[1] - v1[0] * v0[1]
            if abs(den) < 1e-16:
                continue
            l1 = (v2[0] * v1[1] - v1[0] * v2[1]) / den
            l2 = (v0[0] * v2[1] - v2[0] * v0[1]) / den
            l0 = 1 - l1 - l2
            mn = min(l0, l1, l2)
            if best is None or mn > best[0]:
                best = (mn, t, (l0, l1, l2))
            if mn >= -1e-9:
                break
        if best is None or best[0] < -0.5:
            return None
        _, t, (l0, l1, l2) = best
        tv = self.tri_v[t]
        p = l0 * self.co[tv[0]] + l1 * self.co[tv[1]] + l2 * self.co[tv[2]]
        n = l0 * self.n[tv[0]] + l1 * self.n[tv[1]] + l2 * self.n[tv[2]]
        return p, n / max(np.linalg.norm(n), 1e-12)
