import { register } from './registry.js';

/* Lentille E092 — Performance de rendu appliquée au champ d'étoiles de la vue
   Constellation. Dix chantiers locaux et variés : confinement de peinture,
   couche SVG compositée, géométrie mise en cache, écouteurs délégués,
   écritures groupées, régime d'ombres allégé, veille hors écran, mouvement
   réduit, garde-fou de budget et sceau auditable.

   Rapport : UNIFIED_AUDIT/CONSTELLATION/views/E092.md — E092-01 à E092-10.
   Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité :
   ni registry.js, ni index.js, ni constellation.js, ni styles.css.

   Contrat : register('E092', ctx => { … }) avec
   ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text), reducedMotion() }.
   ctx.layout est vérifié avant tout ajout au DOM ; une seule feuille CSS est
   injectée sous l'identifiant constellation-e092. Tous les identifiants DOM
   créés portent le préfixe e092-. Aucun appel réseau, aucune source aléatoire,
   aucune sortie de débogage, aucune minuterie ni boucle d'animation propre. */

const CSS_ID = 'constellation-e092';
const MARQUE = 'data-e092-on';
const PANNEAU_ID = 'e092-perf-audit';
const LIVE_ID = 'e092-perf-live';
const SELECTEUR_NOEUDS = '.const-sun, .const-planet, .const-moon';

const CSS = `
.e092-audit{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout[data-e092-on] .constellation-field{contain:layout paint style;isolation:isolate}
.constellation-layout[data-e092-on] .const-layer{contain:layout paint style;content-visibility:auto;contain-intrinsic-size:1px 240px}
.constellation-layout[data-e092-on] .constellation-edges{will-change:transform;transform:translateZ(0);shape-rendering:optimizeSpeed;backface-visibility:hidden}
.constellation-layout[data-e092-on] .constellation-field[data-e092-dormant] .const-layer,
.constellation-layout[data-e092-on] .constellation-field[data-e092-dormant] .constellation-edges{content-visibility:hidden;will-change:auto}
.constellation-layout[data-e092-on] .constellation-field[data-e092-legers] .const-moon.is-active{box-shadow:none}
.constellation-layout[data-e092-on] .constellation-field[data-e092-surcharge] .constellation-edges line:not(.is-path){display:none}
.constellation-layout[data-e092-on].e092-calm .constellation-field *{transition:none!important;animation:none!important}
.constellation-layout[data-e092-on].e092-calm .constellation-edges{will-change:auto;transform:none}
@media (prefers-reduced-motion: reduce){
  .constellation-layout[data-e092-on] .constellation-field *{transition:none!important;animation:none!important}
  .constellation-layout[data-e092-on] .constellation-edges{will-change:auto;transform:none}
}
`;

/* Une seule mesure de géométrie par nœud, réutilisée aux passes suivantes. */
const geometries = new WeakMap();
/* Un seul jeu d'écouteurs et un seul observateur par champ, même après re-rendu. */
const champsDecores = new WeakSet();
const champsObserves = new WeakSet();

function lireVar(node, nom) {
  try { return String(node.style.getPropertyValue(nom) || '').trim(); }
  catch { return ''; }
}

function ecrireVar(node, nom, valeur) {
  try { node.style.setProperty(nom, valeur); return true; }
  catch { return false; }
}

function nombre(node, nom, secours) {
  const valeur = parseFloat(lireVar(node, nom));
  return Number.isFinite(valeur) ? valeur : secours;
}

function cibleNoeud(event, field) {
  const cible = event && event.target;
  if (!cible || cible.nodeType !== 1 || typeof cible.closest !== 'function') return null;
  const node = cible.closest(SELECTEUR_NOEUDS);
  return node && field.contains(node) ? node : null;
}

/* E092-01 — Confinement de peinture du champ et de ses couches : la feuille
   unique applique contain: layout paint style et content-visibility: auto aux
   trois couches ; le champ reçoit data-e092-contain="on". */
function confinement(layout, field) {
  layout.setAttribute(MARQUE, 'on');
  if (!field || !field.setAttribute) return 0;
  field.setAttribute('data-e092-contain', 'on');
  return 1;
}

/* E092-02 — Promotion ciblée du SVG d'arêtes : will-change, transform 3D et
   shape-rendering optimizeSpeed sont réservés au seul calque décoratif, qui
   reçoit data-e092-gpu="on" ; aucun autre nœud n'est promu. */
function promotionGPU(edges) {
  if (!edges || !edges.setAttribute) return 0;
  edges.setAttribute('data-e092-gpu', 'on');
  return 1;
}

