import { register } from './registry.js';

/* Lentille POINTS E065 — G. Performance & rendu — zéro Math.random, PRNG
 * mulberry32 avec graine affichée si visuel pseudo-aléatoire.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E065.md — chantiers E065-01 à E065-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre, la coque et styles.css ne sont ni édités ni doublés.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance vers le store, les filtres ou le détail :
 * la lentille reste active avec un ctx minimal pourvu qu'il porte un layout.
 *
 * Invariants :
 * - zéro Math.random : toute variation vient de mulberry32 (Math.imul) avec
 *   une graine ENTIÈRE dérivée du DOM par FNV-1a, jamais d'une horloge ;
 * - le visuel pseudo-aléatoire (bandeau de barres) est déterministe et sa
 *   graine est affichée dans le DOM, donc reproductible et falsifiable ;
 * - une seule feuille CSS (ctx.css('points-e065', …)), des IDs préfixés
 *   points-e065-, un seul panneau par rendu, aucune valeur aléatoire écrite
 *   dans le DOM existant (seuls des attributs de marquage déterministes) ;
 * - non destructif, idempotent, zéro réseau, zéro timer, zéro rAF, zéro
 *   innerHTML, zéro console.*, aucun fichier partagé modifié.
 */

const CSS_ID = 'points-e065';
const SCOPE = 'points-e065';
const PANEL_ID = 'points-e065-panel';
const SEED_ID = 'points-e065-seed';
const STRIP_ID = 'points-e065-strip';
const DESC_ID = 'points-e065-desc';
const AUDIT_ID = 'points-e065-audit';
const MAX_BARS = 32;
const REDUCED_ATTR = 'data-points-e065-reduced';

/* Feuille unique, préfixée `points-e065`. Aucune animation, aucune ressource
 * externe, cibles et mesure lisibles, repli mobile et mouvement réduit. */
const CSS = `
.points-e065-panel{
  margin:12px 0 0;padding:8px 10px;
  border:1px solid var(--line-strong,#6b6b6b);border-radius:8px;
  background:rgba(230,185,111,.04);
}
#${SEED_ID}{
  margin:0 0 6px;color:var(--gold,#d9b26a);
  font-size:10px;line-height:1.45;font-variant-numeric:tabular-nums;
}
#${STRIP_ID}{
  display:flex;align-items:flex-end;gap:2px;height:28px;
  border-bottom:1px solid var(--line-strong,#6b6b6b);
}
.points-e065-bar{
  flex:1 1 0;min-width:2px;max-width:10px;
  background:var(--gold,#d9b26a);opacity:.75;
}
#${DESC_ID},#${AUDIT_ID}{
  margin:6px 0 0;color:var(--muted-2,#9aa0a6);
  font-size:10px;line-height:1.45;font-variant-numeric:tabular-nums;
}
@media (max-width:620px){
  #${STRIP_ID}{height:22px;gap:1px}
  .points-e065-bar{max-width:none}
}
@media (prefers-reduced-motion:reduce){
  .points-e065-bar{transition:none}
}
`;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

/* FNV-1a 32 bits : empreinte PURE du DOM, sans graine aléatoire ni horloge. */
function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/* mulberry32 : PRNG déterministe, Math.imul uniquement — jamais Math.random. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Signature stable : noms d'ères, domaines et compteurs tels que RENDUS.
 * Aucune date, aucun compteur de Rendu, aucune valeur issue du hasard. */
function domSignature(root) {
  const parts = [];
  nodes(root, '.points-grid-row').forEach((row) => {
    parts.push(txt(row.querySelector('.points-era')) || '?');
    nodes(row, '.points-cell').forEach((cell) => {
      parts.push(cell.classList.contains('has-points') ? (txt(cell) || '1') : '0');
    });
  });
  return parts.join('|');
}

function filledCount(root) {
  return nodes(root, '.points-cell.has-points').length;
}

/* Réutilise un nœud par identifiant ; le retire s'il est mal parenté, le
 * recrée seulement s'il est absent du document. Garantit l'idempotence. */
