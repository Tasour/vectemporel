/* Composants partagés de l'interface Vectemporel.
 * Pur DOM, aucun état, aucun CSS injecté : les classes sont stylées dans
 * styles.css / tokens.css. Tout texte passe par textContent. */

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function kicker(text) {
  return el('div', 'view-kicker', text);
}

export function badge(text, kind = '') {
  const node = el('span', `ui-badge${kind ? ` is-${kind}` : ''}`, text);
  node.dataset.uiBadge = kind || 'neutral';
  return node;
}

export function metric(label, value, hint = '') {
  const node = el('div', 'ui-metric');
  node.append(el('span', 'ui-metric-label', label), el('strong', 'ui-metric-value', String(value)));
  if (hint) node.appendChild(el('span', 'ui-metric-hint', hint));
  return node;
}

export function metrics(items) {
  const node = el('div', 'ui-metrics');
  for (const item of items) node.appendChild(metric(item.label, item.value, item.hint));
  return node;
}

export function panel({ title, subtitle = '', level = 'h2', children = [], id = '' }) {
  const node = el('section', 'ui-panel');
  if (id) node.id = id;
  node.appendChild(el(level, 'ui-panel-title', title));
  if (subtitle) node.appendChild(el('p', 'ui-panel-subtitle', subtitle));
  for (const child of children) node.appendChild(child);
  return node;
}

export function empty(text, id = '') {
  const node = el('p', 'ui-empty', text);
  if (id) node.id = id;
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  return node;
}

export function toolbar(children = [], label = 'Outils de la vue') {
  const node = el('div', 'ui-toolbar');
  node.setAttribute('role', 'toolbar');
  node.setAttribute('aria-label', label);
  for (const child of children) node.appendChild(child);
  return node;
}

export function figure({ src, alt, caption = '', credit = '', license = '' }) {
  const node = el('figure', 'ui-figure');
  const image = el('img');
  image.src = src;
  image.alt = alt;
  image.loading = 'lazy';
  node.appendChild(image);
  const parts = [caption, credit ? `© ${credit}` : '', license].filter(Boolean);
  if (parts.length) node.appendChild(el('figcaption', 'ui-figure-caption', parts.join(' · ')));
  return node;
}

export function tabs(items, activeId, onSelect) {
  const node = el('div', 'ui-tabs');
  node.setAttribute('role', 'tablist');
  for (const item of items) {
    const button = el('button', 'ui-tab', item.label);
    button.type = 'button';
    button.id = `ui-tab-${item.id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(item.id === activeId));
    button.setAttribute('aria-controls', item.panelId);
    button.tabIndex = item.id === activeId ? 0 : -1;
    button.addEventListener('click', () => onSelect?.(item.id));
    node.appendChild(button);
  }
  return node;
}
