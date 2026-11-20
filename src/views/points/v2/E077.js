import { register } from './registry.js';

/* Lentille POINTS V2 E077 — passe 2 (V2) — domaine H : responsive & mobile.
 * Contraste renforcé, couleurs forcées et reflow, de façon NON destructive et
 * distincte de la passe 1 (src/views/points/E077.js).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E077.md — chantiers V2 E077-01 à
 * E077-10. Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E077.js) ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js) n'est édité.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc sur 'pointsv2' (et non 'points' en passe 1). Les identifiants, classes,
 * attributs et signaux sont TOUS préfixés points-v2-e077 / data-points-v2-e077
 * (clés pointsV2E077*) afin de ne pas écraser ceux de la passe 1
 * (points-e077-*, data-e077-*) qui s'appliquent au même DOM. Le ctx n'expose
 * toujours pas say() : la ligne de statut est un <p role=status aria-live=polite>
 * local, créé par ctx.el et mis à jour par textContent uniquement.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance vers le store, les filtres, le détail ni
 * aucune donnée chiffrée inventée : seuls des seuils de mise en page et des
 * libellés de préférence sont définis.
 *
 * Invariants V2 : un seul greffon register('E077', ctx => …), une seule feuille
 * ctx.css('points-v2-e077', CSS) dont TOUS les sélecteurs commencent par
 * .points-v2-e077, des ids uniques points-v2-e077-* protégés contre les doublons,
 * le DOM statique créé par ctx.el (jamais de balisage interprété), un seul couple
 * d'écouteurs matchMedia pour la session, zéro console, zéro réseau, zéro aléa,
 * zéro timer, zéro rAF, zéro écouteur global.
 */

const CSS_ID = 'points-v2-e077';
const SCOPE = 'points-v2-e077';
const LEGEND_CLASS = 'points-v2-e077-legend';
const NOTE_CLASS = 'points-v2-e077-note';
const MODE_CLASS = 'points-v2-e077-mode';
const STILL_CLASS = 'points-v2-e077-still';

const ID = {
  legend: 'points-v2-e077-legend',
  note: 'points-v2-e077-note',
  mode: 'points-v2-e077-mode',
};

/* Clés dataset distinctes de la passe 1 (e077Forced, e077Contrast) : les deux
 * lentilles coexistent sur les mêmes nœuds sans se effacer mutuellement. */
const DATA = {
  scope: 'pointsV2E077',
  ready: 'pointsV2E077Ready',
  forced: 'pointsV2E077Forced',
  contrast: 'pointsV2E077Contrast',
};

const CONTRAST_QUERY = '(prefers-contrast: more)';
const FORCED_QUERY = '(forced-colors: active)';

const NOTE_TEXT = 'Lisibilité V2 : contraste renforcé et couleurs forcées sont détectés automatiquement. Chaque état actif est doublé par une bordure et par un marqueur textuel, jamais par la couleur seule ; la grille se réorganise en une colonne sur écran étroit.';

/* Feuille unique. Chaque sélecteur COMMENCE littéralement par .points-v2-e077
 * (y compris à l'intérieur des @media) : aucune règle ne peut fuir hors de la
 * vue Points. Le seuil de 820 px complète le 700 px de la passe 1 (zoom 200 %
 * et tablettes) ; la cible tactile est de 44 px, le focus est visible en double
 * anneau, et le mouvement réduit est neutralisé deux fois (classe pilotée par
 * ctx.reducedMotion() ET media query). */
