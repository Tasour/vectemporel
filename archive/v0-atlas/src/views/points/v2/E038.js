import { register } from './registry.js';

/* Lentille E038 — passe 2 (module POINTS/V2 E038). Tableau de lecture de la
 * commande « aller au point » (saut direct).
 *
 * Dix chantiers V2, E038-V2-01 à E038-V2-10, décrits dans
 * UNIFIED_AUDIT/POINTS/V2/views/E038.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E038.js) garde
 * la main sur le formulaire « Aller », ses deux déclencheurs (Entrée dans le
 * champ, clic sur le bouton), la validation 1..N, l'écrite unique du store et
 * le statut aria-live. La passe 2 ne pilote rien, ne déplace aucun point et
 * n'ajoute aucun bouton : elle REND LISIBLE l'état courant de cette commande.
 *
 * Tout identifiant, classe, marqueur et id de feuille est préfixé
 * `points-v2-e038` / `v2-e038`, pour ne jamais entrer en collision avec le
 * formulaire de la passe 1 (`points-e038`, `#points-e038-goto`,
 * `#points-e038-input`, `#points-e038-go`, `#points-e038-status`,
 * `#points-e038-metrics`).
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état, aucun écouteur
 * global, aucune région live supplémentaire (E041 porte l'annonce unique).
 * Les signaux sont lus dans le DOM réellement produit par la passe 1 et
 * réaffichés : borne du champ, texte du statut, compteurs et titre de la fiche.
 * Aucun numéro, aucun total et aucun titre n'est inventé ni codé en dur.
 * Le seul ajout à un nœud existant est un aria-describedby complété (jamais
 * écrasé) sur le champ numérique de la passe 1.
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu ;
 * ids préfixés et dédupliqués ; tout DOM statique bâti avec ctx.el (jamais
 * innerHTML) ; zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.* ;
 * chaque état porte un glyphe ET un mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e038';
const SCOPE = 'points-v2-e038';
const PANEL_ID = 'points-v2-e038-summary';
const TITLE_ID = 'points-v2-e038-title';
const NOTE_ID = 'points-v2-e038-note';
const REDUCED_ATTR = 'data-v2-e038-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* E038-V2-04 : vocabulaire d'état. Chaque distinction est codée trois fois :
 * glyphe, mot et couleur redondante (jamais la couleur seule). Les cinq états
 * couvrent exactement les cinq messages que la passe 1 sait écrire dans son
 * statut (#points-e038-status). */
const STATES = {
  ready: { mark: '◉', word: 'prêt à saisir' },
  refused: { mark: '⊗', word: 'saisie refusée' },
  asked: { mark: '↗', word: 'saut demandé' },
  confirmed: { mark: '✓', word: 'saut confirmé' },
  empty: { mark: '○', word: 'aucun point visible' },
};

/* E038-V2-01 / E038-V2-09 / E038-V2-10 : feuille unique, entièrement préfixée
 * par .points-v2-e038, classe posée sur .points-layout : aucune fuite hors de
 * cette vue. Les transitions ne portent que sur la couleur des glyphes. */
const CSS = `
.points-v2-e038 .points-v2-e038-summary {
  box-sizing: border-box;
  margin: 12px 0 6px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6); font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere; max-width: 100%;
}
.points-v2-e038 .points-v2-e038-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e038 .points-v2-e038-intro,
.points-v2-e038 .points-v2-e038-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e038 .points-v2-e038-list {
  list-style: none; margin: 0 0 8px; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 4px 10px;
}
.points-v2-e038 .points-v2-e038-list li {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
}
.points-v2-e038 .points-v2-e038-glyph {
  display: inline-block; min-width: 1.4em;
  color: var(--gold-bright); font-weight: 700;
  transition: color .18s linear;
}
.points-v2-e038 .points-v2-e038-name { color: var(--ink-soft); }
.points-v2-e038 .points-v2-e038-state {
  margin-left: auto; color: var(--muted-2); font-size: 10px;
}
.points-v2-e038 .points-v2-e038-item.is-refused .points-v2-e038-glyph,
.points-v2-e038 .points-v2-e038-item.is-empty .points-v2-e038-glyph {
  color: var(--muted-2);
}
.points-v2-e038 .points-v2-e038-current,
.points-v2-e038 .points-v2-e038-metrics {
  margin: 6px 0 0; font-size: 10px; line-height: 1.45;
  color: var(--muted); font-variant-numeric: tabular-nums;
}
.points-v2-e038[` + REDUCED_ATTR + `="1"] .points-v2-e038-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e038 .points-v2-e038-glyph { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e038 .points-v2-e038-list { grid-template-columns: 1fr; }
}
@media (forced-colors: active) {
  .points-v2-e038 .points-v2-e038-summary { border-color: CanvasText; }
  .points-v2-e038 .points-v2-e038-glyph,
  .points-v2-e038 .points-v2-e038-state { color: CanvasText; }
}
@media print {
  .points-v2-e038 .points-v2-e038-summary {
    border-color: #666; background: transparent;
  }
}
`;

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E038-V2-10 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est
 * pas celui conservé est retiré du document. */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E038-V2-02 : repérage NON destructif du formulaire de la passe 1 et de ses
 * nœuds, par leurs ids préfixés `points-e038-*`. Aucun nœud n'est créé dans le
 * formulaire, aucun gestionnaire natif n'est remplacé, aucun bouton ajouté. */
