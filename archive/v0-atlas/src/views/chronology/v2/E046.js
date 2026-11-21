import { register } from './registry.js';

/* Lentille V2 E046 — E. Accessibilité & ARIA : inputs avec <label> associé
 * (thème « E046 » de UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E046.md — chantiers E046-01 à
 * E046-10. Fichier possédé : src/views/chronology/v2/E046.js uniquement.
 * Lectures seules : src/views/chronology/E049.js et
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md. Aucun fichier partagé n'est modifié
 * (registry.js, index.js, styles.css, src/views/chronology.js), ni la passe 1,
 * ni une autre lentille V2.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région
 * live, elle n'écrit dans aucune région existante et se contente d'afficher
 * son état en texte visible, dédupliqué, hors aria-live.
 *
 * Problème central : le champ de recherche de la passe 1 est créé par
 * document.createElement('input') avec un aria-label et un placeholder, mais
 * sans aucun élément <label> associé (chronology.js:313-320). Cette lentille
 * greffe ce libellé manquant sans éditer la vue, puis audite et documente
 * l'association.
 *
 * Invariants :
 * - un seul register('E046', install), un seul ctx.css('chronology-v2-e046', …) ;
 * - tous les IDs DOM créés sont préfixés chronology-v2-e046-, uniques, et
 *   protégés par une garde d'existence (idempotence multi-rendus) ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML (replaceChildren / textContent), zéro timer, zéro rAF,
 *   zéro animation, zéro réseau, zéro région live ajoutée.
 */

const CSS_ID = 'chronology-v2-e046';
const PANEL_ID = 'chronology-v2-e046-panel';
const TITLE_ID = 'chronology-v2-e046-title';
const SEARCH_LABEL_ID = 'chronology-v2-e046-search-label';
const AUDIT_ID = 'chronology-v2-e046-audit';
const LINK_ID = 'chronology-v2-e046-link';
const NAME_ID = 'chronology-v2-e046-name';
const PLACEHOLDER_ID = 'chronology-v2-e046-placeholder';
const FOCUS_ID = 'chronology-v2-e046-focus';
const MOTION_ID = 'chronology-v2-e046-motion';
const METRIC_ID = 'chronology-v2-e046-metric';
const MAIN_ID = 'atlas-chrono-main';
const TOOLS_ID = 'atlas-chrono-tools';
const SEARCH_ID = 'atlas-chrono-search';

/* E046-01, E046-08 : le texte du libellé repris tel quel de l'aria-label
   existant, pour que l'association <label> et le nom accessible restent
   cohérents (contrôle E046-08). Aucune donnée historique n'est inventée. */
const LABEL_TEXT = 'Rechercher parmi les repères et les points de ce pays';

/* E046-04, E046-05, E046-06, E046-09 : une seule feuille. Le libellé du champ
   est un bloc avant l'input, cible cliquable d'au moins 24 px, dont l'état de
   focus est doublé en CSS (:has) et en attribut (data-e046-focus). */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 12px 14px 13px;
    border: 1px solid var(--line); border-left: 4px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e046-title {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 16px; font-weight: 600;
    line-height: 1.3; text-transform: none;
  }
  #${PANEL_ID} .e046-lede { margin: 0 0 10px; color: var(--muted); }
  #${PANEL_ID} .e046-audit { margin: 0 0 6px; padding: 0; list-style: none; }
  #${PANEL_ID} .e046-row {
    display: flex; align-items: baseline; gap: 8px;
    margin: 0; padding: 6px 0; border-top: 1px dashed var(--line);
    font-size: 10px;
  }
  #${PANEL_ID} .e046-id {
    flex: 0 0 auto; max-width: 40%; padding: 1px 5px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e046-detail { flex: 1 1 auto; min-width: 0; color: var(--muted); }
  #${PANEL_ID} .e046-flag {
    flex: 0 0 auto; padding: 1px 6px; border: 1px solid currentColor;
    border-radius: 10px; font-size: 9px;
  }
  #${PANEL_ID} .e046-flag[data-e046-ok="1"] { color: var(--gold-bright); }
  #${PANEL_ID} .e046-flag[data-e046-ok="0"] { color: var(--muted-2); }
  #${PANEL_ID} .e046-note,
  #${PANEL_ID} .e046-link,
  #${PANEL_ID} .e046-name,
  #${PANEL_ID} .e046-placeholder,
  #${PANEL_ID} .e046-focus,
  #${PANEL_ID} .e046-motion,
  #${PANEL_ID} .e046-metric { margin: 6px 0 0; }
  #${PANEL_ID} .e046-note { color: var(--muted); }
  #${PANEL_ID} .e046-link,
  #${PANEL_ID} .e046-name,
  #${PANEL_ID} .e046-placeholder,
  #${PANEL_ID} .e046-focus { color: var(--gold-bright); }
  #${PANEL_ID} .e046-link[data-e046-attached="0"],
  #${PANEL_ID} .e046-name[data-e046-coherent="0"],
  #${PANEL_ID} .e046-placeholder[data-e046-placeholder-only="1"] {
    color: var(--muted-2);
  }
  #${PANEL_ID} .e046-motion,
  #${PANEL_ID} .e046-metric { color: var(--muted-2); font-size: 9px; }

  /* E046-04, E046-05 : libellé inséré avant le champ, en bloc pleine largeur,
     cible cliquable native (for=...) d'au moins 24 px de haut. */
  #${SEARCH_LABEL_ID} {
    display: block; flex: 1 1 100%; box-sizing: border-box;
    min-height: 24px; margin: 0 0 2px; padding: 4px 6px;
    border: 1px solid transparent; border-radius: 4px;
    color: var(--ink); font: inherit; font-size: 10px; line-height: 1.4;
    cursor: pointer;
  }
  #${SEARCH_LABEL_ID}:hover { color: var(--gold-bright); }

  /* E046-06 : signal visuel quand le champ associé a le focus. Double voie :
     :has() côté CSS, attribut data-e046-focus côté JS (repli navigateur). */
  #${TOOLS_ID}:has(#${SEARCH_ID}:focus) #${SEARCH_LABEL_ID},
  #${SEARCH_LABEL_ID}[data-e046-focus="1"] {
    border-color: var(--gold); color: var(--gold-bright);
    background: rgba(230,185,111,.08);
  }

  @media (max-width: 620px) {
    #${PANEL_ID} .e046-row { flex-wrap: wrap; gap: 2px 8px; }
    #${PANEL_ID} .e046-detail { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, #${SEARCH_LABEL_ID} {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${SEARCH_LABEL_ID},
    #${PANEL_ID} .e046-flag, #${PANEL_ID} .e046-id {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
  }
