/** Inline SVG icons (no external assets). 24x24 viewBox, stroke = currentColor. */
const P: Record<string, string> = {
  fire: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  ads: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  reload: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  jump: '<path d="M5 14l7-7 7 7"/><path d="M5 20l7-7 7 7"/>',
  crouch: '<path d="M5 4l7 7 7-7"/><path d="M5 10l7 7 7-7"/><path d="M4 21h16"/>',
  swap: '<path d="M4 8h14l-4-4"/><path d="M20 16H6l4 4"/>',
  grenade: '<circle cx="11" cy="14" r="6"/><path d="M11 8V5h4l2 2"/><circle cx="18" cy="4" r="1.5"/>',
  dash: '<path d="M4 17l5-5-5-5"/><path d="M11 17l5-5-5-5"/><path d="M18 6v12"/>',
  noise: '<path d="M4 10v4"/><path d="M8 7v10"/><path d="M12 4v16"/><path d="M16 8v8"/><path d="M20 11v2"/>',
  cover: '<path d="M3 21V11h8v10"/><path d="M11 21V6h7v15"/><path d="M2 21h20"/><circle cx="6.5" cy="7" r="2"/>',
  interact: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6"/><path d="M11 11V4a1.5 1.5 0 0 1 3 0v7"/><path d="M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-3 7-7 7-3 0-5-2-6-4l-2-4a1.5 1.5 0 0 1 2.6-1.5L8 14"/>',
  goggles: '<circle cx="6.5" cy="13" r="3.2"/><circle cx="17.5" cy="13" r="3.2"/><circle cx="12" cy="7" r="2.6"/><path d="M9.7 13h4.6"/>',
  look: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><path d="M5.6 5.6l1.4 1.4M17 17l1.4 1.4"/>',
  shoulder: '<path d="M9 5L3 12l6 7"/><path d="M15 5l6 7-6 7"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  move: '<circle cx="12" cy="12" r="9"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0"/><path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/>',
  gun: '<path d="M3 9h15l2 2v2h-6l-1 2h-3l-1 4H5l1-4H3z"/>',
};

export function icon(name: keyof typeof P | string, size = 24): string {
  const body = P[name] ?? P.move!;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