const CSS = `
  /* V2 E077-01 : ancrage de portée, posé sur .points-layout par apply(). */
  .points-v2-e077 { min-width: 0; }

  /* V2 E077-02 : miroir JS des préférences, relu comme renforcement conditionnel
   * à l'intérieur des blocs système. */
  @media (prefers-contrast: more) {
    .points-v2-e077[data-points-v2-e077-contrast="more"] .points-grid { border-color: var(--gold-bright, #f0d49a); }
  }
  @media (forced-colors: active) {
    .points-v2-e077[data-points-v2-e077-forced="active"] .points-detail { border-color: Highlight; }
  }

  /* V2 E077-03 : reflow à 820 px — aucune largeur fixe, une seule colonne,
   * textes non tronqués. */
  @media (max-width: 820px) {
    .points-v2-e077.points-layout {
      display: block; height: auto; min-height: 0; overflow: visible;
    }
    .points-v2-e077 .points-matrix,
    .points-v2-e077 .points-detail {
      overflow: visible; padding: 16px 12px 24px;
    }
    .points-v2-e077 .points-detail {
      border-left: 0; border-top: 1px solid var(--line-strong, #6b6b6b);
    }
    .points-v2-e077 .points-grid-row {
      display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0;
    }
    .points-v2-e077 .points-grid-row > * { min-width: 0; }
  }
  .points-v2-e077 .points-point-title,
  .points-v2-e077 .points-point-text,
  .points-v2-e077 .points-sources,
  .points-v2-e077 .points-justification,
  .points-v2-e077 .points-meta span,
  .points-v2-e077 .points-families span { overflow-wrap: anywhere; word-break: normal; }

  /* V2 E077-04 : cibles tactiles 44 px, espacement et désactivation du
   * double-tap zoom sur la zone mobile. */
  @media (max-width: 820px) {
    .points-v2-e077 .points-grid-row > span,
    .points-v2-e077 .points-grid-row > button,
    .points-v2-e077 .points-filters select,
    .points-v2-e077 .points-filters button,
    .points-v2-e077 .points-nav button {
      min-height: 44px; min-width: 44px; margin: 2px;
      touch-action: manipulation;
    }
  }

  /* V2 E077-05 : prefers-contrast: more — bordure de 2 px et textes opaques,
   * technique distincte du simple changement de fond de la passe 1. */
  @media (prefers-contrast: more) {
    .points-v2-e077 .points-grid,
    .points-v2-e077 .points-grid-row,
    .points-v2-e077 .points-detail,
    .points-v2-e077 .points-filters select,
    .points-v2-e077 .points-filters button,
    .points-v2-e077 .points-nav button,
    .points-v2-e077 .points-v2-e077-legend {
      background: #05070a; border: 2px solid var(--gold-bright, #f0d49a);
      color: var(--ink, #f5f1e8); text-shadow: none;
    }
    .points-v2-e077 .points-point-text,
    .points-v2-e077 .points-justification,
    .points-v2-e077 .points-sources,
    .points-v2-e077 .points-meta span,
    .points-v2-e077 .points-families span {
      color: var(--ink-soft, #d8d2c4); opacity: 1;
    }
  }

  /* V2 E077-06 : couleurs forcées — frontières système sur les surfaces
   * (Canvas/CanvasText) et sur les commandes (ButtonFace/ButtonText). */
  @media (forced-colors: active) {
    .points-v2-e077 .points-grid,
    .points-v2-e077 .points-grid-row,
    .points-v2-e077 .points-grid-row > span,
    .points-v2-e077 .points-detail,
    .points-v2-e077 .points-meta span,
    .points-v2-e077 .points-families span,
    .points-v2-e077 .points-v2-e077-legend {
      border: 2px solid CanvasText; background: Canvas; color: CanvasText;
      forced-color-adjust: auto;
    }
    .points-v2-e077 .points-grid-row > button,
    .points-v2-e077 .points-filters select,
    .points-v2-e077 .points-filters button,
    .points-v2-e077 .points-nav button {
      border: 2px solid ButtonText; background: ButtonFace; color: ButtonText;
      forced-color-adjust: auto;
    }
  }

  /* V2 E077-07 : état actif / cellule peuplée — liseré Highlight PLUS glyphe
   * textuel, donc identifiable même quand le système écrase les fonds. */
  @media (forced-colors: active) {
    .points-v2-e077 .points-grid-row.is-active > :first-child,
    .points-v2-e077 .points-cell.has-points {
      outline: 3px solid Highlight; outline-offset: -3px; font-weight: 700;
    }
    .points-v2-e077 .points-grid-row.is-active > :first-child::before { content: "▸ "; }
    .points-v2-e077 .points-cell.has-points::before { content: "● "; }
  }

  /* V2 E077-08 : focus visible en double anneau ; en couleurs forcées la
   * box-shadow est neutralisée mais l'outline Highlight subsiste. */
  .points-v2-e077 button:focus-visible,
  .points-v2-e077 select:focus-visible {
    outline: 3px solid var(--gold-bright, #f0d49a); outline-offset: 2px;
    box-shadow: 0 0 0 5px rgba(230, 185, 111, .28);
  }
  @media (forced-colors: active) {
    .points-v2-e077 button:focus-visible,
    .points-v2-e077 select:focus-visible {
      outline: 3px solid Highlight; outline-offset: 2px; box-shadow: none;
    }
  }

  /* V2 E077-09 : légende statique unique, lisible sans JS et hors région live. */
  .points-v2-e077 .points-v2-e077-legend {
    margin: 0 0 14px; padding: 10px 12px;
    border: 2px solid var(--line-strong, #6b6b6b); border-radius: 8px;
    background: rgba(230, 185, 111, .08); font-size: 11px; line-height: 1.5;
  }
  .points-v2-e077 .points-v2-e077-note { margin: 0 0 6px; color: var(--muted-2, #9a9a9a); }
  .points-v2-e077 .points-v2-e077-mode {
    margin: 0; color: var(--ink-soft, #d8d2c4); font-variant-numeric: tabular-nums;
  }

  /* V2 E077-10 : mouvement réduit — aucune transition propre à E077 V2. */
  .points-v2-e077.points-v2-e077-still button,
  .points-v2-e077.points-v2-e077-still select { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e077 button,
    .points-v2-e077 select { transition: none; }
  }
`;