`;

let installCount = 0;
let focusBound = false;
let refs = {
  panel: null, audit: null, link: null, name: null,
  placeholder: null, focus: null, motion: null, metric: null,
  label: null, search: null, reduced: false,
};

/* E046-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent
   est réutilisé et déplacé dans le parent courant : la coque reconstruisant
   le stage, un nœud de la rendu précédente est détaché et n'est pas retrouvé
   par getElementById, mais l'idempotence reste assurée dans les deux cas. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : deux rendus sans changement ne touchent aucun texte. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E046-02, E046-07 : audit en lecture seule de tous les champs de la vue.
   On ne modifie ni l'id, ni le type, ni les attributs existants des champs
   rencontrés ; on relève seulement s'ils portent un <label> associé. */
function auditChamps(root) {
  const champs = root && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll('input, select, textarea'))
    : [];
  const lignes = champs.map((champ) => {
    const avecLabel = Boolean(champ.labels && champ.labels.length > 0);
    const source = avecLabel
      ? 'label associé'
      : champ.hasAttribute('aria-labelledby')
        ? 'aria-labelledby'
        : champ.hasAttribute('aria-label')
          ? 'aria-label seul'
          : champ.getAttribute('placeholder')
            ? 'placeholder seul'
            : 'aucun nom';
    return { id: champ.id || '(sans id)', type: champ.type || champ.tagName.toLowerCase(), avecLabel, source };
  });
  return {
    lignes,
    total: champs.length,
    sansLabel: lignes.filter((ligne) => !ligne.avecLabel).length,
  };
}

/* E046-06 : un seul écouteur, purement observationnel. Il ne fait ni
   preventDefault, ni stopPropagation, ni focus(), ni écriture live : il pose
   seulement un attribut data sur le libellé et le panneau. */
function onFocusIn(event) {
  const actif = event.target instanceof Element && event.target.id === SEARCH_ID;
  const label = document.getElementById(SEARCH_LABEL_ID);
  if (label) label.dataset.e046Focus = actif ? '1' : '0';
  if (refs.panel && refs.panel.isConnected) refs.panel.dataset.e046Focus = actif ? '1' : '0';
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e046-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e046-title', 'Champs et libellés associés');
  title.id = TITLE_ID;
  const lede = make('p', 'e046-lede',
    'Contrôle de la vue : tout champ doit porter un libellé explicite associé. Le panneau décrit l’état réel du DOM ; il ne modifie ni la donnée, ni le routeur, ni la coque.');

  const tools = document.getElementById(TOOLS_ID);
  const search = document.getElementById(SEARCH_ID);

  /* E046-01, E046-03, E046-04, E046-05 : création du libellé manquant et
     insertion avant le champ, dans les outils existants. La garde évite tout
     doublon ; insertBefore déplace un nœud détaché d'un rendu précédent. */
  let label = document.getElementById(SEARCH_LABEL_ID) || make('label', 'e046-search-label', LABEL_TEXT);
  label.id = SEARCH_LABEL_ID;
  label.htmlFor = SEARCH_ID;
  label.setAttribute('for', SEARCH_ID);
  if (tools) {
    if (search && search.parentElement === tools) tools.insertBefore(label, search);
    else if (!search) tools.appendChild(label);
  }

  /* E046-03 : double attache — for= sur le label et aria-labelledby sur le
     champ, l'aria-label d'origine étant conservé en repli. */
  if (search) {
    search.setAttribute('aria-labelledby', SEARCH_LABEL_ID);
  }

  const audit = make('ul', 'e046-audit');
  audit.id = AUDIT_ID;
  const chirurgie = auditChamps(host);
  chirurgie.lignes.slice(0, 20).forEach((ligne) => {
    const row = make('li', 'e046-row');
    const drapeau = make('span', 'e046-flag', ligne.avecLabel ? 'label associé' : 'libellé manquant');
    drapeau.dataset.e046Ok = ligne.avecLabel ? '1' : '0';
    row.append(
      make('span', 'e046-id', `${ligne.id} · ${ligne.type}`),
      make('span', 'e046-detail', `Nom accessible : ${ligne.source}.`),
      drapeau
    );
    audit.appendChild(row);
  });
  if (!chirurgie.lignes.length) {
    audit.appendChild(make('li', 'e046-row', 'Aucun champ (input, select, textarea) repéré dans cette vue.'));
  }

  const link = make('p', 'e046-link');
  link.id = LINK_ID;
  const name = make('p', 'e046-name');
  name.id = NAME_ID;
  const placeholder = make('p', 'e046-placeholder');
  placeholder.id = PLACEHOLDER_ID;
  const focus = make('p', 'e046-focus');
  focus.id = FOCUS_ID;
  const motion = make('p', 'e046-motion');
  motion.id = MOTION_ID;
  const metric = make('p', 'e046-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, audit, link, name, placeholder, focus, motion, metric);

  /* E046-01 : état de l'association sur le champ réel. */
  const attache = Boolean(search && label && label.htmlFor === SEARCH_ID
    && search.getAttribute('aria-labelledby') === SEARCH_LABEL_ID
    && search.labels && search.labels.length > 0);
  write(link, attache
    ? `Association vérifiée : #${SEARCH_ID} possède un <label for> et un aria-labelledby pointant vers #${SEARCH_LABEL_ID}.`
    : `Association incomplète : #${SEARCH_ID} n'a pas été relié à un libellé explicite (champ absent ou garde d'insertion).`);
  link.dataset.e046Attached = attache ? '1' : '0';

  /* E046-08 : cohérence entre le texte du libellé et l'aria-label d'origine. */
  const ariaLabel = search ? (search.getAttribute('aria-label') || '') : '';
  const coherent = Boolean(label) && label.textContent.trim() === ariaLabel.trim();
  write(name, coherent
    ? `Nom accessible cohérent : le libellé visible reprend l'aria-label d'origine (« ${ariaLabel} »).`
    : `Noms à rapprocher : libellé visible « ${label ? label.textContent.trim() : '(absent)'} » contre aria-label « ${ariaLabel} ».`);
  name.dataset.e046Coherent = coherent ? '1' : '0';

  /* E046-07 : le placeholder reste une aide, jamais le seul libellé. */
  const seulPlaceholder = Boolean(search && search.getAttribute('placeholder')
    && !(search.labels && search.labels.length > 0));
  write(placeholder, seulPlaceholder
    ? `Attention : #${SEARCH_ID} n'a que son placeholder pour nom — le libellé associé n'a pas pu être greffé.`
    : `Le placeholder de #${SEARCH_ID} n'est plus son seul indice : un libellé explicite lui est associé.`);
  placeholder.dataset.e046PlaceholderOnly = seulPlaceholder ? '1' : '0';

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  write(focus, 'Focus : le libellé s’illumine quand le champ reçoit le focus (:has et data-e046-focus). Un clic sur le libellé donne le focus au champ.');
  write(motion, reduced
    ? 'Mouvement réduit actif : le libellé et le panneau n’ont aucune transition ni animation.'
    : 'Mouvement normal : l’association reste lisible sans animation.');
  write(metric, `Champs audités : ${chirurgie.total} · sans libellé : ${chirurgie.sansLabel} · libellé greffé : ${attache ? 'oui' : 'non'} · installations : ${installCount} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  panel.dataset.e046Champs = String(chirurgie.total);
  panel.dataset.e046SansLabel = String(chirurgie.sansLabel);
  panel.dataset.e046Attached = attache ? '1' : '0';
  panel.dataset.e046Coherent = coherent ? '1' : '0';
  panel.dataset.e046PlaceholderOnly = seulPlaceholder ? '1' : '0';
  panel.dataset.e046Reduced = reduced ? '1' : '0';
  panel.dataset.e046Installs = String(installCount);

  refs = { panel, audit, link, name, placeholder, focus, motion, metric, label, search, reduced };

  /* E046-06 : écouteur unique, gardé sous une condition module. */
  if (!focusBound) {
    document.addEventListener('focusin', onFocusIn, true);
    focusBound = true;
  }
}

register('E046', install);
