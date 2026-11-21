import { register } from './registry.js';

/* Lentille E028 — Fil d'Ariane Ère → Domaine → Point (domaine C : détail & fiche).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E028.md — chantiers E028-01 à E028-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * le store et styles.css ne sont ni édités ni doublés : la lentille lit le DOM
 * réel de la fiche et de la matrice, puis dépose un repère de navigation
 * sémantique dans `.points-detail`. Elle complète E029 (point suivant/précédent)
 * et E030 (ancre de retour à la matrice) sans les toucher.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (tels que
 * fournis par points/registry.js). Aucune dépendance vers le store, le routeur
 * ou une autre lentille : le greffon reste actif avec le ctx minimal.
 *
 * Invariants : un seul CSS (cssOnce), un seul `<nav>`, une seule `<ol>`, trois
 * jalons par rendu ; aucune donnée historique codée en dur ; zéro écouteur
 * global, zéro observateur, zéro timer, zéro rAF, zéro réseau, zéro aléa,
 * aucune réinterprétation de balisage, aucun message de diagnostic.
 */

const CSS_ID = 'points-e028';
const SCOPE = 'points-e028';
const TRAIL_ID = 'points-e028-trail';
const LIST_ID = 'points-e028-list';
const ERA_ID = 'points-e028-era';
const DOMAIN_ID = 'points-e028-domain';
const POINT_ID = 'points-e028-point';
const HERE_ID = 'points-e028-here';
const REDUCED_ATTR = 'data-e028-reduced';
const SIGNATURE_ATTR = 'data-e028-signature';
const MAX_LABEL = 96; /* borne déterministe d'affichage, pas une donnée du jeu */

/* Toutes les règles sont préfixées `.points-e028`, classe posée sur
 * `.points-detail` : aucune fuite hors de la vue Points. Le séparateur `›` est
 * un pseudo-élément décoratif, donc non lu par les lecteurs d'écran ; les
 * libellès « Ère : », « Domaine : », « Point : » et « vous êtes ici » portent
 * l'information en texte, sans recourir à la couleur. */
const CSS = `
/* E028-01 + E028-04 : repère de navigation cadré dans la fiche. */
.points-e028 .points-e028-trail {
  margin: 0 0 12px;
  padding: 8px 0 0;
  border-top: 1px solid var(--line);
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted-2);
  font-variant-numeric: tabular-nums;
}
.points-e028 .points-e028-list {
  display: flex; flex-wrap: wrap; align-items: baseline;
  gap: 2px 0; margin: 0; padding: 0; list-style: none;
}
.points-e028 .points-e028-crumb {
  min-width: 0; max-width: 100%; overflow-wrap: anywhere;
}
.points-e028 .points-e028-crumb + .points-e028-crumb::before {
  content: '\\203A'; padding: 0 7px; color: var(--gold); font-weight: 700;
}
.points-e028 .points-e028-crumb-text { color: var(--ink-soft); }
/* E028-03 : jalon courant souligné et gras, jamais la couleur seule. */
.points-e028 .points-e028-crumb[aria-current="location"] .points-e028-crumb-text {
  color: var(--gold-bright); font-weight: 700;
  text-decoration: underline; text-underline-offset: 3px;
  transition: color .18s linear;
}
.points-e028 .points-e028-here {
  margin-left: 5px; color: var(--muted-2);
  font-size: 10px; font-style: italic;
}
/* E028-07 : mouvement réduit, couplage JS (attribut) ET media query. */
.points-e028[` + REDUCED_ATTR + `="1"] .points-e028-crumb[aria-current="location"] .points-e028-crumb-text {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .points-e028 .points-e028-crumb[aria-current="location"] .points-e028-crumb-text {
    transition: none;
  }
}
/* E028-08 : en colonne étroite, chaque jalon passe sur sa propre ligne. */
@media (max-width: 700px) {
  .points-e028 .points-e028-list { display: block; }
  .points-e028 .points-e028-crumb + .points-e028-crumb::before { content: ''; padding: 0; }
  .points-e028 .points-e028-crumb { display: block; padding: 2px 0; }
  .points-e028 .points-e028-trail { font-size: 12px; }
}
/* E028-09 : couleurs forcées — le fil reste lisible et le jalon courant
 * identifiable par son texte et son soulignement, pas par sa teinte. */
@media (forced-colors: active) {
  .points-e028 .points-e028-trail,
  .points-e028 .points-e028-crumb-text,
  .points-e028 .points-e028-here { color: CanvasText; }
  .points-e028 .points-e028-trail { border-top-color: CanvasText; }
  .points-e028 .points-e028-crumb[aria-current="location"] .points-e028-crumb-text {
    color: Highlight; text-decoration-color: Highlight;
  }
}
`;

/* E028-02 : lecture du DOM réel, sans store ni donnée codée en dur. */
function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

function clip(value) {
  const chars = Array.from(value);
  return chars.length > MAX_LABEL
    ? `${chars.slice(0, MAX_LABEL - 1).join('')}…`
    : value;
}

function detailOf(layout) {
  return layout && typeof layout.querySelector === 'function'
    ? layout.querySelector('.points-detail')
    : null;
}

