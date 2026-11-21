import { register } from './registry.js';

/* Lentille V2 E095 — glossaire au premier terme (ère, repère, confiance).
 * Domaine J : pédagogie & narration de la vue Chronologie (passe V2).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E095.md — chantiers E095-01 à E095-10.
 * Fichier possédé : src/views/chronology/v2/E095.js uniquement. Lectures seules :
 * src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md
 * (modèles de qualité de la passe 1). Aucun fichier partagé n'est modifié.
 *
 * Contrat : module ESM, un seul import { register } from './registry.js' (:1),
 * un seul register('E095', ctx => { … }), une seule feuille
 * ctx.css('chronology-v2-e095', …). ctx = { viewId:'chronologyv2', stage, layout }
 * enrichi de css / el / reducedMotion (v2/registry.js:28-37).
 *
 * Invariants :
 * - IDs DOM tous préfixés chronology-v2-e095-, uniques : le panneau est gardé
 *   par ensureNode, ses enfants sont remplacés par replaceChildren ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro rAF, zéro écouteur de touche ;
 * - définitions en texte sémantique visible (<dl>/<dt>/<dd>/<p>/<li>), jamais
 *   en sr-only, aria-hidden ni texte généré par le seul JavaScript ;
 * - français partout (commentaires, libellés, définitions, rapport).
 */

const CSS_ID = 'chronology-v2-e095';
const PANEL_ID = 'chronology-v2-e095-glossary';
const TITLE_ID = 'chronology-v2-e095-title';
const DEFS_ID = 'chronology-v2-e095-definitions';
const DFN_ERA_ID = 'chronology-v2-e095-dfn-era';
const DFN_MARKER_ID = 'chronology-v2-e095-dfn-marker';
const DFN_CONF_ID = 'chronology-v2-e095-dfn-confidence';
const DEF_ERA_ID = 'chronology-v2-e095-def-era';
const DEF_MARKER_ID = 'chronology-v2-e095-def-marker';
const DEF_CONF_ID = 'chronology-v2-e095-def-confidence';
const ORDER_ID = 'chronology-v2-e095-order';
const DEEP_ID = 'chronology-v2-e095-deep';
const DEEP_ERA_ID = 'chronology-v2-e095-deep-era';
const DEEP_MARKER_ID = 'chronology-v2-e095-deep-marker';
const DEEP_CONF_ID = 'chronology-v2-e095-deep-confidence';
const INDEX_ID = 'chronology-v2-e095-index';
const METRIC_ID = 'chronology-v2-e095-metric';
const MAIN_ID = 'atlas-chrono-main';

/* E095-01, E095-09 : une seule feuille, injectée une fois par ctx.css. Le
   glossaire est un bloc en flux normal en fin de colonne : jamais une modale,
   jamais superposé, jamais tabulable en plus du nécessaire. Replis
   reduced-motion, forced-colors et 620 px inclus. Aucune information n'est
   portée par la seule couleur : les rôles sont donnés par les libellés. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e095-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e095-subtitle {
    margin: 10px 0 4px; color: var(--ink-soft);
    font-family: var(--serif); font-size: 11px; font-weight: 600;
  }
  #${PANEL_ID} .e095-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e095-defs { margin: 0 0 8px; }
  #${PANEL_ID} .e095-defs dt { margin: 7px 0 2px; color: var(--ink-soft); }
  #${PANEL_ID} .e095-defs dd { margin: 0 0 4px; color: var(--muted); }
  #${PANEL_ID} .e095-dfn {
    color: var(--gold-bright); font-style: normal; font-weight: 600;
  }
  #${PANEL_ID} .e095-first {
    margin-left: 5px; padding: 1px 5px;
    border: 1px solid var(--line-strong); border-radius: 999px;
    color: var(--muted); font-size: 9px;
  }
  #${PANEL_ID} .e095-order { margin: 0 0 8px; padding-left: 18px; }
  #${PANEL_ID} .e095-order li { margin: 0 0 2px; color: var(--muted); }
  #${PANEL_ID} .e095-deep {
    margin: 0 0 8px; padding: 3px 0;
    border-top: 1px solid var(--line);
  }
  #${PANEL_ID} .e095-deep summary {
    color: var(--gold-bright); cursor: pointer; font-size: 10px;
  }
  #${PANEL_ID} .e095-deep p { margin: 4px 0 2px; color: var(--muted); }
  #${PANEL_ID} .e095-index { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e095-index a {
    margin-right: 8px; color: var(--gold-bright);
    text-decoration: underline; text-underline-offset: 2px;
  }
  #${PANEL_ID} .e095-metric { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 10px; }
    #${PANEL_ID} .e095-first { display: block; width: fit-content; margin: 3px 0 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e095-title, #${PANEL_ID} .e095-dfn,
    #${PANEL_ID} .e095-first, #${PANEL_ID} .e095-deep summary,
    #${PANEL_ID} .e095-index a { color: CanvasText; }
  }
`;

/* E095-02 à E095-05 : trois entrées, chacune avec son terme marqué au premier
   occurrence (<dfn>) et sa définition visible (<dd><p>). Les textes décrivent
   le contrat de la frise relevé dans le modèle de passe 1 (E049) ; ils
   n'inventent aucune date, aucun chiffre ni aucune source. */
