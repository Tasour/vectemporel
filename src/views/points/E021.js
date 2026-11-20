import { register } from './registry.js';

/* Lentille E021 — Fiche du point : titre et ancre temporelle en évidence
 * (domaine C : détail & fiche).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E021.md — chantiers E021-01 à E021-10.
 * Fichier possédé : ce module uniquement. Le rendu de base (src/views/points.js)
 * n'est ni édité ni doublé : E021 promeut les nœuds déjà présents dans
 * .points-detail et ajoute un bandeau LOCAL, non modal, sans changer le texte
 * des points ni l'état du store.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Toute la valeur affichée est lue dans le DOM rendu (.points-point-title,
 * .points-meta) : aucune date, aucun pays, aucun chiffre n'est codé en dur.
 *
 * Invariants :
 * - un seul greffon, un seul CSS, un seul bandeau, un seul observateur ;
 * - le titre d'origine est DÉPLACÉ (même nœud), jamais recopié ni supprimé ;
 * - la valeur temporelle d'origine reste intacte dans .points-meta ;
 * - aucun timer, aucune rAF, aucun réseau, aucun aléa, aucune journalisation ;
 * - aucune écriture dans le nœud observé (le bandeau n'est jamais observé) ;
 * - idempotent : un rendu neuf remplace le bandeau, un rendu identique ne
 *   réécrit rien (signature anti-redondance).
 */

const CSS_ID = 'points-e021';
const HEAD_ID = 'points-e021-head';
const TITLE_ID = 'points-e021-title';
const ANCHOR_ID = 'points-e021-anchor';
const TIME_ID = 'points-e021-time';

/* Formes réellement présentes dans le dataset : -43, 476-1492, -600/476,
 * 1618/1648, 1830-07-05, -1600/-221. La contrainte reste large mais bornée :
 * aucun libellé de domaine, d'échelle ou de certitude ne peut la satisfaire. */
const TIME_RE = /^-?\d{1,4}(?:[-\/]-?\d{1,4}){0,2}$/;

const CSS = `
  #${HEAD_ID} {
    margin: 0 0 16px; padding: 14px 16px;
    border: 1px solid var(--line-strong); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(230, 185, 111, .05);
  }
  #${HEAD_ID} .points-e021-kicker {
    margin: 0 0 6px; color: var(--gold);
    font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
  }
  #${HEAD_ID} .points-e021-title {
    margin: 0 0 12px; font-family: var(--serif);
    font-size: clamp(20px, 2.4vw, 30px); font-weight: 500; line-height: 1.2;
    color: var(--gold-bright); overflow-wrap: anywhere;
  }
  #${ANCHOR_ID} { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; margin: 0; }
  #${HEAD_ID} .points-e021-anchor-label {
    color: var(--muted-2); font-size: 10px;
    text-transform: uppercase; letter-spacing: .06em;
  }
  #${TIME_ID} {
    display: inline-block; min-height: 30px; padding: 4px 10px;
    border: 1px solid var(--gold); border-radius: 999px;
    background: rgba(230, 185, 111, .12); color: var(--gold-bright);
    font-size: 17px; font-weight: 600; font-variant-numeric: tabular-nums;
  }
  #${HEAD_ID} .points-e021-note {
    margin: 10px 0 0; color: var(--muted-2); font-size: 10px; line-height: 1.4;
  }
  @media (max-width: 900px) {
    #${HEAD_ID} { padding: 12px; }
    #${TIME_ID} { min-height: 36px; padding: 6px 12px; font-size: 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${HEAD_ID}, #${TIME_ID} { transition: none; }
  }
`;

let detail = null;        // .points-detail courant
let header = null;        // #points-e021-head courant
let titleNode = null;     // titre d'origine déplacé, ou titre de repli
let timeNode = null;      // badge d'ancre possédé par E021
let observer = null;      // unique MutationObserver, ciblé hors du bandeau
let lastSignature = '';
let installCount = 0;
let refreshCount = 0;

function findDetail(ctx) {
  const root = ctx.layout && ctx.layout.isConnected ? ctx.layout : ctx.stage;
  return root && typeof root.querySelector === 'function'
    ? root.querySelector('.points-detail') : null;
}

/* Aucune valeur historique littérale : la source est le DOM déjà rendu.
 * Lecture tolérante : spans d'origine, <dd> d'une métadonnée structurée, ou
 * <time> écrit par une autre lentille ; repli positionnel (3e entrée). */
function findTimeRaw(target) {
  const meta = target && target.querySelector('.points-meta');
  if (!meta) return '';
  const candidates = Array.from(meta.querySelectorAll('span, dd, time'));
  for (const node of candidates) {
    if (node.classList && node.classList.contains('confidence')) continue;
    const value = String(node.textContent || '').trim();
    if (TIME_RE.test(value)) return value;
  }
  const fallback = candidates[2];
  return fallback ? String(fallback.textContent || '').trim() : '';
}

function expandYear(token) {
  const value = String(token || '').trim();
  return /^-\d{1,4}$/.test(value) ? `${value.slice(1)} av. J.-C.` : value;
}

