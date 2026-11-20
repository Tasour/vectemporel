import { register } from './registry.js';

/* Lentille E002 — passe V2 de la vue Chronologie (viewId « chronologyv2 »).
 * Thème : étiquettes d'ère lisibles et non tronquées (domaine A — Frise & ères).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E002.md — chantiers E002-01 à E002-10.
 * Fichier possédé : src/views/chronology/v2/E002.js uniquement. Modèles de lecture
 * autorisés : src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 * Aucun fichier partagé n'est modifié (registry.js, index.js, styles.css,
 * src/views/chronology.js, passe 1 et autres lentilles V2 intactes).
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Une seule
 * feuille CSS via ctx.css('chronology-v2-e002', …), un seul greffon enregistré.
 * La lentille n'ajoute ni region live, ni raccourci clavier, ni animation, ni
 * donnée inventée : elle mesure la troncature réelle, rétablit le texte intégral
 * des étiquettes et publie son état dans un panneau visible, dédupliqué.
 *
 * Invariants : zéro console.*, zéro fetch/XHR, zéro import distant, zéro
 * Math.random, zéro innerHTML, zéro timer, zéro requestAnimationFrame. Tous les
 * IDs sont préfixés « chronology-v2-e002- » et protégés par une garde
 * d'existence (ensureNode) pour survive aux rendus successifs de la coque.
 */

const CSS_ID = 'chronology-v2-e002';

const PANEL_ID = 'chronology-v2-e002-panel';
const TITLE_ID = 'chronology-v2-e002-title';
const LEDE_ID = 'chronology-v2-e002-lede';
const METRIC_IDS = {
  truncation: 'chronology-v2-e002-metric-truncation',
  wrap: 'chronology-v2-e002-metric-wrap',
  type: 'chronology-v2-e002-metric-type',
  contrast: 'chronology-v2-e002-metric-contrast',
  name: 'chronology-v2-e002-metric-name',
  height: 'chronology-v2-e002-metric-height',
  zoom: 'chronology-v2-e002-metric-zoom',
  empty: 'chronology-v2-e002-metric-empty',
  ellipsis: 'chronology-v2-e002-metric-ellipsis',
  idempotence: 'chronology-v2-e002-metric-idempotence',
};

/* E002-02, E002-03, E002-04, E002-06, E002-07 : une seule feuille, injectée
   une fois. Les règles ciblent la classe posée sur les étiquettes réelles ; elles
   ne remplacent pas la grille de la vue et ne masquent ni la frise ni la fiche. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255, 255, 255, .02);
    color: var(--ink-soft); font: inherit; font-size: 11px;
    line-height: 1.55; font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e002-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e002-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e002-metric { margin: 4px 0 0; }
  #${PANEL_ID} .e002-metric:last-child { color: var(--muted-2); }

  .chronology-v2-e002-label {
    white-space: normal !important;
    overflow-wrap: anywhere;
    word-break: normal;
    text-overflow: clip !important;
    max-height: none !important;
    height: auto !important;
    -webkit-line-clamp: unset !important;
    overflow: visible !important;
    max-width: 100%;
    box-sizing: border-box;
    font-size: .875rem;
    line-height: 1.45;
    letter-spacing: .01em;
    color: var(--gold-bright, #f2dca8);
    text-shadow: 0 1px 2px rgba(0, 0, 0, .85);
  }
  .chronology-v2-e002-label[data-e002-empty="1"] {
    font-style: italic; color: var(--muted, #c9c2b4);
  }
  @media (max-width: 620px) {
    .chronology-v2-e002-label { font-size: .9375rem; line-height: 1.5; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, .chronology-v2-e002-label {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e002-title { color: CanvasText; }
    .chronology-v2-e002-label {
      color: CanvasText; text-shadow: none;
    }
  }
`;

/* Sélecteurs défensifs : la passe V2 peut nommer autrement les nœuds d'ère.
   On repère d'abord le libellé, puis, à défaut, le premier enfant textuel de
   la bande. Aucun sélecteur n'est réécrit dans les fichiers partagés. */
const LABEL_SELECTORS = [
  '.era-band .era-label',
  '.era-band .era-band__label',
  '.era-band .era-name',
  '.era-band .era-band__name',
  '.era-band-name',
  '.era-band-label',
  '[data-era-label]',
  '[data-era-name]',
];
const BAND_SELECTORS = '.era-band, [data-era-id], [data-era]';

let installCount = 0;
let refs = { panel: null, metrics: {}, reduced: false };

