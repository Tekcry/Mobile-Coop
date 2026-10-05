type Child = Node | string | number | null | undefined | false;

export interface HProps {
  class?: string;
  id?: string;
  text?: string;
  html?: string;
  title?: string;
  /** Marks the element focusable by FocusNav. */
  focus?: boolean;
  data?: Record<string, string>;
  style?: Partial<CSSStyleDeclaration>;
  attrs?: Record<string, string>;
  onClick?: (e: MouseEvent) => void;
}

/** Tiny DOM builder. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: HProps = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.id) el.id = props.id;
  if (props.title) el.title = props.title;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.html !== undefined) el.innerHTML = props.html;
  if (props.focus) el.dataset.focus = '';
  if (props.data) for (const [k, v] of Object.entries(props.data)) el.dataset[k] = v;
  if (props.style) Object.assign(el.style, props.style);
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  if (props.onClick) el.addEventListener('click', props.onClick as EventListener);
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c);
  }
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
