import { register } from './registry.js';

/* Lentille E067 — Performance & rendu : replaceChildren plutôt que innerHTML
 * (domaine G : performance & rendu).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E067.md — chantiers E067-01 à E067-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : la lentille ajoute un panneau
 * additif dans .points-detail et s'appuie sur le DOM déjà produit par la vue.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (fournis par
 * points/registry.js). Aucune dépendance vers le store, les filtres, le détail
 * internalisé ou une donnée historique : l'aperçu est dérivé du DOM réel.
 *
 * Invariants :
 * - un seul CSS, un seul panneau, une seule portée, aucun écouteur global ;
 * - toute écriture DOM passe par replaceChildren(...) avec des nœuds créés par
 *   ctx.el : aucun innerHTML / outerHTML / insertAdjacentHTML, aucun parsing ;
 * - une signature par nœud (WeakMap) évite les écritures redondantes ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*.
 */

const CSS_ID = 'points-e067';
const PANEL_ID = 'points-e067-panel';
const TITLE_ID = 'points-e067-title';
const PREVIEW_ID = 'points-e067-preview';
const METRICS_ID = 'points-e067-metrics';
const SIGNAL_ATTR = 'data-points-e067';
const MODE_ATTR = 'data-points-e067-mode';

/* E067-06 : feuille unique injectée par cssOnce (registry.js:13-19), stable
 * quand la coque recrée #atlas-stage. Tout est préfixé points-e067- et porté
 * par le panneau : aucun effet hors de la vue Points. */
const CSS = `
  .points-e067-panel {
    margin-top: 18px;
    padding: 12px 14px;
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    background: rgba(230, 185, 111, .04);
  }
  .points-e067-panel :focus-visible {
    outline: 2px solid var(--gold-bright);
    outline-offset: 2px;
  }
  .points-e067-title {
    margin: 0 0 6px;
    font-family: var(--serif);
    font-size: 15px;
    color: var(--gold-bright);
  }
  .points-e067-note {
    margin: 0 0 8px;
    color: var(--muted-2);
    font-size: 10px;
    line-height: 1.5;
  }
  .points-e067-preview {
    margin: 0 0 8px;
    padding-left: 9px;
    border-left: 2px solid var(--gold);
  }
  .points-e067-preview p {
    margin: 0 0 4px;
    color: var(--ink-soft);
    font-size: 11px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .points-e067-families { color: var(--muted) !important; }
  .points-e067-confidence { color: var(--gold) !important; }
  .points-e067-metrics {
    margin: 0;
    color: var(--muted-2);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 620px) {
    .points-e067-panel { padding: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-e067-panel * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    .points-e067-panel { border-color: CanvasText; }
    .points-e067-title, .points-e067-preview p { color: CanvasText; }
  }
`;

/* E067-03 : état d'écriture attaché au nœud lui-même. Une WeakMap permet de
 * ne jamais retenir un nœud périmé après un rendu neuf de la coque. */
const nodeState = new WeakMap();
let currentPreview = null;
let metricNode = null;

function counts() {
  const s = currentPreview ? nodeState.get(currentPreview) : null;
  return s || { writes: 0, skips: 0 };
}

/* E067-04 : compteurs auditables écrits en texte, hors région live (E041 reste
 * seul maître des annonces) et sans innerHTML. */
function writeMetrics() {
  if (!metricNode) return;
  const c = counts();
  metricNode.textContent = `Écritures DOM : ${c.writes} · Écritures évitées par signature : ${c.skips}.`;
}

/* E067-01 / E067-02 : l'unique fonction d'écriture. Les nœuds sont fournis par
 * l'appelant (toujours créés via ctx.el + textContent) et posés d'un seul bloc
 * par replaceChildren. Aucune chaîne n'est jamais interprétée comme balisage. */
function safeWrite(ctx, target, signature, build) {
  let s = nodeState.get(target);
  if (!s) {
    s = { signature: '', writes: 0, skips: 0 };
    nodeState.set(target, s);
  }
  if (s.signature === signature) {
    s.skips += 1;
    writeMetrics();
    return false;
  }
  const nodes = build();
  target.replaceChildren(...nodes);
  s.signature = signature;
  s.writes += 1;
  writeMetrics();
  return true;
}

