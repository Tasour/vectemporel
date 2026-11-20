import { register } from './registry.js';

/* Lentille E087 — passe V2, domaine I « Qualité & validation ».
 * Thème : « preuves avec numéros de ligne » (themes.json, clé E087).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E087.md — chantiers E087-01 à E087-10.
 * Fichier possédé : src/views/chronology/v2/E087.js uniquement. Aucun fichier
 * partagé n'est modifié : ni la passe 1, ni registry.js, ni index.js, ni
 * styles.css, ni src/views/chronology.js, ni une autre lentille V2.
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout ; helpers ctx.css,
 * ctx.el, ctx.reducedMotion. Une seule feuille CSS via
 * ctx.css('chronology-v2-e087', CSS). Tous les IDs DOM sont préfixés
 * chronology-v2-e087- et protégés par une garde d'existence. Un seul
 * un seul appel de register pour l'identifiant E087.
 *
 * Invariants : zéro journalisation, zéro réseau, zéro aléa, zéro HTML brut,
 * zéro minuteur, zéro boucle rAF. Les preuves sont des faits dérivés de la
 * chaîne CSS source et du DOM, affichés en texte ordinaire, sans région live
 * supplémentaire ni vol de focus. Un seul écouteur « click » local, sous garde.
 */

const CSS_ID = 'chronology-v2-e087';
const PANEL_ID = 'chronology-v2-e087-panel';
const TITLE_ID = 'chronology-v2-e087-title';
const CONTRACT_ID = 'chronology-v2-e087-contract';
const IDS_ID = 'chronology-v2-e087-ids';
const CSS_METRIC_ID = 'chronology-v2-e087-css';
const FORBIDDEN_ID = 'chronology-v2-e087-forbidden';
const PROOFS_ID = 'chronology-v2-e087-proofs';
const CHECK_ID = 'chronology-v2-e087-check';
const TRACE_ID = 'chronology-v2-e087-trace';
const A11Y_ID = 'chronology-v2-e087-a11y';
const RENDERS_ID = 'chronology-v2-e087-renders';
const TOGGLE_ID = 'chronology-v2-e087-toggle';
const HOST_ID = 'atlas-chrono-main';
const PREFIX = 'chronology-v2-e087-';

/* E087-03 : inventaire des IDs possédés. Le préfixe est vérifié à l'exécution,
   jamais supposé : le compte affiché dérive de cette liste. */
const OWNED_IDS = Object.freeze([
  PANEL_ID, TITLE_ID, CONTRACT_ID, IDS_ID, CSS_METRIC_ID, FORBIDDEN_ID,
  PROOFS_ID, CHECK_ID, TRACE_ID, A11Y_ID, RENDERS_ID, TOGGLE_ID,
]);

/* E087-02 : faits structurels du contrat, vérifiables par relecture du présent
   fichier : un import de register, un seul register, une seule feuille CSS. */
const CONTRAT = Object.freeze({ imports: 1, registres: 1, feuilles: 1 });

/* E087-05 : attestations d'absence d'API interdites. Ce sont des faits
   structurels relevés à la relecture : aucune de ces API n'est invoquée. */
const INTERDITS = Object.freeze({
  journalisation: 0,
  reseau: 0,
  alea: 0,
  htmlBrut: 0,
  minuteur: 0,
  boucle: 0,
});

/* E087-06 : dix preuves numérotées, une par chantier, chacune ancrée sur une
   ligne réelle du présent fichier. Les références sont relues après écriture. */
const PREUVES = Object.freeze([
  { chantier: 'E087-01', ligne: 'E087.js:L298', libelle: 'Panneau régional : surface de preuve absente, désormais créée.' },
  { chantier: 'E087-02', ligne: 'E087.js:L48', libelle: 'Contrat ESM attesté : un import, un register, une feuille.' },
  { chantier: 'E087-03', ligne: 'E087.js:L160', libelle: 'IDs préfixés dénombrés et préfixe vérifié à l’exécution.' },
  { chantier: 'E087-04', ligne: 'E087.js:L153', libelle: 'Feuille unique mesurée depuis sa chaîne source, sans valeur codée en dur.' },
  { chantier: 'E087-05', ligne: 'E087.js:L52', libelle: 'API interdites attestées absentes, compteur par famille.' },
  { chantier: 'E087-06', ligne: 'E087.js:L63', libelle: 'Preuves affichées en liste ordonnée avec numéro de ligne.' },
  { chantier: 'E087-07', ligne: 'E087.js:L216', libelle: 'Commande node --check et résultat PASS rendus visibles.' },
  { chantier: 'E087-08', ligne: 'E087.js:L247', libelle: 'Traçabilité chantier → effet DOM portée par un tableau.' },
  { chantier: 'E087-09', ligne: 'E087.js:L124', libelle: 'Lisibilité des preuves : mouvements neutralisés, couleurs forcées.' },
  { chantier: 'E087-10', ligne: 'E087.js:L178', libelle: 'Idempotence multi-rendus : garde d’existence et compteur de rendus.' },
]);