function readCommand(layout) {
  const detail = query(layout, '.points-detail');
  const nav = detail ? query(detail, '.points-nav') : null;
  const form = query(detail, '#points-e038-goto')
    || (nav && nav.parentElement ? query(nav.parentElement, '#points-e038-goto') : null);
  return {
    detail,
    form,
    input: form ? query(form, '#points-e038-input') : null,
    button: form ? query(form, '#points-e038-go') : null,
    status: form ? query(form, '#points-e038-status') : null,
    metrics: form ? query(form, '#points-e038-metrics') : null,
    title: txt(query(detail, '.points-point-title')),
  };
}

/* E038-V2-03 : la borne est lue dans le kicker réel de points.js:96
 * (« N point(s) dans ce périmètre »), exactement comme la passe 1. Aucun total
 * codé en dur, aucune position supposée : state.pointIndex n'est pas exposé
 * par le contrat. L'attribut max du champ est lu à titre de corroboration. */
function parseCount(text) {
  const match = /(\d+)\s*point/i.exec(String(text || ''));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function readSignals(layout) {
  const command = readCommand(layout);
  const kicker = txt(query(command.detail, '.view-kicker'));
  const count = parseCount(kicker);
  const statusText = txt(command.status);
  const maxRaw = command.input && command.input.max ? Number(command.input.max) : null;
  const max = Number.isFinite(maxRaw) ? maxRaw : null;

  /* E038-V2-07 : les compteurs sont lus dans le texte que la passe 1 a écrit
   * dans #points-e038-metrics (« Sauts : N · Rendus : N. »), sans état propre. */
  const metricsText = txt(command.metrics);
  const sauts = /Sauts\s*:\s*(\d+)/i.exec(metricsText);
  const rendus = /Rendus\s*:\s*(\d+)/i.exec(metricsText);

  return {
    command,
    count,
    max,
    statusText,
    isRefused: !!(command.status && getAttr(command.status, 'data-tone') === 'error'),
    sauts: sauts ? Number(sauts[1]) : null,
    rendus: rendus ? Number(rendus[1]) : null,
    metricsText,
    hasForm: !!command.form,
  };
}

/* E038-V2-04 : classification du statut réel de la passe 1, en cinq états.
 * L'ordre est significatif : le ton d'erreur l'emporte, puis la demande, puis
 * la confirmation, puis le périmètre vide, sinon l'invite initiale. */
function stateOf(s) {
  if (!s.hasForm) return 'empty';
  if (s.isRefused) return 'refused';
  if (/Saut vers/i.test(s.statusText)) return 'asked';
  if (/s[eé]lectionn[eé]/i.test(s.statusText)) return 'confirmed';
  if (/Aucun point visible/i.test(s.statusText)) return 'empty';
  return 'ready';
}

function signatureOf(s, state) {
  return [state, s.count, s.max, s.statusText, s.metricsText, s.command.title].join('|');
}

function listItem(ctx, name, glyph, state, kind) {
  const li = ctx.el('li', 'points-v2-e038-item is-' + kind);
  li.append(
    ctx.el('span', 'points-v2-e038-glyph', glyph),
    ctx.el('span', 'points-v2-e038-name', name),
    ctx.el('span', 'points-v2-e038-state', state)
  );
  return li;
}

/* E038-V2-05 : le lien avec le champ est additif : l'aria-label, le aria-describedby
 * et les attributs déjà posés par la passe 1 sont conservés et dédupliqués,
 * jamais écrasés. aria-describedby ne fait pas partie de la signature de
 * restauration de focus de la coque. */
function augmentDescribedBy(node, id) {
  if (!node || typeof node.setAttribute !== 'function') return;
  const existing = (getAttr(node, 'aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (existing.indexOf(id) !== -1) return;
  setAttr(node, 'aria-describedby', existing.concat(id).join(' '));
}

/* E038-V2-06 : structure statique construite une seule fois par rendu avec
 * ctx.el (jamais innerHTML) ; seules la liste et les trois lignes dynamiques
 * sont remplacées ensuite par fill(). Le panneau est un frère du formulaire,
 * pas un enfant : il n'entre pas dans l'ordre de tabulation et n'ajoute aucune
 * région live (E041). */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e038-summary');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e038-title',
    'Commande « aller au point » — lecture de l’état');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e038-intro',
    'Ce panneau relit la commande « Aller » de la passe 1 : la borne du champ, le message de son statut, ses compteurs et le titre de la fiche. Il ne déplace jamais le point : la saisie et le saut restent gérés par la passe 1.'));
  panel.appendChild(ctx.el('ul', 'points-v2-e038-list', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e038-current', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e038-metrics', ''));

  const note = ctx.el('p', 'points-v2-e038-note',
    'Lecture seule : le champ numérique et le bouton « Aller » restent gérés par la passe 1. Chaque état est écrit avec un signe et un mot, jamais par la couleur seule. Si le kicker est absent, la borne est dite « non lisible » plutôt que supposée.');
  note.id = NOTE_ID;
  panel.appendChild(note);
  return panel;
}

