import { register } from './registry.js';

/* Lentille E037 — Navigation & clavier (domaine D) : focus visible renforcé
 * sur TOUS les contrôles de la vue Points.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E037.md — chantiers E037-01 à E037-10.
 * Fichier possédé : ce module uniquement. La vue `src/views/points.js`, le
 * registre, le store et la coque ne sont ni édités ni doublés.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion (tels que fournis par points/registry.js:28-44). Tout est
 * DÉRIVÉ DU DOM rendu : aucun libellé, aucun chiffre, aucune ère codés en dur.
 *
 * Complémentarité : E004/E013 posent un contour :focus-visible simple, E035
 * documente les raccourcis clavier. E037 ajoute un anneau ÉPAIS et DÉCALÉ
 * (contour + double box-shadow, donc jamais la seule couleur), pondéré par
 * une repli `@supports`, et un repère auditable sur le contrôle réellement
 * focalisé au clavier. Aucun de ces modules n'est modifié.
 *
 * Invariants :
 * - un seul register, un seul CSS (ctx.css('points-e037', …)), un seul panneau,
 *   un seul jeu de deux écouteurs (focusin/focusout) par rendu ;
 * - non destructif : aucune classe, aucun attribut, aucun gestionnaire natif
 *   n'est retiré ; seuls des ajouts réversibles (classe + data-*) sont posés ;
 * - idempotent : marqueur sur le layout, nœud réutilisé par identifiant,
 *   écouteurs attachés au layout courant, aucun nœud périmé conservé ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro innerHTML, zéro
 *   console.*, aucune boucle d'animation.
 */

const CSS_ID = 'points-e037';
const CONTROL_CLASS = 'points-e037-control';
const PANEL_ID = 'points-e037-focus-help';
const TITLE_ID = 'points-e037-focus-title';
const STATUS_ID = 'points-e037-focus-status';
const SCOPE = `.points-layout[data-points-e037="1"] .${CONTROL_CLASS}`;

/* E037-01 / -03 / -05 — Feuille unique et préfixée, sans ressource distante.
 * L'anneau combine contour solide + décalage + double box-shadow : l'indice
 * n'est jamais porté par la seule couleur. Le !important ne neutralise aucun
 * comportement : il fait simplement prévaloir l'anneau renforcé sur les
 * contours :focus-visible plus fins posés par d'autres lentilles. */
const CSS = `
  ${SCOPE}:focus-visible {
    outline: 3px solid var(--gold-bright, #f0d49a) !important;
    outline-offset: 3px !important;
    box-shadow: 0 0 0 1px #0b0f15, 0 0 0 4px var(--gold, #e6b96f);
    border-radius: 6px;
  }
  /* E037-04 — repli lorsque :focus-visible n'est pas pris en charge. */
  @supports not selector(:focus-visible) {
    ${SCOPE}:focus {
      outline: 3px solid var(--gold-bright, #f0d49a) !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 0 1px #0b0f15, 0 0 0 4px var(--gold, #e6b96f);
    }
  }
  /* E037-06 — en mode couleurs forcées, le contour reste une forme nette. */
  @media (forced-colors: active) {
    ${SCOPE}:focus-visible,
    ${SCOPE}:focus { outline: 3px solid CanvasText !important; outline-offset: 3px !important; }
  }
  #${PANEL_ID} {
    margin: 10px 0 0; padding: 8px 10px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 8px;
    background: rgba(230, 185, 111, .05); color: var(--ink-soft);
    font-size: 10px; line-height: 1.5;
  }
  #${PANEL_ID} h2 { margin: 0 0 4px; font-size: 11px; color: var(--gold-bright, #f0d49a); }
  #${PANEL_ID} p { margin: 0 0 4px; }
  #${PANEL_ID} .points-e037-status { margin: 0; color: var(--gold, #e6b96f); font-variant-numeric: tabular-nums; }
  @media (max-width: 620px) {
    #${PANEL_ID} { font-size: 9px; }
  }
  /* E037-10 — aucune transition n'est ajoutée ; neutralisation explicite. */
  @media (prefers-reduced-motion: reduce) {
    ${SCOPE} { transition: none; }
  }
`;

