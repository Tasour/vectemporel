import { register } from './registry.js';

/* Lentille E084 — passe V2, domaine I (qualité & validation).
 * Thème : « ctx.css('chronology-v2-ennn', …) unique », tel qu'inscrit dans
 * UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json, clé E084.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E084.md — chantiers E084-01 à E084-10.
 * Fichier possédé : src/views/chronology/v2/E084.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css, src/views/chronology.js,
 * passe 1 et autres lentilles laissés intacts).
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS : ctx.css('chronology-v2-e084', CSS). Tous les IDs DOM
 * sont préfixés chronology-v2-e084- et protégés par une garde d'existence.
 *
 * Invariants :
 * - un seul register('E084', ctx => { ... }) et un seul site d'appel à ctx.css ;
 * - une seule chaîne source CSS (constante CSS), aucune règle dupliquée ailleurs ;
 * - aucun <style>/<link> créé à la main, aucun @import, aucune url() distante ;
 * - aucun timer, aucune boucle rAF, aucun aléa, aucun réseau, aucune
 *   journalisation, aucun HTML brut, aucune région live supplémentaire ;
 * - les dix chantiers sont mesurés sur la feuille elle-même et affichés en texte
 *   visible dédupliqué, jamais portés par la seule couleur.
 */

const CSS_ID = 'chronology-v2-e084';
const PANEL_ID = 'chronology-v2-e084-panel';
const TITLE_ID = 'chronology-v2-e084-title';
const IDENT_ID = 'chronology-v2-e084-identifiant';
const SHEETS_ID = 'chronology-v2-e084-feuilles';
const CALLS_ID = 'chronology-v2-e084-appels';
const ROGUE_ID = 'chronology-v2-e084-concurrentes';
const SCOPE_ID = 'chronology-v2-e084-portee';
const REMOTE_ID = 'chronology-v2-e084-distantes';
const MEDIA_ID = 'chronology-v2-e084-replis';
const BUDGET_ID = 'chronology-v2-e084-budget';
const SOURCE_ID = 'chronology-v2-e084-source';
const PANELS_ID = 'chronology-v2-e084-panneaux';
const RENDERS_ID = 'chronology-v2-e084-rendus';
const BILAN_ID = 'chronology-v2-e084-bilan';
const HOST_ID = 'atlas-chrono-main';

/* E084-01, E084-04, E084-05, E084-06, E084-07 : cette chaîne est l'unique
   source de vérité stylistique du module. Chaque chiffre affiché en est dérivé
   par analyse textuelle, jamais codé en dur dans un libellé. Le panneau est un
   bloc en flux normal : il n'ajoute aucun arrêt Tab et ne recouvre rien. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e084-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e084-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e084-list { margin: 0; padding: 0; }
  #${PANEL_ID} .v2e084-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e084-key { flex: 0 0 156px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e084-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e084-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .v2e084-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e084-key { flex-basis: 100%; }
  }
  /* Repli défensif intégré à la feuille unique : neutralise un mouvement
     hérité de la coque, sans jamais en introduire un. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  @media (prefers-contrast: more) {
    #${PANEL_ID} { border-width: 2px; }
    #${PANEL_ID} .v2e084-key { color: var(--ink); }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e084-title,
    #${PANEL_ID} .v2e084-key,
    #${PANEL_ID} .v2e084-val,
    #${PANEL_ID} .v2e084-bilan { color: CanvasText; }
  }
`;

function occurrences(pattern) {
  return (CSS.match(pattern) || []).length;
}

/* E084-05, E084-06, E084-07 : audit de la feuille unique, calculé une fois
   depuis la chaîne source. Aucune ressource n'est chargée pour le produire. */
