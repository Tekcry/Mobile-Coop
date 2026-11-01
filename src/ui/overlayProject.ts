/**
 * (anim-studio) Project a world point to the pixels of a 2D overlay canvas over the game canvas, through the rendered
 * camera (a FreeCamera: its position, Euler yaw / pitch and vertical FOV; the shake's roll ignored), never Babylon's
 * view matrices (which must not be read before the render: the TAA ghost rule). Shared by the tuner's barrel marker and
 * the chamber's viewing aids. Pure, no allocation.
 */
export interface OverlayCam {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  fov: number;
  minZ: number;
}

/** `out.x` / `out.y`: overlay pixels (W x H); `out.z`: the view depth (m; at or below the near plane: behind). */
export function projectPoint(cam: OverlayCam, px: number, py: number, pz: number, W: number, H: number, out: { x: number; y: number; z: number }): void {
  const dx = px - cam.position.x;
  const dy = py - cam.position.y;
  const dz = pz - cam.position.z;
  const ya = cam.rotation.y;
  const xa = cam.rotation.x;
  const sy = Math.sin(ya);
  const cy = Math.cos(ya);
  const sx = Math.sin(xa);
  const cx = Math.cos(xa);
  // forward (sy cx, -sx, cy cx), right (cy, 0, -sy), up (sy sx, cx, cy sx)
  const z = dx * sy * cx - dy * sx + dz * cy * cx;
  const x = dx * cy - dz * sy;
  const y = dx * sy * sx + dy * cx + dz * cy * sx;
  const t = Math.tan(cam.fov / 2);
  const asp = W / Math.max(1, H);
  const zz = Math.max(1e-4, z);
  out.x = (x / (zz * t * asp) + 1) * 0.5 * W;
  out.y = (1 - y / (zz * t)) * 0.5 * H;
  out.z = z;
}