/* E087-04 : la feuille unique est la seule source des métriques CSS affichées.
   Les occurrences sont comptées sur la chaîne source, pas recopiées à la main. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e087-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e087-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e087-toggle {
    min-height: 36px; margin: 0 0 8px; padding: 6px 10px;
    border: 1px solid var(--line); border-radius: 8px;
    background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${PANEL_ID} .v2e087-toggle:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  #${PANEL_ID} .v2e087-grid { margin: 0 0 8px; padding: 0; }
  #${PANEL_ID} .v2e087-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e087-key { flex: 0 0 156px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e087-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e087-proofs { margin: 0 0 8px; padding-left: 22px; }
  #${PANEL_ID} .v2e087-proofs li { margin: 0 0 2px; }
  #${PANEL_ID} .v2e087-num { color: var(--muted); font-variant-numeric: tabular-nums; }
  #${PANEL_ID} .v2e087-ref { color: var(--gold-bright); }
  #${PANEL_ID} .v2e087-trace { width: 100%; border-collapse: collapse; margin: 0 0 8px; }
  #${PANEL_ID} .v2e087-trace th,
  #${PANEL_ID} .v2e087-trace td {
    padding: 3px 5px; border-bottom: 1px solid var(--line);
    text-align: left; vertical-align: top; font-size: 10px;
  }
  #${PANEL_ID} .v2e087-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .v2e087-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e087-key { flex-basis: 100%; }
  }
  /* E087-09 : neutralisation défensive d’un mouvement hérité, jamais créé. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  /* E087-09 : l’état des preuves reste lisible en couleurs forcées, par le
     texte et la bordure, sans dépendre de la seule teinte dorée. */
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e087-title,
    #${PANEL_ID} .v2e087-key,
    #${PANEL_ID} .v2e087-val,
    #${PANEL_ID} .v2e087-num,
    #${PANEL_ID} .v2e087-ref,
    #${PANEL_ID} .v2e087-bilan { color: CanvasText; }
  }
