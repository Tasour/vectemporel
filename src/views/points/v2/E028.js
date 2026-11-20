import { register } from './registry.js';

/* Lentille V2 E028 — Détail & fiche : fil d'Ariane auditable du point.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E028.md — chantiers E028-01 à E028-10.
 * Seconde passe autonome : ce module ne lit ni n'écrit aucun fichier de la
 * passe 1 (src/views/points/E028.js ni son rapport), ni aucun fichier partagé
 * (vue points.js, coque, styles.css, registres, store, routeur). Seuls le
 * registre V2 et le DOM réellement rendu sont employés.
 *
 * La passe 1 disait « où l'on est » (Ère › Domaine › Point). La V2 répond à
 * « comment le sait-on et que se passe-t-il si le signal manque » : elle ajoute
 * la position arithmétique des jalons (aria-posinset/aria-setsize), la
 * profondeur, l'évaluation de complétude, la traçabilité des sources lues, une
 * navigation clavier focalisable, une signature avec empreinte déterministe et
 * un compteur de rafraîchissements. Aucune de ces informations n'est codée en
 * dur : tout est dérivé du DOM observé.
 *
 * Contrat exploité : viewId ('pointsv2', toléré 'points'), stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion(). Aucune dépendance vers
 * le store, le routeur, E029 ou E030.
 *
 * Invariants : une seule feuille (ctx.css('points-v2-e028', …)) dont toutes
 * les règles sont préfixées .points-v2-e028 ; un seul <nav> ; des id uniques
 * préfixés points-v2-e028- protégés par ensureOne() ; zéro console.*, zéro
 * réseau, zéro aléa, zéro minuteur, zéro rAF, zéro observateur, zéro écouteur
 * global, jamais d'innerHTML — tout DOM statique passe par ctx.el.
 */

const CSS_ID = 'points-v2-e028';
const SCOPE = 'points-v2-e028';
const NAV_ID = 'points-v2-e028-nav';
const LIST_ID = 'points-v2-e028-list';
const SUMMARY_ID = 'points-v2-e028-summary';
const COMPLETE_ID = 'points-v2-e028-complete';
const SOURCES_ID = 'points-v2-e028-sources';
const ERA_ID = 'points-v2-e028-era';
const DOMAIN_ID = 'points-v2-e028-domain';
const POINT_ID = 'points-v2-e028-point';
const HERE_ID = 'points-v2-e028-here';
const JALON_IDS = [ERA_ID, DOMAIN_ID, POINT_ID];
const REDUCED_ATTR = 'data-points-v2-e028-reduced';
const MAX_LABEL = 96; /* borne déterministe d'affichage, pas une donnée du jeu */
const VIEW_IDS = ['pointsv2', 'points'];

/* Libellés de repli : ils nomment l'absence au lieu de la masquer. Leur
 * présence dans un jalon est détectée par comparaison stricte (chantier 05). */
const FALLBACKS = ['Ère courante', 'Tous les domaines', 'Aucun point affiché'];

/* Traçabilité (chantier 06) : description lisible + sélecteur réellement
 * interrogé, conservé en title et dans le miroir data-…-sources. */
const SOURCES = [
  { label: 'Ère', desc: 'ligne active de la matrice', selector: '.points-grid-row.is-active .points-era' },
  { label: 'Domaine', desc: 'métadonnées du point, sinon filtre', selector: '.points-meta span · .points-filters select' },
  { label: 'Point', desc: 'titre du point affiché', selector: '.points-point-title' },
];

/* Toutes les règles sont préfixées `.points-v2-e028`, classe posée sur
 * .points-detail : aucune fuite hors de la vue Points. Le chevron › est un
 * pseudo-élément décoratif, donc non énoncé ; les libellés « Ère : »,
 * « Domaine : », « Point : », la profondeur, la complétude, « vous êtes ici »
 * et la traçabilité sont du texte réel, indépendant de la couleur. */