/* Mise en forme seule : le séparateur d'origine est conservé dans title et
 * data-points-e021-time ; aucune précision ni borne n'est ajoutée. */
function formatTime(raw) {
  const value = String(raw || '').trim();
  if (!value) return 'Non renseignée';
  if (/^-?\d{1,4}-\d{2}-\d{2}$/.test(value)) return value;
  return value.split('/').map((chunk) => {
    if (/^\d{1,4}-\d{1,4}$/.test(chunk)) {
      return chunk.split('-').map(expandYear).join(' – ');
    }
    return expandYear(chunk);
  }).join(' – ');
}

function buildHeader(ctx, fresh) {
  if (!header || !detail) return;

  const nativeTitle = detail.querySelector('.points-point-title');
  const titleValid = nativeTitle
    ? titleNode === nativeTitle && titleNode.isConnected && titleNode.parentElement === header
    : titleNode && titleNode.isConnected && titleNode.parentElement === header;
  /* Rendu identique : le bandeau est déjà complet, on ne touche à rien.
   * C'est cette garde qui rend la signature anti-redondance effective. */
  if (!fresh && titleValid && header.firstElementChild && timeNode && timeNode.isConnected) return;

  if (nativeTitle) {
    titleNode = nativeTitle;
  } else if (!titleNode || !titleNode.isConnected || titleNode.parentElement !== header) {
    titleNode = ctx.el('h3', 'points-point-title', 'Aucun point affiché dans ce périmètre.');
  }
  if (!titleNode.id) titleNode.id = TITLE_ID;
  titleNode.classList.add('points-e021-title');

  header.setAttribute('role', 'group');
  header.setAttribute('aria-labelledby', TITLE_ID);
  header.setAttribute('aria-describedby', ANCHOR_ID);

  const kicker = ctx.el('p', 'points-e021-kicker', 'Fiche du point');
  const anchor = ctx.el('p', 'points-e021-anchor');
  anchor.id = ANCHOR_ID;
  anchor.appendChild(ctx.el('span', 'points-e021-anchor-label', 'Ancre temporelle'));
  timeNode = ctx.el('span', 'points-e021-time');
  timeNode.id = TIME_ID;
  anchor.appendChild(timeNode);
  const note = ctx.el('p', 'points-e021-note',
    'L’ancre mesure ce point ; elle ne désigne pas l’ère affichée.');

  /* replaceChildren déplace le titre d'origine (même nœud, même texte) et
   * évacue tout ancien titre de repli : une seule fiche, jamais de doublon. */
  header.replaceChildren(kicker, titleNode, anchor, note);
  if (detail.firstElementChild !== header) detail.insertBefore(header, detail.firstChild);
  lastSignature = '';
}

function refresh() {
  if (!detail || !header || !titleNode || !timeNode || !detail.isConnected) return;
  const titleText = String(titleNode.textContent || '').trim();
  const raw = findTimeRaw(detail);
  const signature = `${titleText}\u0000${raw}`;
  if (signature !== lastSignature) {
    lastSignature = signature;
    refreshCount += 1;
    timeNode.textContent = formatTime(raw);
    timeNode.setAttribute('data-points-e021-time', raw);
    timeNode.title = raw ? `Valeur brute : ${raw}` : 'Aucune valeur d’ancre dans ce périmètre';
  }
  /* Signaux lisibles par les autres lentilles, sans écrire dans le titre ni
   * dans la métadonnée d'origine (les deux seules cibles observées). Toute
   * écriture est conditionnée à un changement réel. */
  if (detail.dataset.pointsE021Title !== titleText) detail.dataset.pointsE021Title = titleText;
  if (detail.dataset.pointsE021Time !== raw) detail.dataset.pointsE021Time = raw;
  const metrics = `installs:${installCount} refreshes:${refreshCount}`;
  if (header.dataset.pointsE021 !== metrics) header.dataset.pointsE021 = metrics;
}

/* Un seul observateur, déconnecté puis reconnecté à chaque installation.
 * Cibles : le titre déplacé et .points-meta. Jamais le bandeau, jamais
 * detail lui-même : refresh() n'écrit que dans le bandeau. */
function observeTargets() {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  observer = null;
  if (typeof MutationObserver === 'undefined') return;
  const meta = detail && detail.querySelector('.points-meta');
  const title = titleNode && titleNode.isConnected ? titleNode : null;
  if (!meta && !title) return;
  observer = new MutationObserver(() => refresh());
  if (meta) observer.observe(meta, { childList: true, characterData: true, subtree: true });
  if (title) observer.observe(title, { childList: true, characterData: true, subtree: true });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const nextDetail = findDetail(ctx);
  if (!nextDetail) return;
  detail = nextDetail;

  const found = document.getElementById(HEAD_ID);
  if (found && found.parentElement !== detail) found.remove();
  const fresh = !found || !found.isConnected || found.parentElement !== detail;
  header = found || ctx.el('header', 'points-e021-head');
  if (!header.id) header.id = HEAD_ID;
  if (fresh) {
    titleNode = null;
    lastSignature = '';
  }

  buildHeader(ctx, fresh);
  observeTargets();
  refresh();
}

register('E021', install);