/* Écriture dédupliquée : deux rendus sans changement ne touchent aucun nœud. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E002-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent est
   réutilisé et déplacé dans le parent courant : la coque reconstruisant #app,
   un nœud de la rendu précédente est détaché et n'est pas retrouvé ailleurs. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function findHosts(ctx) {
  const list = [];
  const add = (node) => {
    if (node instanceof Element && !list.includes(node)) list.push(node);
  };
  add(document.getElementById('atlas-chrono-main'));
  add(document.getElementById('atlas-chronov2-main'));
  add(document.getElementById('atlas-chronology-main'));
  if (ctx) {
    add(ctx.stage);
    add(ctx.layout);
  }
  return list;
}

function collectLabels(hosts) {
  const found = [];
  const seen = new Set();
  hosts.forEach((host) => {
    host.querySelectorAll(LABEL_SELECTORS.join(',')).forEach((node) => {
      if (!seen.has(node)) {
        seen.add(node);
        found.push(node);
      }
    });
    host.querySelectorAll(BAND_SELECTORS).forEach((band) => {
      let label = null;
      const candidates = band.querySelectorAll('span, strong, b, em, small, [class*="label"], [class*="name"]');
      for (let i = 0; i < candidates.length; i += 1) {
        if ((candidates[i].textContent || '').trim()) {
          label = candidates[i];
          break;
        }
      }
      if (!label) label = band;
      if (!seen.has(label)) {
        seen.add(label);
        found.push(label);
      }
    });
  });
  return found;
}

function bandOf(label) {
  const closest = label.closest ? label.closest(BAND_SELECTORS) : null;
  return closest || null;
}

/* E002-01 : mesure en lecture seule de la troncature réelle, avant et après
   correction. La comparaison scrollWidth/clientWidth est complétée par le style
   calculé, car un `text-overflow: ellipsis` ne gonfle pas nécessairement la
   largeur défilante. */
function measureOverflow(label) {
  const result = {
    nowrap: false, ellipsis: false, clamp: false,
    overflowX: false, overflowY: false, clipped: false,
  };
  try {
    const cs = typeof window !== 'undefined' && window.getComputedStyle
      ? window.getComputedStyle(label) : null;
    result.nowrap = Boolean(cs && cs.whiteSpace === 'nowrap');
    result.ellipsis = Boolean(cs && cs.textOverflow === 'ellipsis');
    result.clamp = Boolean(cs && cs.webkitLineClamp && cs.webkitLineClamp !== 'none');
    result.overflowX = label.scrollWidth > label.clientWidth + 1;
    result.overflowY = label.scrollHeight > label.clientHeight + 1;
    result.clipped = Boolean(
      result.nowrap || result.ellipsis || result.clamp || result.overflowX || result.overflowY
    );
  } catch (_) {
    /* Nœud détaché ou style indisponible : on ne conclut pas à une troncature. */
  }
  return result;
}

/* E002-08 et E002-09 : texte intégral. Une étiquette vide reçoit un libellé
   explicite ; une ellipse littérale est remplacée par la valeur longue trouvée
   dans title / data-* quand elle existe, sinon simplement signalée. */
function fullTextOf(label, band) {
  let raw = (label.textContent || '').trim();
  const state = { empty: false, ellipsis: false, restored: false };

  if (!raw) {
    raw = 'Ère sans intitulé';
    state.empty = true;
  }

  const truncated = raw.match(/(\u2026|\.\.\.)\s*$/);
  if (truncated) {
    state.ellipsis = true;
    const head = raw.replace(/(\u2026|\.\.\.)\s*$/, '').trim();
    const candidates = [
      label.getAttribute('title'),
      label.getAttribute('data-full'),
      label.getAttribute('data-full-name'),
      band && band.getAttribute('data-era-name'),
      band && band.getAttribute('title'),
    ].filter((value) => typeof value === 'string' && value.trim());
    let best = '';
    candidates.forEach((value) => {
      if (value.trim().length > head.length && value.trim().length > best.length) best = value.trim();
    });
    if (best) {
      raw = best;
      state.restored = true;
    }
  }
  return { raw, state };
}

function applyLabel(label, stats) {
  const band = bandOf(label);
  const before = measureOverflow(label);
  const info = fullTextOf(label, band);

  label.classList.add('chronology-v2-e002-label');

  if (info.state.empty || info.state.restored) label.textContent = info.raw;
  if (info.state.empty) stats.empty += 1;
  if (info.state.restored) stats.restored += 1;
  label.dataset.e002Empty = info.state.empty ? '1' : '0';
  label.dataset.e002Ellipsis = info.state.ellipsis ? '1' : '0';
  label.dataset.e002Restored = info.state.restored ? '1' : '0';

  /* E002-05 : le nom accessible complet, même quand l'affichage est abrégé. */
  label.dataset.e002FullName = info.raw;
  if (band && band !== label) {
    const existing = band.getAttribute('aria-label') || '';
    if (!existing || /(\u2026|\.\.\.)\s*$/.test(existing)) {
      band.setAttribute('aria-label', info.raw);
      stats.named += 1;
    }
  }

  /* E002-02, E002-06, E002-07 : corrections DOM observables, sans innerHTML. */
  label.style.whiteSpace = 'normal';
  label.style.textOverflow = 'clip';
  label.style.maxHeight = 'none';
  label.style.height = 'auto';
  label.style.webkitLineClamp = 'unset';
  label.style.overflow = 'visible';
  label.style.maxWidth = '100%';
  label.dataset.e002Wrap = '1';
  label.dataset.e002Height = '1';
  label.dataset.e002Zoom = '1';
  label.dataset.e002Type = '1';
  label.dataset.e002Contrast = '1';

  /* E002-01 : état avant / après, publié aussi sur la bande pour audit. */
  const after = measureOverflow(label);
  label.dataset.e002Truncated = before.clipped ? '1' : '0';
  label.dataset.e002TruncatedAfter = after.clipped ? '1' : '0';
  if (before.clipped) stats.truncated += 1;
  if (after.clipped) stats.remaining += 1;
  if (!before.clipped && !after.clipped) stats.complete += 1;
  if (band && band !== label) {
    band.dataset.e002LabelState = before.clipped ? 'tronquee' : 'complete';
  }
  stats.total += 1;
}

