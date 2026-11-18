import { register } from './registry.js';

/* Lentille POINTS E058 — F. Sémantique & données — noms historiques conservés
 * avec leur ère.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E058.md — chantiers E058-01 à E058-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la
 * coque, les autres lentilles et styles.css ne sont ni édités ni doublés.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Toutes les
 * valeurs affichées sont DÉRIVÉES DU DOM rendu par points.js : l'ère vient de
 * la ligne active de `.points-grid`, l'ancrage de `.points-meta`, les noms
 * conservés de `.points-point-title` et `.points-point-text`. Aucun nom, aucune
 * date, aucun millésime n'est codé en dur ; aucune cellule n'est déplacée et
 * aucun gestionnaire natif n'est modifié.
 *
 * Invariants : une seule feuille CSS (ctx.css('points-e058', …)), des
 * identifiants préfixés `points-e058-`, un seul encadré par fiche, une signature
 * anti-écriture redondante, non destructif, idempotent, zéro écouteur global,
 * zéro timer, zéro rAF, zéro réseau, zéro aléa, zéro innerHTML, zéro console.*.
 */

const CSS_ID = 'points-e058';
const SCOPE = 'points-e058';
const PANEL_ID = 'points-e058-panel';
const HEADING_ID = 'points-e058-heading';
const ERA_ID = 'points-e058-era';
const TIME_ID = 'points-e058-time';
const VARIANTS_ID = 'points-e058-variants';
const STATUS_ID = 'points-e058-status';
const REDUCED_ATTR = 'data-points-e058-reduced';

/* Feuille unique, entièrement préfixée : aucune fuite hors de la vue Points.
 * Aucune transition n'est définie ; les règles « réduit » ne sont qu'une garde
 * pour les environnements qui en injecteraient une. */
const CSS = `
.points-e058 .points-e058-panel {
  margin: 12px 0 0; padding: 10px 12px;
  border: 1px solid var(--line-strong, #6b6b6b);
  border-left: 3px solid var(--gold, #e6b96f);
  border-radius: 8px;
  background: rgba(230, 185, 111, .05);
  color: var(--ink-soft, #d8dde6);
  font-size: 11px; line-height: 1.5;
}
.points-e058 .points-e058-heading {
  margin: 0 0 6px; font-family: var(--serif, Georgia, serif);
  font-size: 13px; color: var(--gold-bright, #f0d49a);
}
.points-e058 .points-e058-charte { margin: 0 0 8px; }
.points-e058 .points-e058-anchor {
  margin: 0; display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 4px 10px;
}
.points-e058 .points-e058-anchor dt {
  color: var(--muted, #9aa4b2); font-weight: 600;
}
.points-e058 .points-e058-anchor dd { margin: 0; overflow-wrap: anywhere; }
.points-e058 .points-e058-names { margin: 0; padding-left: 16px; }
.points-e058 .points-e058-name { margin: 0 0 3px; }
.points-e058 .points-e058-none { color: var(--muted-2, #8a94a3); }
.points-e058 .points-e058-status {
  margin: 8px 0 0; color: var(--gold, #e6b96f);
  font-variant-numeric: tabular-nums;
}
@media (max-width: 620px) {
  .points-e058 .points-e058-anchor { grid-template-columns: minmax(0, 1fr); gap: 2px; }
  .points-e058 .points-e058-anchor dd { margin-bottom: 4px; }
}
.points-e058[` + REDUCED_ATTR + `="1"] .points-e058-panel { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e058 .points-e058-panel { transition: none; }
}
@media (forced-colors: active) {
  .points-e058 .points-e058-panel {
    background: Canvas; color: CanvasText;
    border-color: CanvasText; border-left-color: Highlight;
  }
  .points-e058 .points-e058-anchor dt,
  .points-e058 .points-e058-status { color: CanvasText; }
}
@media print {
  .points-e058 .points-e058-panel { background: none; border-color: #999; }
}
`;

let lastSignature = '';

function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') return ctx.stage;
  return null;
}

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

/* E058-04 : un contenu entre parenthèses n'est un nom conservé que s'il porte
 * au moins deux lettres et autant de lettres que de chiffres. Les groupes
 * purement numériques ou datés (« 1911 », « 1897–1904 ») et les expressions
 * de bornes (« jusqu'en… », « vers… », « environ… », « siècle », « année »)
 * sont écartés : ils ne deviennent jamais des noms historiques inventés. */