let currentStatus = null;   // nœud live du rendu courant, jamais d'un rendu périmé
let focusCount = 0;         // focus clavier réellement observés (dérivé d'événements)
let controlsTotal = 0;      // nombre de contrôles tagués, lu sur le DOM
let lastSignature = '';     // garde anti-écritures redondantes
let activeControl = null;   // dernier contrôle marqué, pour nettoyage

function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelectorAll === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelectorAll === 'function') return ctx.stage;
  return null;
}

/* E037-02 / -07 — réutilise un nœud par identifiant ; le recrée seulement s'il
 * est absent, déconnecté ou mal parenté. Garantit l'idempotence après rendu. */
function place(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected || node.parentElement !== parent) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

/* E037-08 — status narratif, dérivé du nombre réel de contrôles et des focus
 * observés. Aucun chiffre littéral, aucune date. */
function refreshStatus() {
  if (!currentStatus) return;
  const text = `${controlsTotal} contrôle${controlsTotal > 1 ? 's' : ''} renforcé${controlsTotal > 1 ? 's' : ''} · focus clavier observés : ${focusCount}.`;
  if (text === lastSignature) return;
  lastSignature = text;
  currentStatus.textContent = text;
}

/* E037-06 — le marqueur data est un crochet d'audit, pas une info colorée :
 * l'anneau solide et décalé reste lisible sans lui. */
function clearMarker() {
  if (activeControl && activeControl.dataset) delete activeControl.dataset.pointsE037Focus;
  activeControl = null;
}

function onFocusIn(event) {
  const target = event.target;
  if (!target || !target.classList || !target.classList.contains(CONTROL_CLASS)) return;
  let keyboard = true;
  try { keyboard = !!target.matches(':focus-visible'); }
  catch { /* repli prudent : on compte comme focus clavier */ }
  clearMarker();
  activeControl = target;
  if (keyboard && target.dataset) {
    target.dataset.pointsE037Focus = 'true';
    focusCount += 1;
    refreshStatus();
  }
}

function onFocusOut(event) {
  if (event.target === activeControl) clearMarker();
}

/* E037-07 — panneau LOCAL non modal :role=region, pas de dialog, pas de piège
 * de focus, aucune touche réservée détournée (E035 reste maître du clavier). */
function buildPanel(ctx, panel) {
  panel.replaceChildren();
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Focus clavier renforcé');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', '',
    'Chaque contrôle de cette vue — boutons d’ère, cellules de la matrice, listes de filtres, réinitialisation et navigation — affiche un anneau épais et décalé quand il reçoit le focus au clavier. Tab et Maj+Tab parcourent les contrôles ; Entrée ou Espace les active.'));

  currentStatus = ctx.el('p', 'points-e037-status', '');
  currentStatus.id = STATUS_ID;
  currentStatus.setAttribute('role', 'status');
  currentStatus.setAttribute('aria-live', 'polite');
  currentStatus.setAttribute('aria-atomic', 'true');
  panel.appendChild(currentStatus);
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = rootOf(ctx);
  if (!layout) return;

  ctx.css(CSS_ID, CSS);

  /* E037-09 — un second appel sur le MÊME layout ne fait que rafraîchir le
   * statut : aucun doublon de classe, de panneau ou d'écouteur. */
  if (layout.dataset.pointsE037 === '1') {
    refreshStatus();
    return;
  }

  focusCount = 0;
  lastSignature = '';
  clearMarker();

  /* E037-02 — couverture exhaustive, énumérée depuis le DOM rendu. */
  const controls = Array.prototype.slice.call(
    layout.querySelectorAll('button, select, a[href], [tabindex]:not([tabindex="-1"])')
  );
  controls.forEach((control) => {
    if (!control.classList.contains(CONTROL_CLASS)) control.classList.add(CONTROL_CLASS);
  });
  controlsTotal = controls.length;

  const matrix = layout.querySelector('.points-matrix') || layout;
  const panel = place(ctx, PANEL_ID, 'section', 'points-e037-help', matrix);
  buildPanel(ctx, panel);

  /* E037-09 — marqueurs préfixés, lisibles par les autres lentilles sans
   * occuper de nom générique. */
  layout.dataset.pointsE037 = '1';
  layout.dataset.pointsE037Controls = String(controlsTotal);

  layout.addEventListener('focusin', onFocusIn);
  layout.addEventListener('focusout', onFocusOut);
  refreshStatus();
}

register('E037', install);