let currentRoot = null;   // dernier .points-layout vu, pour les écouteurs
let listenersBound = false; // un seul couple d'écouteurs pour toute la session

/* Détection tolérante : un environnement sans matchMedia ou qui lève une
 * exception ne doit jamais faire échouer le rendu de la vue. */
function matches(query) {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(query).matches;
  } catch { return false; }
}

function docOf(ctx, root) {
  if (root && root.ownerDocument) return root.ownerDocument;
  if (ctx && ctx.stage && ctx.stage.ownerDocument) return ctx.stage.ownerDocument;
  return typeof document !== 'undefined' ? document : null;
}

/* V2 E077-01 — ancrage : layout d'abord, repli sur le .points-layout contenu
 * dans stage. Le filtre sur viewId 'pointsv2' neutralise la lentille hors passe 2. */
function rootOf(ctx) {
  if (!ctx || (ctx.viewId && ctx.viewId !== 'pointsv2')) return null;
  const layout = ctx.layout;
  if (layout && typeof layout.querySelector === 'function' && layout.isConnected !== false) return layout;
  const stage = ctx.stage;
  if (stage && typeof stage.querySelector === 'function') {
    return (stage.querySelector('.points-layout') || stage);
  }
  return null;
}

function modeLabel(forced, contrast) {
  if (forced) return 'Mode V2 : couleurs forcées détectées — frontières système épaisses et marqueurs textuels actifs.';
  if (contrast) return 'Mode V2 : contraste renforcé détecté — surfaces et bordures accentuées.';
  return 'Mode V2 : thème standard — la légende suit automatiquement les préférences du système.';
}

/* V2 E077-02 — un seul écrivain pour les signaux : attributs data observables
 * + ligne de texte, modifiés seulement quand la valeur change. */
