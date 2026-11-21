import { register } from './registry.js';

/* Lentille E023 — Détail & fiche : domaine / échelle / temps en métadonnées
 * structurées (domaine C : détail & fiche).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E023.md — chantiers E023-01 à E023-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), les
 * autres lentilles, la coque et styles.css ne sont ni édités ni doublés.
 *
 * E023 transforme le bloc `.points-meta` (quatre <span> sans étiquette :
 * domaine, échelle, temps, certitude) en une liste de définitions `<dl>`
 * `<dt>/<dd>` lisible : chaque valeur d'origine est CONSERVÉE et déplacée dans
 * un <dd>, chaque champ reçoit une étiquette textuelle explicite. Aucune
 * donnée n'est inventée, aucun nœud étranger n'est supprimé.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (tel que
 * fourni par points/registry.js). Aucune dépendance vers le store, le routeur
 * ou une autre lentille : le greffon reste actif avec le ctx minimal.
 *
 * Invariants :
 * - un seul CSS, une seule portée, une seule <dl>, un seul compteur par rendu ;
 * - les <span> source sont réutilisés (identité et classes conservées), jamais
 *   clonés ni reconstruits : le style de certitude d'E022 reste intact ;
 * - un seul MutationObserver, ciblé sur le titre du point, jamais sur la zone
 *   écrite (<dl> / compteur) : aucune boucle d'écriture ;
 * - aucune sortie console, aucun appel réseau, aucun aléa, aucun timer ni
 *   boucle d'animation, aucune réinterprétation de balisage (innerHTML).
 */

const CSS_ID = 'points-e023';
const SCOPE = 'points-e023';
const DL_ID = 'points-e023-dl';
const METRICS_ID = 'points-e023-metrics';
const SOURCE_CLASS = 'points-e023-source';
const SIGNATURE_KEY = 'pointsE023Signature';
const REDUCED_ATTR = 'data-points-e023-reduced';

/* Étiquettes de CHAMPS (noms de métadonnées), jamais des valeurs historiques. */
const LABELS = ['Domaine', 'Échelle', 'Temps', 'Certitude'];

/* Toutes les règles sont préfixées par `.points-e023` (portée sur .points-detail)
 * ou par un identifiant `points-e023-*` : aucune fuite hors de cette vue. */
const CSS = `
  /* E023-01/02 : le conteneur redevient un flux vertical ; la <dl> porte la structure. */
  .${SCOPE} .points-meta { display: block; }
  #${DL_ID} {
    margin: 12px 0; padding: 10px 12px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 8px;
    background: rgba(255, 255, 255, .02);
    font-size: 12px; line-height: 1.5;
    transition: border-color .18s linear;
  }
  /* E023-03 : étiquette visible en texte, jamais portée par la seule couleur. */
  #${DL_ID} .points-e023-key {
    color: var(--muted-2, #8c8d91);
    font-size: 10px; font-weight: 600; letter-spacing: .04em;
  }
  #${DL_ID} .points-e023-key::after { content: ' :'; }
  #${DL_ID} .points-e023-val {
    margin: 0 0 7px; color: var(--ink-soft, #d7d1c6);
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${DL_ID} .points-e023-val:last-child { margin-bottom: 0; }
  /* E023-05 : le <span> d'origine garde ses classes (confidence is-…) et son style. */
  #${DL_ID} .points-e023-val > span { color: inherit; }
  #${DL_ID} .points-e023-val > span.confidence { font-weight: 600; }
  /* E023-07 : compteur auditable, hors de toute région live. */
  .${SCOPE} .points-e023-metrics {
    margin: 0 0 12px; color: var(--muted-2, #8c8d91);
    font-size: 10px; font-variant-numeric: tabular-nums;
  }
  /* E023-10 : mouvement réduit, couplage JS (attribut) ET media query. */
  .${SCOPE}[${REDUCED_ATTR}="1"] #${DL_ID} { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    #${DL_ID} { transition: none; }
  }
  /* E023-10 : écran étroit et couleurs forcées. */
  @media (max-width: 620px) {
    #${DL_ID} { padding: 8px 10px; font-size: 11px; }
  }
  @media (forced-colors: active) {
    #${DL_ID}, #${DL_ID} .points-e023-key,
    #${DL_ID} .points-e023-val, .${SCOPE} .points-e023-metrics {
      border-color: CanvasText; color: CanvasText;
    }
  }
`;

let observer = null;        // unique MutationObserver, ciblé sur le titre du point
let currentCtx = null;      // dernier ctx reçu, pour l'observateur
let structureCount = 0;     // nombre de structurations effectives (auditable)