const CSS = `
/* E028-01 + E028-07 : repère de navigation cadré, focalisable au clavier. */
.points-v2-e028 #${NAV_ID} {
  margin: 0 0 12px; padding: 9px 11px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(8, 11, 16, .72); color: var(--muted-2);
  font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums;
}
.points-v2-e028 #${NAV_ID}:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 3px;
}
.points-v2-e028 #${LIST_ID} {
  display: flex; flex-wrap: wrap; align-items: baseline;
  gap: 2px 0; margin: 0; padding: 0; list-style: none;
}
.points-v2-e028 .points-v2-e028-crumb {
  min-width: 0; max-width: 100%; overflow-wrap: anywhere;
}
.points-v2-e028 .points-v2-e028-crumb + .points-v2-e028-crumb::before {
  content: '\\203A'; padding: 0 7px; color: var(--gold); font-weight: 700;
}
.points-v2-e028 .points-v2-e028-crumb-text { color: var(--ink-soft); }
/* E028-03 : le jalon courant est marqué par aria-current ET par le texte,
 * le gras et le soulignement — jamais par la couleur seule. */
.points-v2-e028 .points-v2-e028-crumb[aria-current="location"] .points-v2-e028-crumb-text {
  color: var(--gold-bright); font-weight: 700;
  text-decoration: underline; text-underline-offset: 3px;
  transition: color .18s linear;
}
.points-v2-e028 .points-v2-e028-here {
  margin-left: 5px; color: var(--muted-2);
  font-size: 10px; font-style: italic;
}
/* E028-04 + E028-05 : lignes de synthèse, déjà écrites dans le DOM. */
.points-v2-e028 .points-v2-e028-summary,
.points-v2-e028 .points-v2-e028-complete {
  margin: 6px 0 0; padding-top: 5px;
  border-top: 1px solid var(--line); color: var(--muted);
  overflow-wrap: anywhere;
}
/* E028-06 : table de traçabilité, définitions lisibles sans la feuille. */
.points-v2-e028 .points-v2-e028-sources-title {
  margin: 7px 0 3px; color: var(--gold); font-weight: 600;
}
.points-v2-e028 .points-v2-e028-sources-list {
  margin: 0; display: grid; grid-template-columns: max-content 1fr;
  gap: 1px 10px;
}
.points-v2-e028 .points-v2-e028-sources-list dt { color: var(--ink-soft); }
.points-v2-e028 .points-v2-e028-sources-list dd {
  margin: 0; color: var(--muted-2); overflow-wrap: anywhere;
}
/* E028-09 : mouvement réduit, couplage JS (attribut) ET media query. */
.points-v2-e028[${REDUCED_ATTR}="1"] .points-v2-e028-crumb[aria-current="location"] .points-v2-e028-crumb-text {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .points-v2-e028 .points-v2-e028-crumb[aria-current="location"] .points-v2-e028-crumb-text {
    transition: none;
  }
}
/* E028-10 : en colonne étroite, chaque jalon passe sur sa propre ligne. */
@media (max-width: 700px) {
  .points-v2-e028 #${LIST_ID} { display: block; }
  .points-v2-e028 .points-v2-e028-crumb + .points-v2-e028-crumb::before { content: ''; padding: 0; }
  .points-v2-e028 .points-v2-e028-crumb { display: block; padding: 2px 0; }
  .points-v2-e028 .points-v2-e028-sources-list { grid-template-columns: 1fr; gap: 0; }
  .points-v2-e028 .points-v2-e028-sources-list dd { margin-bottom: 4px; }
  .points-v2-e028 #${NAV_ID} { padding: 7px 8px; font-size: 12px; }
}
/* E028-09 : couleurs forcées — la hiérarchie reste portée par l'ordre, le
 * texte, aria-current et le soulignement, pas par la teinte. */
@media (forced-colors: active) {
  .points-v2-e028 #${NAV_ID},
  .points-v2-e028 .points-v2-e028-crumb-text,
  .points-v2-e028 .points-v2-e028-here,
  .points-v2-e028 .points-v2-e028-summary,
  .points-v2-e028 .points-v2-e028-complete,
  .points-v2-e028 .points-v2-e028-sources-list dt,
  .points-v2-e028 .points-v2-e028-sources-list dd { color: CanvasText; }
  .points-v2-e028 #${NAV_ID} { background: Canvas; border-color: CanvasText; }
  .points-v2-e028 .points-v2-e028-crumb[aria-current="location"] .points-v2-e028-crumb-text {
    color: Highlight; text-decoration-color: Highlight;
  }
}
`;