function isNameLike(value) {
  if (!value) return false;
  if (/^(?:jusqu|vers|environ|env|après|apr|avant|av|ca|c)\b/i.test(value)) return false;
  if (/\b(?:siècle|millénaire|année|annee|ans|date|environ|jusqu|vers)\b/i.test(value)) return false;
  const letters = (value.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length;
  const digits = (value.match(/\d/g) || []).length;
  return letters >= 2 && letters >= digits;
}

/* E058-04 / E058-05 : collecte des segments conservés tels quels dans le titre
 * et le texte du point. Deux sources seulement, toutes deux lues dans le DOM :
 * - variante entre parenthèses (ex. « Calcutta » dans « Kolkata (Calcutta) ») ;
 * - nom propre introduit par un qualificatif d'époque (ancien/ancienne/autrefois/
 *   jadis/alors) suivi d'une majuscule.
 * La déduplication préserve l'ordre d'apparition ; aucune valeur n'est traduite,
 * corrigée ou coupée. */
function detectNames(root) {
  const found = [];
  const seen = new Set();
  const add = (value, source) => {
    const clean = String(value || '').trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    found.push({ value: clean, source });
  };

  const title = root.querySelector('.points-point-title');
  const text = root.querySelector('.points-point-text');
  [['titre', title], ['texte', text]].forEach(([source, node]) => {
    const value = txt(node);
    if (!value) return;
    const parens = /\(([^()]*)\)/g;
    let match = parens.exec(value);
    while (match) {
      if (isNameLike(match[1])) add(match[1], source);
      match = parens.exec(value);
    }
    const marked = /\b(?:[Aa]ncien(?:ne)?s?|[Aa]utrefois|[Jj]adis|[Aa]lors)\s+([A-ZÀ-ÖØ][A-Za-zÀ-ÖØ-öø-ÿ'’-]*)/g;
    match = marked.exec(value);
    while (match) {
      add(match[1], source);
      match = marked.exec(value);
    }
  });
  return found;
}

/* E058-02 : l'ère est celle de la ligne active de la matrice ; points.js filtre
 * en effet les points visibles sur eraId === era.id. Repli sur l'aria-current
 * écrit par E004 si présent, puis sur une phrase explicite plutôt qu'un nom
 * supposé. Aucune ère n'est écrite en dur dans le module. */
function eraOf(root) {
  const active = root.querySelector('.points-grid-row.is-active .points-era');
  if (active) return txt(active);
  const current = root.querySelector('.points-era[aria-current="true"]');
  return current ? txt(current) : '';
}

/* E058-03 : l'ancrage temporel est le troisième span de `.points-meta`
 * (domaine, échelle, temps, certitude). Repli : premier span contenant un
 * chiffre. Si la fiche n'affiche rien, on le dit au lieu d'inventer une date. */
function timeOf(root) {
  const meta = root.querySelector('.points-meta');
  if (!meta) return '';
  const spans = nodes(meta, 'span');
  if (spans.length >= 3) {
    const value = txt(spans[2]);
    if (value) return value;
  }
  const numeric = spans.map(txt).find((value) => /\d/.test(value));
  return numeric || '';
}

function buildPanel(ctx, panel) {
  put(panel, 'role', 'region');
  put(panel, 'aria-labelledby', HEADING_ID);

  const heading = ctx.el('h4', 'points-e058-heading', 'Noms historiques et leur ère');
  heading.id = HEADING_ID;
  panel.appendChild(heading);

  /* E058-01 : charte statique, toujours affichée, sans modale ni region live
   * supplémentaire. Elle énonce la règle avant même qu'un nom soit détecté. */
  panel.appendChild(ctx.el('p', 'points-e058-charte',
    'Charte : un nom d’époque est conservé tel que la source le donne — il n’est ni modernisé ni traduit. Une variante entre parenthèses est un nom historique, pas une correction : elle reste attachée à son ère et à l’ancrage du point. Un groupe purement numérique ou daté n’est pas traité comme un nom. Cette lecture n’efface ni ne réécrit la fiche.'));

  const anchor = ctx.el('dl', 'points-e058-anchor');
  [['Ère du point', ERA_ID],
    ['Ancrage temporel', TIME_ID],
    ['Noms / variantes conservés', VARIANTS_ID]].forEach(([label, id]) => {
    anchor.appendChild(ctx.el('dt', '', label));
    const dd = ctx.el('dd', '');
    dd.id = id;
    anchor.appendChild(dd);
  });
  panel.appendChild(anchor);

  /* E058-07 : une seule région live LOCALE, dédiée, distincte de celles des
   * autres lentilles ; le ctx de cette vue n'expose pas say(). */
  const status = ctx.el('p', 'points-e058-status', '');
  status.id = STATUS_ID;
  put(status, 'role', 'status');
  put(status, 'aria-live', 'polite');
  put(status, 'aria-atomic', 'true');
  panel.appendChild(status);
}

function fillPanel(ctx, panel, era, time, names) {
  const eraNode = panel.querySelector('#' + ERA_ID);
  const timeNode = panel.querySelector('#' + TIME_ID);
  const variants = panel.querySelector('#' + VARIANTS_ID);
  const status = panel.querySelector('#' + STATUS_ID);
  if (!eraNode || !timeNode || !variants || !status) return false;

  eraNode.textContent = era || 'Ère non précisée dans la matrice';
  timeNode.textContent = time || 'Ancrage non affiché dans cette fiche';

  variants.replaceChildren();
  if (!names.length) {
    variants.appendChild(ctx.el('span', 'points-e058-none',
      'Aucune variante détectée : le nom du point est conservé tel quel avec son ère.'));
  } else {
    const list = ctx.el('ul', 'points-e058-names');
    names.forEach((name) => {
      const suffix = time ? ` · ancrage : ${time}` : '';
      list.appendChild(ctx.el('li', 'points-e058-name',
        `« ${name.value} » — conservé tel quel · ère : ${era || 'non précisée'}${suffix} · relevé dans le ${name.source}.`));
    });
    variants.appendChild(list);
  }

  status.textContent = `Ancrage historique : ère ${era || 'non précisée'} · ${names.length} nom(s) ou variante(s) conservé(s) tel(s) quel(s).`;
  return true;
}

function apply(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  const root = rootOf(ctx);
  if (!root) return;

  /* E058-09 : CSS unique et portée ancrée sur la vue réellement rendue. */
  ctx.css(CSS_ID, CSS);
  root.classList.add(SCOPE);
  root.dataset.pointsE058 = '1';

  /* E058-09 : couplage explicite à la préférence de mouvement réduite, en plus
   * de la media query, pour les environnements sans matchMedia fiable. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    root.setAttribute(REDUCED_ATTR, '1');
  } else {
    root.removeAttribute(REDUCED_ATTR);
  }

  const detail = root.querySelector('.points-detail');
  if (!detail || typeof detail.appendChild !== 'function') return;

  const era = eraOf(root);
  const time = timeOf(root);
  const names = detectNames(root);
  const signature = [era, time, names.map((n) => `${n.source}:${n.value}`).join('|')].join('~');

  /* E058-10 : réutilisation par identifiant, jamais de doublon ; un encadré
   * mal parenté ou issu d'un rendu précédent est retiré avant réinsertion. */
  let panel = document.getElementById(PANEL_ID);
  if (panel && (panel.parentElement !== detail || !root.contains(panel))) panel.remove();
  if (!panel || !panel.isConnected) {
    panel = ctx.el('section', 'points-e058-panel');
    panel.id = PANEL_ID;
    buildPanel(ctx, panel);
    const nav = detail.querySelector('.points-nav');
    if (nav && nav.parentElement === detail) detail.insertBefore(panel, nav);
    else detail.appendChild(panel);
  }

  /* E058-10 : signature anti-écriture redondante — aucun live bavard, aucune
   * réécriture si l'ancrage n'a pas changé. Les signaux de test restent ceux
   * de la dernière écriture utile. */
  if (panel.dataset.pointsE058Signature === signature && lastSignature === signature) return;
  if (!fillPanel(ctx, panel, era, time, names)) return;
  panel.dataset.pointsE058Signature = signature;
  lastSignature = signature;

  /* E058-08 : signaux DOM préfixés, lisibles par un harnais ou une autre
   * lentille sans occuper de nom générique. Rien d'existant n'est modifié. */
  detail.dataset.pointsE058Era = era;
  detail.dataset.pointsE058Time = time;
  detail.dataset.pointsE058Variants = String(names.length);
  detail.dataset.pointsE058Charter = '1';
}

register('E058', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return; // une structure inattendue neutralise la lentille, jamais la vue.
  }
});