const TERMS = [
  {
    key: 'era',
    word: 'ère',
    label: 'Ère',
    dfnId: DFN_ERA_ID,
    defId: DEF_ERA_ID,
    deepId: DEEP_ERA_ID,
    definition: 'Grande période délimitée par des bornes explicites : elle forme une bande de la frise et se lit à l’échelle du temps, jamais à la couleur seule.',
    deep: 'Dans la frise, l’ère est la bande de lecture. Ses bornes et son amplitude sont écrites sur l’axe ; l’épaisseur de la bande traduit la durée, toujours accompagnée d’une légende textuelle pour que l’information ne dépende pas d’un simple ton.',
  },
  {
    key: 'marker',
    word: 'repère',
    label: 'Repère',
    dfnId: DFN_MARKER_ID,
    defId: DEF_MARKER_ID,
    deepId: DEEP_MARKER_ID,
    definition: 'Ancre datée posée sur une ère : elle ouvre la fiche d’un point. Le repère est l’adresse, le point en est le contenu.',
    deep: 'Le repère est l’ancre datée posée sur une ère. Il pointe vers une fiche où le point — l’événement — est décrit avec sa source et son degré de confiance. Confondre repère et point reviendrait à confondre l’adresse et le contenu.',
  },
  {
    key: 'confidence',
    word: 'confiance',
    label: 'Confiance',
    dfnId: DFN_CONF_ID,
    defId: DEF_CONF_ID,
    deepId: DEEP_CONF_ID,
    definition: 'Degré de fiabilité d’une attribution ou d’une source. Une source absente est signalée par une omission justifiée, jamais par un silence.',
    deep: 'La confiance n’est pas un verdict : elle dit combien l’on peut tenir pour solide une attribution. Quand une source fait défaut, la fiche affiche une omission justifiée plutôt qu’un blanc : le lecteur voit une donnée absente, pas un oubli.',
  },
];

let renderCount = 0;

/* E095-10 : garde d'existence pour toute ID préfixée chronology-v2-e095. Un
   nœud déjà présent est réutilisé et déplacé dans le parent courant : la coque
   reconstruisant #app, un nœud du rendu précédent est détaché et n'est donc
   pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

/* E095-06 : mesure en lecture seule des occurrences réelles des trois termes
   dans le texte de la vue. Aucune écriture dans le DOM observé, aucun comptage
   aléatoire : la même vue donne toujours le même résultat. */