let lastSignature = '';  /* signature du dernier relevé écrit */
let refreshCount = 0;    /* nombre d'écritures réelles, auditable hors texte */

function byId(id) {
  return document.getElementById(id);
}

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

/* E028-02 : lecture du DOM réel, sans store ni millésime codé en dur. */
function readEra(detail, layout) {
  const root = layout || detail;
  if (!root || typeof root.querySelector !== 'function') return FALLBACKS[0];
  const active = root.querySelector('.points-grid-row.is-active .points-era');
  const current = active || root.querySelector('.points-era[aria-current="true"]');
  return clip(textOf(current) || FALLBACKS[0]);
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
  return clip(value || FALLBACKS[1]);
}

function readPoint(detail) {
  return clip(textOf(detail.querySelector('.points-point-title')) || FALLBACKS[2]);
}

/* E028-02/05/06 : une seule passe de relevé. Chaque jalon porte sa valeur,
 * son indicateur de repli et la description de sa source. */
function readJalons(detail, layout) {
  const raw = [readEra(detail, layout), readDomain(detail, layout), readPoint(detail)];
  return raw.map((value, index) => ({
    label: SOURCES[index].label,
    text: `${SOURCES[index].label} : ${value}`,
    value,
    isFallback: value === FALLBACKS[index],
    desc: SOURCES[index].desc,
    selector: SOURCES[index].selector,
  }));
}

/* E028-08 : empreinte FNV-1a déterministe (aucun aléa). Deux relevés identiques
 * donnent toujours la même clé, ce qui rend la signature auditable. */
function hashOf(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(36);
}

/* E028-01 : garde anti-doublon. Pour un id donné, on garde le premier nœud
 * contenu dans root et connecté, on retire tous les autres. */
function ensureOne(id, root) {
  const found = Array.from(document.querySelectorAll('[id="' + id + '"]'));
  let kept = null;
  for (const node of found) {
    if (!kept && root && root.contains(node) && node.isConnected) kept = node;
    else node.remove();
  }
  return kept;
}

/* E028-01/03/04/05/06/07 : structure statique construite une seule fois,
 * exclusivement via ctx.el. */
