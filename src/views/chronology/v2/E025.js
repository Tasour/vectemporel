import { register } from './registry.js';

/* Lentille E025 — sources de la fiche et repli « omission justifiée ».
 * Domaine C (détail & fiche) de la vue Chronologie, passe V2.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E025.md — chantiers E025-01 à E025-10.
 * Fichier possédé : src/views/chronology/v2/E025.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, chronology.js, passe 1) n'est modifié.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } ; helpers
 * ctx.css(id, rules), ctx.el(tag, className, text), ctx.reducedMotion().
 * Le registre n'expose pas de say() : la lentille n'ajoute AUCUNE région live,
 * elle affiche son état en texte visible ordinaire et dédupliqué.
 *
 * Invariants : un seul register('E025', …), une seule feuille ctx.css
 * ('chronology-v2-e025', …), IDs tous préfixés chronology-v2-e025-*, gardes
 * d'existence pour chaque ID, zéro console / fetch / XHR / Math.random /
 * innerHTML / timer, zéro réseau, français partout. Les données sont lues dans
 * le DOM (attributs data-source-*), jamais inventées : à défaut de source,
 * c'est précisément le repli « omission justifiée » qui s'affiche.
 */

const CSS_ID = 'chronology-v2-e025';
const PANEL_ID = 'chronology-v2-e025-sources';
const TITLE_ID = 'chronology-v2-e025-title';
const LIST_ID = 'chronology-v2-e025-list';
const FALLBACK_ID = 'chronology-v2-e025-fallback';
const REASON_ID = 'chronology-v2-e025-reason';
const COUNT_ID = 'chronology-v2-e025-count';
const NOTE_ID = 'chronology-v2-e025-note';

/* E025-02, E025-03, E025-06 : sélecteur tolérant. Les nœuds porteurs de
   données de source sont reconnus par attributs data-* ou par classe ; le
   panneau lui-même est exclu de la collecte pour ne jamais se relire. */
const SOURCE_SELECTOR = [
  '[data-e025-source]',
  '[data-source-id]',
  '[data-source-url]',
  '.chronology-source',
  '.source-entry'
].join(',');