/* E092-03 — Géométrie mesurée une seule fois : getBoundingClientRect est lu
   au plus une fois par nœud et mis en cache dans une WeakMap ; les passes
   suivantes réutilisent la valeur au lieu de relancer un calcul de layout. */
function cacheGeometrie(noeuds, field) {
  let caches = 0;
  noeuds.forEach((node) => {
    if (geometries.has(node)) return;
    let rect = null;
    try { rect = node.getBoundingClientRect(); }
    catch { rect = null; }
    const valide = rect && rect.width > 0 && rect.height > 0;
    geometries.set(node, valide
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, largeur: rect.width, hauteur: rect.height }
      : null);
    caches += 1;
  });
  if (field && field.setAttribute) field.setAttribute('data-e092-geometry', String(noeuds.length));
  return caches;
}

/* E092-04 — Écouteurs délégués uniques : un seul pointerover, pointerout et
   focusin sur le champ (WeakSet), posant data-e092-hover / data-e092-focus sur
   le nœud visé ; aucun écouteur par bouton, aucun doublon après re-rendu. */
function deleguerEcouteurs(field) {
  if (!field || typeof field.addEventListener !== 'function') return 0;
  if (champsDecores.has(field)) {
    field.setAttribute('data-e092-delegue', 'on');
    return 0;
  }
  champsDecores.add(field);
  field.addEventListener('pointerover', (event) => {
    const node = cibleNoeud(event, field);
    if (node) node.setAttribute('data-e092-hover', '1');
  });
  field.addEventListener('pointerout', (event) => {
    const node = cibleNoeud(event, field);
    if (node) node.removeAttribute('data-e092-hover');
  });
  field.addEventListener('focusin', (event) => {
    const node = cibleNoeud(event, field);
    if (node) node.setAttribute('data-e092-focus', '1');
  });
  field.setAttribute('data-e092-delegue', 'on');
  return 3;
}

/* E092-05 — Écritures groupées et arrondies : toutes les positions sont lues
   d'abord, puis réécrites en une seule passe au dixième de pourcentage, et
   seulement si la valeur change ; data-e092-batch consigne les écritures. */
function ecrirePositions(noeuds, field) {
  const lectures = noeuds.map((node) => ({
    node,
    x: nombre(node, '--x', Number.NaN),
    y: nombre(node, '--y', Number.NaN),
  }));
  let ecrit = 0;
  lectures.forEach(({ node, x, y }) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const nx = Math.round(x * 10) / 10;
    const ny = Math.round(y * 10) / 10;
    if (nx !== x && ecrireVar(node, '--x', `${nx.toFixed(1)}%`)) ecrit += 1;
    if (ny !== y && ecrireVar(node, '--y', `${ny.toFixed(1)}%`)) ecrit += 1;
  });
  if (field && field.setAttribute) field.setAttribute('data-e092-batch', String(ecrit));
  return ecrit;
}

/* E092-06 — Régime d'ombres allégé : au-delà de douze nœuds coûteux ou en
   mouvement réduit, data-e092-legers active une feuille qui supprime
   l'ombre portée de la lune active ; data-e092-ombres compte les nœuds actifs. */
function regimeOmbres(noeuds, field, sobre) {
  if (!field || !field.setAttribute) return 0;
  const actifs = noeuds.filter((node) => node.classList && node.classList.contains('is-active')).length;
  if (estLeger(noeuds.length, sobre)) field.setAttribute('data-e092-legers', 'on');
  else field.removeAttribute('data-e092-legers');
  field.setAttribute('data-e092-ombres', String(actifs));
  return actifs;
}

function estLeger(total, sobre) {
  return sobre || total > 12;
}

/* E092-07 — Veille hors écran : un seul IntersectionObserver par champ pose
   data-e092-dormant="on" quand le champ quitte la fenêtre ; la feuille met
   alors les couches en content-visibility: hidden et libère will-change. */
function veilleHorsEcran(field) {
  if (!field || !field.setAttribute || champsObserves.has(field)) return 0;
  if (typeof IntersectionObserver === 'undefined') return 0;
  champsObserves.add(field);
  try {
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) field.removeAttribute('data-e092-dormant');
        else field.setAttribute('data-e092-dormant', 'on');
      });
    }, { root: null, threshold: 0 });
    observateur.observe(field);
    field.setAttribute('data-e092-io', 'on');
    return 1;
  } catch {
    return 0;
  }
}

/* E092-08 — Mouvement réduit : ctx.reducedMotion() pilote la classe e092-calm
   du layout et data-e092-calm du champ, qui annulent transitions, animations
   et promotion GPU sans toucher au contenu ni au focus. */
