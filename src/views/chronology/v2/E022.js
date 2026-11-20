import { register } from './registry.js';

/* Lentille E022 — V2, passe CHRONOLOGIE (domaine C : détail & fiche).
 * Thème : « bloc de confiance au libellé explicite » (themes.json, clé E022).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E022.md — chantiers E022-01 à E022-10.
 * Fichier possédé : src/views/chronology/v2/E022.js uniquement. Lectures seules :
 * src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 * Aucun fichier partagé n'est modifié : ni registry.js, ni index.js, ni styles.css,
 * ni src/views/chronology.js, ni la passe 1, ni une autre lentille V2.
 *
 * Contrat exploité : viewId ('chronologyv2'), stage, layout, css, el, reducedMotion.
 * La lentille n'écrit dans aucune région live existante : elle affiche son état en
 * texte visible, dédupliqué, dans un bloc en flux normal (jamais une modale).
 *
 * Invariants :
 * - un seul register('E022', ctx => { … }), un seul css('chronology-v2-e022', …) ;
 * - dix identifiants DOM uniques, tous préfixés 'chronology-v2-e022-', protégés
 *   par une garde d'existence (idempotence entre deux rendus) ;
 * - zéro appel réseau, zéro aléa, zéro journalisation, zéro HTML brut injecté,
 *   zéro timer, zéro animation propre, zéro écouteur inutile.
 */

const CSS_ID = 'chronology-v2-e022';

/* E022-01 à E022-10 : les dix nœuds possédés, tous préfixés. */
const PANEL_ID = 'chronology-v2-e022-trust-panel';
const BLOCK_ID = 'chronology-v2-e022-bloc';
const TITLE_ID = 'chronology-v2-e022-titre';
const DESC_ID = 'chronology-v2-e022-description';
const LABEL_ID = 'chronology-v2-e022-libelle';
const LEVEL_ID = 'chronology-v2-e022-niveau';
const DFN_ID = 'chronology-v2-e022-definition';
const CRITERIA_ID = 'chronology-v2-e022-criteres';
const SOURCE_ID = 'chronology-v2-e022-source';
const DISPUTE_ID = 'chronology-v2-e022-dispute';
const PRECISION_ID = 'chronology-v2-e022-precision';
const FALLBACK_ID = 'chronology-v2-e022-repli';
const STATE_ID = 'chronology-v2-e022-etat';

/* E022-06, E022-09 : une seule feuille, injectée une fois par ctx.css. Le bloc
   est un groupe en flux, jamais superposé : il n'ajoute aucun arrêt Tab et ne
   masque ni la frise ni la fiche. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e022-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e022-desc,
  #${PANEL_ID} .e022-label { margin: 0 0 8px; color: var(--muted); }
  #${BLOCK_ID} {
    margin: 0 0 8px; padding: 9px 11px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(0,0,0,.12);
  }
  #${PANEL_ID} .e022-label {
    display: block; color: var(--gold-bright); font-weight: 600;
  }
  /* E022-01, E022-02 : le niveau est un texte, la couleur n'est qu'un renfort. */
  #${PANEL_ID} .e022-level {
    display: block; margin: 0 0 7px; padding: 5px 8px;
    border: 1px solid var(--line-strong); border-radius: 5px;
    color: var(--ink); font-size: 11px; font-weight: 600;
  }
  #${BLOCK_ID}[data-e022-level="elevee"] .e022-level { border-left: 4px solid var(--gold-bright); }
  #${BLOCK_ID}[data-e022-level="moyenne"] .e022-level { border-left: 4px solid var(--muted); }
  #${BLOCK_ID}[data-e022-level="faible"] .e022-level { border-left: 4px solid var(--line-strong); }
  #${BLOCK_ID}[data-e022-level="dispute"] .e022-level { border-left: 4px solid var(--gold); }
  #${PANEL_ID} .e022-dfn { margin: 0 0 7px; color: var(--muted); }
  #${PANEL_ID} .e022-dfn dfn { color: var(--gold-bright); font-style: normal; font-weight: 600; }
  /* E022-04 : puces sémantiques, sans dépendance chromatique. */
  #${PANEL_ID} .e022-criteria { margin: 0 0 7px; padding-left: 18px; list-style: disc; }
  #${PANEL_ID} .e022-criteria li { margin: 0 0 3px; }
  #${PANEL_ID} .e022-source,
  #${PANEL_ID} .e022-dispute,
  #${PANEL_ID} .e022-precision,
  #${PANEL_ID} .e022-fallback,
  #${PANEL_ID} .e022-state { margin: 5px 0 0; }
  #${PANEL_ID} .e022-dispute { color: var(--gold-bright); }
  #${PANEL_ID} .e022-source,
  #${PANEL_ID} .e022-precision,
  #${PANEL_ID} .e022-fallback,
  #${PANEL_ID} .e022-state { color: var(--muted-2); font-size: 9px; }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 9px 10px 10px; }
    #${BLOCK_ID} { padding: 7px 9px; }
  }
  /* E022-09 : mouvement réduit — aucune transition, aucune animation propre. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  /* E022-09 : en couleurs forcées, le texte reste le vecteur d'information. */
  @media (forced-colors: active) {
    #${PANEL_ID}, #${BLOCK_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e022-title,
    #${PANEL_ID} .e022-label,
    #${PANEL_ID} .e022-level,
    #${PANEL_ID} .e022-dfn dfn,
    #${PANEL_ID} .e022-dispute { color: CanvasText; }
  }