function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') return ctx.stage;
  return null;
}

function findDetail(ctx) {
  const root = rootOf(ctx);
  return root ? root.querySelector('.points-detail') : null;
}

/* E023-06 : absence de .points-meta → on ne crée RIEN (pas de bloc fantôme). */
function findMeta(ctx) {
  const detail = findDetail(ctx);
  return detail ? detail.querySelector('.points-meta') : null;
}

/* E023-05 : on réutilise les <span> déjà marqués ; au premier passage on prend
 * les enfants <span> directs de .points-meta tels que points.js les a écrits. */
function sourceSpans(meta) {
  if (!meta || typeof meta.querySelectorAll !== 'function') return [];
  const tagged = meta.querySelectorAll('.' + SOURCE_CLASS);
  if (tagged.length) return Array.prototype.slice.call(tagged);
  return Array.prototype.slice.call(meta.children).filter((node) => node && node.tagName === 'SPAN');
}

function signatureOf(spans) {
  return spans.map((span) => String(span.textContent || '').trim()).join(' | ');
}

/* E023-07 : compteur hors région live, réutilisé d'un passage à l'autre. */
function writeMetrics(ctx, fieldCount) {
  const detail = findDetail(ctx);
  if (!detail) return;
  let metrics = detail.querySelector('#' + METRICS_ID);
  if (!metrics) {
    metrics = ctx.el('p', 'points-e023-metrics');
    metrics.id = METRICS_ID;
    detail.appendChild(metrics);
  }
  metrics.textContent = `Métadonnées structurées : ${fieldCount} champ(s) · ${structureCount} structuration(s).`;
}

/* E023-02/03/05 : construit la <dl> en déplaçant les <span> d'origine dans des
 * <dd> (contenu et classes préservés) et en ajoutant une <dt> par champ. */
function structure(ctx) {
  const meta = findMeta(ctx);
  const detail = findDetail(ctx);
  if (!meta || !detail) return;

  const spans = sourceSpans(meta);
  if (!spans.length) return;

  spans.forEach((span) => span.classList.add(SOURCE_CLASS));
  const signature = signatureOf(spans);

  let dl = meta.querySelector('#' + DL_ID);
  /* E023-07 : signature inchangée → aucune écriture redondante. */
  if (dl && dl.dataset && dl.dataset[SIGNATURE_KEY] === signature) return;

  if (!dl) {
    dl = ctx.el('dl', 'points-e023-dl');
    dl.id = DL_ID;
    meta.appendChild(dl);
  }

  const pairs = [];
  spans.forEach((span, index) => {
    const key = ctx.el('dt', 'points-e023-key', LABELS[index] || `Champ ${index + 1}`);
    const value = ctx.el('dd', 'points-e023-val');
    value.appendChild(span); // déplacement, pas clonage : le nœud d'origine survit
    pairs.push(key, value);
  });
  dl.replaceChildren.apply(dl, pairs); // uniquement notre propre zone
  dl.dataset[SIGNATURE_KEY] = signature;

  structureCount += 1;
  detail.classList.add(SCOPE);
  if (detail.dataset) detail.dataset.pointsE023 = 'ready';
  writeMetrics(ctx, spans.length);
}

/* E023-08 : un seul observateur, sur le titre sémantique du point — jamais sur
 * la <dl> ni le compteur que E023 écrit. */
function observeTitle(ctx) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  const root = rootOf(ctx);
  const title = root ? root.querySelector('.points-detail .points-point-title') : null;
  if (!title) return;
  observer = new MutationObserver(() => {
    if (currentCtx) structure(currentCtx);
  });
  observer.observe(title, { childList: true, characterData: true, subtree: true });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;

  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);

  const detail = findDetail(ctx);
  if (!detail) return;
  detail.classList.add(SCOPE);

  /* E023-10 : couplage mouvement réduit (JS + media query). */
  if (ctx.reducedMotion && ctx.reducedMotion()) detail.setAttribute(REDUCED_ATTR, '1');
  else detail.removeAttribute(REDUCED_ATTR);

  /* E023-09 : un rendu neuf recrée le panneau ; on retire tout nœud E023
   * mal parenté avant de réutiliser/créer le nôtre (aucun doublon). */
  const meta = findMeta(ctx);
  ['#' + DL_ID, '#' + METRICS_ID].forEach((selector) => {
    const stray = document.querySelector(selector);
    if (stray && (!meta || !detail.contains(stray))) stray.remove();
  });

  structure(ctx);
  observeTitle(ctx);
}

register('E023', install);