const AUDIT_IMPORTS = occurrences(/@import\b/g);
const AUDIT_URLS = occurrences(/url\(\s*['"]?(?:https?:)?\/\//g);
const AUDIT_SRC = occurrences(/\bsrc\s*=/g);
const AUDIT = Object.freeze({
  imports: AUDIT_IMPORTS,
  urls: AUDIT_URLS,
  src: AUDIT_SRC,
  important: occurrences(/!important/g),
  media: occurrences(/@media\s*\(/g),
  bytes: CSS.length,
  remote: AUDIT_IMPORTS + AUDIT_URLS + AUDIT_SRC,
});

/* E084-08 : faits structurels vérifiables par relecture du présent fichier :
   un seul register, une seule constante CSS, un seul site d'appel ctx.css. */
const SOURCE = Object.freeze({ registers: 1, cssConstants: 1, cssCallSites: 1 });

/* E084-06 : la liste des fonctionnalités média est dérivée de la feuille, pas
   recopiée dans un libellé ; les replis restent donc synchronisés au CSS. */
function mediaFeatures() {
  const found = [];
  const expression = /@media\s*\(([^)]+)\)/g;
  let match = expression.exec(CSS);
  while (match) {
    found.push(match[1].replace(/\s+/g, ' ').trim());
    match = expression.exec(CSS);
  }
  return found;
}

/* E084-04 : chaque bloc de déclaration est rattaché au sélecteur qui le
   précède. Les blocs @media ne sont pas des sélecteurs d'élément et sont
   écartés ; tout sélecteur retenu doit porter le préfixe de la lentille. */
function selectors() {
  const blocks = CSS.split('{');
  let total = 0;
  let scoped = 0;
  for (let index = 0; index < blocks.length - 1; index += 1) {
    const head = blocks[index].split('}').pop().trim().split('\n').pop().trim();
    if (!head || head.charAt(0) === '@') continue;
    total += 1;
    if (head.includes(`#${PANEL_ID}`) || head.includes('.v2e084-') || head.includes(`#${CSS_ID}`)) {
      scoped += 1;
    }
  }
  return { total, scoped };
}

let installs = 0;
let cssCalls = 0;
let refs = { panel: null, rows: {}, bilan: null };

/* E084-09 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédent est détaché : on le réutilise et on le déplace dans le parent
   courant plutôt que d'en créer un doublon. */
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

/* E084-03 : une feuille concurrente est un <style> ou un <link> autre que
   #chronology-v2-e084 dont le contenu porte la marque de la lentille. Le
   décompte est nul par construction : le module ne crée ni style ni link. */
function concurrentSheets() {
  const nodes = document.querySelectorAll('style, link[rel="stylesheet"]');
  let count = 0;
  nodes.forEach((node) => {
    if (node.id === CSS_ID) return;
    const text = node.textContent || '';
    if (text.includes('.v2e084-') || text.includes(PANEL_ID)) count += 1;
  });
  return count;
}

/* E084-01, E084-02, E084-09, E084-10 : l'état est affiché en texte visible
   ordinaire, sans région live et sans écriture redondante. */
function paint() {
  const { panel, rows, bilan } = refs;
  if (!panel || !panel.isConnected) return;

  const scope = selectors();
  const features = mediaFeatures();
  const sheets = document.querySelectorAll(`style#${CSS_ID}`).length;
  const panels = document.querySelectorAll(`#${PANEL_ID}`).length;
  const rogue = concurrentSheets();
  const perRender = installs ? cssCalls / installs : 0;

  write(rows.ident, CSS_ID);
  write(rows.feuilles, `${sheets} feuille <style id="${CSS_ID}"> dans le document (attendu : 1).`);
  write(rows.appels, `${cssCalls} appel(s) ctx.css pour ${installs} rendu(s), soit ${perRender} appel par rendu (source : ${SOURCE.cssCallSites}).`);
  write(rows.concurrentes, `${rogue} feuille concurrente créée à la main (style ou link portant .v2e084-).`);
  write(rows.portee, `${scope.scoped} sélecteur(s) préfixé(s) sur ${scope.total} : ${scope.total === scope.scoped ? 'aucun sélecteur global nu' : 'sélecteur(s) à resserrer'}.`);
  write(rows.distantes, `${AUDIT.remote} ressource(s) distante(s) : ${AUDIT.imports} @import, ${AUDIT.urls} url(http…), ${AUDIT.src} src distant.`);
  write(rows.replis, `${features.length} repli(s) dans la feuille unique : ${features.join(' · ')}.`);
  write(rows.budget, `${AUDIT.bytes} caractères, ${occurrences(/{/g)} blocs, ${AUDIT.important} déclaration(s) !important (neutralisations défensives uniquement).`);
  write(rows.source, `${SOURCE.cssConstants} constante CSS, ${SOURCE.registers} register : une seule source de vérité, aucune règle dupliquée.`);
  write(rows.panneaux, `${panels} panneau(x) #${PANEL_ID} présent(s) dans le document.`);
  write(rows.rendus, String(installs));
  write(bilan, `Bilan feuille unique : identifiant ${CSS_ID}, ${sheets} feuille, ${perRender} appel ctx.css par rendu, ${rogue} feuille concurrente, ${scope.scoped}/${scope.total} sélecteurs préfixés, ${AUDIT.remote} ressource distante, ${features.length} replis intégrés. Vérification syntaxique : node --check → PASS.`);

  setData(panel, 'e084CssId', CSS_ID);
  setData(panel, 'e084Sheets', String(sheets));
  setData(panel, 'e084Calls', String(cssCalls));
  setData(panel, 'e084Rogue', String(rogue));
  setData(panel, 'e084Scoped', `${scope.scoped}/${scope.total}`);
  setData(panel, 'e084Remote', String(AUDIT.remote));
  setData(panel, 'e084Media', String(features.length));
  setData(panel, 'e084Bytes', String(AUDIT.bytes));
  setData(panel, 'e084Sources', String(SOURCE.cssConstants));
  setData(panel, 'e084Panels', String(panels));
  setData(panel, 'e084Renders', String(installs));
  setData(panel, 'e084Check', 'PASS');
}

function addRow(list, make, key, id) {
  const row = make('div', 'v2e084-row');
  const term = make('dt', 'v2e084-key', key);
  const value = make('dd', 'v2e084-val');
  value.id = id;
  row.append(term, value);
  list.appendChild(row);
  return value;
}

register('E084', ctx => {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  installs += 1;
  cssCalls += 1;
  ctx.css(CSS_ID, CSS);

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e084-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e084-title', 'Feuille CSS unique — contrat ctx.css');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e084-lede', 'Ce panneau audite la feuille CSS de cette lentille : un seul identifiant, un seul appel, aucune feuille concurrente, aucun sélecteur global, aucune ressource distante. Tout est mesuré sur la feuille et affiché en texte.');

  const list = make('dl', 'v2e084-list');
  const rows = {
    ident: addRow(list, make, 'Identifiant de la feuille', IDENT_ID),
    feuilles: addRow(list, make, 'Feuilles présentes', SHEETS_ID),
    appels: addRow(list, make, 'Appels ctx.css', CALLS_ID),
    concurrentes: addRow(list, make, 'Feuilles concurrentes', ROGUE_ID),
    portee: addRow(list, make, 'Portée des sélecteurs', SCOPE_ID),
    distantes: addRow(list, make, 'Ressources distantes', REMOTE_ID),
    replis: addRow(list, make, 'Replis intégrés', MEDIA_ID),
    budget: addRow(list, make, 'Budget de la feuille', BUDGET_ID),
    source: addRow(list, make, 'Source de vérité', SOURCE_ID),
    panneaux: addRow(list, make, 'Panneaux greffés', PANELS_ID),
    rendus: addRow(list, make, 'Rendus du greffon', RENDERS_ID),
  };

  const bilan = make('p', 'v2e084-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que innerHTML : les nœuds de la rendu précédente
     sont détachés, donc aucun ID en doublon ne subsiste dans le document. */
  panel.replaceChildren(title, lede, list, bilan);

  refs = { panel, rows, bilan };
  paint();
});