function readEra(detail, layout) {
  const root = layout || detail;
  if (!root || typeof root.querySelector !== 'function') return 'Ère courante';
  const active = root.querySelector('.points-grid-row.is-active .points-era');
  const current = active || root.querySelector('.points-era[aria-current="true"]');
  return clip(textOf(current) || 'Ère courante');
}

function readDomain(detail, layout) {
  const meta = detail.querySelector('.points-meta');
  const spans = meta && typeof meta.querySelectorAll === 'function'
    ? meta.querySelectorAll('span') : [];
  let value = spans.length ? textOf(spans[0]) : '';
  if (!value && layout && typeof layout.querySelectorAll === 'function') {
    const select = layout.querySelectorAll('.points-filters select')[0];
    if (select && select.value && select.value !== '*') {
      const option = select.selectedOptions && select.selectedOptions[0];
      value = option ? textOf(option) : select.value;
    }
  }
  return clip(value || 'Tous les domaines');
}

function readPoint(detail) {
  return clip(textOf(detail.querySelector('.points-point-title')) || 'Aucun point affiché');
}

function labelOf(label, value) {
  return `${label} : ${value}`;
}

function trailValues(detail, layout) {
  return {
    era: labelOf('Ère', readEra(detail, layout)),
    domain: labelOf('Domaine', readDomain(detail, layout)),
    point: labelOf('Point', readPoint(detail)),
  };
}

function signatureOf(values) {
  return `${values.era}\u0000${values.domain}\u0000${values.point}`;
}

/* E028-01 : un seul nav, une seule liste, trois jalons ; le jalon terminal
 * porte aria-current="location" et un complément textuel « vous êtes ici ». */
function buildTrail(ctx, values) {
  const nav = ctx.el('nav', SCOPE + '-trail');
  nav.id = TRAIL_ID;
  nav.setAttribute('aria-label', 'Fil d’Ariane du point');

  const list = ctx.el('ol', SCOPE + '-list');
  list.id = LIST_ID;
  const ids = [ERA_ID, DOMAIN_ID, POINT_ID];
  const texts = [values.era, values.domain, values.point];

  texts.forEach((text, index) => {
    const li = ctx.el('li', SCOPE + '-crumb');
    const body = ctx.el('span', SCOPE + '-crumb-text', text);
    body.id = ids[index];
    li.appendChild(body);
    if (index === texts.length - 1) {
      li.setAttribute('aria-current', 'location');
      const here = ctx.el('span', SCOPE + '-here', 'vous êtes ici');
      here.id = HERE_ID;
      li.appendChild(here);
    }
    list.appendChild(li);
  });

  nav.appendChild(list);
  return nav;
}

/* Insertion après le kicker d'origine de points.js, sans déplacer ni écraser
 * les en-têtes ajoutés par E021, E030 ou toute autre lentille. */
function placeTrail(detail, nav) {
  const kicker = Array.from(detail.children)
    .find((child) => child.classList && child.classList.contains('view-kicker'));
  if (kicker && kicker.nextSibling) detail.insertBefore(nav, kicker.nextSibling);
  else if (kicker) detail.appendChild(nav);
  else detail.insertBefore(nav, detail.firstChild);
}

/* E028-05 : écriture conditionnelle — une signature identique n'entraîne
 * aucune mutation, et seul textContent est employé, sans réinterprétation
 * de balisage. */
function render(ctx, detail, layout) {
  const values = trailValues(detail, layout);
  const signature = signatureOf(values);
  let nav = detail.querySelector('#' + TRAIL_ID);
  if (!nav) {
    const stale = document.getElementById(TRAIL_ID);
    if (stale && !detail.contains(stale)) stale.remove();
    nav = buildTrail(ctx, values);
    placeTrail(detail, nav);
  }
  if (nav.getAttribute(SIGNATURE_ATTR) === signature) return;
  nav.setAttribute(SIGNATURE_ATTR, signature);
  const bodies = nav.querySelectorAll('.' + SCOPE + '-crumb-text');
  const texts = [values.era, values.domain, values.point];
  bodies.forEach((node, index) => {
    if (node.textContent !== texts[index]) node.textContent = texts[index];
  });
  detail.dataset.pointsE028Trail = texts.join(' › ');
}

/* E028-06 : l'installation est idempotente — CSS unique, nav unique,
 * aucun stockage de nœud périmé d'un rendu à l'autre. */
register('E028', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  const detail = detailOf(layout);
  if (!detail) return;

  css(CSS_ID, CSS);
  detail.classList.add(SCOPE);
  detail.dataset.e028 = '1';

  let nav = detail.querySelector('#' + TRAIL_ID);
  if (nav && nav.parentElement !== detail) nav.remove();
  nav = detail.querySelector('#' + TRAIL_ID);
  if (!nav) {
    const stale = document.getElementById(TRAIL_ID);
    if (stale && stale.parentElement !== detail) stale.remove();
  }

  if (typeof reducedMotion === 'function' && reducedMotion()) {
    detail.setAttribute(REDUCED_ATTR, '1');
  } else {
    detail.removeAttribute(REDUCED_ATTR);
  }

  render(ctx, detail, layout);
});