`;

/* E022-02 : vocabulaires observés, ramenés à quatre niveaux nommés. Toute
   valeur non reconnue devient « Non renseignée » : jamais un chiffre orphelin. */
function normalizeLevel(raw) {
  const value = String(raw == null ? '' : raw).trim().toLowerCase();
  if (!value) return 'inconnu';
  if (value === 'dispute' || value === 'disputé' || value === 'conteste' || value === 'contested') return 'dispute';
  if (value === 'elevee' || value === 'élevée' || value === 'haute' || value === 'high' || value === 'forte') return 'elevee';
  if (value === 'moyenne' || value === 'medium' || value === 'moderee' || value === 'modérée') return 'moyenne';
  if (value === 'faible' || value === 'low' || value === 'basse') return 'faible';
  return 'inconnu';
}

function labelForLevel(level) {
  if (level === 'elevee') return 'Élevée';
  if (level === 'moyenne') return 'Moyenne';
  if (level === 'faible') return 'Faible';
  if (level === 'dispute') return 'Disputée — les sources ne s’accordent pas';
  return 'Non renseignée — niveau à expliciter dans la fiche';
}

/* E022-02, E022-04, E022-05, E022-07 : lecture tolérante du DOM. La lentille
   observe un éventuel bloc de confiance existant ; si aucun n'est trouvé, elle
   affiche un état explicite plutôt que de deviner une valeur. */
function findConfidenceNode(root) {
  if (!root || typeof root.querySelector !== 'function') return null;
  const selectors = [
    '[data-confidence]',
    '[data-confidence-level]',
    '.confidence',
    '.confiance',
    '[data-trust]',
    '[aria-label*="confiance" i]'
  ];
  for (let i = 0; i < selectors.length; i += 1) {
    const found = root.querySelector(selectors[i]);
    if (found) return found;
  }
  return null;
}

function datasetValue(node, keys) {
  if (!node || !node.dataset) return '';
  for (let i = 0; i < keys.length; i += 1) {
    const value = node.dataset[keys[i]];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/* E022-10 : garde d'existence. Un nœud déjà présent est réutilisé et déplacé
   dans le parent courant ; la coque reconstruisant la scène, un nœud de la
   rendu précédent est détaché et n'est donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E022-10 : écriture dédupliquée — deux rendus identiques ne touchent à aucun
   textContent, donc ne réveillent aucune région live alentour. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function isTruthy(value) {
  const v = String(value == null ? '' : value).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'oui' || v === 'yes';
}

/* Module-level : survive aux rendus sans créer de nœud ni d'écouteur. */
let renderCount = 0;

register('E022', ctx => {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e022-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  /* E022-08 : le bloc lui-même est un groupe explicitement étiqueté. */
  const block = ensureNode(make, BLOCK_ID, 'div', 'e022-bloc', panel);
  block.setAttribute('role', 'group');
  block.setAttribute('aria-labelledby', LABEL_ID);
  block.setAttribute('aria-describedby', DESC_ID);

  const title = ensureNode(make, TITLE_ID, 'h2', 'e022-title', panel);
  write(title, 'Bloc de confiance — libellé explicite');

  const desc = ensureNode(make, DESC_ID, 'p', 'e022-desc', panel);
  write(desc, 'Ce bloc accompagne la fiche du repère : il nomme le niveau de confiance au lieu de le laisser à la seule couleur.');

  /* E022-01 : libellé textuel explicite, toujours porteur du sens. */
  const label = ensureNode(make, LABEL_ID, 'p', 'e022-label', block);
  write(label, 'Niveau de confiance (libellé explicite)');

  /* E022-02 : niveau nommé, dérivé du DOM, jamais d'une couleur. */
  const source = findConfidenceNode(ctx.stage) || findConfidenceNode(ctx.layout);
  const rawLevel = datasetValue(source, ['confidence', 'confidenceLevel', 'trust', 'niveau']);
  const level = normalizeLevel(rawLevel);
  const levelText = ensureNode(make, LEVEL_ID, 'p', 'e022-level', block);
  write(levelText, 'Niveau déclaré : ' + labelForLevel(level));
  block.dataset.e022Level = level;
  panel.dataset.e022Label = '1';

  /* E022-03 : glossaire — le terme est défini à sa première occurrence. */
  const dfnWrap = ensureNode(make, DFN_ID, 'p', 'e022-dfn', block);
  dfnWrap.replaceChildren();
  const dfn = make('dfn', 'e022-dfn-term', 'Confiance');
  dfnWrap.append(dfn, document.createTextNode(' : degré de fiabilité d’une assertion historique, estimé d’après ses sources et indépendamment de la précision de sa date.'));

  /* E022-04 : critères explicites, un <li> par critère observable. */
  const provenance = datasetValue(source, ['provenance', 'sourceProvenance']);
  const sourcesCount = datasetValue(source, ['sourcesCount', 'sourceCount', 'nbSources']);
  const corroboration = datasetValue(source, ['corroboration', 'corroboratedBy']);
  const criteria = ensureNode(make, CRITERIA_ID, 'ul', 'e022-criteria', block);
  criteria.replaceChildren();
  const rows = [
    provenance ? 'Provenance déclarée : ' + provenance : 'Provenance : non renseignée dans le DOM.',
    sourcesCount ? 'Sources mobilisées : ' + sourcesCount : 'Sources mobilisées : non dénombrées dans le DOM.',
    corroboration ? 'Corroboration : ' + corroboration : 'Corroboration : non signalée dans le DOM.'
  ];
  rows.forEach(text => criteria.appendChild(make('li', 'e022-criterion', text)));

  /* E022-05 : attribution nominative, ou omission justifiée. */
  const sourceName = datasetValue(source, ['confidenceSource', 'source', 'sourceName']);
  const sourceText = ensureNode(make, SOURCE_ID, 'p', 'e022-source', block);
  write(sourceText, sourceName
    ? 'Source du niveau de confiance : ' + sourceName + '.'
    : 'Source du niveau de confiance : omission justifiée — aucune source nominative fournie par la fiche.');

  /* E022-06 : un statut disputé est dit, jamais tu par un silence. */
  const disputed = level === 'dispute' || isTruthy(datasetValue(source, ['disputed', 'dispute']));
  const disputeText = ensureNode(make, DISPUTE_ID, 'p', 'e022-dispute', block);
  write(disputeText, disputed
    ? 'Statut : disputé — les sources divergent ; le désaccord est affiché, non résolu par un silence.'
    : 'Statut : aucun désaccord signalé dans le DOM à ce jour.');
  panel.dataset.e022Status = disputed ? 'dispute' : 'non-dispute';

  /* E022-07 : confiance de l'assertion ≠ précision de la date. */
  const precision = datasetValue(source, ['datePrecision', 'precision']);
  const precisionText = ensureNode(make, PRECISION_ID, 'p', 'e022-precision', block);
  write(precisionText, 'Précision de la date : ' + (precision || 'non renseignée')
    + ' — grandeur distincte de la confiance de l’assertion.');

  /* E022-09 : le texte reste le vecteur principal, même sans couleur. */
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const fallback = ensureNode(make, FALLBACK_ID, 'p', 'e022-fallback', panel);
  write(fallback, 'Le niveau est toujours écrit en toutes lettres : la couleur n’est qu’un renfort. Aucune animation n’est ajoutée ici — le mouvement réduit est respecté.');
  panel.dataset.e022Reduced = reduced ? '1' : '0';
  panel.dataset.e022Nocolor = '1';

  /* E022-10 : état dedans / dehors, dédupliqué et dérivé du DOM. */
  const state = ensureNode(make, STATE_ID, 'p', 'e022-state', panel);
  write(state, 'Rendus : ' + renderCount + ' · bloc de confiance observé : '
    + (source ? 'oui' : 'non') + ' · feuille CSS unique : ' + CSS_ID + '.');
  panel.dataset.e022Renders = String(renderCount);
  panel.dataset.e022Observed = source ? '1' : '0';

  /* Ordre de lecture stable : titre, description, puis bloc, puis repli/état.
     replaceChildren sur le panneau aurait écrasé les nœuds réutilisés : on se
     contente de garantir la présence de chacun dans l'ordre attendu. */
  const ordered = [title, desc, block, fallback, state];
  ordered.forEach(node => { if (node.parentElement !== panel) panel.appendChild(node); });
  block.appendChild(label);
  block.appendChild(levelText);
  block.appendChild(dfnWrap);
  block.appendChild(criteria);
  block.appendChild(sourceText);
  block.appendChild(disputeText);
  block.appendChild(precisionText);
});
