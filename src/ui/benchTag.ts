/**
 * The benchmark's run tag (3.1.4): "Run 3/9 · without bloom · 52 fps" over the flight and the loading screen, so a
 * crash or a stutter can be put to a run. null removes it.
 */
export function benchTag(text: string | null): void {
  let el = document.getElementById('bench-tag');
  if (text === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = 'bench-tag';
    el.className = 'bench-tag';
    document.body.appendChild(el);
  }
  if (el.textContent !== text) el.textContent = text;
}