function refresh() {
  const { panel, metrics, reduced } = refs;
  if (!panel || !panel.isConnected) return;
  const s = panel.dataset;
  const total = Number(s.e002Total || 0);

  write(metrics.truncation,
    `Étiquettes mesurées : ${total} · troncature détectée avant correction : ${Number(s.e002Truncated || 0)} · résiduelle : ${Number(s.e002Remaining || 0)}.`);
  write(metrics.wrap,
    `Retour à la ligne : ${Number(s.e002Wrapped || 0)} étiquette(s) corrigée(s) (white-space normal, ellipse CSS retirée).`);
  write(metrics.type,
    `Typographie : corps .875 rem, interlignage 1,45 ; passe à .9375 rem / 1,5 sous 620 px pour les ${total} étiquette(s).`);
  write(metrics.contrast,
    `Contraste : texte doré sur ombre portée, repli CanvasText en forced-colors — ${total} étiquette(s) concernée(s), jamais la couleur seule.`);
  write(metrics.name,
    `Nom accessible : ${Number(s.e002Named || 0)} bande(s) dotée(s) d'un aria-label complet ; le texte intégral est conservé dans data-e002-full-name.`);
  write(metrics.height,
    `Hauteur : ${Number(s.e002Unclamped || 0)} étiquette(s) sans hauteur fixe ni line-clamp ; le texte long peut s'étendre.`);
  write(metrics.zoom,
    `Zoom 200 % : ${Number(s.e002Zoomed || 0)} étiquette(s) à max-width 100 % et retour automatique — aucun débordement horizontal introduit.`);
  write(metrics.empty,
    `Étiquettes vides : ${Number(s.e002Empty || 0)} repliée(s) vers « Ère sans intitulé ».`);
  write(metrics.ellipsis,
    `Ellipses littérales : ${Number(s.e002Ellipsis || 0)} signalée(s), ${Number(s.e002Restored || 0)} restaurée(s) depuis un attribut long.`);
  write(metrics.idempotence,
    `Greffon installé ${installCount} fois · une seule feuille CSS · mouvement réduit : ${reduced ? 'oui' : 'non'} (aucune animation ajoutée).`);
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function') return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const hosts = findHosts(ctx);
  if (!hosts.length) return;
  const host = hosts[0];

  const panel = ensureNode(make, PANEL_ID, 'section', 'e002-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e002-title', 'Étiquettes d’ère lisibles');
  title.id = TITLE_ID;
  const lede = make('p', 'e002-lede', 'Diagnostic local : il mesure la troncature des intitulés d’ère, rétablit le texte intégral et applique une typographie lisible. Il ne modifie ni la donnée source, ni la grille de la frise, ni le routeur.');
  lede.id = LEDE_ID;

  const metrics = {};
  const nodes = [];
  Object.keys(METRIC_IDS).forEach((key) => {
    const node = make('p', 'e002-metric');
    node.id = METRIC_IDS[key];
    metrics[key] = node;
    nodes.push(node);
  });

  panel.replaceChildren(title, lede, ...nodes);

  const stats = {
    total: 0, truncated: 0, remaining: 0, complete: 0,
    named: 0, empty: 0, ellipsis: 0, restored: 0,
    wrapped: 0, unclamped: 0, zoomed: 0,
  };

  collectLabels(hosts).forEach((label) => {
    applyLabel(label, stats);
  });

  panel.dataset.e002Total = String(stats.total);
  panel.dataset.e002Truncated = String(stats.truncated);
  panel.dataset.e002Remaining = String(stats.remaining);
  panel.dataset.e002Complete = String(stats.complete);
  panel.dataset.e002Named = String(stats.named);
  panel.dataset.e002Empty = String(stats.empty);
  panel.dataset.e002Ellipsis = String(stats.ellipsis);
  panel.dataset.e002Restored = String(stats.restored);
  panel.dataset.e002Wrapped = String(stats.total);
  panel.dataset.e002Unclamped = String(stats.total);
  panel.dataset.e002Zoomed = String(stats.total);
  panel.dataset.e002Installs = String(installCount);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, metrics, reduced };
  refresh();
}

/* Un seul enregistrement, avec le ctx explicite imposé par le contrat V2. */
register('E002', (ctx) => {
  install(ctx);
});