/* E025-01, E025-07, E025-08 : une seule feuille. Le bloc est en flux normal
   (jamais une modale, jamais superposé). Le marqueur d'omission est textuel
   (« OMISSE ») ET formel (bordure en pointillé) : jamais la couleur seule. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line, rgba(255,255,255,.18));
    border-left: 3px solid var(--gold, #c9a227);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft, #d8d4cc); font: inherit; font-size: 11px;
    line-height: 1.55; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e025-title {
    margin: 0 0 6px; color: var(--gold-bright, #f0d488);
    font-family: var(--serif, Georgia, serif); font-size: 14px; font-weight: 600;
  }
  #${PANEL_ID} .e025-lede,
  #${PANEL_ID} .e025-note { margin: 0 0 8px; color: var(--muted, #9a948a); font-size: 10px; }
  #${PANEL_ID} .e025-list { margin: 0 0 8px; padding: 0; list-style: none; }
  #${PANEL_ID} .e025-item {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px;
    margin: 0 0 6px; padding: 6px 8px;
    border: 1px solid var(--line, rgba(255,255,255,.18)); border-radius: 6px;
  }
  #${PANEL_ID} .e025-item-head {
    display: flex; flex-wrap: wrap; align-items: baseline;
    gap: 6px; flex: 1 1 auto; min-width: 0;
  }
  #${PANEL_ID} .e025-label,
  #${PANEL_ID} .e025-link { color: var(--ink, #f2efe9); }
  #${PANEL_ID} .e025-link { text-decoration: underline; text-underline-offset: 2px; }
  #${PANEL_ID} .e025-id {
    padding: 1px 5px; border: 1px solid var(--line-strong, rgba(255,255,255,.3));
    border-radius: 4px; color: var(--gold-bright, #f0d488); font-size: 10px;
  }
  #${PANEL_ID} .e025-badge {
    padding: 1px 6px; border: 1px solid currentColor; border-radius: 999px;
    font-size: 9px; font-weight: 700; letter-spacing: .06em;
  }
  #${PANEL_ID} .e025-item[data-e025-kind="omise"] { border-style: dashed; }
  #${PANEL_ID} .e025-reason {
    flex: 1 1 100%; color: var(--muted, #9a948a); font-size: 10px; font-style: italic;
  }
  #${PANEL_ID} .e025-reason-block { margin: 5px 0 0; color: var(--muted, #9a948a); font-size: 10px; }
  #${PANEL_ID} .e025-fallback {
    margin: 0 0 8px; padding: 8px 10px;
    border: 1px dashed var(--line-strong, rgba(255,255,255,.3)); border-radius: 6px;
    color: var(--ink-soft, #d8d4cc);
  }
  #${PANEL_ID} .e025-fallback .e025-badge { margin-left: 6px; }
  #${PANEL_ID} .e025-count {
    margin: 6px 0 0; color: var(--gold-bright, #f0d488);
    font-size: 10px; font-variant-numeric: tabular-nums;
  }
  #${PANEL_ID} .e025-link:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d488); outline-offset: 2px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e025-item { flex-direction: column; align-items: flex-start; }
    #${PANEL_ID} .e025-link { display: inline-block; min-height: 44px; padding: 10px 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e025-item,
    #${PANEL_ID} .e025-fallback,
    #${PANEL_ID} .e025-badge { border-color: CanvasText; color: CanvasText; }
    #${PANEL_ID} .e025-title,
    #${PANEL_ID} .e025-count,
    #${PANEL_ID} .e025-id,
    #${PANEL_ID} .e025-link { color: CanvasText; }
  }
`;

let renderCount = 0;

/* E025-10 : garde d'existence. Un nœud du rendu précédent est détaché par la
   coque, donc getElementById ne le retrouve pas ; sinon on le déplace dans le
   parent courant. Jamais de clonage, jamais de doublon. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écritures dédupliquées : un second rendu sans changement ne touche à aucun
   textContent (utile au contrat anti-écriture redondante). */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setAttr(node, name, value) {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function attr(node, names) {
  for (const name of names) {
    const value = node.getAttribute(name);
    if (value) return value.trim();
  }
  return '';
}

/* E025-02, E025-03, E025-04, E025-06 : lecture des données de source depuis
   le DOM uniquement. Aucune valeur n'est forgée : le repli porte l'absence. */
function readSources(root, panel) {
  const found = [];
  if (!root || typeof root.querySelectorAll !== 'function') return found;
  root.querySelectorAll(SOURCE_SELECTOR).forEach((node) => {
    if (node === panel || panel.contains(node)) return;
    const raw = attr(node, ['data-e025-source', 'data-source-id', 'data-source']);
    const url = attr(node, ['data-source-url', 'data-href']);
    const kind = attr(node, ['data-source-kind']) || (raw === 'omise' ? 'omise' : 'renseignée');
    const reason = attr(node, ['data-omission-reason', 'data-e025-reason']);
    const label = attr(node, ['data-source-label']) || (node.textContent || '').trim();
    found.push({
      id: raw && raw !== 'omise' ? raw : '',
      url,
      kind,
      reason,
      label: label || (kind === 'omise' ? 'Source omise — omission justifiée' : 'Source sans libellé')
    });
  });
  return found;
}

/* E025-03, E025-06, E025-07 : une entrée = un <li> sémantique, un identifiant
   stable affiché, un lien sortant sécurisé si une URL existe, sinon un simple
   <span>. Les omissions portent le badge texte « OMISSE » et data-e025-kind. */
function buildItem(make, source, index) {
  const li = make('li', 'e025-item');
  setAttr(li, 'data-e025-kind', source.kind);
  setAttr(li, 'data-e025-index', String(index + 1));

  const head = make('span', 'e025-item-head');
  let labelNode;
  if (source.url) {
    labelNode = make('a', 'e025-link', source.label);
    setAttr(labelNode, 'href', source.url);
    setAttr(labelNode, 'target', '_blank');
    setAttr(labelNode, 'rel', 'noopener noreferrer');
  } else {
    labelNode = make('span', 'e025-label', source.label);
  }
  head.appendChild(labelNode);
  if (source.id) head.appendChild(make('code', 'e025-id', source.id));
  li.appendChild(head);

  if (source.kind === 'omise') li.appendChild(make('span', 'e025-badge', 'OMISSE'));
  if (source.reason) li.appendChild(make('span', 'e025-reason', source.reason));
  return li;
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function') return;

  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = ctx.layout || document.body;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e025-sources', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e025-title', 'Sources du repère');
  title.id = TITLE_ID;
  const lede = make('p', 'e025-lede',
    'Sources rattachées au repère affiché. Une source absente est signalée par un repli « omission justifiée » explicite, jamais par un vide silencieux.');
  const list = make('ul', 'e025-list');
  list.id = LIST_ID;
  const fallback = make('p', 'e025-fallback');
  fallback.id = FALLBACK_ID;
  const reason = make('p', 'e025-reason-block');
  reason.id = REASON_ID;
  const count = make('p', 'e025-count');
  count.id = COUNT_ID;
  const note = make('p', 'e025-note');
  note.id = NOTE_ID;

  panel.replaceChildren(title, lede, list, fallback, reason, count, note);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const sources = readSources(document, panel);
  const present = sources.filter((item) => item.kind !== 'omise');
  const omitted = sources.filter((item) => item.kind === 'omise');

  /* E025-02 à E025-07 : liste sémantique, ou repli explicite si elle est vide. */
  list.replaceChildren(...sources.map((item, index) => buildItem(make, item, index)));
  list.hidden = sources.length === 0;
  fallback.hidden = sources.length !== 0;
  if (sources.length === 0) {
    fallback.replaceChildren(
      document.createTextNode('Aucune source n’est rattachée à ce repère dans le DOM. Omission justifiée : le dossier ne renseigne pas de source pour ce point ; ce silence est traité comme une donnée explicite.'),
      make('span', 'e025-badge', 'OMISSE')
    );
  } else {
    fallback.replaceChildren();
  }

  /* E025-05 : le motif d'omission reste un texte distinct, jamais un blanc. */
  const motives = omitted
    .map((item, index) => (item.reason ? `source ${index + 1} : ${item.reason}` : ''))
    .filter(Boolean);
  write(reason, motives.length
    ? `Motif d’omission — ${motives.join(' ; ')}.`
    : (sources.length === 0
      ? 'Motif d’omission — aucune source transmise à la fiche ; le repli explicite tient lieu de justification.'
      : 'Motif d’omission — aucune omission déclarée pour ce repère.'));

  /* E025-09 : mesure chiffrée recalculée depuis les nœuds collectés. */
  write(count, `Sources renseignées : ${present.length} · omissions justifiées : ${omitted.length} · total : ${sources.length}.`);

  /* E025-08, E025-10 : état visible (aucune région live ajoutée). */
  write(note, `Contrôle : identifiants de source stables et visibles, liens sortants sécurisés (nouvel onglet, relation « noopener noreferrer »), repli non coloriel (badge « OMISSE » + bordure en pointillé). Mouvement réduit : ${reduced ? 'oui' : 'non'} · rendus : ${renderCount}.`);

  setAttr(panel, 'data-e025-sources', String(present.length));
  setAttr(panel, 'data-e025-omitted', String(omitted.length));
  setAttr(panel, 'data-e025-state', sources.length === 0 ? 'omise' : 'renseignee');
  setAttr(panel, 'data-e025-reduced', reduced ? '1' : '0');
  setAttr(panel, 'data-e025-renders', String(renderCount));
}

register('E025', install);
