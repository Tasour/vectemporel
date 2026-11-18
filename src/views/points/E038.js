import { register } from './registry.js';

/* Lentille E038 — Navigation & clavier : commande « aller au point » (saut direct).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E038.md — chantiers E038-01 à E038-10.
 * Fichier possédé : ce module uniquement. La vue (points.js), le store
 * (domain/store.js), le routeur (platform/keyboard.js) et styles.css ne sont
 * jamais édités : E038 appelle l'API publique du store exactement comme le font
 * déjà les boutons « Point précédent / suivant » de points.js:119-120.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * E038 ajoute UNE commande locale après .points-nav : un champ numérique 1..N
 * (N lu dans le kicker du détail, points.js:96) et un bouton « Aller » qui
 * écrivent state.pointIndex en une seule passe, sans fichier partagé modifié.
 *
 * Invariants :
 * - un seul register, un seul CSS (ctx.css('points-e038', …)), un seul
 *   formulaire inséré après .points-nav, un seul jeu d'écouteurs ;
 * - aucune touche globale : '?' , Échap, 1–6, flèches et Entrée restent au
 *   routeur ; champs éditables et contrôles natifs le protègent déjà
 *   (keyboard.js:129, :132) ;
 * - aucun nœud existant n'est retiré ni réécrit (non destructif) ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro journalisation.
 */

const CSS_ID = 'points-e038';
const FORM_ID = 'points-e038-goto';
const INPUT_ID = 'points-e038-input';
const BUTTON_ID = 'points-e038-go';
const STATUS_ID = 'points-e038-status';
const METRICS_ID = 'points-e038-metrics';
const TITLE_ID = 'points-e038-title';

const CSS = `
  #${FORM_ID} {
    margin: 10px 0 0; padding: 10px 12px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(255,255,255,.02); color: var(--ink-soft);
    font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere; max-width: 100%;
  }
  #${TITLE_ID} { display: block; color: var(--gold-bright); font-weight: 600; margin-bottom: 6px; }
  #${FORM_ID} label { color: var(--gold); font-weight: 600; }
  #${INPUT_ID} {
    width: 5ch; min-height: 36px; margin: 0 4px; padding: 0 6px;
    border: 1px solid var(--line); border-radius: 8px;
    background: #0b0f15; color: var(--ink-soft); font: inherit; text-align: center;
  }
  #${BUTTON_ID} {
    min-height: 36px; padding: 0 12px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(230,185,111,.08); color: var(--gold-bright);
    font: inherit; cursor: pointer;
  }
  #${BUTTON_ID}:hover { border-color: var(--gold-bright); }
  #${FORM_ID} :is(input, button):focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  #${STATUS_ID} { margin: 8px 0 0; }
  #${STATUS_ID}[data-tone="error"] { color: var(--gold-bright); font-weight: 600; }
  #${METRICS_ID} { margin: 4px 0 0; color: var(--muted-2); font-size: 10px; }
  @media (max-width: 900px) {
    #${INPUT_ID}, #${BUTTON_ID} { min-height: 44px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${FORM_ID}, #${INPUT_ID}, #${BUTTON_ID} { transition: none; }
  }
`;

let inputNode = null;
let statusNode = null;
let metricsNode = null;
let visibleTotal = 0;
let renderedStatus = '';
let renderedMax = '';
let pendingJump = null;      // { value, total } diffusé au rendu suivant
let jumpCount = 0;
let installCount = 0;