function mouvementReduit(layout, field, ctx, sobre) {
  if (sobre) {
    layout.classList.add('e092-calm');
    if (field && field.setAttribute) field.setAttribute('data-e092-calm', 'on');
  } else {
    layout.classList.remove('e092-calm');
    if (field && field.removeAttribute) field.removeAttribute('data-e092-calm');
  }
  return sobre ? 1 : 0;
}

/* E092-09 — Garde-fou de budget : le total des nœuds et des arêtes est calculé
   une seule fois ; au-delà de 48, data-e092-surcharge masque les traits
   décoratifs non prioritaires pour limiter le nombre d'opérations de rendu. */
function budgetNoeuds(noeuds, edges, field) {
  let lignes = 0;
  try {
    if (edges && typeof edges.querySelectorAll === 'function') {
      lignes = edges.querySelectorAll('line').length;
    }
  } catch {
    lignes = 0;
  }
  const total = noeuds.length + lignes;
  if (!field || !field.setAttribute) return total;
  if (total > 48) field.setAttribute('data-e092-surcharge', String(total));
  else field.removeAttribute('data-e092-surcharge');
  return total;
}

/* E092-10 — Sceau auditable : compteurs sur le layout (data-e092-perf,
   data-e092-checks) et panneau #e092-perf-audit recréé de façon idempotente,
   avec une région live #e092-perf-live en texte réel et lisible. */
function scellerAudit(ctx, counts, noeuds) {
  const layout = ctx.layout;
  layout.setAttribute(MARQUE, 'on');
  layout.setAttribute('data-e092-perf', String(noeuds.length));
  layout.setAttribute('data-e092-checks', counts
    .map((n, index) => `${String(index + 1).padStart(2, '0')}:${n}`).join(' '));

  let panneau = document.getElementById(PANNEAU_ID);
  if (!panneau || panneau.parentNode !== layout) {
    if (panneau && panneau.parentNode) panneau.parentNode.removeChild(panneau);
    panneau = ctx.el('section', 'e092-audit');
    panneau.id = PANNEAU_ID;
    panneau.setAttribute('aria-label', 'Synthèse de performance du champ d’étoiles');
    layout.appendChild(panneau);
  }
  while (panneau.firstChild) panneau.removeChild(panneau.firstChild);
  panneau.appendChild(ctx.el('h3', 'e092-audit-titre', 'Performance de rendu — E092'));
  panneau.appendChild(ctx.el('p', 'e092-audit-ligne',
    `${noeuds.length} nœud(s) du champ examiné(s) · ${counts.reduce((somme, n) => somme + n, 0)} effet(s) au total.`));
  counts.forEach((n, index) => {
    panneau.appendChild(ctx.el('p', 'e092-audit-ligne',
      `E092-${String(index + 1).padStart(2, '0')} : ${n} effet(s).`));
  });
  let live = document.getElementById(LIVE_ID);
  if (!live || live.parentNode !== panneau) {
    live = ctx.el('p', 'e092-audit-ligne', '');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    panneau.appendChild(live);
  }
  const sobre = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  live.textContent = `Rendu local, sans réseau : ${noeuds.length} nœud(s), `
    + `${counts.filter((n) => n > 0).length} chantier(s) actif(s), `
    + `mouvement réduit ${sobre ? 'actif' : 'inactif'}.`;
}

register('E092', (ctx) => {
  /* Contrat : ctx.layout est exigé avant la moindre insertion dans le DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;
  if (typeof document === 'undefined') return;

  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field');
  const edges = layout.querySelector('.constellation-edges');
  const noeuds = field && typeof field.querySelectorAll === 'function'
    ? Array.from(field.querySelectorAll(SELECTEUR_NOEUDS)) : [];
  const sobre = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();

  try { ctx.css(CSS_ID, CSS); }
  catch { /* greffon tolérant : la structure reste lisible sans la feuille. */ }

  const etapes = [
    () => confinement(layout, field),
    () => promotionGPU(edges),
    () => cacheGeometrie(noeuds, field),
    () => deleguerEcouteurs(field),
    () => ecrirePositions(noeuds, field),
    () => regimeOmbres(noeuds, field, sobre),
    () => veilleHorsEcran(field),
    () => mouvementReduit(layout, field, ctx, sobre),
    () => budgetNoeuds(noeuds, edges, field),
  ];
  const counts = etapes.map((etape) => {
    try { return Math.max(0, Number(etape()) || 0); }
    catch { return 0; }
  });
  counts.push(1); // E092-10 : le sceau et le panneau sont produits à chaque passe.

  try { scellerAudit(ctx, counts, noeuds); }
  catch { /* greffon tolérant : un rendu partiel reste lisible. */ }
});