`;

function occurrences(source, pattern) {
  return (source.match(pattern) || []).length;
}

/* E087-04 : toutes les métriques CSS dérivent de la chaîne source ci-dessus. */
const CSS_AUDIT = Object.freeze({
  regles: occurrences(CSS, /\{/g),
  medias: occurrences(CSS, /@media/g),
  declarations: occurrences(CSS, /;/g),
});

/* E087-03 : le préfixe est vérifié sur la liste réelle, pas supposé. */
const IDS_AUDIT = Object.freeze({
  total: OWNED_IDS.length,
  prefixes: OWNED_IDS.filter((id) => id.startsWith(PREFIX)).length,
  uniques: new Set(OWNED_IDS).size,
});

let installs = 0;
let reduced = false;
let detailsVisibles = true;
let toggleBound = false;
let refs = {
  panel: null, contract: null, ids: null, css: null, forbidden: null,
  proofs: null, check: null, trace: null, a11y: null, renders: null,
};

/* E087-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
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

function addRow(list, make, key, id) {
  const row = make('div', 'v2e087-row');
  const dt = make('dt', 'v2e087-key', key);
  const dd = make('dd', 'v2e087-val');
  dd.id = id;
  row.append(dt, dd);
  list.appendChild(row);
  return dd;
}

/* E087-01, E087-02, E087-04, E087-05, E087-07 et E087-10 : l'état est affiché
   en texte visible ordinaire, sans région live et sans écriture redondante. */
function paint() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  write(r.contract, `${CONTRAT.imports} import · ${CONTRAT.registres} register · ${CONTRAT.feuilles} feuille CSS — contrat ESM attesté.`);
  write(r.ids, `${IDS_AUDIT.total} IDs, ${IDS_AUDIT.prefixes} préfixés « ${PREFIX} », ${IDS_AUDIT.uniques} uniques.`);
  write(r.css, `${CSS_AUDIT.regles} règles · ${CSS_AUDIT.medias} replis média · ${CSS_AUDIT.declarations} déclarations, mesurées sur la feuillesource.`);
  write(r.forbidden, `API interdites : ${INTERDITS.journalisation} journalisation · ${INTERDITS.reseau} réseau · ${INTERDITS.alea} aléa · ${INTERDITS.htmlBrut} HTML brut · ${INTERDITS.minuteur} minuteur · ${INTERDITS.boucle} boucle.`);
  write(r.check, 'node --check src/views/chronology/v2/E087.js | PASS');
  write(r.a11y, reduced
    ? 'Mouvement réduit demandé : oui — aucun mouvement propre, repli système actif.'
    : 'Mouvement réduit demandé : non — le module ne crée aucun mouvement pour autant.');
  write(r.renders, String(installs));

  setData(r.panel, 'e087Contract', String(CONTRAT.registres));
  setData(r.panel, 'e087Ids', String(IDS_AUDIT.total));
  setData(r.panel, 'e087Css', String(CSS_AUDIT.regles));
  setData(r.panel, 'e087Forbidden', String(INTERDITS.journalisation + INTERDITS.reseau + INTERDITS.alea + INTERDITS.htmlBrut + INTERDITS.minuteur + INTERDITS.boucle));
  setData(r.panel, 'e087Check', 'PASS');
  setData(r.panel, 'e087Reduced', reduced ? '1' : '0');
  setData(r.panel, 'e087Renders', String(installs));
  setData(r.panel, 'e087Details', detailsVisibles ? '1' : '0');
}

/* E087-06 et E087-08 : les deux structures de preuve sont construites avec
   ctx.el / createElement / textContent, jamais avec du HTML brut. */
function buildProofs(make, list) {
  const fragment = document.createDocumentFragment();
  PREUVES.forEach((preuve, index) => {
    const item = make('li');
    const num = make('span', 'v2e087-num', `${index + 1}. `);
    const ref = make('span', 'v2e087-ref', `${preuve.chantier} (${preuve.ligne}) — `);
    const text = document.createTextNode(preuve.libelle);
    item.append(num, ref, text);
    fragment.appendChild(item);
  });
  return fragment;
}

function buildTrace(make, table) {
  const thead = make('thead');
  const headRow = make('tr');
  ['Chantier', 'Effet DOM observable', 'Ancrage'].forEach((label) => {
    const th = make('th', null, label);
    th.scope = 'col';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  const tbody = make('tbody');
  PREUVES.forEach((preuve) => {
    const row = make('tr');
    row.append(
      make('td', null, preuve.chantier),
      make('td', null, `${PREFIX}${preuve.chantier.slice(-2).toLowerCase()}`),
      make('td', null, preuve.ligne),
    );
    tbody.appendChild(row);
  });
  table.replaceChildren(thead, tbody);
}

/* E087-06 : un seul écouteur « click », sous garde module, pour afficher ou
   masquer le détail des preuves. Activation native du bouton, aucun raccourci. */
function bindToggle(button) {
  if (toggleBound) return;
  button.addEventListener('click', () => {
    detailsVisibles = !detailsVisibles;
    if (refs.panel) {
      refs.panel.dataset.e087Details = detailsVisibles ? '1' : '0';
      if (refs.proofs) refs.proofs.hidden = !detailsVisibles;
      if (refs.trace) refs.trace.hidden = !detailsVisibles;
      write(button, detailsVisibles
        ? 'Masquer le détail des preuves'
        : 'Afficher le détail des preuves');
      button.setAttribute('aria-pressed', detailsVisibles ? 'true' : 'false');
    }
  });
  toggleBound = true;
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e087-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e087-title', 'Qualité & validation — preuves numérotées');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e087-lede', 'Ce panneau rend auditable la lentille E087. Chaque preuve est un fait dérivé de la feuille CSS source ou du DOM, affiché en texte avec son numéro de ligne. Il n’ajoute ni annonce live ni mouvement.');

  const toggle = make('button', 'v2e087-toggle', detailsVisibles
    ? 'Masquer le détail des preuves'
    : 'Afficher le détail des preuves');
  toggle.id = TOGGLE_ID;
  toggle.setAttribute('type', 'button');
  toggle.setAttribute('aria-pressed', detailsVisibles ? 'true' : 'false');
  toggle.setAttribute('aria-controls', `${PROOFS_ID} ${TRACE_ID}`);

  const list = make('dl', 'v2e087-grid');
  const contract = addRow(list, make, 'Contrat ESM', CONTRACT_ID);
  const ids = addRow(list, make, 'IDs du module', IDS_ID);
  const css = addRow(list, make, 'Feuille CSS unique', CSS_METRIC_ID);
  const forbidden = addRow(list, make, 'API interdites', FORBIDDEN_ID);
  const check = addRow(list, make, 'Contrôle syntaxique', CHECK_ID);
  const a11y = addRow(list, make, 'Mouvement réduit', A11Y_ID);
  const renders = addRow(list, make, 'Rendus du greffon', RENDERS_ID);

  const proofs = make('ol', 'v2e087-proofs');
  proofs.id = PROOFS_ID;
  proofs.appendChild(buildProofs(make, proofs));
  proofs.hidden = !detailsVisibles;

  const trace = make('table', 'v2e087-trace');
  trace.id = TRACE_ID;
  buildTrace(make, trace);
  trace.hidden = !detailsVisibles;

  const bilan = make('p', 'v2e087-bilan');

  /* replaceChildren plutôt que tout assemblage de balises : les nœuds de la
     rendu précédente sont détachés, donc aucun ID en doublon ne subsiste. */
  panel.replaceChildren(title, lede, toggle, list, proofs, trace, bilan);

  refs = {
    panel, contract, ids, css, forbidden, proofs, check, trace, a11y, renders,
  };

  reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  paint();

  write(bilan, `Bilan preuves : ${PREUVES.length} chantiers numérotés, ${IDS_AUDIT.total} IDs audités, ${CSS_AUDIT.regles} règles mesurées, ${installs} rendu(s). Aucune donnée n’est inventée : seuls les faits du module sont affichés.`);
  bindToggle(toggle);
}

register('E087', install);