/* Ancre de lecture : le layout fourni, sinon le stage (points.js:126). */
function nodeIn(ctx, selector) {
  const root = ctx.layout && ctx.layout.isConnected ? ctx.layout : ctx.stage;
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

/* E038-02 : N vient du kicker réel « … point(s) dans ce périmètre » écrit par
 * points.js:96. Aucun total, aucun millésime, aucune donnée codée en dur. */
function visibleCount(ctx) {
  const kicker = nodeIn(ctx, '.points-detail .view-kicker');
  const text = kicker ? String(kicker.textContent || '') : '';
  const match = text.match(/(\d+)\s*point/i);
  const value = match ? Number(match[1]) : 0;
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function pointTitle(ctx) {
  const title = nodeIn(ctx, '.points-point-title');
  return title ? String(title.textContent || '').trim() : '';
}

/* E038-06 : une seule région live locale, écrite par textContent, avec une
 * signature pour éviter les réécritures (E066). Aucune région de la coque. */
function setStatus(text, tone) {
  const value = String(text || '');
  const signature = `${tone === 'error' ? 'e' : 'n'}|${value}`;
  if (!statusNode || signature === renderedStatus) return;
  renderedStatus = signature;
  statusNode.textContent = value;
  if (tone === 'error') statusNode.setAttribute('data-tone', 'error');
  else statusNode.removeAttribute('data-tone');
}

function writeMetrics() {
  if (!metricsNode) return;
  metricsNode.textContent = `Sauts : ${jumpCount} · Rendus : ${installCount}.`;
}

/* E038-04 : limite falsifiable — une saisie vide, non entière ou hors 1..N est
 * refusée avec un message explicite, sans aucune écriture du pointIndex. */
function validate(value, total) {
  if (!Number.isFinite(value)) return { ok: false, message: 'Saisissez un numéro de point.' };
  if (!Number.isInteger(value)) return { ok: false, message: 'Le numéro doit être un entier.' };
  if (value < 1) return { ok: false, message: 'Le premier point porte le numéro 1.' };
  if (value > total) return { ok: false, message: total < 1 ? 'Aucun point visible dans ce périmètre.' : `Ce périmètre contient ${total} point(s) : choisissez 1 à ${total}.` };
  return { ok: true, message: '' };
}

function readValue() {
  if (!inputNode) return NaN;
  const raw = String(inputNode.value || '').trim();
  return raw ? Number(raw) : NaN;
}

/* E038-05 : import de module LOCAL, identique à points.js:52,71,83,90,119-120.
 * Aucun fetch, aucune URL distante, aucun fichier partagé édité. Une seule
 * écrite d'état par action : set({ pointIndex }, 'point'). */
function performJump(index) {
  import('../../domain/store.js')
    .then(({ set }) => { if (typeof set === 'function') set({ pointIndex: index }, 'point'); })
    .catch(() => setStatus('Saut indisponible : le magasin est inaccessible.', 'error'));
}

/* E038-03 : deux déclencheurs locaux seulement (Entrée dans le champ, clic sur
 * le bouton). Pas d'écouteur documentaire, pas de lettre réservée, pas de
 * data-fk : le routeur (keyboard.js:199) reste seul maître des raccourcis. */
function submit() {
  const value = readValue();
  const result = validate(value, visibleTotal);
  if (!result.ok) {
    setStatus(result.message, 'error');
    return;
  }
  setStatus(`Saut vers le point ${value} sur ${visibleTotal}…`);
  pendingJump = { value, total: visibleTotal };
  jumpCount += 1;
  writeMetrics();
  performJump(value - 1);
}

/* E038-01 / E038-08 / E038-10 : structure statique bâtie une fois par ctx.el,
 * sans réinterprétation de balisage. Région non modale, pas de piège de focus. */
function buildForm(ctx) {
  const form = ctx.el('section', 'points-e038-form');
  form.id = FORM_ID;
  form.setAttribute('role', 'region');
  form.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('span', '', 'Aller au point · saut direct');
  title.id = TITLE_ID;

  const label = ctx.el('label', '', 'Point n°');
  label.htmlFor = INPUT_ID;

  inputNode = ctx.el('input');
  inputNode.id = INPUT_ID;
  inputNode.type = 'number';
  inputNode.min = '1';
  inputNode.step = '1';
  inputNode.inputMode = 'numeric';
  inputNode.setAttribute('aria-label', 'Numéro du point');

  const button = ctx.el('button', '', 'Aller');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.setAttribute('aria-label', 'Aller au point saisi');

  statusNode = ctx.el('p', '', '');
  statusNode.id = STATUS_ID;
  statusNode.setAttribute('role', 'status');
  statusNode.setAttribute('aria-live', 'polite');

  metricsNode = ctx.el('p', '', '');
  metricsNode.id = METRICS_ID;

  form.append(title, label, inputNode, button, statusNode, metricsNode);

  inputNode.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    submit();
  });
  button.addEventListener('click', submit);
  return form;
}

/* E038-07 / E038-09 : un seul formulaire par rendu, retrouvé par son id ;
 * un nœud mal parenté est retiré, jamais un nœud de la vue. Les compteurs
 * (sauts, rendus) sont écrits hors région live pour un contrôle auditable. */
function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);
  installCount += 1;

  const nav = nodeIn(ctx, '.points-nav');
  if (!nav || !nav.parentElement) return;

  visibleTotal = visibleCount(ctx);

  let form = document.getElementById(FORM_ID);
  if (form && form.parentElement !== nav.parentElement) form.remove();
  if (!form) {
    renderedStatus = '';
    renderedMax = '';
    form = buildForm(ctx);
  } else {
    inputNode = document.getElementById(INPUT_ID);
    statusNode = document.getElementById(STATUS_ID);
    metricsNode = document.getElementById(METRICS_ID);
  }
  if (form.previousElementSibling !== nav) nav.parentElement.insertBefore(form, nav.nextSibling);

  if (inputNode) {
    const max = String(Math.max(1, visibleTotal));
    if (renderedMax !== max) {
      renderedMax = max;
      inputNode.max = max;
      inputNode.setAttribute('aria-label', `Numéro du point (1 à ${max})`);
    }
  }

  writeMetrics();

  if (pendingJump) {
    const { value, total } = pendingJump;
    const title = pointTitle(ctx);
    setStatus(`Point ${value} sur ${total} sélectionné${title ? ` : ${title}` : ''}.`);
    pendingJump = null;
  } else if (!statusNode || !String(statusNode.textContent || '').trim()) {
    setStatus(visibleTotal
      ? `Saisissez 1 à ${visibleTotal}, puis « Aller » pour un saut direct.`
      : 'Aucun point visible : ajustez les filtres ou l’ère.');
  }
}

register('E038', install);