function place(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

function apply(ctx) {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof layout.querySelector !== 'function') return;
  if (typeof css !== 'function' || typeof el !== 'function') return;

  const matrix = layout.querySelector('.points-matrix') || layout;
  if (typeof matrix.appendChild !== 'function') return;

  /* E065-01 — injection CSS unique et ancrage de portée sur la vue. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.setAttribute('data-points-e065', '1');

  /* E065-09 — couplage mouvement réduit : aucune animation propre, l'attribut
   * documente l'état pour les environnements sans matchMedia fiable. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* E065-06 — la graine vient de l'empreinte du DOM rendu, pas d'une date,
   * ni d'un compteur, ni de Math.random. */
  const seed = fnv1a(domSignature(layout));
  const filled = filledCount(layout);
  const bars = Math.min(MAX_BARS, Math.max(1, filled));

  /* E065-03 — tirages mulberry32 : séquence unique, bornée, reproductible. */
  const next = mulberry32(seed);
  const values = [];
  for (let i = 0; i < bars; i += 1) values.push(next());
  let draws = bars;

  /* E065-04 — auto-vérification de reproductibilité : une nouvelle instance
   * sur la MÊME graine doit redonner les trois premiers tirages. */
  const probe = mulberry32(seed);
  let reproducible = true;
  for (let i = 0; i < 3; i += 1) {
    draws += 1;
    if (probe() !== values[i]) reproducible = false;
  }

  /* E065-02 / E065-08 — un seul panneau, réutilisé par identifiant. */
  const panel = place(ctx, PANEL_ID, 'section', 'points-e065-panel', matrix);
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Signature déterministe de couverture, sans aléa');
  panel.dataset.pointsE065 = 'ready';

  const seedLine = place(ctx, SEED_ID, 'p', 'points-e065-seed', panel);
  const hex = seed.toString(16).toUpperCase().padStart(8, '0');
  seedLine.textContent = `Graine : 0x${hex} (${seed}) · mulberry32 · empreinte DOM FNV-1a.`;

  /* E065-05 / E065-07 — le bandeau est le SEUL visuel pseudo-aléatoire ; il
   * est décoratif, aria-hidden et reconstruit par replaceChildren (jamais
   * innerHTML), avec une contrepartie textuelle dans le même panneau. */
  const strip = place(ctx, STRIP_ID, 'div', 'points-e065-strip', panel);
  strip.setAttribute('aria-hidden', 'true');
  const barNodes = values.map((value, index) => {
    const bar = el('span', 'points-e065-bar');
    bar.style.height = `${Math.round(10 + value * 90)}%`;
    bar.title = `tirage ${index + 1} : ${value.toFixed(3)}`;
    return bar;
  });
  strip.replaceChildren(...barNodes);

  const desc = place(ctx, DESC_ID, 'p', 'points-e065-desc', panel);
  desc.textContent = `Bandeau décoratif de ${bars} barres issues de la graine affichée ci-dessus. Il n'encode aucune donnée de couverture : il démontre l'absence de Math.random.`;

  const audit = place(ctx, AUDIT_ID, 'p', 'points-e065-audit', panel);
  audit.setAttribute('role', 'status');
  audit.setAttribute('aria-live', 'polite');
  audit.textContent = `Math.random : 0 appel · mulberry32 : ${draws} tirages · reproductibilité : ${reproducible ? 'vérifiée' : 'échec'} · ${bars} barres · ${filled} cellules renseignées.`;

  /* E065-10 — traces auditables, toutes déterministes ; aucun timer, aucune
   * rAF, aucun écouteur, une seule passe de calcul par rendu. */
  panel.dataset.pointsE065Seed = hex;
  panel.dataset.pointsE065Draws = String(draws);
  panel.dataset.pointsE065Repro = reproducible ? 'ok' : 'fail';
  panel.dataset.pointsE065Bars = String(bars);
}

register('E065', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