/* E067-05 : lecture du DOM réel de la fiche (points.js:98-111), sans accès au
 * store et sans donnée codée en dur. */
function textOf(root, selector) {
  const found = root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
  return found ? String(found.textContent || '').trim() : '';
}

function detailData(layout) {
  const detail = layout && typeof layout.querySelector === 'function'
    ? layout.querySelector('.points-detail') : null;
  const families = detail
    ? Array.from(detail.querySelectorAll('.points-families span'))
      .map((node) => String(node.textContent || '').trim()).filter(Boolean)
    : [];
  return {
    subject: textOf(detail, '.points-point-title'),
    text: textOf(detail, '.points-point-text'),
    confidence: textOf(detail, '.points-meta .confidence'),
    sources: textOf(detail, '.points-sources'),
    justification: textOf(detail, '.points-justification'),
    families,
  };
}

/* E067-03 : séparateur de contrôle improbable dans du texte historique. */
function signatureOf(data) {
  return [data.subject, data.text, data.confidence, data.sources,
    data.justification, data.families.join('|')].join('\u001f');
}

/* E067-02 : chaque ligne est un nœud texte créé par ctx.el, jamais une concaté
 * nation de balisage. */
function buildPreview(ctx, data) {
  const nodes = [];
  nodes.push(ctx.el('p', 'points-e067-lead', data.subject
    ? `Point affiché : ${data.subject}.`
    : 'Aucun point affiché dans le détail.'));
  if (data.families.length) {
    nodes.push(ctx.el('p', 'points-e067-families', `Familles : ${data.families.join(' · ')}.`));
  }
  if (data.confidence) {
    nodes.push(ctx.el('p', 'points-e067-confidence', `Certitude : ${data.confidence}.`));
  }
  return nodes;
}

/* E067-08 : rebuild structurel idempotent — replaceChildren remplace le contenu
 * du panneau existant sans jamais toucher au reste de la fiche. */
function buildPanel(ctx, panel) {
  const title = ctx.el('h3', 'points-e067-title', 'Rendu sans innerHTML');
  title.id = TITLE_ID;
  const note = ctx.el('p', 'points-e067-note',
    'Cet aperçu est écrit avec replaceChildren et des nœuds créés par ctx.el : aucune chaîne HTML n’est réinterprétée. Une signature évite les écritures redondantes.');
  const preview = ctx.el('div', 'points-e067-preview');
  preview.id = PREVIEW_ID;
  const metrics = ctx.el('p', 'points-e067-metrics', '');
  metrics.id = METRICS_ID;
  panel.replaceChildren(title, note, preview, metrics);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  return { preview, metrics };
}

function install(ctx) {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E067-06 : CSS unique (cssOnce) et signaux d'audit sur la vue. */
  css(CSS_ID, CSS);
  layout.setAttribute(SIGNAL_ATTR, '1');
  layout.setAttribute(MODE_ATTR, 'replaceChildren');

  /* E067-07 / E067-08 : un seul panneau par rendu. Un nœud déconnecté d'une
   * rendu précédent est retiré ; un second passage sur le même DOM est sans
   * effet (le panneau est retrouvé, jamais dupliqué). */
  let panel = layout.querySelector('#' + PANEL_ID);
  if (!panel) {
    const stale = document.getElementById(PANEL_ID);
    if (stale && !layout.contains(stale)) stale.remove();
    panel = el('section', 'points-e067-panel');
    panel.id = PANEL_ID;
    const host = layout.querySelector('.points-detail') || layout;
    host.appendChild(panel);
  }

  let preview = panel.querySelector('#' + PREVIEW_ID);
  let metrics = panel.querySelector('#' + METRICS_ID);
  if (!preview || !metrics || !panel.contains(preview) || !panel.contains(metrics)) {
    const refs = buildPanel(ctx, panel);
    preview = refs.preview;
    metrics = refs.metrics;
  }
  currentPreview = preview;
  metricNode = metrics;

  /* E067-09 : l'aperçu n'est écrit que dans notre propre conteneur ; aucun
   * élément existant (matrice, filtres, fiche, navigation) n'est modifié. */
  const data = detailData(layout);
  safeWrite(ctx, preview, signatureOf(data), () => buildPreview(ctx, data));
}

register('E067', install);