/* E038-V2-03 / E038-V2-04 / E038-V2-07 / E038-V2-08 : tout le contenu
 * dynamique est écrit ici, à partir des signaux lus dans le DOM de la passe 1. */
function fill(ctx, panel, s, state) {
  const vocab = STATES[state];
  const count = s.count;
  const list = query(panel, '.points-v2-e038-list');
  if (list) {
    list.replaceChildren(
      listItem(ctx, 'Commande', vocab.mark, vocab.word, state),
      listItem(ctx, 'Borne du champ',
        count === null ? '○' : '◉',
        count === null ? 'non lisible' : '1 à ' + count + ' point' + plural(count, '', 's'),
        count === null ? 'empty' : 'open'),
      listItem(ctx, 'Sauts demandés',
        s.sauts === null ? '○' : '↗',
        s.sauts === null ? 'non lisible' : String(s.sauts),
        s.sauts === null ? 'empty' : 'open'),
      listItem(ctx, 'Rendus',
        s.rendus === null ? '○' : '✓',
        s.rendus === null ? 'non lisible' : String(s.rendus),
        s.rendus === null ? 'empty' : 'open')
    );
  }

  const current = query(panel, '.points-v2-e038-current');
  if (current) {
    current.textContent = 'Lecture : ' + vocab.word
      + (s.command.title ? ' · fiche « ' + s.command.title + ' »' : ' · aucune fiche affichée')
      + (s.statusText ? ' · statut : ' + s.statusText : '') + '.';
  }

  const metrics = query(panel, '.points-v2-e038-metrics');
  if (metrics) {
    metrics.textContent = 'Signaux observables : commande '
      + (s.hasForm ? 'présente' : 'absente')
      + ' · borne ' + (count === null ? 'non lue' : count)
      + ' · max du champ ' + (s.max === null ? 'non lu' : s.max)
      + ' · sauts ' + (s.sauts === null ? 'non lus' : s.sauts)
      + ' · rendus ' + (s.rendus === null ? 'non lus' : s.rendus) + '.';
  }

  setAttr(panel, 'data-v2-e038-state', state);
  setAttr(panel, 'data-v2-e038-count', count === null ? '' : String(count));
  setAttr(panel, 'data-v2-e038-max', s.max === null ? '' : String(s.max));
  setAttr(panel, 'data-v2-e038-sauts', s.sauts === null ? '' : String(s.sauts));
  setAttr(panel, 'data-v2-e038-rendus', s.rendus === null ? '' : String(s.rendus));
}

/* E038-V2-09 : mouvement réduit couplé JS et CSS, sans animation propre. */
function applyReducedMotion(ctx, layout) {
  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(REDUCED_ATTR)) {
    layout.removeAttribute(REDUCED_ATTR);
  }
}

/* E038-V2-01 / E038-V2-09 / E038-V2-10 : unique point d'entrée, gardes
 * structurelles, feuille unique, portée unique, ids dédupliqués, repli
 * silencieux sur structure inattendue. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const detail = query(layout, '.points-detail');
  const nav = detail ? query(detail, '.points-nav') : null;
  if (!isElement(detail) || !isElement(nav)) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  applyReducedMotion(ctx, layout);

  const signals = readSignals(layout);
  const state = stateOf(signals);
  const sig = signatureOf(signals, state);

  /* E038-V2-10 : réconciliation par id. On conserve le panneau déjà monté dans
   * le détail courant, on retire les doublons d'un rendu antérieur, puis on
   * garantit l'unicité du titre et de la note. */
  const candidates = nodesById(PANEL_ID);
  let panel = null;
  for (const candidate of candidates) {
    if (detail.contains(candidate) && candidate.parentElement === detail) {
      panel = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!isElement(panel)) {
    panel = buildPanel(ctx);
    detail.appendChild(panel);
  }
  enforceUnique(TITLE_ID, query(panel, '#' + TITLE_ID));
  enforceUnique(NOTE_ID, query(panel, '#' + NOTE_ID));

  if (getAttr(panel, 'data-v2-e038-signature') !== sig) {
    setAttr(panel, 'data-v2-e038-signature', sig);
    fill(ctx, panel, signals, state);
  }

  setAttr(panel, 'data-v2-e038', '1');
  if (signals.command.form) setAttr(signals.command.form, 'data-v2-e038-form', '1');
  if (signals.command.input) augmentDescribedBy(signals.command.input, NOTE_ID);
}

register('E038', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