function countOccurrences(haystack, needle) {
  const text = String(haystack || '').toLowerCase();
  const term = String(needle || '').toLowerCase();
  if (!term) return 0;
  let count = 0;
  let from = 0;
  let at = text.indexOf(term, from);
  while (at !== -1) {
    count += 1;
    from = at + term.length;
    at = text.indexOf(term, from);
  }
  return count;
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout || typeof document === 'undefined') return;

  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  const fallback = ctx.layout.nodeType === 1 ? ctx.layout : document.body;
  const host = document.getElementById(MAIN_ID) || fallback;

  /* E095-01 : panneau non modal, en flux normal, nommé par son titre. */
  const panel = ensureNode(make, PANEL_ID, 'section', 'e095-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  setData(panel, 'e095Renders', String(renderCount));

  const title = make('h2', 'e095-title', 'Glossaire — ère, repère, confiance');
  title.id = TITLE_ID;
  const lede = make('p', 'e095-lede', 'Les trois mots qui structurent la lecture de la frise sont définis ici dès leur première occurrence. Ce glossaire est un texte lisible : il n’ajoute ni annonce sonore, ni fenêtre, ni raccourci.');

  /* E095-02 : structure sémantique <dl> — définitions indexables en plein
     texte, jamais en sr-only ni en contenu généré par le seul JavaScript. */
  const defs = make('dl', 'e095-defs');
  defs.id = DEFS_ID;

  /* E095-06 : relevé des occurrences avant construction du glossaire, sur le
     seul texte de la vue, sans mutation. */
  const view = document.getElementById(MAIN_ID);
  const viewText = view ? view.textContent : '';
  const occurrences = {};
  TERMS.forEach((term) => {
    occurrences[term.key] = countOccurrences(viewText, term.word);

    /* E095-03, E095-04, E095-05 : le terme est marqué comme premier terme
       avec <dfn>, la définition suit immédiatement dans <dd><p>. */
    const dt = make('dt', 'e095-term');
    const dfn = make('dfn', 'e095-dfn', term.word);
    dfn.id = term.dfnId;
    setData(dfn, 'e095First', '1');
    dt.append(dfn, make('span', 'e095-first', 'premier terme'));

    const dd = make('dd', 'e095-definition');
    const definition = make('p', 'e095-definition-text', term.definition);
    definition.id = term.defId;
    setData(definition, 'e095Term', term.key);
    dd.appendChild(definition);

    defs.append(dt, dd);
  });

  /* E095-07 : ordre d'apparition ère → repère → confiance, explicite et
     numéroté, pour que le lecteur suive le même chemin que le récit. */
  const orderHeading = make('h3', 'e095-subtitle', 'Ordre de première rencontre');
  const order = make('ol', 'e095-order');
  order.id = ORDER_ID;
  TERMS.forEach((term) => order.appendChild(make('li', 'e095-order-item', term.label)));

  /* E095-08 : approfondissement dépliable nativement. <details>/<summary>
     donne l'équivalent clavier sans JavaScript, sans modale et sans infobulle
     à base de title : la définition courte reste toujours visible. */
  const deepHeading = make('h3', 'e095-subtitle', 'Pour aller plus loin');
  const deep = make('div', 'e095-deep-list');
  deep.id = DEEP_ID;
  TERMS.forEach((term) => {
    const block = make('details', 'e095-deep');
    block.id = term.deepId;
    block.appendChild(make('summary', 'e095-deep-summary', term.label + ' — précision'));
    block.appendChild(make('p', 'e095-deep-text', term.deep));
    deep.appendChild(block);
  });

  /* E095-09 : renvois locaux vers chaque définition ; ancre de fragment,
     activation native, aucun intercepteur de clic ni conflit de routeur. */
  const indexHeading = make('h3', 'e095-subtitle', 'Aller à une définition');
  const index = make('nav', 'e095-index');
  index.id = INDEX_ID;
  index.setAttribute('aria-label', 'Index du glossaire');
  TERMS.forEach((term) => {
    const link = make('a', 'e095-index-link', term.label);
    link.href = '#' + term.defId;
    link.setAttribute('aria-label', 'Aller à la définition : ' + term.word);
    index.appendChild(link);
  });

  /* E095-10 : métrique visible et dédupliquée, mouvement réduit publié. */
  const metric = make('p', 'e095-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(
    title, lede,
    defs,
    orderHeading, order,
    deepHeading, deep,
    indexHeading, index,
    metric
  );

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  setData(panel, 'e095Reduced', reduced ? '1' : '0');
  setData(panel, 'e095Terms', String(TERMS.length));
  setData(panel, 'e095Occurrences', String(
    occurrences.era + occurrences.marker + occurrences.confidence
  ));
  TERMS.forEach((term) => setData(panel, 'e095Occurrences-' + term.key, String(occurrences[term.key])));
  setData(panel, 'e095Anchors', String(index.querySelectorAll('a[href^="#chronology-v2-e095-"]').length));
  setData(panel, 'e095Details', String(deep.querySelectorAll('details').length));

  write(metric, 'Installations : ' + renderCount
    + ' · termes définis : ' + TERMS.length
    + ' · occurrences relevées dans la vue : ' + (occurrences.era + occurrences.marker + occurrences.confidence)
    + ' (ère ' + occurrences.era + ' · repère ' + occurrences.marker + ' · confiance ' + occurrences.confidence + ')'
    + ' · renvois : ' + TERMS.length
    + ' · mouvement réduit : ' + (reduced ? 'oui' : 'non') + '.');
}

register('E095', (ctx) => {
  install(ctx);
});
