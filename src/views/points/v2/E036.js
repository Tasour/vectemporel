import { register } from './registry.js';

/* Lentille POINTS E036 — passe 2 (V2) : Navigation entre points par j / k,
 * augmentée sans jamais reprendre la touche elle-même (domaine D).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E036.md — chantiers E036-01 à E036-10.
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E036.js) ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js) n'est modifié.
 *
 * Contrat exploité : viewId ('pointsv2'), stage, layout, css(id, rules),
 * el(tag, cls, text), reducedMotion(). Toutes les valeurs affichées sont
 * dérivées du DOM réellement rendu : aucun millésime, aucun total, aucun
 * index de point n'est codé en dur ni inventé.
 *
 * Décision contractuelle importante : la passe 1 possède déjà l'unique
 * écouteur 'keydown' qui traduit j/k en activation des boutons natifs de
 * .points-nav. Cette V2 N'AJOUTE AUCUN ÉCOUTEUR GLOBAL et ne clique aucun
 * bouton : elle se contente d'enrichir l'interface (badges de touche, lectures
 * chiffrées, lien d'évitement, ancrage, étiquetage) sur le même DOM. Il n'y a
 * donc jamais de double navigation ni de vol de touche entre les deux passes.
 *
 * Invariants : une seule feuille (ctx.css), une seule portée (.points-v2-e036),
 * des ids préfixés points-v2-e036-, des signaux data-points-v2-e036 distincts
 * de ceux de la passe 1, zéro innerHTML, zéro réseau, zéro aléa, zéro timer,
 * zéro rAF, zéro écouteur, aucun appel à la console.
 */

const CSS_ID = 'points-v2-e036';
const SCOPE = 'points-v2-e036';
const DATA_SCOPE = 'pointsV2E036';
const DATA_VIEW = 'pointsV2E036View';

/* Ids DOM — tous préfixés points-v2-e036- (aucune reprise des ids de la passe 1). */
const SHARE_ID = 'points-v2-e036-share';
const TABS_ID = 'points-v2-e036-tabs';
const WARN_ID = 'points-v2-e036-warn';
const SKIP_ID = 'points-v2-e036-skip';
const TARGET_ID = 'points-v2-e036-target';

const KEY_CLASS = 'points-v2-e036-key';
const READOUT_CLASS = 'points-v2-e036-readout';
const WARN_CLASS = 'points-v2-e036-warn';
const SKIP_CLASS = 'points-v2-e036-evitement';
const READOUTS_CLASS = 'points-v2-e036-readouts';
const NAV_LABEL = 'Navigation entre les points : j pour le point suivant, k pour le point précédent.';

/* Ordre réel des boutons natifs (points.js:117-122) : 0 = précédent (k),
 * 1 = suivant (j). La V2 ne lit que cet ordre pour poser ses badges. */
const NAV_KEYS = Object.freeze([
  Object.freeze({ index: 0, key: 'k' }),
  Object.freeze({ index: 1, key: 'j' }),
]);

/* Chaque sélecteur commence littéralement par `.points-v2-e036`, y compris à
 * l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points.
 * Les attributs de donnée sont distincts de ceux de la passe 1
 * (data-points-e036-*) pour ne pas écraser ses signaux sur le DOM partagé. */