function writePreferenceState() {
  if (!currentRoot || !currentRoot.dataset) return;
  const forced = matches(FORCED_QUERY);
  const contrast = matches(CONTRAST_QUERY);
  const forcedValue = forced ? 'active' : 'none';
  const contrastValue = contrast ? 'more' : 'normal';
  if (currentRoot.dataset[DATA.forced] !== forcedValue) currentRoot.dataset[DATA.forced] = forcedValue;
  if (currentRoot.dataset[DATA.contrast] !== contrastValue) currentRoot.dataset[DATA.contrast] = contrastValue;
  const doc = docOf(null, currentRoot);
  const status = doc && typeof doc.getElementById === 'function' ? doc.getElementById(ID.mode) : null;
  const label = modeLabel(forced, contrast);
  if (status && status.textContent !== label) status.textContent = label;
}

/* V2 E077-10 — écouteurs attachés une seule fois, jamais retirés : ils ne
 * retiennent aucun nœud périmé, seulement currentRoot, remplacé à chaque rendu. */
function bindPreferenceListeners() {
  if (listenersBound) return;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  listenersBound = true;
  [CONTRAST_QUERY, FORCED_QUERY].forEach((query) => {
    let media;
    try { media = window.matchMedia(query); } catch { return; }
    try {
      if (typeof media.addEventListener === 'function') media.addEventListener('change', writePreferenceState);
      else if (typeof media.addListener === 'function') media.addListener(writePreferenceState);
    } catch { /* repli : préférences relues à chaque rendu */ }
  });
}

/* V2 E077-09 — légende unique, construite par ctx.el, jamais interprétée comme
 * du balisage. Les ids sont ceux de la V2 et n'empruntent pas ceux de la passe 1. */
function ensureLegend(doc, ctx, root) {
  if (!doc || typeof doc.getElementById !== 'function') return null;
  const matrix = root.querySelector('.points-matrix');
  if (!matrix) return null;
  let legend = doc.getElementById(ID.legend);
  if (legend && (legend.tagName || '').toLowerCase() !== 'div') {
    if (legend.remove) legend.remove();
    legend = null;
  }
  if (!legend) {
    legend = ctx.el('div', LEGEND_CLASS);
    legend.id = ID.legend;
    const note = ctx.el('p', NOTE_CLASS, NOTE_TEXT);
    note.id = ID.note;
    const status = ctx.el('p', MODE_CLASS, '');
    status.id = ID.mode;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    legend.append(note, status);
    const title = matrix.querySelector('.points-title');
    if (title && title.nextSibling) matrix.insertBefore(legend, title.nextSibling);
    else matrix.appendChild(legend);
  } else if (!matrix.contains(legend)) {
    matrix.appendChild(legend);
  }
  return legend;
}

function apply(ctx) {
  const root = rootOf(ctx);
  if (!root) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const doc = docOf(ctx, root);
  if (!doc || typeof doc.getElementById !== 'function') return;

  /* V2 E077-01 / E077-02 — une seule feuille, une seule portée, des signaux
   * distincts de la passe 1. Le layout sert de racine CSS ; stage reste l'ancre
   * de repli utilisée par rootOf(). */
  ctx.css(CSS_ID, CSS);
  const layout = (ctx.layout && ctx.layout.classList && typeof ctx.layout.classList.add === 'function')
    ? ctx.layout : root;
  layout.classList.add(SCOPE);
  if (layout.dataset) layout.dataset[DATA.scope] = 'grafted';

  const grid = root.querySelector('.points-grid');
  if (grid && grid.dataset) grid.dataset[DATA.ready] = '1';

  ensureLegend(doc, ctx, root);
  currentRoot = root;

  /* V2 E077-10 — couplage défensif au mouvement réduit, en plus de la media
   * query, pour les environnements sans matchMedia fiable. */
  if (layout.classList && typeof layout.classList.toggle === 'function') {
    const still = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
    layout.classList.toggle(STILL_CLASS, still);
  }

  writePreferenceState();
  bindPreferenceListeners();
}

register('E077', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
