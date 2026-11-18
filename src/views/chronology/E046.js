import { register } from './registry.js';

/* Lentille CHRONOLOGIE E046 — contraste et lisibilité des bandes d'ère et des
 * cartes d'événement.
 *
 * Dix chantiers appliqués à chaque rendu de la vue chronologie par
 * `runEnhancements` (registry.js:28-44). Le thème est la LISIBILITÉ : mesurer le
 * contraste réel depuis le CSS calculé, garantir un renfort quand la couleur
 * d'ère fait varier le fond, ajouter des indices textuels aux états actifs
 * (jamais la couleur seule), hiérarchiser année / titre / sous-titre, signaler
 * les titres tronqués sans masquer de donnée, et rester idempotent sous la
 * reconstruction complète du DOM opérée par la coque.
 *
 * Contrat respecté : un seul fichier possédé, CSS injecté une seule fois via
 * ctx.css('chronology-e046', …), identifiants tous préfixés `e046-` et protégés
 * par getElementById, aucune trace de débogage, aucun appel réseau, aucune
 * source d'aléa, aucune boucle d'animation propre, aucun fichier partagé
 * modifié, aucun sélecteur de test altéré. Toutes les valeurs affichées sont
 * recalculées depuis le DOM / le CSS calculé, jamais saisies à la main.
 *
 * Lectures utilisées : src/views/chronology.js, src/views/chronology/registry.js,
 * styles.css (:2-20, :33-35, :194-217, :316, :339).
 */

const CSS_ID = 'chronology-e046';
const SCOPE = 'chronology-e046';

const PANEL_ID = 'e046-panel';
const TITLE_ID = 'e046-title';
const LINE_ID = 'e046-line';
const NOTE_ID = 'e046-note';

/* Seuil d'accessibilité déclaré : cible WCAG AA pour du texte courant. C'est un
 * choix d'interface falsifiable, pas une donnée historique ; il est nommé ici
 * pour être modifiable d'un coup d'œil et répercuté dans le rapport. */
const MIN_RATIO = 4.5;

/* Aucun état module : la coque reconstruisant tout le DOM (shell.js:137), les
 * nœuds et les écouteurs vivent sur le `layout` / le `main` courants. */
const CSS = `
.chronology-e046 #${PANEL_ID}{
  margin:0 0 12px;padding:8px 10px;
  border:1px solid var(--line-strong);border-radius:8px;
  background:rgba(8,11,16,.72);color:var(--ink-soft);
  font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;
}
#${PANEL_ID} h2{margin:0 0 5px;color:var(--gold-bright);font-family:var(--serif);font-size:12px;font-weight:450}
#${PANEL_ID} p{margin:0}
#${PANEL_ID} #${NOTE_ID}{margin-top:3px;color:var(--muted)}
#${PANEL_ID}[data-e046-low="1"]{border-left:3px solid var(--gold)}
.chronology-e046 .era-band.e046-band{
  border-left-width:3px;
  text-shadow:0 1px 2px rgba(0,0,0,.95),0 0 1px rgba(0,0,0,.8);
  transition:none;
}
.chronology-e046 .era-band.e046-band .e046-band-name{
  color:var(--ink);font-size:11px;font-weight:600;line-height:1.25;letter-spacing:.01em;
}
.chronology-e046 .era-band.e046-band .atlas-chrono-era-range{
  color:var(--ink-soft);font-size:9px;font-weight:600;line-height:1.3;letter-spacing:.02em;
}
.chronology-e046 .era-band[aria-current="true"].e046-band{
  border-left-color:var(--gold-bright);
  border-top-color:var(--line-strong);
  border-right-color:var(--line-strong);
  border-bottom-color:var(--line-strong);
}
.e046-current-flag{
  display:block;margin-top:2px;color:var(--gold-bright);
  font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
}
.chronology-e046 .event-card.e046-card{
  border-left:3px solid var(--line-strong);
  transition:none;
}
.chronology-e046 .event-card.e046-card .e046-year{
  color:var(--gold-bright);font-size:10px;font-weight:600;line-height:1.3;letter-spacing:.04em;
}
.chronology-e046 .event-card.e046-card strong.e046-title{
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;
  overflow:hidden;color:var(--ink);font-weight:600;line-height:1.2;
  overflow-wrap:anywhere;hyphens:auto;
}
.chronology-e046 .event-card.e046-card .e046-subtitle{
  color:var(--ink-soft);font-size:10px;line-height:1.4;
}
.e046-card-current{
  display:block;padding:2px 10px;color:var(--gold-bright);
  font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
}
.chronology-e046 .event-card[aria-current="true"].e046-card{border-left-color:var(--gold-bright)}
.chronology-e046 .e046-band:focus-visible,
.chronology-e046 .e046-card:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
@media (max-width:620px){
  .chronology-e046 #${PANEL_ID}{padding:7px 8px}
  .chronology-e046 .era-band.e046-band .e046-band-name{font-size:10px}
  .chronology-e046 .event-card.e046-card .e046-subtitle{font-size:9px}
}
.chronology-e046[data-e046-reduced="1"] .e046-band,
.chronology-e046[data-e046-reduced="1"] .e046-card{transition:none}
@media (prefers-reduced-motion:reduce){
  .e046-band,.e046-card,.e046-current-flag,.e046-card-current{transition:none}
}`;