function buildNav(el, jalons) {
  const nav = el('nav', SCOPE + '-nav');
  nav.id = NAV_ID;
  nav.setAttribute('aria-label', 'Fil d’Ariane du point — position dans la hiérarchie');
  /* E028-07 : le repère est focalisable et décrit par sa propre ligne de
   * synthèse ; aucun contrôle natif n'est remplacé. */
  nav.setAttribute('tabindex', '0');
  nav.setAttribute('aria-describedby', SUMMARY_ID);

  const list = el('ol', SCOPE + '-list');
  list.id = LIST_ID;
  const bodies = [];
  jalons.forEach((jalon, index) => {
    const item = el('li', SCOPE + '-crumb');
    /* E028-03 : position arithmétique annoncée par les lecteurs d'écran. */
    item.setAttribute('aria-posinset', String(index + 1));
    item.setAttribute('aria-setsize', String(jalons.length));
    const body = el('span', SCOPE + '-crumb-text', jalon.text);
    body.id = JALON_IDS[index];
    bodies.push(body);
    item.appendChild(body);
    if (index === jalons.length - 1) {
      item.setAttribute('aria-current', 'location');
      const here = el('span', SCOPE + '-here', 'vous êtes ici');
      here.id = HERE_ID;
      item.appendChild(here);
    }
    list.appendChild(item);
  });
  nav.appendChild(list);

  const summary = el('p', SCOPE + '-summary');
  summary.id = SUMMARY_ID;
  const complete = el('p', SCOPE + '-complete');
  complete.id = COMPLETE_ID;

  const sources = el('div', SCOPE + '-sources');
  sources.id = SOURCES_ID;
  sources.appendChild(el('p', SCOPE + '-sources-title', 'Traçabilité des jalons :'));
  const definitions = el('dl', SCOPE + '-sources-list');
  jalons.forEach((jalon) => {
    definitions.appendChild(el('dt', '', jalon.label));
    const detailLine = el('dd', '', `${jalon.desc} — ${jalon.selector}`);
    detailLine.setAttribute('title', jalon.selector);
    definitions.appendChild(detailLine);
  });
  sources.appendChild(definitions);

  nav.append(summary, complete, sources);
  return { nav, list, bodies, summary, complete, sources };
}

/* Insertion après le kicker d'origine de points.js, sans déplacer ni écraser
 * les en-têtes ajoutés par la passe 1, E021 ou E030. */
function placeNav(detail, nav) {
  const kicker = Array.from(detail.children)
    .find((child) => child.classList && child.classList.contains('view-kicker'));
  if (kicker && kicker.nextSibling) detail.insertBefore(nav, kicker.nextSibling);
  else if (kicker) detail.appendChild(nav);
  else detail.insertBefore(nav, detail.firstChild);
}