const CSS = `
  /* E036-02 : badges de touche posés sur les boutons natifs, décoratifs. */
  .points-v2-e036 .points-v2-e036-key {
    display: inline-block; min-width: 18px; margin-left: 6px; padding: 0 4px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 4px;
    color: var(--gold-bright, #e9c98f); font: inherit; font-variant-numeric: tabular-nums;
    text-align: center; vertical-align: middle;
  }
  /* E036-08 : le groupe de navigation est explicitement délimité et étiqueté
     par un filet, sans dépendre d'une couleur. */
  .points-v2-e036 .points-nav {
    border-top: 1px solid var(--line, #333);
    padding-top: 10px;
  }
  /* E036-03 / E036-04 / E036-07 : lectures chiffrées, texte intégralement
     dérivé du DOM, chiffres à largeur fixe pour la comparaison. */
  .points-v2-e036 .points-v2-e036-readouts {
    display: flex; flex-direction: column; gap: 4px; margin-top: 10px;
  }
  .points-v2-e036 .points-v2-e036-readout {
    margin: 0; color: var(--muted-2, #9a9a9a);
    font-size: 10px; line-height: 1.45; font-variant-numeric: tabular-nums;
  }
  .points-v2-e036 .points-v2-e036-warn {
    margin: 0; padding: 6px 8px;
    border: 1px solid var(--line-strong, #5b5b5b);
    border-left: 3px solid var(--gold, #e6b96f); border-radius: 6px;
    color: var(--ink-soft, #d8d8d8); font-size: 10px; line-height: 1.45;
  }
  .points-v2-e036 .points-v2-e036-warn[hidden] { display: none; }
  /* E036-05 : lien d'évitement hors écran au repos, révélé au focus. */
  .points-v2-e036 .points-v2-e036-evitement {
    position: absolute; left: -9999px; top: auto;
    min-height: 36px; padding: 8px 12px;
    border: 1px solid var(--gold, #e6b96f); border-radius: 8px;
    background: #0b0f15; color: var(--gold-bright, #e9c98f);
    font-size: 11px; text-decoration: none; z-index: 20;
  }
  .points-v2-e036 .points-v2-e036-evitement:focus {
    left: 8px; top: 8px;
  }
  /* E036-06 : ancrage de retour : le titre ciblé s'arrête sous le bord. */
  .points-v2-e036 .points-point-title { scroll-margin-top: 12px; }
  .points-v2-e036 .points-detail { scroll-behavior: smooth; }
  /* E036-09 : mouvement réduit — filet CSS indépendant du JS. */
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e036 .points-detail { scroll-behavior: auto; }
    .points-v2-e036 .points-v2-e036-evitement { transition: none; }
  }
  /* E036-09 : contraste renforcé et couleurs forcées, aucun sens porté par la
     seule couleur (les badges et lectures restent du texte lisible). */
  @media (prefers-contrast: more) {
    .points-v2-e036 .points-v2-e036-readout,
    .points-v2-e036 .points-v2-e036-warn { color: #fff; }
    .points-v2-e036 .points-v2-e036-evitement { background: #000; }
  }
  @media (forced-colors: active) {
    .points-v2-e036 .points-v2-e036-key { border-color: CanvasText; color: CanvasText; }
    .points-v2-e036 .points-v2-e036-warn { border-color: CanvasText; border-left-color: Highlight; color: CanvasText; }
    .points-v2-e036 .points-v2-e036-evitement { background: Canvas; color: CanvasText; border-color: CanvasText; }
  }
  /* E036-10 : sur 390 × 844, les lectures restent compactes et le lien garde
     une citable tactile ≥ 36 px ; hors écran imprimé, tout le chrome V2 est masqué. */
  @media (max-width: 620px) {
    .points-v2-e036 .points-v2-e036-readouts { gap: 3px; margin-top: 8px; }
    .points-v2-e036 .points-v2-e036-readout,
    .points-v2-e036 .points-v2-e036-warn { font-size: 9px; }
    .points-v2-e036 .points-v2-e036-key { min-width: 20px; }
  }
  @media print {
    .points-v2-e036 .points-v2-e036-key,
    .points-v2-e036 .points-v2-e036-readouts,
    .points-v2-e036 .points-v2-e036-evitement { display: none; }
  }
`;

/* Dérive le nombre initial d'une chaîne du type « 12 point(s) … ». Aucun
 * chiffre n'est fabriqué : absence de correspondance -> null. */