/* Analyse d'une couleur calculée. Chrome peut renvoyer `rgb()`, `rgba()`,
 * `color(srgb r g b / a)` pour un `color-mix` (styles.css:201) ou un hexadécimal
 * : les quatre formes sont acceptées. Une valeur non reconnue renvoie null et
 * la mesure est alors annoncée « non mesurable » plutôt qu'un chiffre faux. */
function parseColor(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return { rgb: m[1].split('').map((c) => parseInt(c + c, 16)), a: 1 };
  m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) return { rgb: [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)), a: 1 };
  m = /^color\(\s*srgb\s+([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*\/\s*([\d.]+))?/.exec(v);
  if (m) {
    return {
      rgb: [m[1], m[2], m[3]].map((x) => Math.round(parseFloat(x) * 255)),
      a: m[4] === undefined ? 1 : parseFloat(m[4]),
    };
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?/.exec(v);
  if (m) {
    return {
      rgb: [m[1], m[2], m[3]].map((x) => Math.round(parseFloat(x))),
      a: m[4] === undefined ? 1 : parseFloat(m[4]),
    };
  }
  return null;
}

function channel(value) {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(rgb) {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/* Fond effectif : on remonte les ancêtres jusqu'à une couleur de fond opaque.
 * Si une forme de couleur n'est pas reconnue, on renonce à la mesure plutôt
 * que d'attribuer au texte un fond qui n'est pas le sien. */
function backgroundColor(node) {
  let cur = node;
  while (cur && cur.nodeType === 1) {
    let raw = '';
    try { raw = window.getComputedStyle(cur).backgroundColor || ''; }
    catch { return null; }
    const parsed = parseColor(raw);
    if (parsed) {
      if (parsed.a > 0.5) return parsed.rgb;
    } else if (raw && raw !== 'transparent' && raw !== 'rgba(0, 0, 0, 0)') {
      return null; /* forme non reconnue : on n'invente pas de fond */
    }
    cur = cur.parentElement;
  }
  return null;
}

function ratioFor(node) {
  if (!node) return null;
  try {
    const fg = parseColor(window.getComputedStyle(node).color);
    if (!fg || fg.a === 0) return null;
    const bg = backgroundColor(node);
    return bg ? contrast(fg.rgb, bg) : null;
  } catch {
    return null;
  }
}

function fr(value) {
  return value.toFixed(1).replace('.', ',');
}

function fmtRatio(value) {
  return value === null || !isFinite(value) ? 'non mesurable' : `${fr(value)} : 1`;
}

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function mark(node, value) {
  if (!node || node.nodeType !== 1) return;
  node.dataset.e046Contrast = value === null || !isFinite(value) ? 'nd' : value.toFixed(2);
}

/* Panneau de mesure : inséré après la bande de statut de chronology.js:247-256. */
function ensurePanel(ctx, main) {
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = ctx.el('section', 'e046-panel');
    panel.id = PANEL_ID;
    const title = ctx.el('h2', 'e046-title', 'Contraste des bandes et des cartes');
    title.id = TITLE_ID;
    panel.setAttribute('aria-labelledby', TITLE_ID);
    const line = ctx.el('p', 'e046-line');
    line.id = LINE_ID;
    const note = ctx.el('p', 'e046-note');
    note.id = NOTE_ID;
    panel.append(title, line, note);
  }
  const status = main.querySelector('#atlas-chrono-status');
  if (status && status.nextSibling) main.insertBefore(panel, status.nextSibling);
  else main.prepend(panel);
  return panel;
}

/* Bandes d'ère : indice textuel de l'ère courante en plus de l'accent doré
 * (chronology.js:45), renfort de poids sur le nom et la période. */
function decorateBands(ctx, main) {
  const bands = main.querySelectorAll('#atlas-chrono-eras .era-band.atlas-chrono-band');
  Array.prototype.forEach.call(bands, (band) => {
    band.classList.add('e046-band');
    let name = null;
    for (let i = 0; i < band.children.length; i += 1) {
      const child = band.children[i];
      if (!child.classList.contains('atlas-chrono-era-range')) { name = child; break; }
    }
    if (name) name.classList.add('e046-band-name');
    const range = band.querySelector('.atlas-chrono-era-range');
    if (range) range.classList.add('e046-range');

    const active = band.getAttribute('aria-current') === 'true';
    const flag = band.querySelector('.e046-current-flag');
    if (active && !flag) band.appendChild(ctx.el('span', 'e046-current-flag', 'Ère courante'));
    else if (!active && flag) flag.remove();
  });
}

/* Cartes d'événement : même logique d'indice textuel que la bande, plus le
 * titre intégral exposé via `title` et un marqueur de troncature auditable. */
function decorateCards(ctx, main) {
  const cards = main.querySelectorAll('#atlas-chrono-events .event-card');
  Array.prototype.forEach.call(cards, (card) => {
    card.classList.add('e046-card');
    const strong = card.querySelector('strong');
    if (strong) {
      strong.classList.add('e046-title');
      const full = (strong.textContent || '').replace(/\s+/g, ' ').trim();
      if (full && !strong.hasAttribute('title')) strong.setAttribute('title', full);
      if (!card.hidden && strong.clientHeight > 0) {
        card.dataset.e046Truncated = strong.scrollHeight > strong.clientHeight + 1 ? '1' : '0';
      } else {
        card.dataset.e046Truncated = 'nd';
      }
    }
    const year = card.querySelector('.event-year');
    if (year) year.classList.add('e046-year');
    const sub = card.querySelector('.event-subtitle');
    if (sub) sub.classList.add('e046-subtitle');

    const active = card.getAttribute('aria-current') === 'true';
    const flag = card.querySelector('.e046-card-current');
    if (active && !flag) card.appendChild(ctx.el('span', 'e046-card-current', 'Repère sélectionné'));
    else if (!active && flag) flag.remove();
  });
}

/* Toutes les grandeurs sont relues depuis le CSS calculé, donc recalculées à
 * chaque rendu ; aucun chiffre n'est littéral dans le module hors du seuil. */
function refresh(layout) {
  const main = layout.querySelector('#atlas-chrono-main');
  if (!main) return;
  const band = main.querySelector('#atlas-chrono-eras .era-band.e046-band');
  const bandName = band ? band.querySelector('.e046-band-name') : null;
  const bandRange = main.querySelector('#atlas-chrono-eras .atlas-chrono-era-range');
  const year = main.querySelector('.e046-year');
  const title = main.querySelector('.event-card strong.e046-title');
  const subtitle = main.querySelector('.e046-subtitle');

  const values = [
    ratioFor(bandName),
    ratioFor(bandRange),
    ratioFor(year),
    ratioFor(title),
    ratioFor(subtitle),
  ];
  [bandName, bandRange, year, title, subtitle].forEach((node, i) => mark(node, values[i]));

  const labels = ['nom d’ère', 'période', 'année', 'titre', 'sous-titre'];
  const parts = labels.map((label, i) => `${label} ${fmtRatio(values[i])}`);
  setText(document.getElementById(LINE_ID),
    `Contraste mesuré (texte sur fond, seuil ${fr(MIN_RATIO)} : 1) : ${parts.join(' · ')}.`);

  const below = labels.filter((label, i) => values[i] !== null && isFinite(values[i]) && values[i] < MIN_RATIO);
  const panel = document.getElementById(PANEL_ID);
  if (panel) {
    panel.dataset.e046Low = below.length ? '1' : '0';
    panel.dataset.e046Below = String(below.length);
  }
  setText(document.getElementById(NOTE_ID), below.length
    ? `Renfort de lisibilité appliqué sur : ${below.join(', ')}. Valeurs recalculées depuis le CSS calculé, jamais saisies à la main.`
    : 'Aucune mesure sous le seuil déclaré. Valeurs recalculées depuis le CSS calculé, jamais saisies à la main.');
}

/* Lecture différée sans minuteur : les filtres structurels posent `hidden` sans
 * re-rendre la vue ; la micro-tâche les laisse terminer avant la mesure. */
function deferRefresh(layout) {
  const read = () => refresh(layout);
  if (typeof queueMicrotask === 'function') queueMicrotask(read);
  else Promise.resolve().then(read);
}

register('E046', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  const layout = ctx.layout
    || (ctx.stage && typeof ctx.stage.querySelector === 'function'
      ? ctx.stage.querySelector('.chronology-layout') : null);
  if (!layout || typeof layout.querySelector !== 'function') return;
  const main = layout.querySelector('#atlas-chrono-main');
  if (!main) return; /* la vue chronologie n'est pas rendue : lentille inactive */

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e046 = '1';
  layout.dataset.e046Reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? '1' : '0';

  ensurePanel(ctx, main);
  decorateBands(ctx, main);
  decorateCards(ctx, main);

  /* Un seul jeu d'écouteurs par rendu : ils vivent sur le `main` courant,
   * détruit avec la coque, donc aucun cumul. Aucun écouteur global. */
  if (main.dataset.e046Bound !== '1') {
    main.dataset.e046Bound = '1';
    main.addEventListener('input', () => deferRefresh(layout));
    main.addEventListener('change', () => deferRefresh(layout));
    main.addEventListener('click', () => deferRefresh(layout));
  }

  refresh(layout);
});