/* E028-04/05/08/09 : écriture conditionnelle et miroirs hors région live. */
function render(ctx, detail, layout, fresh) {
  if (!detail.isConnected) return;
  const jalons = readJalons(detail, layout);
  const fallbacks = jalons.filter((jalon) => jalon.isFallback).map((jalon) => jalon.label);
  const sourceState = fallbacks.length === jalons.length ? 'indisponible' : 'observable';
  const signature = [
    jalons.map((jalon) => jalon.text).join('\u0000'),
    fallbacks.join(','),
    sourceState,
  ].join('\u0001');

  let nav = ensureOne(NAV_ID, detail);
  if (nav && !nav.querySelector('#' + LIST_ID)) {
    nav.remove();
    nav = null;
  }
  let parts;
  if (nav) {
    parts = {
      nav,
      list: nav.querySelector('#' + LIST_ID),
      bodies: Array.from(nav.querySelectorAll('.' + SCOPE + '-crumb-text')),
      summary: nav.querySelector('#' + SUMMARY_ID),
      complete: nav.querySelector('#' + COMPLETE_ID),
      sources: nav.querySelector('#' + SOURCES_ID),
    };
  } else {
    parts = buildNav(ctx.el, jalons);
    placeNav(detail, parts.nav);
  }
  /* Les trois id de jalon et les deux id de synthèse restent uniques après
   * deux passes, y compris sur un DOM partiellement construit. */
  JALON_IDS.forEach((id, index) => {
    const kept = ensureOne(id, parts.nav);
    if (kept && parts.bodies[index] !== kept) parts.bodies[index] = kept;
  });
  if (parts.summary) parts.summary = ensureOne(SUMMARY_ID, parts.nav) || parts.summary;
  if (parts.complete) parts.complete = ensureOne(COMPLETE_ID, parts.nav) || parts.complete;
  if (parts.sources) parts.sources = ensureOne(SOURCES_ID, parts.nav) || parts.sources;

  if (!fresh && signature === lastSignature) return;
  lastSignature = signature;
  refreshCount += 1;

  parts.bodies.forEach((node, index) => {
    const wanted = jalons[index] ? jalons[index].text : '';
    if (node && node.textContent !== wanted) node.textContent = wanted;
  });
  const current = parts.list && parts.list.lastElementChild;
  if (current) {
    current.setAttribute('aria-current', 'location');
    current.setAttribute('aria-posinset', String(jalons.length));
    current.setAttribute('aria-setsize', String(jalons.length));
    if (!current.querySelector('#' + HERE_ID)) {
      const here = ctx.el('span', SCOPE + '-here', 'vous êtes ici');
      here.id = HERE_ID;
      current.appendChild(here);
    }
  }

  if (parts.summary) {
    parts.summary.textContent = sourceState === 'indisponible'
      ? 'Fil d’Ariane : source indisponible — aucun signal de la vue n’a pu être lu.'
      : `Profondeur : ${jalons.length} niveaux · Jalon courant : ${jalons.length} sur ${jalons.length} (${jalons.length - 1} avant).`;
  }
  if (parts.complete) {
    parts.complete.textContent = fallbacks.length
      ? `Complétude : ${jalons.length - fallbacks.length} jalon(s) renseigné(s) ; repli sur ${fallbacks.join(', ')}.`
      : `Complétude : ${jalons.length} jalons renseignés.`;
  }
  if (parts.sources) {
    const definitions = parts.sources.querySelector('dl');
    if (definitions) {
      Array.from(definitions.querySelectorAll('dd')).forEach((node, index) => {
        const jalon = jalons[index];
        if (!jalon) return;
        const wanted = `${jalon.desc} — ${jalon.selector}`;
        if (node.textContent !== wanted) node.textContent = wanted;
        if (node.getAttribute('title') !== jalon.selector) node.setAttribute('title', jalon.selector);
      });
    }
  }

  /* E028-04/05/08 : miroirs auditable, tous préfixés points-v2-e028-. */
  detail.dataset.pointsV2E028Depth = String(jalons.length);
  detail.dataset.pointsV2E028Rank = String(jalons.length);
  detail.dataset.pointsV2E028Complete = String(fallbacks.length === 0);
  detail.dataset.pointsV2E028Fallbacks = String(fallbacks.length);
  detail.dataset.pointsV2E028Sources = SOURCES.map((source) => source.selector).join(' | ');
  detail.dataset.pointsV2E028SourceState = sourceState;
  detail.dataset.pointsV2E028Signature = hashOf(signature);
  detail.dataset.pointsV2E028Refreshes = String(refreshCount);
  detail.dataset.pointsV2E028State = fresh ? 'initial' : 'mis-a-jour';
}

register('E028', (ctx) => {
  /* E028-01 : échec fermé si le contrat n'est pas celui de la vue points V2.
   * 'points' est toléré pour un harnais réutilisant le ctx de la passe 1. */
  if (!ctx || !VIEW_IDS.includes(ctx.viewId)) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const { viewId, stage, layout, css } = ctx;
  if (!layout || !layout.isConnected) return;
  if (stage && typeof stage.contains === 'function' && !stage.contains(layout)) return;

  /* E028-01 : un nœud déconnecté marque un rendu neuf ; la signature est
   * remise à zéro pour réécrire les valeurs dans le DOM frais. */
  const detail = detailOf(layout);
  if (!detail || !detail.isConnected) return;
  const found = byId(NAV_ID);
  const fresh = !(found && found.isConnected && detail.contains(found));

  /* E028-01/09 : injection unique (cssOnce) et ancrage de portée. */
  css(CSS_ID, CSS);
  detail.classList.add(SCOPE);
  detail.dataset.pointsV2E028 = viewId;
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    detail.setAttribute(REDUCED_ATTR, '1');
  } else {
    detail.removeAttribute(REDUCED_ATTR);
  }

  if (fresh) lastSignature = '';
  render(ctx, detail, layout, fresh);
});