function leadingCount(node) {
  if (!node || typeof node.textContent !== 'string') return null;
  const match = node.textContent.match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

/* E036-03 : part du périmètre dans le corpus, deux grandeurs lues sur le DOM
 * (points.js:33 « N points isolés » et points.js:97 « M point(s) dans ce
 * périmètre »). Le pourcentage est borné et arrondi, jamais codé en dur. */
function perimeterShare(matrix, detail) {
  const inScope = leadingCount(detail && detail.querySelector('.view-kicker'));
  const total = leadingCount(matrix && matrix.querySelector('.points-title'));
  if (inScope === null || total === null || total <= 0) return null;
  const pct = Math.max(0, Math.min(100, Math.round((inScope / total) * 100)));
  return { inScope, total, pct };
}

/* E036-04 : nombre d'arrêts de tabulation réellement présents dans la vue. */
function tabStopCount(layout) {
  if (!layout || typeof layout.querySelectorAll !== 'function') return null;
  const selector = 'button:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
  return layout.querySelectorAll(selector).length;
}

/* E036-05 : cible du lien d'évitement, dérivée du titre réel. On ne pose un id
 * propre que si le titre n'en a déjà aucun, afin de ne pas écraser un id
 * existant posé par une autre lentille. */
function skipTarget(detail) {
  const title = detail && detail.querySelector('.points-point-title');
  if (!title) return null;
  let id = title.id;
  if (!id) {
    id = TARGET_ID;
    title.id = id;
  }
  return id;
}

/* Réutilise un nœud par id, en nettoyant au préalable un nœud périmé resté
 * dans le stage Suite au re-rendu de la coque. Création toujours via ctx.el. */
function ensure(ctx, parent, id, tag, className, text) {
  let node = parent.querySelector('#' + id);
  const root = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;
  if (!node && root) {
    const stale = root.querySelector('#' + id);
    if (stale && !parent.contains(stale)) stale.remove();
  }
  if (!node) {
    node = ctx.el(tag, className, text === undefined ? '' : text);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

/* E036-02 : un badge décoratif par bouton de navigation, posé selon l'ordre
 * réel des boutons. aria-hidden garde le nom accessible du bouton intact. */
function badgeNavButtons(ctx, detail) {
  const nav = detail && detail.querySelector('.points-nav');
  if (!nav || typeof nav.querySelectorAll !== 'function') return;
  const buttons = nav.querySelectorAll('button');
  NAV_KEYS.forEach(({ index, key }) => {
    const button = buttons[index];
    if (!button || !button.isConnected) return;
    if (button.querySelector('.' + KEY_CLASS)) return;
    const badge = ctx.el('kbd', KEY_CLASS, key);
    badge.setAttribute('aria-hidden', 'true');
    button.appendChild(badge);
  });
}

function apply(ctx) {
  /* E036-01 : filtre sur la vue V2 et gardes de type pour un ctx minimal. */
  if (!ctx || ctx.viewId !== 'pointsv2') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;

  const detail = layout.querySelector('.points-detail');
  const matrix = layout.querySelector('.points-matrix');

  /* E036-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  if (layout.dataset) {
    layout.dataset[DATA_SCOPE] = '1';
    layout.dataset[DATA_VIEW] = 'pointsv2';
  }

  if (!detail) return;

  /* E036-02 : badges j / k sur les boutons natifs. */
  badgeNavButtons(ctx, detail);

  /* E036-08 : le groupe reçoit un rôle et un libellé explicites, sans toucher
   * aux boutons ni à leurs gestionnaires. */
  const nav = detail.querySelector('.points-nav');
  if (nav && typeof nav.setAttribute === 'function') {
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', NAV_LABEL);
  }

  /* Conteneur unique des lectures chiffrées, placé après la navigation. */
  let reads = detail.querySelector('.' + READOUTS_CLASS);
  if (!reads) {
    reads = ctx.el('div', READOUTS_CLASS);
    if (nav && nav.nextSibling) detail.insertBefore(reads, nav.nextSibling);
    else detail.appendChild(reads);
  }

  /* E036-03 : part du périmètre dans le corpus. */
  const share = perimeterShare(matrix, detail);
  const shareNode = ensure(ctx, reads, SHARE_ID, 'p', READOUT_CLASS);
  shareNode.textContent = share
    ? `Périmètre : ${share.inScope} point(s) sur ${share.total} (${share.pct} % du corpus).`
    : 'Périmètre : décompte indisponible dans cette vue.';

  /* E036-04 : arrêts de tabulation. */
  const tabs = tabStopCount(layout);
  const tabsNode = ensure(ctx, reads, TABS_ID, 'p', READOUT_CLASS);
  tabsNode.textContent = tabs === null
    ? 'Navigation clavier : décompte indisponible dans cette vue.'
    : `Navigation clavier : ${tabs} contrôle(s) atteignable(s) au Tab dans cette vue.`;

  /* E036-07 : avertissement quand j / k ne peut rien déplacer (0 ou 1 point). */
  const inScope = leadingCount(detail.querySelector('.view-kicker'));
  const warn = ensure(ctx, reads, WARN_ID, 'p', WARN_CLASS);
  if (inScope !== null && inScope <= 1) {
    warn.textContent = `Navigation j / k sans effet : ce périmètre contient ${inScope} point(s).`;
    warn.hidden = false;
  } else {
    warn.textContent = '';
    warn.hidden = true;
  }

  /* E036-05 : lien d'évitement vers le point courant, première commande utile
   * de la vue, inséré en tête du layout. */
  const targetId = skipTarget(detail);
  if (targetId) {
    const skip = ensure(ctx, layout, SKIP_ID, 'a', SKIP_CLASS, 'Aller au point courant');
    skip.setAttribute('href', '#' + targetId);
    if (layout.firstChild !== skip) layout.insertBefore(skip, layout.firstChild);
  }

  /* E036-09 : couplage explicite à la préférence de mouvement (filet CSS en
   * complément). L'attribut est distinct de celui de la passe 1. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute('data-points-v2-e036-motion', 'reduce');
  } else {
    layout.removeAttribute('data-points-v2-e036-motion');
  }
}

register('E036', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
